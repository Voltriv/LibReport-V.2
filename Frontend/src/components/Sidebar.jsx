import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/fav_logo.png";
import ThemeToggle from "./ThemeToggle";

const Sidebar = () => {
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [role, setRole] = useState('student');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lr_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.role) setRole(u.role);
      }
    } catch {}
  }, []);

  const baseLink = "block rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10";
  const activeLink = "bg-white/15 text-brand-gold";

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 inline-flex items-center justify-center h-10 w-10 rounded-md bg-white/90 dark:bg-stone-900/80 ring-1 ring-slate-200 dark:ring-stone-700 shadow"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-slate-700 dark:text-stone-200">
          <path fillRule="evenodd" d="M3.75 5.25a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75zm0 6a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75zm0 6a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z" clipRule="evenodd" />
        </svg>
      </button>

      <aside className={`fixed top-0 left-0 h-full w-72 transform transition-transform duration-200 ease-out bg-gradient-to-b from-brand-green to-brand-greenDark text-white shadow-xl z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between gap-3 p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded" />
            <span className="text-lg font-semibold">LibReport</span>
          </div>
          <ThemeToggle />
        </div>

        <nav className="p-4 space-y-1">
          <NavLink to="/dashboard" onClick={() => setIsOpen(false)} className={({isActive}) => `${baseLink} ${isActive ? activeLink : ''}`}>Dashboard</NavLink>
          <NavLink to="/usage-heatmaps" onClick={() => setIsOpen(false)} className={({isActive}) => `${baseLink} ${isActive ? activeLink : ''}`}>Usage Heatmaps</NavLink>
          <NavLink to="/tracker" onClick={() => setIsOpen(false)} className={({isActive}) => `${baseLink} ${isActive ? activeLink : ''}`}>Tracker</NavLink>
          <NavLink to="/library" onClick={() => setIsOpen(false)} className={({isActive}) => `${baseLink} ${isActive ? activeLink : ''}`}>Library</NavLink>
          {/* Legacy link removed; stack is React + Tailwind only */}
          <NavLink to="/reports" onClick={() => setIsOpen(false)} className={({isActive}) => `${baseLink} ${isActive ? activeLink : ''}`}>Reports</NavLink>

          {role === 'admin' && (
            <div className="pt-2">
              <button
                className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/90 hover:bg-white/10"
                onClick={() => setIsAdminOpen(!isAdminOpen)}
              >
                <span>Admin Panel</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`h-4 w-4 transition-transform ${isAdminOpen ? 'rotate-180' : ''}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {isAdminOpen && (
                <div className="mt-1 ml-1 space-y-1">
                  <NavLink to="/usermanagement" onClick={() => setIsOpen(false)} className={({isActive}) => `${baseLink} ${isActive ? activeLink : ''}`}>User</NavLink>
                  {/* Material merged into Books Management */}
                  <NavLink to="/booksmanagement" onClick={() => setIsOpen(false)} className={({isActive}) => `${baseLink} ${isActive ? activeLink : ''}`}>Books Management</NavLink>
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      {/* Spacer for layout on md+ */}
      <div className="hidden md:block w-72 shrink-0" />
    </>
  );
};

export default Sidebar;
