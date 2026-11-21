import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { canonicalDestination, legacyDestination, originURL, publicLocation } from './worker.mjs';
const routes = JSON.parse(await readFile(new URL('./routes.json', import.meta.url)));
const aliases = JSON.parse(await readFile(new URL('./canonical-redirects.json', import.meta.url)));
test('all former publication URLs redirect directly to their own canonical story', async () => {
  assert.ok(Object.keys(aliases).length > 0);
  for (const [path, target] of Object.entries(aliases)) {
    assert.ok(!Object.hasOwn(aliases, target), 'No redirect chains');
    const canonical = 'https://folklore.tschopp.org' + target;
    assert.equal(canonicalDestination(`https://folklore.tschopp.org${path}?from=old#reader-note-1`), canonical + '?from=old#reader-note-1');
    assert.equal(canonicalDestination(`https://folklore.tschopp.org${path}index.html`), canonical);
    assert.equal(canonicalDestination(`https://folklore.tschopp.org${path.slice(0,-1)}`), canonical);
    for (const method of ['GET','HEAD']) {
      const response = await worker.fetch(new Request(`https://folklore.tschopp.org${path}?from=old`, {method}));
      assert.equal(response.status,301);assert.equal(response.headers.get('Location'),canonical+'?from=old');
      assert.match(response.headers.get('Link'),/rel="webmention"/);
    }
  }
  assert.equal(canonicalDestination('https://example.com'+Object.keys(aliases)[0]),null);
  assert.equal(canonicalDestination('https://folklore.tschopp.org/stories/unknown/'),null);
});
test('alias redirects preserve method restrictions and legacy routes have no extra hop', async () => {
  const path=Object.keys(aliases)[0];
  assert.equal((await worker.fetch(new Request('https://folklore.tschopp.org'+path,{method:'POST',body:'private'}))).status,405);
  for(const target of Object.values(routes))assert.ok(!Object.hasOwn(aliases,new URL(target).pathname));
});
test('every inventoried URL redirects directly with query and fragment preserved', () => {
  for (const [path, target] of Object.entries(routes)) {
    for (const host of ['tedt.org', 'www.tedt.org']) {
      assert.equal(legacyDestination(`https://${host}${path}?utm_source=test#reader-note-1`), `${target}?utm_source=test#reader-note-1`);
      if (!path.endsWith('/') && !/\.[a-z]+$/i.test(path)) assert.equal(legacyDestination(`https://${host}${path}/index.html`), target);
      if (path.endsWith('/')) {
        assert.equal(legacyDestination(`https://${host}${path}index.html`), target);
        assert.equal(legacyDestination(`https://${host}${path.slice(0, -1)}`), target);
      }
    }
  }
});
test('comparison pairs remain separate and aliases converge', () => {
  for (const [first, second] of [['the-devil-and-the-poacher-lutolf', 'the-devil-and-the-poacher-muller'],['the-giants-of-iseltwald-hartmann','the-giants-of-iseltwald-kohlrusch'],['the-heavy-child-jecklin','the-heavy-child-kohlrusch'],['the-noblewoman-of-milan-bern','the-noblewoman-of-milan-tscheinen-ruppen']]) {
    const one = routes[`/folklore/stories/${first}/`], two = routes[`/folklore/stories/${second}/`];
    assert.ok(one && two); assert.notEqual(one, two);
  }
});
test('unrelated legacy resources do not redirect', () => {
  for (const path of ['/stories/house-of-the-blood-comet.html', '/RPG/', '/profile/', '/folklore/stories/unknown/', '/category/folklore-news/', '/The-Chriemhild-Trench-another-story/']) assert.equal(legacyDestination('https://tedt.org' + path), null);
  assert.equal(legacyDestination('https://example.com/folklore/'), null);
});
test('publication origin and origin redirect remain scoped', () => {
  assert.equal(originURL('https://folklore.tschopp.org/stories/a/?q=x'), 'https://tedtschopp.github.io/folklore.tschopp.org/stories/a/?q=x');
  assert.throws(() => originURL('https://example.com/'));
  assert.equal(publicLocation('https://tedtschopp.github.io/folklore.tschopp.org/search/', 'https://folklore.tschopp.org/search'), 'https://folklore.tschopp.org/search/');
  assert.equal(publicLocation('https://example.com/path', 'https://folklore.tschopp.org/'), null);
});
test('legacy HTTP response is permanent and advertises the existing receiver', async () => {
  const response = await worker.fetch(new Request('https://tedt.org/folklore/?q=notes'));
  assert.equal(response.status, 301); assert.equal(response.headers.get('Location'), 'https://folklore.tschopp.org/?q=notes');
  assert.match(response.headers.get('Link'), /rel="webmention"/);
  assert.match(response.headers.get('Link'), /<https:\/\/folklore\.tschopp\.org\/>; rel="canonical"/);
  assert.ok(!response.headers.get('Link').includes('?q='));
});
test('public proxy strips credentials and retains static headers', async () => {
  const original = globalThis.fetch;
  let called;
  globalThis.fetch = async (url, options) => { called = { url, options }; return new Response('<html>OK</html>', { headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'origin=bad' } }); };
  try {
    const response = await worker.fetch(new Request('https://folklore.tschopp.org/stories/a/', { headers: { Cookie: 'secret=x', Authorization: 'Bearer private', Range: 'bytes=0-100' } }));
    assert.equal(called.options.headers.get('Cookie'), null); assert.equal(called.options.headers.get('Authorization'), null);
    assert.equal(called.options.headers.get('Range'), 'bytes=0-100'); assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff'); assert.match(response.headers.get('Link'), /webmention/);
  } finally { globalThis.fetch = original; }
});
test('publication refuses non-reading methods', async () => {
  assert.equal((await worker.fetch(new Request('https://folklore.tschopp.org/', { method: 'POST', body: 'private' }))).status, 405);
});

test('migrated original fiction retains its own TedT destination', async () => {
  const old = 'https://tedt.org/folklore/stories/house-of-the-blood-comet.html';
  const target = 'https://tedt.org/stories/house-of-the-blood-comet.html';
  assert.equal(legacyDestination(old), target);
  assert.equal((await worker.fetch(new Request(old))).headers.get('Location'), target);
});
test('Unicode and percent-encoded former article URLs share one destination', () => {
  const target = 'https://folklore.tschopp.org/stories/the-wattermanndli-in-the-portlialp/';
  for (const name of ['Pörtlialp','P%C3%B6rtlialp','P%c3%b6rtlialp']) {
    assert.equal(legacyDestination('http://www.tedt.org/Swiss-Folklore/The-Weatherman-in-' + name + '.html'), target);
  }
});
test('configured Cloudflare route scopes cover every migrated URL', async () => {
  const config = JSON.parse(await readFile(new URL('./wrangler.json', import.meta.url)));
  for (const path of Object.keys(routes)) {
    for (const host of ['tedt.org', 'www.tedt.org']) {
      const variants = path.endsWith('/') ? [path, path.slice(0, -1), path + 'index.html'] : [path];
      if (!path.endsWith('/') && !/\.[a-z]+$/i.test(path)) variants.push(path + '/', path + '/index.html');
      for (const variant of variants) {
        for (const query of ['', '?from=old&reader=1']) {
          const url = host + variant + query;
          assert.ok(config.routes.some(route => route.pattern && new RegExp('^' + route.pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$').test(url)), url);
        }
      }
    }
  }
});
