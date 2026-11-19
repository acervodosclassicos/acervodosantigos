import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { injectProductMeta } from '../src/lib/seo-injector.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables from .env if present
function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  const envVars = { ...process.env };
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [k, ...v] = trimmed.split('=');
        if (k && v.length) {
          envVars[k.trim()] = v.join('=').trim();
        }
      }
    }
  }
  return envVars;
}

async function runPrerender() {
  const distIndexHtmlPath = path.join(projectRoot, 'dist', 'index.html');
  if (!fs.existsSync(distIndexHtmlPath)) {
    console.error('[prerender] dist/index.html does not exist. Run vite build first.');
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(distIndexHtmlPath, 'utf8');
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('[prerender] Supabase credentials not found. Skipping static product prerendering.');
    return;
  }

  console.log('[prerender] Fetching products from Supabase for static Open Graph prerendering...');
  try {
    const endpoint = `${supabaseUrl}/rest/v1/products?select=id,title,description,price,vehicle,condition,slug,images:product_images(url,is_primary,sort_order)&order=created_at.desc`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!res.ok) {
      console.error(`[prerender] Failed to fetch products: ${res.status} ${res.statusText}`);
      return;
    }

    const products = await res.json();
    console.log(`[prerender] Found ${products.length} products to prerender.`);

    let generatedCount = 0;

    for (const product of products) {
      const injectedHtml = injectProductMeta(baseHtml, product, {
        defaultSiteUrl: 'https://acervodosantigos.com.br',
      });

      // Target folders:
      // 1. By slug: dist/produto/<slug>/index.html
      // 2. By id: dist/produto/<id>/index.html
      const destinations = [
        product.slug,
        encodeURIComponent(product.slug),
        product.id
      ];

      const uniqueDests = Array.from(new Set(destinations)).filter(Boolean);

      for (const dest of uniqueDests) {
        // Safe folder name
        const productDir = path.join(projectRoot, 'dist', 'produto', dest);
        fs.mkdirSync(productDir, { recursive: true });
        const filePath = path.join(productDir, 'index.html');
        fs.writeFileSync(filePath, injectedHtml, 'utf8');
        generatedCount++;
      }
    }

    console.log(`[prerender] Successfully generated ${generatedCount} static product HTML files with Open Graph tags!`);
  } catch (err) {
    console.error('[prerender] Error during static prerender:', err);
  }
}

runPrerender();
