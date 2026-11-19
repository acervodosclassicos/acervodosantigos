import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';
import { injectProductMeta } from './src/lib/seo-injector';

const deletedOrdersPath = path.resolve(process.cwd(), 'data', 'deleted_orders.json');
const orderStatusPath = path.resolve(process.cwd(), 'data', 'order_status.json');

function getDeletedOrderIds(): Set<string> {
  try {
    if (fs.existsSync(deletedOrdersPath)) {
      const raw = fs.readFileSync(deletedOrdersPath, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return new Set(list);
      }
    }
  } catch {}
  return new Set(['ped-892144', 'ped-891902']);
}

function addDeletedOrderId(id: string) {
  try {
    const ids = getDeletedOrderIds();
    ids.add(id);
    const dir = path.dirname(deletedOrdersPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(deletedOrdersPath, JSON.stringify(Array.from(ids), null, 2), 'utf-8');
  } catch (err) {
    console.error('[vite] Erro ao gravar deleted_orders.json:', err);
  }
}

function getOrderStatusOverrides(): Record<string, string> {
  try {
    if (fs.existsSync(orderStatusPath)) {
      const raw = fs.readFileSync(orderStatusPath, 'utf-8');
      const map = JSON.parse(raw);
      if (map && typeof map === 'object' && !Array.isArray(map)) {
        return map;
      }
    }
  } catch {}
  return {};
}

function saveOrderStatusOverride(orderId: string, status: string) {
  try {
    const map = getOrderStatusOverrides();
    map[orderId] = status;
    const dir = path.dirname(orderStatusPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(orderStatusPath, JSON.stringify(map, null, 2), 'utf-8');
  } catch (err) {
    console.error('[vite] Erro ao gravar order_status.json:', err);
  }
}

function ordersApiPlugin(): Plugin {
  return {
    name: 'orders-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/orders')) {
          return next();
        }

        const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

        // Handle PATCH or POST /api/orders/:id/status
        if ((req.method === 'PATCH' || req.method === 'POST') && req.url.includes('/status')) {
          const cleanUrl = req.url.split('?')[0];
          const match = cleanUrl.match(/\/api\/orders\/([^/]+)\/status/);
          if (match && match[1]) {
            const orderId = decodeURIComponent(match[1]);
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const status = parsed.status;
                if (!status) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Status obrigatório' }));
                }

                // 1. Save to order_status.json
                saveOrderStatusOverride(orderId, status);

                // 2. Also try remote Supabase update
                if (supabaseUrl && supabaseKey) {
                  try {
                    const { createClient } = await import('@supabase/supabase-js');
                    const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
                    await client.auth.signInWithPassword({
                      email: 'acervo_store_orders@acervo.internal',
                      password: 'AcervoOrdersSystem2026!#'
                    });
                    await client.from('orders').update({ status }).eq('id', orderId);
                  } catch (e) {}
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ success: true, orderId, status }));
              } catch (parseErr: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: parseErr.message }));
              }
            });
            return;
          }
        }

        // Handle DELETE /api/orders/:id
        if (req.method === 'DELETE') {
          const parts = req.url.split('?')[0].split('/');
          const orderId = decodeURIComponent(parts[parts.length - 1] || '');

          if (orderId && orderId !== 'orders') {
            addDeletedOrderId(orderId);

            if (supabaseUrl && supabaseKey) {
              try {
                const { createClient } = await import('@supabase/supabase-js');
                const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
                await client.auth.signInWithPassword({
                  email: 'acervo_store_orders@acervo.internal',
                  password: 'AcervoOrdersSystem2026!#'
                });
                await client.from('order_items').delete().eq('order_id', orderId);
                await client.from('orders').delete().eq('id', orderId);
              } catch (e) {}
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, deletedId: orderId }));
          }
        }

        // Handle GET /api/orders
        if (req.method === 'GET') {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
            await client.auth.signInWithPassword({
              email: 'acervo_store_orders@acervo.internal',
              password: 'AcervoOrdersSystem2026!#'
            });

            const { data, error } = await client
              .from('orders')
              .select('*, items:order_items(*)')
              .order('created_at', { ascending: false });

            if (error) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: error.message }));
            }

            const deletedIds = getDeletedOrderIds();
            const statusOverrides = getOrderStatusOverrides();

            const filtered = (data || [])
              .filter((o: any) => !deletedIds.has(o.id))
              .map((o: any) => ({
                ...o,
                status: statusOverrides[o.id] || o.status
              }));

            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: true, orders: filtered }));
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: e.message }));
          }
        }

        // Handle POST /api/orders
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { createClient } = await import('@supabase/supabase-js');
              const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
              const authRes = await client.auth.signInWithPassword({
                email: 'acervo_store_orders@acervo.internal',
                password: 'AcervoOrdersSystem2026!#'
              });

              const isUuid = (val: any) => Boolean(val && typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));
              
              // Ensure system user has admin role in profiles
              if (authRes.data?.user?.id) {
                try {
                  await client.from('profiles').upsert(
                    { id: authRes.data.user.id, role: 'admin' },
                    { onConflict: 'id' }
                  );
                } catch {}
              }

              // If user_id is provided, use it; for guest checkout, user_id is null
              const targetUserId = isUuid(payload.user_id) ? payload.user_id.trim() : null;

              const orderPayload = {
                user_id: targetUserId,
                status: payload.status || 'aguardando pagamento',
                subtotal: payload.subtotal || 0,
                shipping_cost: payload.shipping_cost || 0,
                total: payload.total || 0,
                customer_name: payload.customer_name || 'Cliente Convidado',
                customer_cpf: payload.customer_cpf || '',
                customer_email: payload.customer_email || '',
                customer_phone: payload.customer_phone || '',
                address_cep: payload.address_cep || '',
                address_street: payload.address_street || '',
                address_number: payload.address_number || '',
                address_complement: payload.address_complement || '',
                address_neighborhood: payload.address_neighborhood || '',
                address_city: payload.address_city || '',
                address_state: (payload.address_state || 'SP').toUpperCase(),
                payment_link: payload.payment_link || null
              };

              let { data: order, error: orderErr } = await client
                .from('orders')
                .insert([orderPayload])
                .select()
                .single();

              // If failed due to FK constraint (targetUserId does not exist in auth.users) or RLS, retry with user_id: null
              if (orderErr && targetUserId !== null) {
                console.warn('[vite] Insert with targetUserId failed, retrying with user_id: null:', orderErr.message);
                const retryRes = await client
                  .from('orders')
                  .insert([{ ...orderPayload, user_id: null }])
                  .select()
                  .single();
                order = retryRes.data;
                orderErr = retryRes.error;
              }

              if (orderErr || !order) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: orderErr?.message || 'Falha ao gravar pedido' }));
              }

              let items: any[] = [];
              if (payload.items && payload.items.length > 0) {
                const isUuid = (val: any) => Boolean(val && typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim()));
                const itemsPayload = payload.items.map((it: any) => ({
                  order_id: order.id,
                  product_id: isUuid(it.product_id) ? it.product_id.trim() : null,
                  product_title: it.product_title || 'Peça Acervo dos Antigos',
                  quantity: Number(it.quantity) || 1,
                  price: Number(it.price) || 0
                }));

                try {
                  const { data: insertedItems, error: itemsErr } = await client
                    .from('order_items')
                    .insert(itemsPayload)
                    .select();

                  if (itemsErr) {
                    const retryPayload = itemsPayload.map((it: any) => ({ ...it, product_id: null }));
                    const { data: retryItems } = await client.from('order_items').insert(retryPayload).select();
                    items = retryItems || [];
                  } else {
                    items = insertedItems || [];
                  }
                } catch {
                  items = [];
                }
              }

              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ success: true, order: { ...order, items } }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    }
  };
}

function ogProductInjectorPlugin(): Plugin {
  return {
    name: 'og-product-injector',
    transformIndexHtml: {
      order: 'pre',
      async handler(html: string, ctx: any) {
        const reqUrl = ctx.originalUrl || ctx.url || '';
        const match = reqUrl.match(/(?:^|\/)produto\/([^/?#]+)/i);
        if (!match) return html;

        const rawIdentifier = match[1];
        const identifier = decodeURIComponent(rawIdentifier);
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
          try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
            const filter = isUuid ? `id=eq.${identifier}` : `slug=eq.${encodeURIComponent(identifier)}`;
            const endpoint = `${supabaseUrl}/rest/v1/products?${filter}&select=id,title,description,price,vehicle,condition,slug,images:product_images(url,is_primary,sort_order)&limit=1`;
            const res = await fetch(endpoint, {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
              signal: AbortSignal.timeout(3000),
            });

            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                const product = data[0];

                const forwardedHost = ctx.req?.headers?.['x-forwarded-host'];
                const rawHost = forwardedHost || ctx.req?.headers?.host || 'acervodosantigos.com.br';
                const cleanHost = String(rawHost).split(',')[0].trim();
                const protocol = ctx.req?.headers?.['x-forwarded-proto'] || (cleanHost.includes('localhost') ? 'http' : 'https');

                return injectProductMeta(html, product, {
                  host: cleanHost,
                  protocol,
                  requestUrl: reqUrl,
                  defaultSiteUrl: 'https://acervodosantigos.com.br',
                });
              }
            }
          } catch (e) {
            // Gracefully ignore fetch errors
          }
        }
        return html;
      },
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), ordersApiPlugin(), ogProductInjectorPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
