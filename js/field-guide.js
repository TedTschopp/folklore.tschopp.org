/* Adapt the centrally hosted appearance controller to the two folklore grounds. */
(function () {
  'use strict';
  var button = document.querySelector('[data-folklore-theme]');
  function render() {
    var dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.mode = dark ? 'dark' : 'light';
    document.body.classList.toggle('me-dark-ground', dark);
    document.body.classList.toggle('me-paper', !dark);
    if (button) {
      button.textContent = dark ? 'Day' : 'Dusk';
      button.setAttribute('aria-label', dark ? 'Use parchment appearance' : 'Use dusk appearance');
      button.setAttribute('aria-pressed', String(dark));
    }
  }
  if (button) button.addEventListener('click', function () {
    if (window.TedTTheme) window.TedTTheme.set(window.TedTTheme.resolved() === 'dark' ? 'light' : 'dark');
  });
  window.addEventListener('tedt:theme-change', render);
  render();
}());
