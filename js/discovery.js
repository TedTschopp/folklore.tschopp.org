/* Reader navigation. The published translations and annotations remain the source. */
const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();

// Old index fragments remain useful bookmarks and inbound links.
function followOldIndexLink() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = id && document.getElementById(id)?.dataset.legacyTarget;
  if (target && (/^\/(?:themes|locations)\/[a-z0-9-]+\/$/.test(target) || /^\/research\/place-profiles\/#[a-f0-9]{40}$/.test(target))) location.replace(target);
  else if (location.pathname === '/themes/' && /^(?:type|primary|secondary)-[a-z0-9-]+$/.test(id || '')) location.replace('/research/pilot-themes/#' + id);
}
followOldIndexLink();
window.addEventListener('hashchange', followOldIndexLink);

document.querySelectorAll('[data-directory]').forEach(directory => {
  const input = directory.querySelector('[data-directory-query]');
  if (!input) return;
  const entries = [...directory.querySelectorAll('[data-directory-item]')];
  const status = directory.querySelector('[data-directory-status]');
  input.addEventListener('input', () => {
    const term = fold(input.value.trim());
    const details = directory.querySelector('[data-directory-details]');
    if (details && term) details.open = true;
    let count = 0;
    for (const entry of entries) {
      entry.hidden = !fold(entry.dataset.searchTerms || entry.textContent).includes(term);
      if (!entry.hidden) count++;
    }
    if (status) status.textContent = count ? `${count} ${count === 1 ? 'match' : 'matches'}` : 'No matching name. Try a shorter spelling, or browse the regions below.';
  });
});

async function searchPage() {
  const list = document.getElementById('search-results');
  if (!list) return;
  const error = document.querySelector('[data-search-error]');
  try {
    // Reuse the installed Pagefind 1.6 input/filter components and instance API.
    await import('/pagefind/pagefind-component-ui.js');
    const instance = window.PagefindComponents.getInstanceManager().getInstance('default');
    // Explicit names also work while optional filters are inside closed details.
    // Reapply after the component replaces its trigger during a language update.
    document.querySelectorAll('pagefind-filter-dropdown').forEach(dropdown => {
      const nameTrigger = () => {
        const button = dropdown.querySelector('[role="combobox"]');
        if (!button) return;
        const selected = [...dropdown.querySelectorAll('[role="option"][aria-selected="true"]')].map(option => option.dataset.value);
        const name = dropdown.getAttribute('label') + (selected.length ? ': ' + selected.join(', ') : '');
        if (button.getAttribute('aria-label') !== name) button.setAttribute('aria-label', name);
      };
      nameTrigger();
      new MutationObserver(nameTrigger).observe(dropdown, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
    });
    const keys = ['topic', 'region', 'length', 'place', 'collector', 'tag'];
    const status = document.getElementById('search-page-status');
    const pager = document.querySelector('[data-search-pagination]');
    const previous = document.querySelector('[data-search-previous]');
    const next = document.querySelector('[data-search-next]');
    const pageText = document.querySelector('[data-search-page]');
    const size = 24;
    let results = [], generation = 0, page = 1, term = '', filters = {};
    const requestedPage = () => Math.max(1, Number.parseInt(new URLSearchParams(location.search).get('page'), 10) || 1);
    let restoring = true;
    function updateUrl(push = false) {
      const params = new URLSearchParams();
      if (term) params.set('q', term);
      for (const key of keys) for (const value of [].concat(filters[key] || [])) params.append(key, value);
      if (page > 1) params.set('page', String(page));
      const url = location.pathname + (params.size ? '?' + params.toString() : '');
      if (url !== location.pathname + location.search) history[push ? 'pushState' : 'replaceState']({}, '', url);
    }
    const el = (tag, text, className) => {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    function card(data) {
      const path = new URL(data.url, location.origin).pathname;
      if (!/^\/stories\/[a-z0-9-]+\/$/.test(path)) throw new Error('Unexpected search target');
      const item = el('li', undefined, 'folklore-discovery-card');
      const meta = data.meta || {};
      item.append(el('p', [meta.reading, meta.region].filter(Boolean).join(' · '), 'folklore-kicker'));
      const heading = el('h3');
      const link = el('a', meta.title || 'Read this tale'); link.href = path; heading.append(link); item.append(heading);
      item.append(el('p', meta.summary || 'Read the English translation, original text and reader notes.', 'folklore-catalog-summary'));
      if (term && data.excerpt) {
        const details = el('details', undefined, 'folklore-search-match');
        details.append(el('summary', 'Matching passage'));
        // Pagefind returns escaped HTML with mark elements. Read it as inert text.
        const plain = new DOMParser().parseFromString(data.excerpt, 'text/html').body.textContent;
        details.append(el('p', plain)); item.append(details);
      }
      const note = el('a', 'Reader notes'); note.href = path + '#reader-notes'; note.setAttribute('aria-label', `Reader notes for ${meta.title}`); item.append(note);
      return item;
    }
    async function render(focus = false) {
      const run = ++generation;
      const totalPages = Math.max(1, Math.ceil(results.length / size));
      page = Math.min(Math.max(1, page), totalPages);
      list.setAttribute('aria-busy', 'true');
      const data = await Promise.all(results.slice((page - 1) * size, page * size).map(result => result.data()));
      if (run !== generation) return;
      list.replaceChildren(...data.map(card));
      list.setAttribute('aria-busy', 'false');
      status.textContent = results.length ? `Showing ${(page - 1) * size + 1}–${Math.min(page * size, results.length)} of ${results.length} matching stories` : 'No stories match these choices. Clear a filter or try a different word.';
      pager.hidden = totalPages <= 1;
      previous.disabled = page <= 1; next.disabled = page >= totalPages;
      pageText.textContent = `Page ${page} of ${totalPages}`;
      updateUrl();
      if (focus) { const first = list.querySelector('h3 a'); if (first) first.focus(); }
    }
    // Faceted mode starts its own empty search while loading. Let that startup
    // finish before restoring a bookmarked query/page or subscribing to changes.
    await instance.triggerLoad();
    instance.on('loading', () => { generation++; list.setAttribute('aria-busy', 'true'); });
    instance.on('error', () => { generation++; list.setAttribute('aria-busy', 'false'); error.hidden = false; });
    instance.on('search', (value, selected) => {
      term = value || ''; filters = selected || {};
      page = restoring ? requestedPage() : 1;
      restoring = false;
      updateUrl();
    });
    instance.on('results', result => {
      error.hidden = true;
      results = result.results || [];
      render().catch(() => { error.hidden = false; list.setAttribute('aria-busy', 'false'); });
    });
    const restore = () => {
      const params = new URLSearchParams(location.search);
      const selected = {};
      for (const key of keys) if (params.has(key)) selected[key] = params.getAll(key);
      restoring = true;
      instance.triggerSearchWithFilters(params.get('q') || '', selected);
    };
    previous.addEventListener('click', () => { page--; updateUrl(true); render(true).catch(() => { error.hidden = false; }); });
    next.addEventListener('click', () => { page++; updateUrl(true); render(true).catch(() => { error.hidden = false; }); });
    document.querySelector('[data-search-reset]').addEventListener('click', () => instance.triggerSearchWithFilters('', {}));
    window.addEventListener('popstate', restore);
    restore();
  } catch {
    error.hidden = false;
    list.setAttribute('aria-busy', 'false');
  }
}
searchPage();
