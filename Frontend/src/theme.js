const LIGHT_THEME = 'light';

function setDomTheme() {
  const root = document.documentElement;
  const body = document.body;
  root.setAttribute('data-theme', LIGHT_THEME);
  root.classList.remove('dark');
  if (body) {
    body.setAttribute('data-theme', LIGHT_THEME);
    body.classList.remove('dark');
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    const event = new CustomEvent('lr:theme-change', { detail: { theme: LIGHT_THEME } });
    window.dispatchEvent(event);
  }
}

export function applyTheme() {
  try { localStorage.setItem('lr_theme', LIGHT_THEME); } catch {}
  setDomTheme();
}

export function initTheme() {
  try { localStorage.setItem('lr_theme', LIGHT_THEME); } catch {}
  setDomTheme();
  return LIGHT_THEME;
}

export function nextTheme() {
  return LIGHT_THEME;
}
