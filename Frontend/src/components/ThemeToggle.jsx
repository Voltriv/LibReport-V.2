import React, { useEffect, useState } from 'react';
import { applyTheme, nextTheme, initTheme } from '../theme';

const ThemeToggle = () => {
  const [theme, setTheme] = useState('dark');
  useEffect(() => { setTheme(initTheme()); }, []);
  const toggle = () => {
    const t = nextTheme(theme);
    applyTheme(t);
    setTheme(t);
  };
  return (
    <button
      onClick={toggle}
      className="inline-flex items-center justify-center h-9 px-3 rounded-md bg-white/80 dark:bg-stone-900/60 ring-1 ring-slate-200 dark:ring-stone-700 text-slate-700 dark:text-stone-200 hover:shadow-sm"
      title="Toggle theme"
    >
      {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
};

export default ThemeToggle;

