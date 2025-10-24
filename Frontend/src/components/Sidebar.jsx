import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/fav_logo.png";
import ThemeToggle from "./ThemeToggle";

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const baseLink =
    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-white/90 hover:bg-white/10 hover:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 group";
  const activeLink = "bg-white/20 text-white shadow-lg ring-1 ring-white/20";
  const primaryNav = [
    { to: "/dashboard", label: "Dashboard", icon: "📊" },
    { to: "/tracker", label: "Tracker", icon: "📍" },
    { to: "/usage-heatmaps", label: "Usage Heatmaps", icon: "🔥" },
    { to: "/reports", label: "Reports", icon: "📈" },
    { to: "/library", label: "Library", icon: "📚" },
  ];
  const managementNav = [
    { to: "/usermanagement", label: "User Management", icon: "👥" },
    { to: "/booksmanagement", label: "Books Management", icon: "📖" },
    { to: "/admins", label: "Admins", icon: "👤" },
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

      <aside className={`fixed top-0 left-0 h-full w-80 transform transition-all duration-300 ease-out bg-gradient-to-br from-brand-green via-brand-green to-brand-greenDark text-white shadow-2xl z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between gap-4 p-6 border-b border-white/20 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={logo} alt="Logo" className="h-12 w-12 rounded-xl shadow-lg" />
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-gold shadow-sm"></div>
            </div>
            <div>
              <span className="text-xl font-bold">LibReport</span>
              <div className="text-xs text-white/70 font-medium">Admin Portal</div>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <nav className="p-6 space-y-6 overflow-y-auto h-[calc(100%-5rem)]">
          <div className="space-y-2">
            <h3 className="px-4 py-2 text-xs font-bold text-white/60 uppercase tracking-wider">Overview</h3>
            {primaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ""}`}
              >
                <span className="text-lg group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="border-t border-white/20 pt-6">
            <h3 className="px-4 py-2 text-xs font-bold text-white/60 uppercase tracking-wider">Management</h3>
            <div className="space-y-2">
              {managementNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => `${baseLink} ${isActive ? activeLink : ""}`}
                >
                  <span className="text-lg group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* Spacer for layout on md+ */}
      <div className="hidden md:block w-80 shrink-0" />
    </>
  );
};

export default Sidebar;
