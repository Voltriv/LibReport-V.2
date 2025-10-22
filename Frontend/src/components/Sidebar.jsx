import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/fav_logo.png";
import ThemeToggle from "./ThemeToggle";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const baseLink =
    "block rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";
  const activeLink = "bg-white/20 text-brand-gold shadow-inner";
  const primaryNav = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/tracker", label: "Tracker" },
    { to: "/usage-heatmaps", label: "Usage Heatmaps" },
    { to: "/reports", label: "Reports" },
    { to: "/library", label: "Library" },
  ];
  const managementNav = [
    { to: "/usermanagement", label: "User Management" },
    { to: "/booksmanagement", label: "Books Management" },
    { to: "/admins", label: "Admins" },
  ];

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

        <nav className="p-4 space-y-4 overflow-y-auto h-[calc(100%-4.5rem)]">
          <div className="space-y-1">
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div>
            <p className="px-3 text-xs uppercase tracking-wide text-white/60">Management</p>
            <div className="mt-2 space-y-1">
              {managementNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ""}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* Spacer for layout on md+ */}
      <div className="hidden md:block w-72 shrink-0" />
    </>
  );
};

export default Sidebar;
