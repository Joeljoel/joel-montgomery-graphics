(() => {
  'use strict';

  const key = 'jm-utilities-theme';
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  let preference;
  let toggle;

  function applyTheme() {
    const theme = preference || (systemTheme.matches ? 'dark' : 'light');
    root.dataset.utilityTheme = theme;
    toggle?.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  function readPreference() {
    try {
      const saved = localStorage.getItem(key);
      preference = saved === 'dark' || saved === 'light' ? saved : undefined;
    } catch {
      // The current document can still be toggled if storage is blocked.
    }
    applyTheme();
  }

  readPreference();
  systemTheme.addEventListener('change', applyTheme);
  window.addEventListener('pageshow', readPreference);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) readPreference();
  });

  document.addEventListener('DOMContentLoaded', () => {
    if (root.classList.contains('utilities-embedded')) return;

    toggle = document.createElement('button');
    toggle.className = 'utilities-theme-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Dark mode');
    toggle.title = 'Toggle dark mode';
    toggle.innerHTML = `
      <svg class="utilities-theme-moon" aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20.8 14.7A9 9 0 0 1 9.3 3.2 9 9 0 1 0 20.8 14.7Z"/>
      </svg>
      <svg class="utilities-theme-sun" aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19m0-14-1.5 1.5m-11 11L5 19"/>
      </svg>`;
    toggle.addEventListener('click', () => {
      preference = root.dataset.utilityTheme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(key, preference);
      } catch {}
      applyTheme();
    });
    applyTheme();
    document.body.append(toggle);
  });
})();
