import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { legacyDestination, originURL, publicLocation } from './worker.mjs';
const routes = JSON.parse(await readFile(new URL('./routes.json', import.meta.url)));
test('every inventoried URL redirects directly with query and fragment preserved', () => {
  for (const [path, target] of Object.entries(routes)) {
    for (const host of ['tedt.org', 'www.tedt.org']) {
      assert.equal(legacyDestination(`https://${host}${path}?utm_source=test#reader-note-1`), `${target}?utm_source=test#reader-note-1`);
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
test('unrelated and exceptional legacy resources do not redirect', () => {
  for (const path of ['/folklore/stories/house-of-the-blood-comet.html', '/folklore/The-Bailiff-of-Brunnegg.html', '/RPG/', '/profile/', '/folklore/stories/unknown/']) assert.equal(legacyDestination('https://tedt.org' + path), null);
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
