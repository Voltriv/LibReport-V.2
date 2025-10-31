import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

import { getStoredUser } from "../api";

const anchorSections = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "sections", label: "Library Sections" },
  { id: "services", label: "Library Services" },

  { id: "ebooks", label: "Ebook Collection" },
  { id: "support", label: "Support" }
];

const StudentLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [accountDropdown, setAccountDropdown] = React.useState(false);
  
  const [user, setUser] = React.useState(() => getStoredUser());
  const [activeAnchor, setActiveAnchor] = React.useState("home");

  React.useEffect(() => {
    const updateUser = () => setUser(getStoredUser());

    window.addEventListener("storage", updateUser);
    window.addEventListener("lr-auth-change", updateUser);
    return () => {
      window.removeEventListener("storage", updateUser);
      window.removeEventListener("lr-auth-change", updateUser);
    };
  }, []);

  React.useEffect(() => {
    setMenuOpen(false);

    if (location.pathname !== "/student") {
      setActiveAnchor("");
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (location.pathname !== "/student") return undefined;

    const handleScroll = () => {
      const offset = window.scrollY + 160;
      let current = "home";
      anchorSections.forEach((section) => {
        const element = document.getElementById(section.id);
        if (!element) return;
        const top = element.getBoundingClientRect().top + window.scrollY;
        if (top <= offset) {
          current = section.id;
        }
      });
      setActiveAnchor(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  const isStudent = user?.role === "student";
  const isCatalog = location.pathname.startsWith("/student/catalog");
  const isAccount = location.pathname.startsWith("/student/account");

  const scrollToSection = (target) => {
    const executeScroll = () => {
      const el = document.getElementById(target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    if (location.pathname !== "/student") {
      navigate("/student", { state: { scrollTo: target } });
    } else {
      executeScroll();
    }
  };

  const onAnchorClick = (target) => {
    setMenuOpen(false);

    setActiveAnchor(target);

    scrollToSection(target);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">

      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/95 backdrop-blur-md shadow-sm">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link to="/student" className="flex items-center gap-3 group">
              <div className="relative">
                <img src={logo} alt="LibReport" className="h-12 w-12 rounded-xl border-2 border-slate-200 shadow-sm transition-transform group-hover:scale-105" />
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-brand-green shadow-sm"></div>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold uppercase tracking-wide text-brand-green">LibReport</div>
                <div className="text-xs text-slate-500 font-medium">Student Portal</div>
              </div>
            </Link>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold lg:hidden"
            onClick={() => setMenuOpen((s) => !s)}
            aria-label="Toggle navigation"
          >
            <span>Menu</span>
            <svg className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
            </svg>
          </button>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-700 lg:flex">
            {anchorSections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onAnchorClick(item.id)}
                className={`student-nav-link transition-all duration-200 ${
                  location.pathname === "/student" && activeAnchor === item.id ? "is-active" : ""
                }`}
              >
                {item.label}
              </button>
            ))}

            <Link
              to="/student/catalog"
              className={`student-nav-link transition-all duration-200 ${isCatalog ? "is-active" : ""}`}
            >
              Catalog
            </Link>
            {isStudent ? (
              <div className="relative">
                <button
                  onClick={() => setAccountDropdown(prev => !prev)}
                  className={`btn-student-primary btn-pill-sm flex items-center gap-2 transition-all duration-200 ${isAccount ? "shadow-lg ring-2 ring-brand-gold/20" : ""}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  My Account
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${accountDropdown ? 'rotate-180' : ''}`}>
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                {accountDropdown && (
                  <div className="absolute right-0 mt-3 w-56 rounded-xl bg-white/95 backdrop-blur-md py-2 shadow-xl ring-1 ring-slate-200/60 focus:outline-none z-10 animate-in slide-in-from-top-2 duration-200">
                    <Link to="/student/account" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setAccountDropdown(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      My Account
                    </Link>
                    <Link to="/student/borrowed-books" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setAccountDropdown(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                      </svg>
                      Borrowed Books
                    </Link>
                    <Link to="/student/borrow-requests" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setAccountDropdown(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16v12H5.17L4 17.17V4z"/>
                        <path d="M8 8h8"/>
                        <path d="M8 12h6"/>
                      </svg>
                      Borrow Requests
                    </Link>
                    <Link to="/student/overdue-books" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setAccountDropdown(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      Overdue Books
                    </Link>
                    <Link to="/student/borrowing-history" className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors" onClick={() => setAccountDropdown(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                      Borrowing History
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/student/signin"
                  className="btn-student-outline btn-pill-sm transition-all duration-200 hover:shadow-md"
                >
                  Sign In
                </Link>
                <Link
                  to="/student/signup"
                  className="btn-student-primary btn-pill-sm transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-200/60 bg-white/95 backdrop-blur-md lg:hidden animate-in slide-in-from-top-2 duration-200">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-sm font-medium text-slate-700">
              {anchorSections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAnchorClick(item.id)}
                  className={`student-nav-link w-full rounded-xl px-4 py-3 text-left hover:bg-slate-50 transition-all duration-200 ${
                    location.pathname === "/student" && activeAnchor === item.id ? "is-active bg-brand-green-soft" : ""
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <Link
                to="/student/catalog"
                className={`student-nav-link w-full rounded-xl px-4 py-3 hover:bg-slate-50 transition-all duration-200 ${
                  isCatalog ? "is-active bg-brand-green-soft" : ""
                }`}
                onClick={() => setMenuOpen(false)}
              >
                Catalog
              </Link>
              {isStudent ? (
                <>
                  <div className="px-4 py-2 font-semibold text-slate-900 text-sm uppercase tracking-wide">My Account</div>
                  <Link
                    to="/student/account"
                    className="student-nav-link w-full rounded-xl px-6 py-3 hover:bg-slate-50 text-slate-700 transition-all duration-200"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/student/borrowed-books"
                    className="student-nav-link w-full rounded-xl px-6 py-3 hover:bg-slate-50 text-slate-700 transition-all duration-200"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Books/Borrowed Books
                  </Link>
                  <Link
                    to="/student/overdue-books"
                    className="student-nav-link w-full rounded-xl px-6 py-3 hover:bg-slate-50 text-slate-700 transition-all duration-200"
                    onClick={() => setMenuOpen(false)}
                  >
                    Overdue Books
                  </Link>
                  <Link
                    to="/student/borrowing-history"
                    className="student-nav-link w-full rounded-xl px-6 py-3 hover:bg-slate-50 text-slate-700 transition-all duration-200"
                    onClick={() => setMenuOpen(false)}
                  >
                    Borrowing History
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/student/signin"
                    className="btn-student-outline btn-pill-sm w-full justify-center transition-all duration-200 hover:shadow-md"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/student/signup"
                    className="btn-student-primary btn-pill-sm w-full justify-center transition-all duration-200 hover:shadow-lg"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-slate-200/60 bg-gradient-to-r from-white via-slate-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-sm text-slate-600 lg:px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src={logo} alt="LibReport" className="h-8 w-8 rounded-lg border border-slate-200" />
                <div>
                  <div className="text-sm font-bold uppercase tracking-wide text-brand-green">LibReport</div>
                  <div className="text-xs text-slate-500">Student Portal</div>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Your gateway to academic resources, digital collections, and library services.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/student" className="block text-sm text-slate-600 hover:text-brand-green transition-colors">Home</Link>
                <Link to="/student/catalog" className="block text-sm text-slate-600 hover:text-brand-green transition-colors">Catalog</Link>
                <Link to="/student/signin" className="block text-sm text-slate-600 hover:text-brand-green transition-colors">Sign In</Link>
                <Link to="/student/signup" className="block text-sm text-slate-600 hover:text-brand-green transition-colors">Sign Up</Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Support</h3>
              <div className="space-y-2">
                <Link to="/signin" className="block text-sm text-slate-600 hover:text-brand-green transition-colors">Admin Portal</Link>
                <a href="mailto:library@phinmaed.com" className="block text-sm text-slate-600 hover:text-brand-green transition-colors">Contact Librarians</a>
                <p className="text-xs text-slate-500">Monday-Friday: 7:30 AM - 6:00 PM</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 border-t border-slate-200/60 pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">&copy; {new Date().getFullYear()} LibReport Student Portal. All rights reserved.</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Built with ❤️ for students</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentLayout;
