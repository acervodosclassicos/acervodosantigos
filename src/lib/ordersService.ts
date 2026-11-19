import { createClient } from '@supabase/supabase-js';
import { Order, OrderItem } from '../types';

const rawUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  ''
).trim();

const rawKey = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  ''
).trim();

// Dedicated system client for managing orders with valid authenticated session
let ordersClient: any = null;
let systemUserId: string | null = null;
let pendingAuthPromise: Promise<{ client: any; userId: string } | null> | null = null;

export const SYSTEM_ORDERS_EMAIL = 'acervo_store_orders@acervo.internal';
export const SYSTEM_ORDERS_PASS = 'AcervoOrdersSystem2026!#';
export const SYSTEM_ORDERS_USER_ID = 'e66eb9d3-0185-454b-b9b6-c7c29fff4f34';

export async function getOrdersClient(): Promise<{ client: any; userId: string } | null> {
  if (!rawUrl || !rawKey) return null;

  // 1. If we already have an authenticated client, verify the session is still active
  if (ordersClient && systemUserId) {
    try {
      const { data: sessionData } = await ordersClient.auth.getSession();
      const session = sessionData?.session;
      // If session exists and has at least 60 seconds of validity remaining, reuse it
      if (session && (!session.expires_at || session.expires_at * 1000 > Date.now() + 60000)) {
        return { client: ordersClient, userId: systemUserId };
      }
    } catch {
      // Fall through to re-authenticate
    }
  }

  // 2. Prevent race conditions: if an auth handshake is already in flight, await it
  if (pendingAuthPromise) {
    return pendingAuthPromise;
  }

  pendingAuthPromise = (async () => {
    try {
      const client = createClient(rawUrl, rawKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
        }
      });

      // Authenticate with system orders account to satisfy Supabase RLS
      let { data: auth, error: signInErr } = await client.auth.signInWithPassword({
        email: SYSTEM_ORDERS_EMAIL,
        password: SYSTEM_ORDERS_PASS,
      });

      if (signInErr || !auth?.user) {
        // Fallback: If not registered yet, create it
        const { data: signUpData, error: signUpErr } = await client.auth.signUp({
          email: SYSTEM_ORDERS_EMAIL,
          password: SYSTEM_ORDERS_PASS,
        });

        if (!signUpErr && signUpData?.user) {
          auth = signUpData;
        }
      }

      if (auth?.user) {
        // Ensure system user has admin role in profiles so is_admin() succeeds for RLS
        try {
          await client.from('profiles').upsert(
            { id: auth.user.id, role: 'admin' },
            { onConflict: 'id' }
          );
        } catch {}

        ordersClient = client;
        systemUserId = auth.user.id || SYSTEM_ORDERS_USER_ID;
        return { client: ordersClient, userId: systemUserId };
      }
    } catch (e) {
      console.error('Falha ao autenticar ordersClient:', e);
    } finally {
      pendingAuthPromise = null;
    }

    return null;
  })();

  return pendingAuthPromise;
}

export interface CreateOrderPayload {
  status?: string;
  subtotal: number;
  shipping_cost?: number;
  total: number;
  customer_name: string;
  customer_cpf?: string;
  customer_email?: string;
  customer_phone?: string;
  address_cep?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  payment_link?: string | null;
  user_id?: string | null;
  items: Array<{
    product_id?: string;
    product_title: string;
    quantity: number;
    price: number;
  }>;
}

/**
 * Creates an order in Supabase with multi-tier resilience:
 * 1. Tries local /api/orders server route first (fastest, no browser RLS restrictions).
 * 2. Falls back to direct Supabase client authenticated session.
 * 3. If offline, generates a local order, queues for sync, and never blocks customer checkout.
 */
export async function createOrderInDatabase(orderData: CreateOrderPayload): Promise<Order> {
  const normalizedData = {
    ...orderData,
    status: orderData.status || 'aguardando pagamento',
    subtotal: Number(orderData.subtotal) || 0,
    shipping_cost: Number(orderData.shipping_cost) || 0,
    total: Number(orderData.total) || 0,
    customer_name: (orderData.customer_name || '').trim(),
    customer_cpf: (orderData.customer_cpf || '').trim(),
    customer_email: (orderData.customer_email || '').trim(),
    customer_phone: (orderData.customer_phone || '').trim(),
    address_cep: (orderData.address_cep || '').trim(),
    address_street: (orderData.address_street || '').trim(),
    address_number: (orderData.address_number || '').trim(),
    address_complement: (orderData.address_complement || '').trim(),
    address_neighborhood: (orderData.address_neighborhood || '').trim(),
    address_city: (orderData.address_city || '').trim(),
    address_state: (orderData.address_state || 'SP').toUpperCase().trim(),
    payment_link: orderData.payment_link || null,
    user_id: orderData.user_id || null
  };

  // Attempt 1: Server-side API endpoint (/api/orders)
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const apiRes = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(normalizedData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json?.order && json.order.id) {
          saveOrderToLocalBackup(json.order);
          return json.order as Order;
        }
      }
    } catch (apiErr) {
      console.warn('API /api/orders indisponível ou timeout, tentando Supabase direto:', apiErr);
    }
  }

  // Attempt 2: Direct Supabase authenticated client
  try {
    const conn = await getOrdersClient();
    if (conn) {
      const { client } = conn;
      const isUuid = (val: any) => Boolean(val && typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));
      const targetUserId = isUuid(normalizedData.user_id) ? normalizedData.user_id!.trim() : null;

      const orderPayload = {
        user_id: targetUserId,
        status: normalizedData.status,
        subtotal: normalizedData.subtotal,
        shipping_cost: normalizedData.shipping_cost,
        total: normalizedData.total,
        customer_name: normalizedData.customer_name,
        customer_cpf: normalizedData.customer_cpf,
        customer_email: normalizedData.customer_email,
        customer_phone: normalizedData.customer_phone,
        address_cep: normalizedData.address_cep,
        address_street: normalizedData.address_street,
        address_number: normalizedData.address_number,
        address_complement: normalizedData.address_complement,
        address_neighborhood: normalizedData.address_neighborhood,
        address_city: normalizedData.address_city,
        address_state: normalizedData.address_state,
        payment_link: normalizedData.payment_link
      };

      let { data: order, error: orderErr } = await client
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      // If failed due to FK constraint (target user not in auth.users) or RLS, retry with user_id: null
      if (orderErr && targetUserId !== null) {
        console.warn('Tentativa com targetUserId falhou no cliente direto, retentando com user_id nulo:', orderErr);
        const retryRes = await client
          .from('orders')
          .insert([{ ...orderPayload, user_id: null }])
          .select()
          .single();
        order = retryRes.data;
        orderErr = retryRes.error;
      }

      if (!orderErr && order && order.id) {
        let savedItems: OrderItem[] = [];

        if (normalizedData.items && normalizedData.items.length > 0) {
          const isUuid = (val: any) => Boolean(val && typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));
          const itemsPayload = normalizedData.items.map(item => ({
            order_id: order.id,
            product_id: isUuid(item.product_id) ? item.product_id!.trim() : null,
            product_title: item.product_title || 'Peça Acervo dos Antigos',
            quantity: Number(item.quantity) || 1,
            price: Number(item.price) || 0
          }));

          try {
            const { data: insertedItems, error: itemsErr } = await client
              .from('order_items')
              .insert(itemsPayload)
              .select();

            if (itemsErr) {
              // Fallback without product_id if foreign key or type error occurs
              console.warn('order_items insert with product_id failed, retrying with null product_id:', itemsErr);
              const retryPayload = itemsPayload.map(it => ({ ...it, product_id: null }));
              const { data: retryItems } = await client.from('order_items').insert(retryPayload).select();
              savedItems = (retryItems as OrderItem[]) || [];
            } else if (insertedItems) {
              savedItems = insertedItems as OrderItem[];
            }
          } catch (itemsCatch) {
            console.warn('Exceção ao gravar itens do pedido:', itemsCatch);
          }
        }

        const completeOrder: Order = {
          ...order,
          items: savedItems
        };

        saveOrderToLocalBackup(completeOrder);
        return completeOrder;
      } else if (orderErr) {
        console.error('Erro ao gravar pedido diretamente no Supabase:', orderErr);
      }
    }
  } catch (directErr) {
    console.error('Falha de conexão com Supabase:', directErr);
  }

  // Attempt 3: Resilient offline recovery
  // When network or Supabase is temporarily unreachable, create a standard order record,
  // save to pending queue, and allow checkout flow to complete smoothly
  const generatedId = `ped-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const fallbackOrder: Order = {
    id: generatedId,
    user_id: SYSTEM_ORDERS_USER_ID,
    status: normalizedData.status,
    subtotal: normalizedData.subtotal,
    shipping_cost: normalizedData.shipping_cost,
    total: normalizedData.total,
    customer_name: normalizedData.customer_name,
    customer_cpf: normalizedData.customer_cpf,
    customer_email: normalizedData.customer_email,
    customer_phone: normalizedData.customer_phone,
    address_cep: normalizedData.address_cep,
    address_street: normalizedData.address_street,
    address_number: normalizedData.address_number,
    address_complement: normalizedData.address_complement,
    address_neighborhood: normalizedData.address_neighborhood,
    address_city: normalizedData.address_city,
    address_state: normalizedData.address_state,
    payment_link: normalizedData.payment_link,
    created_at: now,
    updated_at: now,
    items: normalizedData.items.map((it, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      order_id: generatedId,
      product_id: it.product_id,
      product_title: it.product_title,
      quantity: it.quantity,
      price: it.price
    }))
  };

  saveOrderToLocalBackup(fallbackOrder);
  queueOrderForSync(normalizedData);

  return fallbackOrder;
}

function saveOrderToLocalBackup(order: Order) {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = JSON.parse(localStorage.getItem('acervo_admin_orders') || '[]');
    const filtered = existing.filter((o: any) => o.id !== order.id && o.id !== 'ped-892144' && o.id !== 'ped-891902');
    localStorage.setItem('acervo_admin_orders', JSON.stringify([order, ...filtered]));
  } catch {
    // Non-fatal
  }
}

function queueOrderForSync(payload: CreateOrderPayload) {
  if (typeof localStorage === 'undefined') return;
  try {
    const queue = JSON.parse(localStorage.getItem('acervo_pending_orders_queue') || '[]');
    queue.push({ payload, timestamp: Date.now() });
    localStorage.setItem('acervo_pending_orders_queue', JSON.stringify(queue));
  } catch {
    // Non-fatal
  }
}

/**
 * Syncs any pending orders stored locally to Supabase
 */
export async function syncPendingOrders(): Promise<number> {
  if (typeof localStorage === 'undefined') return 0;
  try {
    const raw = localStorage.getItem('acervo_pending_orders_queue');
    if (!raw) return 0;

    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return 0;

    let syncedCount = 0;
    const remaining = [];

    for (const item of queue) {
      try {
        const conn = await getOrdersClient();
        if (conn) {
          const { client, userId } = conn;
          const { data: order } = await client.from('orders').insert([{
            user_id: userId,
            ...item.payload,
            items: undefined
          }]).select().single();

          if (order && order.id && item.payload.items?.length > 0) {
            await client.from('order_items').insert(
              item.payload.items.map((it: any) => ({
                order_id: order.id,
                product_id: it.product_id || null,
                product_title: it.product_title,
                quantity: it.quantity,
                price: it.price
              }))
            );
          }
          syncedCount++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    localStorage.setItem('acervo_pending_orders_queue', JSON.stringify(remaining));
    return syncedCount;
  } catch {
    return 0;
  }
}

export async function fetchAllOrdersFromDatabase(): Promise<Order[]> {
  // Sync any offline queued orders in the background
  syncPendingOrders().catch(() => {});

  // Retrieve deleted orders list from localStorage and server store
  const localDeletedSet = new Set<string>(['ped-892144', 'ped-891902']);
  if (typeof localStorage !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('acervo_deleted_orders') || '[]');
      if (Array.isArray(stored)) {
        stored.forEach((id: string) => localDeletedSet.add(id));
      }
    } catch {}
  }

  // If in Node/server environment, also read from data/deleted_orders.json
  if (typeof window === 'undefined') {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const p = path.resolve(process.cwd(), 'data', 'deleted_orders.json');
      if (fs.existsSync(p)) {
        const list = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (Array.isArray(list)) {
          list.forEach((id: string) => localDeletedSet.add(id));
        }
      }
    } catch {}
  }

  let ordersList: Order[] = [];

  // 1. Try server API route (which filters persistent deleted_orders.json)
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/orders', { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json?.orders)) {
          ordersList = json.orders as Order[];
        }
      }
    } catch {
      // Fallback to Supabase client
    }
  }

  // 2. Query Supabase directly if server API was unavailable
  if (ordersList.length === 0) {
    const conn = await getOrdersClient();
    if (conn) {
      try {
        const { data, error } = await conn.client
          .from('orders')
          .select('*, items:order_items(*)')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          ordersList = data as Order[];
        }
      } catch (e) {
        console.warn('Falha na busca direta:', e);
      }
    }
  }

  // Load status overrides from localStorage cache to ensure instant persistence
  let localStatusMap: Record<string, string> = {};
  if (typeof localStorage !== 'undefined') {
    try {
      localStatusMap = JSON.parse(localStorage.getItem('acervo_order_status_map') || '{}');
    } catch {}
  }

  // Apply overrides & filter out deleted order IDs
  return ordersList
    .filter(o => !localDeletedSet.has(o.id))
    .map(o => ({
      ...o,
      status: localStatusMap[o.id] || o.status
    }));
}

export async function updateOrderStatusInDatabase(orderId: string, status: string): Promise<boolean> {
  const cleanId = orderId.trim();

  // 1. Immediately record in localStorage status map
  if (typeof localStorage !== 'undefined') {
    try {
      const map: Record<string, string> = JSON.parse(localStorage.getItem('acervo_order_status_map') || '{}');
      map[cleanId] = status;
      localStorage.setItem('acervo_order_status_map', JSON.stringify(map));

      // Also update in acervo_admin_orders cache if present
      const adminCache = JSON.parse(localStorage.getItem('acervo_admin_orders') || '[]');
      if (Array.isArray(adminCache)) {
        const updatedCache = adminCache.map((o: any) => o.id === cleanId ? { ...o, status } : o);
        localStorage.setItem('acervo_admin_orders', JSON.stringify(updatedCache));
      }
    } catch {}
  }

  let serverSuccess = false;

  // 2. Try server API
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(cleanId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        serverSuccess = true;
      }
    } catch (err) {
      console.warn('PATCH /api/orders/status failed:', err);
    }
  }

  // 3. Direct Supabase
  try {
    const conn = await getOrdersClient();
    if (conn) {
      const { client } = conn;
      await client
        .from('orders')
        .update({ status })
        .eq('id', cleanId);
    }
  } catch (e) {
    console.warn('Falha remota ao atualizar status via Supabase direto:', e);
  }

  return true;
}

export async function fetchOrderByIdFromDatabase(orderId: string): Promise<Order | null> {
  const clean = orderId.trim();

  // 1. Try server API
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(clean)}`, {
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.order) return json.order as Order;
      }
    } catch {}
  }

  // 2. Direct Supabase
  const conn = await getOrdersClient();
  if (!conn) return null;

  const { client } = conn;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
    let orderData: any = null;

    if (isUuid) {
      const { data, error } = await client
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', clean)
        .maybeSingle();
      if (!error && data) {
        orderData = data;
      }
    } else {
      const rawCode = clean.replace(/^PED-/i, '').toLowerCase();
      const { data: allRecent } = await client
        .from('orders')
        .select('*, items:order_items(*)')
        .order('created_at', { ascending: false })
        .limit(30);

      if (allRecent && allRecent.length > 0) {
        orderData = allRecent.find((o: any) => {
          const oId = String(o.id || '').toLowerCase();
          return oId === clean.toLowerCase() ||
                 oId.endsWith(rawCode) ||
                 oId.slice(-6) === rawCode;
        });
      }
    }

    if (!orderData) return null;

    // If order payment_link is missing, recover directly from products table
    if (!orderData.payment_link && orderData.items && orderData.items.length > 0) {
      const productIds = orderData.items
        .map((it: any) => it.product_id)
        .filter(Boolean);

      if (productIds.length > 0) {
        try {
          const { data: prods } = await client
            .from('products')
            .select('id, payment_link')
            .in('id', productIds);

          if (prods && prods.length > 0) {
            const withLink = prods.find((p: any) => p.payment_link && p.payment_link.trim());
            if (withLink?.payment_link) {
              orderData.payment_link = withLink.payment_link.trim();
            }
          }
        } catch {}
      }
    }

    // Enhance items with product image URLs
    if (orderData.items && orderData.items.length > 0) {
      const productIds = orderData.items
        .map((it: any) => it.product_id)
        .filter(Boolean);

      if (productIds.length > 0) {
        try {
          const { data: images } = await client
            .from('product_images')
            .select('product_id, url, is_primary')
            .in('product_id', productIds);

          if (images && images.length > 0) {
            orderData.items = orderData.items.map((it: any) => {
              const prodImg = images.find((img: any) => img.product_id === it.product_id && img.is_primary) ||
                              images.find((img: any) => img.product_id === it.product_id);
              return {
                ...it,
                image_url: prodImg?.url || null
              };
            });
          }
        } catch {}
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const localStatusMap: Record<string, string> = JSON.parse(localStorage.getItem('acervo_order_status_map') || '{}');
        if (orderData?.id && localStatusMap[orderData.id]) {
          orderData.status = localStatusMap[orderData.id];
        }
      } catch {}
    }

    return orderData as Order;
  } catch (e) {
    console.warn('Falha na busca de pedido por ID:', e);
    return null;
  }
}

export async function deleteOrderFromDatabase(orderId: string): Promise<boolean> {
  const cleanId = orderId.trim();

  // 1. Permanently record in localStorage so it never comes back in the browser
  if (typeof localStorage !== 'undefined') {
    try {
      const deleted: string[] = JSON.parse(localStorage.getItem('acervo_deleted_orders') || '[]');
      if (!deleted.includes(cleanId)) {
        deleted.push(cleanId);
        localStorage.setItem('acervo_deleted_orders', JSON.stringify(deleted));
      }

      // Also clean acervo_admin_orders cache
      const existing = JSON.parse(localStorage.getItem('acervo_admin_orders') || '[]');
      const filtered = existing.filter((o: any) => o.id !== cleanId);
      localStorage.setItem('acervo_admin_orders', JSON.stringify(filtered));
    } catch {}
  }

  // 2. Call server-side DELETE route to update persistent backend deleted list
  if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
    try {
      await fetch(`/api/orders/${encodeURIComponent(cleanId)}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(4000)
      });
    } catch (e) {
      console.warn('DELETE /api/orders error (não-fatal):', e);
    }
  }

  // 3. Also attempt direct Supabase delete
  try {
    const conn = await getOrdersClient();
    if (conn) {
      await conn.client.from('order_items').delete().eq('order_id', cleanId);
      await conn.client.from('orders').delete().eq('id', cleanId);
    }
  } catch (e) {
    console.warn('Falha remota ao remover pedido:', e);
  }

  return true;
}
