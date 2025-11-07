import { useEffect, useState } from "react";
import { applyTheme } from "../theme";

const readTheme = () => {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
};

const ThemeToggle = () => {
  const [theme, setTheme] = useState(readTheme);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncTheme = () => setTheme(readTheme());

    window.addEventListener("lr:theme-change", syncTheme);
    window.addEventListener("storage", syncTheme);

    return () => {
      window.removeEventListener("lr:theme-change", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const isDark = theme === "dark";
  const currentLabel = isDark ? "Dark Mode" : "Light Mode";
  const hintLabel = isDark ? "Tap to switch to light" : "Tap to switch to dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle inline-flex items-center gap-3 font-semibold tracking-wide"
      aria-label="Toggle theme"
      aria-pressed={isDark}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
          isDark ? "bg-stone-800 text-amber-200" : "bg-amber-100 text-amber-600"
        }`}
      >
        {isDark ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M21.64 13a9 9 0 11-10.73-10.7 1 1 0 01.9 1.67A7 7 0 1019.97 12a1 1 0 011.67.9z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M6.76 4.84l-1.8-1.79 1.41-1.41 1.79 1.8-1.4 1.4zm10.48 14.32l1.79 1.8-1.41 1.41-1.8-1.79 1.42-1.42zM12 4V1h0v3h0zm0 22v-3h0v3h0zM4 12H1v0h3v0zm22 0h-3v0h3 v0zM6.76 19.16l1.4 1.4-1.79 1.8-1.41-1.41 1.8-1.79zM19.16 6.76l1.8-1.79-1.41-1.41-1.79 1.8 1.4 1.4zM12 6a6 6 0 100 12A6 6 0 0012 6z" />
          </svg>
        )}
      </span>
      <span className="flex flex-col leading-tight text-left">
        <span className="text-xs font-semibold">{currentLabel}</span>
        <span className="text-[0.65rem] font-normal text-slate-500 dark:text-stone-400">{hintLabel}</span>
      </span>
    </button>
  );
};

export default ThemeToggle;
