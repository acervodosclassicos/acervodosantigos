import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { injectProductMeta } from './src/lib/seo-injector';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

/**
 * Fetches product from Supabase by slug or ID
 */
async function fetchProduct(identifier: string) {
  if (!supabaseUrl || !supabaseKey || !identifier) return null;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const filter = isUuid ? `id=eq.${identifier}` : `slug=eq.${encodeURIComponent(identifier)}`;
    const endpoint = `${supabaseUrl}/rest/v1/products?${filter}&select=id,title,description,price,vehicle,condition,slug,images:product_images(url,is_primary,sort_order)&limit=1`;
    
    const res = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    }
  } catch (err) {
    console.error(`[server] Error fetching product "${identifier}":`, err);
  }
  return null;
}

async function createServer() {
  const app = express();

  let vite: any;
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist'), { index: false }));
  }

  app.use(express.json());

  const deletedOrdersPath = path.resolve(__dirname, 'data', 'deleted_orders.json');
  const orderStatusPath = path.resolve(__dirname, 'data', 'order_status.json');

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
      console.error('[server] Erro ao gravar deleted_orders.json:', err);
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
      console.error('[server] Erro ao gravar order_status.json:', err);
    }
  }

  // API Route: GET /api/orders
  app.get('/api/orders', async (req: Request, res: Response) => {
    try {
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase não configurado no servidor' });
      }
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
        return res.status(500).json({ error: error.message });
      }

      const deletedIds = getDeletedOrderIds();
      const statusOverrides = getOrderStatusOverrides();

      const filtered = (data || [])
        .filter((o: any) => !deletedIds.has(o.id))
        .map((o: any) => ({
          ...o,
          status: statusOverrides[o.id] || o.status
        }));

      return res.json({ success: true, orders: filtered });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route: PATCH or POST /api/orders/:id/status
  const handleStatusUpdate = async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id;
      const { status } = req.body;
      if (!orderId || !status) {
        return res.status(400).json({ error: 'ID e status são obrigatórios' });
      }

      // 1. Save to persistent file store
      saveOrderStatusOverride(orderId, status);

      // 2. Also try Supabase update
      if (supabaseUrl && supabaseKey) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const client = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
          await client.auth.signInWithPassword({
            email: 'acervo_store_orders@acervo.internal',
            password: 'AcervoOrdersSystem2026!#'
          });
          await client.from('orders').update({ status }).eq('id', orderId);
        } catch (dbErr) {
          console.warn('[server] Tentativa de atualizar status remota (não-fatal):', dbErr);
        }
      }

      return res.json({ success: true, orderId, status });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  };

  app.patch('/api/orders/:id/status', handleStatusUpdate);
  app.post('/api/orders/:id/status', handleStatusUpdate);

  // API Route: DELETE /api/orders/:id
  app.delete('/api/orders/:id', async (req: Request, res: Response) => {
    try {
      const orderId = req.params.id;
      if (!orderId) {
        return res.status(400).json({ error: 'ID do pedido obrigatório' });
      }

      // 1. Permanently track in deleted orders store so it never comes back
      addDeletedOrderId(orderId);

      // 2. Also try direct Supabase delete
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
        } catch (dbErr) {
          console.warn('[server] Tentativa de exclusão remota (não-fatal):', dbErr);
        }
      }

      return res.json({ success: true, deletedId: orderId });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route: POST /api/orders
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase não configurado no servidor' });
      }
      const payload = req.body;
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

      // If failed due to FK constraint (e.g. targetUserId does not exist in auth.users) or RLS, retry with user_id: null
      if (orderErr && targetUserId !== null) {
        console.warn('[server] Insert with targetUserId failed, retrying with user_id: null:', orderErr.message);
        const retryRes = await client
          .from('orders')
          .insert([{ ...orderPayload, user_id: null }])
          .select()
          .single();
        order = retryRes.data;
        orderErr = retryRes.error;
      }

      if (orderErr || !order) {
        return res.status(400).json({ error: orderErr?.message || 'Falha ao gravar pedido' });
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

      return res.json({ success: true, order: { ...order, items } });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Handle /produto/:identifier dynamically for WhatsApp, Facebook, crawlers and users
  app.get(['/produto/:identifier', '/produto/:identifier/*'], async (req: Request, res: Response) => {
    const rawIdentifier = req.params.identifier;
    const identifier = decodeURIComponent(rawIdentifier);

    // Protocol and Host resolution
    const forwardedHost = req.headers['x-forwarded-host'];
    const hostHeader = (forwardedHost || req.headers.host || 'acervodosantigos.com.br') as string;
    const cleanHost = hostHeader.split(',')[0].trim();
    const proto = (req.headers['x-forwarded-proto'] || (cleanHost.includes('localhost') ? 'http' : 'https')) as string;

    // Check if pre-rendered static file exists in dist
    if (isProd) {
      const staticPrerenderPath = path.resolve(__dirname, 'dist', 'produto', identifier, 'index.html');
      if (fs.existsSync(staticPrerenderPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.sendFile(staticPrerenderPath);
      }
    }

    try {
      const product = await fetchProduct(identifier);

      let template = '';
      if (!isProd) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'dist', 'index.html'), 'utf-8');
      }

      if (product) {
        const enrichedHtml = injectProductMeta(template, product, {
          host: cleanHost,
          protocol: proto,
          requestUrl: `/produto/${encodeURIComponent(product.slug || identifier)}`,
          defaultSiteUrl: 'https://acervodosantigos.com.br',
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(enrichedHtml);
      }

      // If product not found, return template with default metadata
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(template);
    } catch (e) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(e);
      }
      console.error('[server] Error rendering product route:', e);
      return res.status(500).send('Internal Server Error');
    }
  });

  // Catch-all SPA route
  app.get('*', async (req: Request, res: Response) => {
    try {
      let template = '';
      if (!isProd) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'dist', 'index.html'), 'utf-8');
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(template);
    } catch (e) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(e);
      }
      console.error('[server] Error handling route:', e);
      res.status(500).send('Internal Server Error');
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Server listening on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

createServer().catch((err) => {
  console.error('[server] Failed to start server:', err);
});
