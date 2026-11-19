import routes from './routes.json' with { type: 'json' };

export const PUBLIC_HOST = 'folklore.tschopp.org';
export const ORIGIN = 'https://tedtschopp.github.io';
export const ORIGIN_PREFIX = '/folklore.tschopp.org';
const receiver = 'https://webmention.io/tedt.org/webmention';

export function legacyDestination(value) {
  const url = new URL(value);
  if (!['tedt.org', 'www.tedt.org'].includes(url.hostname)) return null;
  let path = url.pathname.replace(/\/index\.html$/, '/');
  let target = routes[path] || routes[path + '/'];
  if (!target) return null;
  const destination = new URL(target);
  destination.search = url.search;
  destination.hash = url.hash;
  return destination.href;
}

export function originURL(value) {
  const url = new URL(value);
  if (url.hostname !== PUBLIC_HOST) throw new Error('Unexpected publication hostname');
  return `${ORIGIN}${ORIGIN_PREFIX}${url.pathname}${url.search}`;
}

export function publicLocation(value, requestURL) {
  const location = new URL(value, ORIGIN);
  if (location.origin !== ORIGIN || !location.pathname.startsWith(ORIGIN_PREFIX + '/')) return null;
  const target = new URL(requestURL);
  target.pathname = location.pathname.slice(ORIGIN_PREFIX.length);
  target.search = location.search;
  target.hash = location.hash;
  return target.href;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const destination = legacyDestination(url);
    if (destination) return new Response(null, { status: 301, headers: {
      Location: destination,
      'Cache-Control': 'public, max-age=300',
      Link: `<${destination}>; rel="canonical", <${receiver}>; rel="webmention"`,
    } });
    // Unmapped legacy resources, including the embedded fiction fragment, retain their origin.
    if (url.hostname !== PUBLIC_HOST) return fetch(request);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {
      status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' },
    });
    const headers = new Headers();
    // This is a public static origin: never forward cookies, authentication, or request bodies.
    for (const name of ['Accept', 'Accept-Encoding', 'Accept-Language', 'If-None-Match', 'If-Modified-Since', 'Range']) {
      if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    }
    let response;
    try {
      response = await fetch(originURL(url), { method: request.method, headers, redirect: 'manual' });
    } catch {
      return new Response('The collection is temporarily unavailable. Please try again.', {
        status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
    const output = new Headers(response.headers);
    output.delete('Set-Cookie');
    output.set('X-Content-Type-Options', 'nosniff');
    output.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (response.status >= 300 && response.status < 400 && output.has('Location')) {
      const location = publicLocation(output.get('Location'), url);
      if (!location) return new Response('Unexpected origin redirect', { status: 502 });
      output.set('Location', location);
    }
    if (response.status === 200 && output.get('Content-Type')?.includes('text/html')) {
      output.set('Link', `<${receiver}>; rel="webmention"`);
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: output });
  },
};
