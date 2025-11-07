function setDomTheme(t) {
  const root = document.documentElement;
  const body = document.body;
  root.setAttribute('data-theme', t);
  root.classList.remove('dark');
  if (t === 'dark') root.classList.add('dark');
  if (body) {
    body.setAttribute('data-theme', t);
    body.classList.remove('dark');
    if (t === 'dark') body.classList.add('dark');
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    const event = new CustomEvent('lr:theme-change', { detail: { theme: t } });
    window.dispatchEvent(event);
  }
}

export function applyTheme(theme) {
  const t = theme === 'light' ? 'light' : 'dark';
  try { localStorage.setItem('lr_theme', t); } catch {}
  setDomTheme(t);
}

export function initTheme() {
  let t = 'dark';
  try {
    const saved = localStorage.getItem('lr_theme');
    if (saved === 'light' || saved === 'dark') t = saved;
  } catch {}
  setDomTheme(t);
  return t;
}

export function nextTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}
