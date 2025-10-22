import { useEffect, useState } from "react";
import { applyTheme, nextTheme, initTheme } from "../theme";

const ThemeToggle = () => {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setTheme(initTheme());
  }, []);

  const toggle = () => {
    const t = nextTheme(theme);
    applyTheme(t);
    setTheme(t);
  };

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 justify-center h-9 px-3 rounded-md bg-white/80 dark:bg-stone-900/60 ring-1 ring-slate-200 dark:ring-stone-700 text-slate-700 dark:text-stone-200 hover:shadow-sm"
      title="Toggle theme"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M6.76 4.84l-1.8-1.79 1.41-1.41 1.79 1.8-1.4 1.4zm10.48 14.32l1.79 1.8-1.41 1.41-1.8-1.79 1.42-1.42zM12 4V1h0v3h0zm0 22v-3h0v3h0zM4 12H1v0h3v0zm22 0h-3v0h3v0zM6.76 19.16l1.4 1.4-1.79 1.8-1.41-1.41 1.8-1.79zM19.16 6.76l1.8-1.79-1.41-1.41-1.79 1.8 1.4 1.4zM12 6a6 6 0 100 12A6 6 0 0012 6z" />
          </svg>
          <span>Dark</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M21.64 13a9 9 0 11-10.73-10.7 1 1 0 01.9 1.67A7 7 0 1019.97 12a1 1 0 011.67.9z" />
          </svg>
          <span>Light</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
