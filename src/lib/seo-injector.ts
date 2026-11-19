/**
 * SEO & Open Graph Injector for ACERVO DOS ANTIGOS
 * Injects dynamic product meta tags, OpenGraph cards, Twitter cards, and Schema.org JSON-LD
 * into HTML templates before sending responses to crawlers (WhatsApp, Facebook, Twitter, Telegram, etc.)
 */

export interface ProductMetaImage {
  url: string;
  is_primary?: boolean;
  sort_order?: number;
  created_at?: string;
}

export interface ProductMetaData {
  id: string;
  title: string;
  description?: string | null;
  price?: number | null;
  vehicle?: string | null;
  condition?: string | null;
  slug: string;
  images?: ProductMetaImage[];
}

export interface InjectOptions {
  requestUrl?: string;
  host?: string;
  protocol?: string;
  defaultSiteUrl?: string;
}

/**
 * Escapes characters for HTML attributes to prevent breaking meta tags
 */
export function escapeHtmlAttr(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

/**
 * Formats currency in Brazilian Real (BRL)
 */
export function formatBRL(amount: number | null | undefined): string {
  const num = Number(amount || 0);
  return num
    .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    .replace(/\u00a0/g, ' ');
}

/**
 * Injects dynamic product OpenGraph, Twitter, and SEO tags into an HTML string
 */
export function injectProductMeta(
  html: string,
  product: ProductMetaData,
  options: InjectOptions = {}
): string {
  if (!product || !html) return html;

  // 1. Sort images to guarantee the true primary / first image is picked
  const sortedImages = (product.images || []).slice().sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    const orderA = typeof a.sort_order === 'number' ? a.sort_order : 999;
    const orderB = typeof b.sort_order === 'number' ? b.sort_order : 999;
    if (orderA !== orderB) return orderA - orderB;
    return 0;
  });

  const fallbackImage = 'https://images.unsplash.com/photo-1580274455006-2594aee9fc4f?auto=format&fit=crop&q=80&w=1200';
  let firstImageUrl = sortedImages[0]?.url || fallbackImage;

  // 2. Resolve image MIME type
  let imageType = 'image/jpeg';
  const lowerUrl = firstImageUrl.toLowerCase();
  if (lowerUrl.includes('.png')) imageType = 'image/png';
  else if (lowerUrl.includes('.webp')) imageType = 'image/webp';
  else if (lowerUrl.includes('.gif')) imageType = 'image/gif';

  // 3. Resolve canonical URL
  const defaultSite = options.defaultSiteUrl || 'https://acervodosantigos.com.br';
  let canonicalUrl = '';
  if (options.host) {
    const proto = options.protocol || (options.host.includes('localhost') ? 'http' : 'https');
    const path = options.requestUrl || `/produto/${encodeURIComponent(product.slug)}`;
    canonicalUrl = `${proto}://${options.host}${path}`;
  } else {
    canonicalUrl = `${defaultSite}/produto/${encodeURIComponent(product.slug)}`;
  }

  // 4. Formats price and titles
  const numPrice = Number(product.price || 0);
  const priceFormatted = formatBRL(numPrice);

  const cleanTitle = (product.title || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Social Title format: [Nome da Peça] - [Valor Formatado] | ACERVO DOS ANTIGOS
  const titleWithPrice = `${cleanTitle} - ${priceFormatted} | ACERVO DOS ANTIGOS`;
  const escapedTitleWithPrice = escapeHtmlAttr(titleWithPrice);
  const escapedCleanTitle = escapeHtmlAttr(cleanTitle);

  // 5. Clean and prepare description
  const rawDesc = (product.description || '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[*#_~`]/g, '')
    .trim();

  const detailsHeader = [
    `💰 Valor: ${priceFormatted}`,
    product.vehicle ? `Veículo: ${product.vehicle}` : null,
    product.condition ? `Condição: ${product.condition}` : null,
  ].filter(Boolean).join(' • ');

  const fullDesc = rawDesc
    ? `${detailsHeader} — ${rawDesc.slice(0, 160)}${rawDesc.length > 160 ? '...' : ''}`
    : `${detailsHeader} — Peça original e clássica disponível no Acervo dos Antigos com envio seguro para todo o Brasil.`;

  const escapedDescription = escapeHtmlAttr(fullDesc);

  // 6. Schema.org JSON-LD
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: cleanTitle,
    image: [firstImageUrl],
    description: fullDesc,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: numPrice,
      availability: 'https://schema.org/InStock',
      itemCondition:
        product.condition?.toLowerCase() === 'nova'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
    },
  });

  // 7. Inject tags into HTML
  let result = html;

  // Title tag
  result = result.replace(/<title>.*?<\/title>/i, `<title>${escapedTitleWithPrice}</title>`);

  // Meta Description
  result = result.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapedDescription}" />`);

  // Open Graph Title
  result = result.replace(/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapedTitleWithPrice}" />`);

  // Open Graph Description
  result = result.replace(/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapedDescription}" />`);

  // Open Graph Type & Price
  result = result.replace(
    /<meta\s+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="product" />\n    <meta property="product:price:amount" content="${numPrice}" />\n    <meta property="product:price:currency" content="BRL" />\n    <meta property="og:price:amount" content="${numPrice}" />\n    <meta property="og:price:currency" content="BRL" />`
  );

  // Open Graph URL & Canonical
  result = result.replace(
    /<meta\s+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${canonicalUrl}" />\n    <link rel="canonical" href="${canonicalUrl}" />`
  );

  // Open Graph Image Tags
  result = result.replace(/<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${firstImageUrl}" />`);
  result = result.replace(/<meta\s+property=["']og:image:secure_url["'][^>]*>/i, `<meta property="og:image:secure_url" content="${firstImageUrl}" />`);
  result = result.replace(/<meta\s+property=["']og:image:type["'][^>]*>/i, `<meta property="og:image:type" content="${imageType}" />`);
  result = result.replace(/<meta\s+property=["']og:image:width["'][^>]*>/i, `<meta property="og:image:width" content="1200" />`);
  result = result.replace(/<meta\s+property=["']og:image:height["'][^>]*>/i, `<meta property="og:image:height" content="630" />`);
  result = result.replace(/<meta\s+property=["']og:image:alt["'][^>]*>/i, `<meta property="og:image:alt" content="${escapedCleanTitle}" />`);

  // Twitter Card Tags
  result = result.replace(/<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${escapedTitleWithPrice}" />`);
  result = result.replace(/<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${escapedDescription}" />`);
  result = result.replace(/<meta\s+name=["']twitter:image["'][^>]*>/i, `<meta name="twitter:image" content="${firstImageUrl}" />\n    <meta name="twitter:image:alt" content="${escapedCleanTitle}" />`);

  // Remove any previously injected JSON-LD to avoid duplicates
  result = result.replace(/<script\s+type=["']application\/ld\+json["']>[\s\S]*?<\/script>/gi, '');

  // Inject fresh JSON-LD into head
  result = result.replace('</head>', `    <script type="application/ld+json">${jsonLd}</script>\n  </head>`);

  return result;
}
