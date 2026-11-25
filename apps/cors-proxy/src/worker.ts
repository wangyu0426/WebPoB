/**
 * Optional lightweight Cloudflare Worker CORS Proxy for WebPoB.
 * Strictly allowlists Path of Building share hosts (pobb.in, pastebin.com, pathofexile.com).
 *
 * Deploy with: `wrangler deploy`
 */

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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request): Promise<Response> {
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

    const upstream = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'WebPoB-CORS-Proxy/0.1 (+https://github.com/zhnpeng/WebPoB)',
      },
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
      },
    });
  },
};
