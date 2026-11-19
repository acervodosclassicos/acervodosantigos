import { supabase, hasSupabaseConfig } from './supabase';
import type { Product, SiteSettings, Banner, Feedback } from '../types';

const CACHE_PREFIX = 'acervo_cache_v2_';
const MEMORY_CACHE = new Map<string, { data: any; expiry: number }>();

// Helper to get from local storage cache
export function getLocalCache<T>(key: string): T | null {
  try {
    // 1. Check memory cache first (instant)
    const mem = MEMORY_CACHE.get(key);
    if (mem && mem.expiry > Date.now()) {
      return mem.data as T;
    }

    // 2. Check localStorage
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiry && parsed.expiry < Date.now()) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    // Repopulate memory cache
    MEMORY_CACHE.set(key, { data: parsed.data, expiry: parsed.expiry });
    return parsed.data as T;
  } catch (e) {
    return null;
  }
}

// Helper to set local storage cache
export function setLocalCache<T>(key: string, data: T, ttlMs: number = 10 * 60 * 1000): void {
  try {
    const expiry = Date.now() + ttlMs;
    MEMORY_CACHE.set(key, { data, expiry });
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, expiry })
    );
  } catch (e) {
    // Storage quota might be exceeded, ignore gracefully
  }
}

// Timeout promise wrapper
function timeoutPromise<T>(promise: Promise<T>, ms: number, errorMessage = 'Tempo de conexão esgotado'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Fetch with automatic retry and timeout
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  timeoutMs = 4500
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await timeoutPromise(fn(), timeoutMs);
    } catch (err: any) {
      lastError = err;
      if (i < retries) {
        // Short exponential delay before retrying
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
  }
  throw lastError;
}

/**
 * High-speed Product Details Fetcher with SWR (Stale-While-Revalidate)
 * Returns cached product instantly if available, while refreshing in background.
 */
export async function getProductBySlug(
  slug: string,
  onBackgroundUpdate?: (freshProduct: Product) => void
): Promise<{ product: Product | null; isFromCache: boolean }> {
  const cacheKey = `product_${slug}`;
  const cached = getLocalCache<Product>(cacheKey);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const sortImages = (prod: any) => {
    if (prod && Array.isArray(prod.images)) {
      prod.images.sort((a: any, b: any) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        const orderA = typeof a.sort_order === 'number' ? a.sort_order : 999;
        const orderB = typeof b.sort_order === 'number' ? b.sort_order : 999;
        return orderA - orderB;
      });
    }
    return prod;
  };

  // If found in cache, return immediately and trigger background revalidation
  if (cached) {
    if (onBackgroundUpdate && hasSupabaseConfig) {
      // Revalidate in background without blocking UI
      fetchWithRetry(async () => {
        let query = supabase.from('products').select('*, images:product_images(*)');
        query = isUuid ? query.eq('id', slug) : query.eq('slug', slug);
        const { data, error } = await query.single();
        if (!error && data) {
          const sorted = sortImages(data) as Product;
          setLocalCache(cacheKey, sorted, 15 * 60 * 1000);
          onBackgroundUpdate(sorted);
        }
      }, 1, 4000).catch(() => {});
    }
    return { product: cached, isFromCache: true };
  }

  // If not in cache, fetch with retry
  if (!hasSupabaseConfig) {
    return { product: null, isFromCache: false };
  }

  try {
    const data = await fetchWithRetry(async () => {
      let query = supabase.from('products').select('*, images:product_images(*)');
      query = isUuid ? query.eq('id', slug) : query.eq('slug', slug);
      const { data, error } = await query.single();
      if (error) throw error;
      return sortImages(data);
    }, 2, 4500);

    if (data) {
      setLocalCache(cacheKey, data, 15 * 60 * 1000);
      return { product: data as Product, isFromCache: false };
    }
    return { product: null, isFromCache: false };
  } catch (err) {
    throw err;
  }
}

/**
 * High-speed Home Data Fetcher with resilient Promise.allSettled and local cache
 */
export async function getHomeData(): Promise<{
  products: Product[];
  banners: Banner[];
  feedbacks: Feedback[];
  settings: SiteSettings | null;
}> {
  const cacheKey = 'home_data_bundle';
  const cached = getLocalCache<{
    products: Product[];
    banners: Banner[];
    feedbacks: Feedback[];
    settings: SiteSettings | null;
  }>(cacheKey);

  // Fallback defaults in case Supabase is waking up
  let result = cached || {
    products: [],
    banners: [],
    feedbacks: [],
    settings: null,
  };

  if (!hasSupabaseConfig) {
    return result;
  }

  // Fetch each data independently using Promise.allSettled so one slow query never blocks others
  try {
    const [prodSettled, bannerSettled, fbSettled, settingsSettled] = await Promise.allSettled([
      fetchWithRetry(async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*, images:product_images(*)')
          .in('status', ['ativo', 'esgotado'])
          .order('created_at', { ascending: false })
          .limit(12);
        if (error) throw error;
        return data || [];
      }, 1, 4000),

      fetchWithRetry(async () => {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        return data || [];
      }, 1, 3500),

      fetchWithRetry(async () => {
        const { data, error } = await supabase
          .from('feedbacks')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })
          .limit(6);
        if (error) throw error;
        return data || [];
      }, 1, 3000),

      fetchWithRetry(async () => {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .limit(1)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      }, 1, 3000),
    ]);

    const freshProducts = prodSettled.status === 'fulfilled' ? (prodSettled.value as Product[]) : result.products;
    const freshBanners = bannerSettled.status === 'fulfilled' ? (bannerSettled.value as Banner[]) : result.banners;
    const freshFeedbacks = fbSettled.status === 'fulfilled' ? (fbSettled.value as Feedback[]) : result.feedbacks;
    const freshSettings = settingsSettled.status === 'fulfilled' ? (settingsSettled.value as SiteSettings | null) : result.settings;

    const freshBundle = {
      products: freshProducts,
      banners: freshBanners,
      feedbacks: freshFeedbacks,
      settings: freshSettings,
    };

    // Cache products individually as well so clicking any of them opens in 0ms!
    freshProducts.forEach((p) => {
      if (p.slug) {
        setLocalCache(`product_${p.slug}`, p, 15 * 60 * 1000);
      }
    });

    if (freshProducts.length > 0 || freshBanners.length > 0) {
      setLocalCache(cacheKey, freshBundle, 10 * 60 * 1000);
    }

    return freshBundle;
  } catch (e) {
    return result;
  }
}
