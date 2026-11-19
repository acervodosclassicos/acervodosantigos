import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { injectProductMeta } from '../src/lib/seo-injector';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req: any, res: any) {
  const slugQuery = req.query?.slug;
  const identifier = Array.isArray(slugQuery) ? slugQuery[0] : (slugQuery || '');

  // Resolve template HTML
  let template = '';
  const distPath = path.resolve(process.cwd(), 'dist', 'index.html');
  const rootPath = path.resolve(process.cwd(), 'index.html');

  if (fs.existsSync(distPath)) {
    template = fs.readFileSync(distPath, 'utf-8');
  } else if (fs.existsSync(rootPath)) {
    template = fs.readFileSync(rootPath, 'utf-8');
  }

  if (!identifier || !supabaseUrl || !supabaseKey) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(template);
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    const filter = isUuid ? `id=eq.${identifier}` : `slug=eq.${encodeURIComponent(identifier)}`;
    const endpoint = `${supabaseUrl}/rest/v1/products?${filter}&select=id,title,description,price,vehicle,condition,slug,images:product_images(url,is_primary,sort_order)&limit=1`;

    const fetchRes = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (fetchRes.ok) {
      const data = await fetchRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const product = data[0];
        const forwardedHost = req.headers['x-forwarded-host'];
        const rawHost = forwardedHost || req.headers.host || 'acervodosantigos.com.br';
        const cleanHost = String(rawHost).split(',')[0].trim();
        const proto = (req.headers['x-forwarded-proto'] || (cleanHost.includes('localhost') ? 'http' : 'https')) as string;

        const enrichedHtml = injectProductMeta(template, product, {
          host: cleanHost,
          protocol: proto,
          requestUrl: `/produto/${encodeURIComponent(product.slug || identifier)}`,
          defaultSiteUrl: 'https://acervodosantigos.com.br',
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
        return res.status(200).send(enrichedHtml);
      }
    }
  } catch (err) {
    console.error('[vercel-api] Error in Open Graph handler:', err);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(template);
}
