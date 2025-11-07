import { useMemo, useState } from "react";
import { applyTheme } from "../theme";

const getInitialTheme = () => {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
};

const ThemeToggle = () => {
  const [theme, setTheme] = useState(getInitialTheme);

  const options = useMemo(
    () => [
      {
        value: "light",
        label: "Light",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M6.76 4.84l-1.8-1.79 1.41-1.41 1.79 1.8-1.4 1.4zm10.48 14.32l1.79 1.8-1.41 1.41-1.8-1.79 1.42-1.42zM12 4V1h0v3h0zm0 22v-3h0v3h0zM4 12H1v0h3v0zm22 0h-3v0h3v0zM6.76 19.16l1.4 1.4-1.79 1.8-1.41-1.41 1.8-1.79zM19.16 6.76l1.8-1.79-1.41-1.41-1.79 1.8 1.4 1.4zM12 6a6 6 0 100 12A6 6 0 0012 6z" />
          </svg>
        )
      },
      {
        value: "dark",
        label: "Dark",
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M21.64 13a9 9 0 11-10.73-10.7 1 1 0 01.9 1.67A7 7 0 1019.97 12a1 1 0 011.67.9z" />
          </svg>
        )
      }
    ],
    []
  );

  const setMode = (value) => {
    const next = value === "light" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-white/80 dark:bg-stone-900/70 ring-1 ring-slate-200 dark:ring-stone-700 p-1">
      {options.map((option) => {
        const isActive = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              isActive
                ? "bg-slate-900 text-white shadow dark:bg-stone-700"
                : "text-slate-600 hover:text-slate-900 dark:text-stone-300 dark:hover:text-white"
            }`}
            aria-pressed={isActive}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeToggle;
