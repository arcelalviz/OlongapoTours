import index from '@/data/verified-photo-index.json';

// Only the curated, exact URLs bundled with this project can be fetched.
// Never accept arbitrary user-provided URLs as a photo proxy.
const allowedHosts = new Set([
  'commons.wikimedia.org',
  'upload.wikimedia.org',
  'deped-olongapo.com',
  'www.deped-olongapo.com',
]);

export const runtime = 'nodejs';

export async function GET(_request: Request, {params}: {params: Promise<{kind: string; slug: string}>}) {
  const {kind, slug} = await params;
  if ((kind !== 'place' && kind !== 'event') || !/^[a-z0-9-]{1,100}$/.test(slug)) {
    return new Response('Not found', {status: 404});
  }
  const image = (index as Record<string,{url:string;source:string;credit?:string}>)[`${kind}/${slug}`];
  if (!image) return new Response('No verified photo', {status: 404});

  try {
    let target = new URL(image.url);
    let response: Response | undefined;
    // Restrict every redirect to known Wikimedia/official-source hosts.
    for (let redirectCount=0; redirectCount<5; redirectCount++) {
      if (target.protocol !== 'https:' || !allowedHosts.has(target.hostname)) {
        return new Response('Untrusted image host', {status: 502});
      }
      response = await fetch(target, {
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
        headers: {'User-Agent': 'OlongapoTours/4.0 (tourism photo attribution; server image preview)'},
      });
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) return new Response('Photo redirect error', {status: 502});
        target = new URL(location, target);
        response = undefined;
        continue;
      }
      break;
    }
    if (!response || !response.ok) return new Response('Photo unavailable', {status: 502});
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
    if (!['image/jpeg','image/png','image/webp','image/avif'].includes(contentType)) {
      return new Response('Invalid photo response', {status: 502});
    }
    const contentLength = Number(response.headers.get('content-length')||'0');
    if (contentLength > 8_000_000) return new Response('Photo exceeds size limit', {status: 502});
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8_000_000 || bytes.byteLength < 32) return new Response('Invalid photo bytes', {status: 502});
    return new Response(bytes, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Photo temporarily unavailable', {status: 502});
  }
}
