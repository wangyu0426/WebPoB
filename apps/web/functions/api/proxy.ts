const ALLOWED_HOSTS = new Set([
  'pobb.in',
  'www.pobb.in',
  'pastebin.com',
  'www.pastebin.com',
  'poe.ninja',
  'www.poe.ninja',
  'www.pathofexile.com',
  'pathofexile.com',
  'poe.game.qq.com',
]);

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequest = async (context: {
  request: Request;
  waitUntil?: (promise: Promise<unknown>) => void;
}): Promise<Response> => {
  const { request } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const reqUrl = new URL(request.url);
  const targetParam = reqUrl.searchParams.get('url');
  if (!targetParam) {
    return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetParam);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
    return new Response(JSON.stringify({ error: `Host not allowed: ${targetUrl.hostname}` }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Check Cloudflare Edge Cache first so popular share links return in <50ms without hitting upstream
  const edgeCache = (caches as unknown as { default?: Cache }).default;
  const cacheKey = new Request(reqUrl.toString(), { method: 'GET' });
  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) {
      const hitHeaders = new Headers(cached.headers);
      hitHeaders.set('X-WebPoB-Cache', 'HIT');
      return new Response(cached.body, { status: cached.status, headers: hitHeaders });
    }
  }

  const upstream = await fetch(targetUrl.toString(), {
    headers: {
      'User-Agent': 'WebPoB-Proxy/1.0 (+https://webpob.pages.dev)',
    },
    // Cloudflare-specific upstream caching hint (ignored outside Workers runtime)
    ...({ cf: { cacheTtl: 3600, cacheEverything: true } } as Record<string, unknown>),
  });

  const body = await upstream.text();
  const isCacheable = upstream.status === 200 && body.length > 0;
  const response = new Response(body, {
    status: upstream.status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
      'Cache-Control': isCacheable
        ? 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
        : 'no-store',
      'X-WebPoB-Cache': 'MISS',
    },
  });

  if (isCacheable && edgeCache) {
    const putPromise = edgeCache.put(cacheKey, response.clone()).catch(() => undefined);
    if (context.waitUntil) context.waitUntil(putPromise);
    else await putPromise;
  }

  return response;
};
