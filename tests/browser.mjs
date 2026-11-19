import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = resolve(fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(join(directory, 'package.json'));
const { chromium, expect } = require('@playwright/test');
const { default: AxeBuilder } = await import('@axe-core/playwright');
const built = resolve(directory, '_site');
const catalog = JSON.parse(await readFile(join(directory, '_data/folklore/archive.json'), 'utf8'));
const guides = JSON.parse(await readFile(join(directory, '_data/folklore/reader_guides.json'), 'utf8'));
const migration = JSON.parse(await readFile(join(directory, '_data/folklore/migration.json'), 'utf8'));
const screenshots = resolve(directory, 'test-results');
await mkdir(screenshots, { recursive: true });
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.wasm': 'application/wasm', '.woff2': 'font/woff2' };
const server = process.argv[2] ? null : createServer(async (request, response) => {
  try {
    let file = resolve(built, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (file !== built && !file.startsWith(built + sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});

if (server) await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const base = process.argv[2] || 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch();
const primary = catalog.stories.find(story => story.title === 'The Springs of the Schafmatt');
const storyUrl = primary.url;
const legacyUrl = '/stories/' + primary.id + '/';
async function serveCanonical(route) {
  const path = new URL(route.request().url()).pathname;
  await route.fulfill({ path: join(built, path, 'index.html'), contentType: 'text/html; charset=utf-8' });
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light' });
  const tab = await context.newPage();
  await context.route(/https:\/\/(?:[^/]*google-analytics\.com|www\.googletagmanager\.com|[^/]*clarity\.ms|static\.cloudflareinsights\.com)\//, route => route.abort());
  if (server && process.env.SHARED_HEADER_BUILD) {
    await context.route('https://tedt.org/assets/global-header/**', route => route.fulfill({
      status: 200, path: join(process.env.SHARED_HEADER_BUILD, new URL(route.request().url()).pathname),
      headers: { 'access-control-allow-origin': '*' },
    }));
  }
  const browserErrors = [];
  if (process.env.DEBUG_FOLKLORE) {
    tab.on('pageerror', error => console.log('browser error', error.message));
    tab.on('console', message => console.log('browser', message.type(), message.text().slice(0, 400)));
    tab.on('requestfailed', request => console.log('request failed', request.url(), request.failure()));
  }
  tab.on('pageerror', error => browserErrors.push(error.message));
  tab.on('console', message => {
    if (/WebAssembly|Pagefind|Wasm code/.test(message.text()) && message.type() === 'error') {
      browserErrors.push(message.text());
    }
  });
  await tab.goto(base + '/search/', { waitUntil: 'domcontentloaded' });
  const input = tab.getByRole('searchbox', { name: 'Search this site' });
  const summary = tab.locator('pagefind-summary');
  if (process.env.DEBUG_FOLKLORE) console.log(await tab.locator('#folklore-main').ariaSnapshot());
  await expect(input).toBeVisible();
  const checkContrast = async page => {
    const result = await new AxeBuilder({ page }).include('#folklore-main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(result.violations.map(({ id, nodes }) => [id, nodes.map(n => [n.target, n.failureSummary])]), []);
  };
  for (const query of ['Wallfahrer', 'break forth again', 'Black Madonna']) {
    await input.fill(query);
    await expect(summary).toContainText(query, { timeout: 10000 });
    await expect(summary).not.toContainText(/searching|error/i);
    const result = tab.locator('pagefind-results').getByRole('link', { name: /Springs of the Schafmatt/ });
    await expect(result).toBeVisible({ timeout: 10000 });
    assert.equal(await result.evaluate(link => new URL(link.href).pathname), storyUrl);
    console.log('Search matched the story for ' + query);
  }
  const longSearch = await tab.screenshot({ path: join(screenshots, 'search-mobile.png') });
  assert.ok(longSearch.length);
  await checkContrast(tab);
  for (const query of ['Wydenweiblein', 'Wütisheer']) {
    await input.fill(query);
    await expect(summary).toContainText(query, { timeout: 10000 });
    const matched = await tab.locator('pagefind-results').getByRole('link').evaluateAll(nodes => nodes.map(node => new URL(node.href).pathname));
    assert.ok(matched.every(url => !catalog.source_notes.some(note => note.url === url)));
  }
  assert.deepEqual(browserErrors, []);
  await checkContrast(tab);
  const dark = await context.newPage();
  await dark.goto(base + '/search/', { waitUntil: 'domcontentloaded' });
  await dark.locator('[data-folklore-theme]').click();
  await expect(dark.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(dark.locator('html')).toHaveAttribute('data-mode', 'dark');
  await dark.getByRole('searchbox', { name: 'Search this site' }).fill('Wallfahrer');
  await expect(dark.locator('pagefind-results').getByRole('link', { name: /Springs of the Schafmatt/ })).toBeVisible();
  await checkContrast(dark);
  await tab.goto(base + storyUrl, { waitUntil: 'domcontentloaded' });
  await expect(tab.getByRole('heading', { level: 1 })).toHaveText('The Springs of the Schafmatt');
  await expect(tab.locator('.folklore-story-summary')).toContainText('Pilgrims crossing the Schafmatt');
  const readingNav = tab.getByRole('navigation', { name: 'Read this tale' });
  await expect(readingNav.getByRole('link')).toHaveText(['English translation', 'Reader notes', 'Original text']);
  assert.deepEqual(await tab.locator('.folklore-reading-nav, #english, #reader-notes, #original, #story-context').evaluateAll(nodes => nodes.map(node => node.id || 'reading nav')), ['reading nav', 'english', 'reader-notes', 'original', 'story-context']);
  await tab.screenshot({ path: join(screenshots, 'reading-mobile.png') });
  const pilgrimageNote = tab.getByRole('link', { name: /Note \d+ for The Black Madonna of Einsiedeln/ });
  const firstMarker = tab.getByRole('link', { name: 'Note 1 for Schafmatt' });
  await expect(pilgrimageNote).toBeVisible();
  await firstMarker.focus();
  await tab.keyboard.press('Enter');
  assert.equal(new URL(tab.url()).hash, '#reader-note-1');
  await expect(tab.locator('#reader-note-1')).toContainText('Jura pass');
  await tab.locator('#reader-note-1').scrollIntoViewIfNeeded();
  await tab.screenshot({ path: join(screenshots, 'story-notes-mobile.png') });
  const returnLink = tab.locator('#reader-note-1').getByRole('link', { name: 'Return to note 1 in the translation' });
  await returnLink.focus();
  await tab.keyboard.press('Enter');
  assert.equal(new URL(tab.url()).hash, '#reader-note-ref-1');
  await expect(firstMarker).toBeFocused();
  await expect(tab.locator('#original [lang=de]')).toContainText('Wallfahrer');
  assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await tab.getByRole('link', { name: 'Original text', exact: true }).focus();
  await tab.keyboard.press('Enter');
  assert.equal(new URL(tab.url()).hash, '#original');
  await checkContrast(tab);
  const guide = guides.stories[primary.id];
  for (const entry of [guide.places[0], guide.themes[0]]) {
    const link = tab.locator('.folklore-context').getByRole('link', { name: entry.label, exact: true });
    await expect(link).toHaveAttribute('href', entry.url);
    await link.click();
    const id = entry.url.split('#')[1];
    await expect(tab.locator('#' + id)).toHaveText(entry.label);
    await expect(tab.locator('#' + id + ' + ul').getByRole('link', { name: 'The Springs of the Schafmatt' })).toHaveAttribute('href', storyUrl);
    await tab.goBack();
  }
  await tab.locator('.folklore-discussion-links').getByRole('link', { name: 'Discussion', exact: true }).click();
  await expect(tab).toHaveURL(/#discussion$/);
  const composer = new URL(await tab.getByRole('link', { name: 'Start a discussion on Mastodon' }).getAttribute('href'));
  assert.equal(composer.origin, 'https://share.joinmastodon.org');
  assert.equal(new URLSearchParams(composer.hash.slice(1)).get('text'), primary.title + ' https://folklore.tschopp.org' + storyUrl);
  await tab.locator('.folklore-discussion-links').getByRole('link', { name: 'Webmentions', exact: true }).click();
  await expect(tab).toHaveURL(/#webmentions-section$/);
  const form = tab.locator('#webmentions-section form');
  const receiver = 'https://webmention.io/tedt.org/webmention';
  await expect(form).toHaveAttribute('action', receiver);
  await tab.route(receiver, async route => {
    const data = new URLSearchParams(route.request().postData());
    assert.equal(data.get('target'), 'https://folklore.tschopp.org' + storyUrl);
    assert.equal(data.get('source'), 'https://example.net/test-folklore-response');
    await route.fulfill({ status: 202, headers: { 'access-control-allow-origin': '*' }, body: '{}' });
  });
  await form.getByLabel('URL of your response').fill('https://example.net/test-folklore-response');
  await form.getByRole('button', { name: 'Send Webmention' }).click();
  await expect(form.getByRole('status')).toContainText('Queued for verification');
  await checkContrast(tab);
  if (server) await tab.route('https://folklore.tschopp.org/stories/**', serveCanonical);
  await tab.goto(base + legacyUrl + '#reader-note-5', { waitUntil: 'domcontentloaded' });
  await expect(tab).toHaveURL('https://folklore.tschopp.org' + storyUrl + '#reader-note-5');
  await expect(tab.locator('#reader-note-5')).toContainText('Black Madonna');
  const plain = await browser.newPage({ javaScriptEnabled: false });
  const listingIndex = Math.floor(catalog.stories.findIndex(story => story.id === primary.id) / catalog.page_size);
  const listingUrl = listingIndex ? '/page/' + (listingIndex + 1) + '/' : '/';
  await plain.goto(base + listingUrl, { waitUntil: 'domcontentloaded' });
  await expect(plain.locator('.folklore-catalog h3 a')).toHaveCount(Math.min(catalog.page_size, catalog.stories.length - listingIndex * catalog.page_size));
  await expect(plain.getByRole('link', { name: 'Reader notes for The Springs of the Schafmatt' })).toHaveAttribute('href', storyUrl + '#reader-notes');
  await plain.getByRole('link', { name: 'The Springs of the Schafmatt', exact: true }).click();
  await expect(plain.locator('#english')).toBeVisible();
  await expect(plain.locator('#original')).toBeVisible();
  await plain.getByRole('link', { name: 'Note 1 for Schafmatt' }).click();
  await expect(plain).toHaveURL(/#reader-note-1$/);
  if (server) await plain.route('https://folklore.tschopp.org/stories/**', serveCanonical);
  await plain.goto(base + legacyUrl, { waitUntil: 'domcontentloaded' });
  await expect(plain).toHaveURL('https://folklore.tschopp.org' + storyUrl);
  const checks = [...catalog.stories, ...catalog.source_notes];
  const oldIds = new Set(migration.documents.filter(document => document.aliases.length).map(document => document.story_id));
  for (const { url, id } of checks) {
    const [response, redirected] = await Promise.all([
      tab.request.get(base + url),
      oldIds.has(id) ? tab.request.get(base + '/stories/' + id + '/') : Promise.resolve(null),
    ]);
    assert.equal(response.status(), 200, url);
    if (redirected) assert.equal(redirected.status(), 200, id);
    const html = await response.text();
    const aliasHtml = redirected ? await redirected.text() : '';
    assert.ok(html.includes('rel="canonical" href="https://folklore.tschopp.org' + url + '"'), url);
    assert.ok(html.includes('name="target" value="https://folklore.tschopp.org' + url + '"'), url);
    assert.ok(html.includes('href="#discussion"') && html.includes('href="#webmentions-section"'), url);
    if (redirected) assert.ok(aliasHtml.includes('content="0; url=https://folklore.tschopp.org' + url + '"'), id);
    if (catalog.source_notes.some(note => note.url === url)) {
      assert.match(html, /noindex/);
      assert.ok(!html.includes('data-pagefind-body') && !html.includes('id="english"') && !html.includes('id="original"') && !html.includes('id="reader-notes"'), url);
      assert.match(html, /View the source record/);
    } else {
      assert.match(html, /data-pagefind-body/);
      assert.match(html, /id="english"/);
      assert.match(html, /id="original"/);
      assert.match(html, /id="reader-notes"/);
      const storyNotes = guides.stories[id].notes;
      assert.equal([...html.matchAll(/id="reader-note-ref-(\d+)"/g)].length, storyNotes.filter(note => note.anchor).length, url);
    }
  }
  const sitemap = await (await tab.request.get(base + '/sitemap.xml')).text();
  for (const story of catalog.stories) assert.ok(sitemap.includes('https://folklore.tschopp.org' + story.url + '</loc>'), story.url);
  for (const story of catalog.source_notes) assert.ok(!sitemap.includes(story.url), story.url);
  for (const { id } of checks) assert.ok(!sitemap.includes('/stories/' + id + '/'), id);

  await tab.goto(base + '/search/', { waitUntil: 'domcontentloaded' });
  const expandedSearch = tab.getByRole('searchbox', { name: 'Search this site' });
  for (const query of ['The Heavy Child', 'The Giants of Iseltwald', 'The Devil and the Poacher', 'The Noblewoman of Milan']) {
    await expandedSearch.fill(query);
    await expect(tab.locator('pagefind-summary')).toContainText(query, { timeout: 10000 });
    for (const story of catalog.stories.filter(story => story.title.startsWith(query + ' ('))) {
      const result = tab.locator('pagefind-results').getByRole('link', { name: story.title, exact: true });
      await expect(result).toBeVisible({ timeout: 10000 });
      assert.equal(await result.evaluate(node => new URL(node.href).pathname), story.url);
    }
    console.log('Search distinguishes versions for ' + query);
  }
  for (const slug of ['the-white-chamois-bern', 'the-heavy-child-jecklin', 'the-heavy-child-kohlrusch', 'a-ghost-realp']) {
    await tab.goto(base + '/stories/' + slug + '/', { waitUntil: 'domcontentloaded' });
    await checkContrast(tab);
    assert.ok(await tab.getByRole('navigation', { name: 'Read this tale' }).isVisible());
    assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (slug === 'the-white-chamois-bern') {
      await expect(tab.locator('#story-sources > ul > li')).toHaveCount(2);
      await expect(tab.locator('#story-sources')).not.toContainText('SourceURL is preserved');
      await tab.locator('#story-sources').screenshot({ path: join(screenshots, 'white-chamois-sources-mobile.png') });
    }
  }
  const browseLinks = [];
  for (let number = 1; number <= catalog.page_count; number++) {
    const url = number === 1 ? '/' : '/page/' + number + '/';
    const response = await tab.request.get(base + url);
    assert.equal(response.status(), 200);
    const html = await response.text();
    for (const story of catalog.stories) {
      if (html.includes('href="' + story.url + '"')) browseLinks.push(story.url);
    }
  }
  assert.deepEqual(browseLinks.sort(), catalog.stories.map(story => story.url).sort());
  await tab.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await tab.setViewportSize({ width: 1440, height: 1000 });
  await tab.screenshot({ path: join(screenshots, 'collection-desktop.png'), fullPage: false });
  await checkContrast(tab);
  await tab.goto(base + storyUrl, { waitUntil: 'domcontentloaded' });
  await tab.screenshot({ path: join(screenshots, 'story-desktop.png'), fullPage: false });
  assert.ok(await tab.locator('h1').evaluate(node => getComputedStyle(node).fontFamily.includes('IM Fell English')));
  assert.ok(await tab.locator('#english p').first().evaluate(node => getComputedStyle(node).fontFamily.includes('Alegreya')));
  assert.deepEqual(await tab.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => { JSON.parse(node.textContent); return true; })), [true]);
  console.log('Verified all five browse pages, shared sources, short entries, comparison-pair search, and mobile contrast.');

  console.log('Passed canonical search, reading navigation, footnote return focus, discussion and mocked Webmention submission, mobile and keyboard checks, and ' + checks.length + ' canonical URLs and redirects.');
} finally {
  await browser.close();
  if (server) {
    server.closeAllConnections();
    server.close();
  }
}
