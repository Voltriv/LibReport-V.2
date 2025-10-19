function setDomTheme(t) {
  const root = document.documentElement;
  root.setAttribute('data-theme', t);
  if (t === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
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
