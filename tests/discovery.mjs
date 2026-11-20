import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function checkDiscovery({ tab, context, browser, base, discovery, screenshots, expect, checkContrast }) {
  await tab.setViewportSize({ width: 390, height: 844 });
  await tab.goto(base + '/', { waitUntil: 'networkidle' });
  await expect(tab.getByRole('navigation', { name: 'Swiss Folklore', exact: true })).toBeVisible();
  await expect(tab.getByRole('link', { name: `Explore all ${discovery.story_count} stories`, exact: true })).toHaveAttribute('href', '/stories/');
  await expect(tab.getByRole('link', { name: 'Find a short tale', exact: true })).toHaveAttribute('href', '/short-tales/');
  await expect(tab.locator('.folklore-featured > li')).toHaveCount(3);
  await tab.getByRole('searchbox', { name: 'Search all stories', exact: true }).fill('Schafmatt');
  await tab.locator('.folklore-site-search').getByRole('button', { name: 'Search', exact: true }).click();
  await expect(tab).toHaveURL(/\/search\/\?q=Schafmatt$/);
  await expect(tab.locator('#search-results').getByRole('link', { name: 'The Springs of the Schafmatt', exact: true })).toBeVisible({ timeout: 15000 });

  await tab.goto(base + '/themes/', { waitUntil: 'networkidle' });
  await expect(tab.locator('.folklore-topic-grid > li')).toHaveCount(12);
  assert.ok(await tab.evaluate(() => document.documentElement.scrollHeight < 10000), 'Topic landing is a bounded introduction on mobile');
  await tab.getByRole('link', { name: 'Ghosts and hauntings', exact: true }).click();
  await expect(tab.getByRole('heading', { level: 1 })).toHaveText('Ghosts and hauntings');
  await expect(tab.locator('.folklore-catalog > li')).toHaveCount(24);
  const firstPage = await tab.locator('.folklore-catalog h3 a').evaluateAll(nodes => nodes.map(n => n.pathname));
  await tab.getByRole('link', { name: 'Next page', exact: true }).click();
  await expect(tab).toHaveURL(/\/themes\/ghosts-and-hauntings\/page\/2\/$/);
  const secondPage = await tab.locator('.folklore-catalog h3 a').evaluateAll(nodes => nodes.map(n => n.pathname));
  assert.ok(secondPage.every(url => !firstPage.includes(url)), 'Topic pages do not repeat stories');
  await tab.goBack();
  await expect(tab).toHaveURL(base + '/themes/ghosts-and-hauntings/');

  await tab.goto(base + '/themes/#theme-witchcraft');
  await expect(tab).toHaveURL(base + '/themes/witchcraft/');
  await expect(tab.getByRole('heading', { level: 1 })).toHaveText('Witchcraft');
  await tab.goto(base + '/locations/#place-uri');
  await expect(tab).toHaveURL(base + '/locations/uri/');
  await expect(tab.locator('.folklore-catalog > li')).toHaveCount(24);

  await tab.goto(base + '/locations/', { waitUntil: 'networkidle' });
  await tab.getByLabel('Village, valley, river, mountain or canton').fill('Grisons');
  await expect(tab.locator('[data-directory-item]:visible').getByRole('link', { name: 'Graubünden', exact: true })).toBeVisible();
  await tab.getByLabel('Village, valley, river, mountain or canton').fill('ruti');
  await expect(tab.locator('[data-directory-item]:visible')).toHaveCount(1);
  await tab.locator('[data-directory-item]:visible').getByRole('link').click();
  await expect(tab.getByRole('heading', { level: 1 })).toHaveText('Rüti (St. Gallen)');
  await expect(tab.locator('.folklore-catalog').getByRole('link', { name: 'The Three-Legged Hare', exact: true })).toBeVisible();
  await tab.goto(base + '/locations/', { waitUntil: 'networkidle' });
  await tab.getByLabel('Village, valley, river, mountain or canton').fill('a-place-that-is-not-recorded');
  await expect(tab.locator('[data-directory-status]')).toContainText('No matching name');
  await tab.getByLabel('Village, valley, river, mountain or canton').fill('');
  await expect(tab.locator('[data-directory-item]:visible')).toHaveCount(discovery.places.length);
  await tab.goto(base + '/locations/#ac9c1a2ef9b0d0fbbd47f28da9d1f2d9d1f4d3b7');
  await expect(tab).toHaveURL(base + '/research/place-profiles/#ac9c1a2ef9b0d0fbbd47f28da9d1f2d9d1f4d3b7');
  await expect(tab.locator('#ac9c1a2ef9b0d0fbbd47f28da9d1f2d9d1f4d3b7')).toContainText('Rotental');

  const params = new URLSearchParams({ topic: 'Ghosts and hauntings', region: 'Uri', length: 'Under 2 minutes' });
  await tab.goto(base + '/search/?' + params, { waitUntil: 'networkidle' });
  await expect(tab.locator('#search-results > li').first()).toBeVisible({ timeout: 15000 });
  const metadata = new Map(Object.values(discovery.stories).map(story => [story.url, story]));
  const checkResults = async () => {
    const links = await tab.locator('#search-results h3 a').evaluateAll(nodes => nodes.map(n => n.pathname));
    assert.ok(links.length && links.length <= 24);
    for (const url of links) {
      const story = metadata.get(url);
      assert.ok(story.topics.includes('ghosts-and-hauntings'), url);
      assert.ok(story.regions.includes('uri'), url);
      assert.equal(story.length, 'Under 2 minutes', url);
    }
    return links;
  };
  const filteredFirst = await checkResults();
  const nextResults = tab.getByRole('button', { name: 'Next results', exact: true });
  await expect(nextResults).toBeEnabled();
  await nextResults.click();
  await expect(tab.locator('#search-page-status')).toContainText('Showing 25');
  const filteredNext = await checkResults();
  assert.ok(filteredNext.every(url => !filteredFirst.includes(url)));
  await expect(tab.locator('#search-results h3 a').first()).toBeFocused();
  await tab.reload({ waitUntil: 'networkidle' });
  await expect(tab.locator('#search-page-status')).toContainText('Showing 25');
  await tab.goBack();
  await expect(tab.locator('#search-page-status')).toContainText('Showing 1');
  await tab.getByRole('button', { name: 'Clear search and filters', exact: true }).click();
  await expect(tab.locator('pagefind-summary')).toContainText(discovery.story_count.toLocaleString('en-US'), { timeout: 15000 });
  await expect(tab).toHaveURL(base + '/search/');
  const length = tab.locator('pagefind-filter-dropdown[filter="length"]');
  await length.getByRole('combobox').click();
  await length.getByRole('option', { name: /Over 5 minutes/ }).click();
  await expect(tab).toHaveURL(/length=Over\+5\+minutes/);
  await expect(tab.locator('#search-results > li').first()).toBeVisible();
  await expect(tab.locator('#search-results .folklore-kicker').first()).not.toContainText('Under 1 min');

  await tab.goto(base + '/guide/', { waitUntil: 'networkidle' });
  await expect(tab.locator('.folklore-glossary > div')).toHaveCount(8);
  const glossaryLink = tab.locator('.folklore-glossary a').first();
  await glossaryLink.click();
  await expect(tab.locator(locationHash(await tab.url()))).toBeVisible();
  await expect(tab.locator('.folklore-footnotes')).toContainText('seasonal pasture');

  const plain = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    await plain.goto(base + '/themes/');
    await plain.getByRole('link', { name: 'Ghosts and hauntings', exact: true }).click();
    await expect(plain.locator('.folklore-catalog > li')).toHaveCount(24);
    await plain.getByRole('link', { name: 'Next page', exact: true }).click();
    await expect(plain).toHaveURL(/page\/2\/$/);
    await plain.locator('.folklore-catalog h3 a').first().click();
    await expect(plain.locator('#english p').first()).toBeVisible();
    await expect(plain.locator('#reader-notes li').first()).toBeVisible();
    await plain.goto(base + '/locations/#ac9c1a2ef9b0d0fbbd47f28da9d1f2d9d1f4d3b7');
    await plain.locator('#ac9c1a2ef9b0d0fbbd47f28da9d1f2d9d1f4d3b7').getByRole('link', { name: 'Rotental', exact: true }).click();
    await expect(plain).toHaveURL(base + '/research/place-profiles/#ac9c1a2ef9b0d0fbbd47f28da9d1f2d9d1f4d3b7');
    await expect(plain.locator('#ac9c1a2ef9b0d0fbbd47f28da9d1f2d9d1f4d3b7')).toContainText('Rotental');
    await plain.goto(base + '/research/');
    await plain.getByRole('link', { name: 'Detailed place profiles', exact: true }).click();
    await expect(plain.getByRole('heading', { level: 1 })).toHaveText('Selected place profiles');
  } finally { await plain.close(); }

  for (const path of ['/', '/themes/', '/locations/', '/guide/', '/search/']) {
    await tab.goto(base + path, { waitUntil: 'networkidle' });
    await tab.evaluate(() => document.fonts.ready);
    if (path === '/search/') await expect(tab.locator('#search-results > li').first()).toBeVisible({ timeout: 15000 });
    for (const theme of ['light', 'dark']) {
      if (await tab.locator('html').getAttribute('data-theme') !== theme) await tab.locator('[data-folklore-theme]').click();
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, path + ' horizontal overflow');
      await checkContrast(tab);
      await tab.screenshot({ path: join(screenshots, 'discovery-' + (path.split('/')[1] || 'home') + '-mobile-' + theme + '.png') });
    }
  }
  await tab.setViewportSize({ width: 1440, height: 1000 });
  await tab.goto(base + '/', { waitUntil: 'networkidle' });
  if (await tab.locator('html').getAttribute('data-theme') !== 'light') await tab.locator('[data-folklore-theme]').click();
  await checkContrast(tab);
  await tab.screenshot({ path: join(screenshots, 'discovery-home-desktop.png') });
  assert.ok((await context.pages()).includes(tab));
  console.log('Verified guided entry, all twelve topics, bounded pagination, legacy links, place lookup, combined search filters, URL restoration, glossary sources, no-JavaScript reading and both mobile themes.');
}

function locationHash(url) { return new URL(url).hash; }
