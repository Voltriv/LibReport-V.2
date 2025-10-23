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
    <div className="min-h-screen bg-slate-50 text-slate-900">

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <Link to="/student" className="flex items-center gap-2">
              <img src={logo} alt="LibReport" className="h-10 w-10 rounded-full border border-slate-200" />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold uppercase tracking-wide text-brand-green">LibReport</div>
                <div className="text-xs text-slate-500">Student Portal</div>
              </div>
            </Link>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold lg:hidden"
            onClick={() => setMenuOpen((s) => !s)}
            aria-label="Toggle navigation"
          >
            <span>Menu</span>
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2zm0 4h14a1 1 0 010 2H3a1 1 0 010-2z" clipRule="evenodd" />
            </svg>
          </button>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 lg:flex">
            {anchorSections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onAnchorClick(item.id)}

                className={`student-nav-link ${
                  location.pathname === "/student" && activeAnchor === item.id ? "is-active" : ""
                }`}

              >
                {item.label}
              </button>
            ))}

            <Link
              to="/student/catalog"
              className={`student-nav-link ${isCatalog ? "is-active" : ""}`}
            >
              Catalog
            </Link>
            {isStudent ? (
              <div className="relative">
                <button
                  onClick={() => setAccountDropdown(prev => !prev)}
                  className={`btn-student-primary btn-pill-sm flex items-center gap-1 ${isAccount ? "shadow-lg" : ""}`}
                >
                  My Account
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                {accountDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <Link to="/student/account" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => setAccountDropdown(false)}>
                      My Account
                    </Link>
                    <Link to="/student/borrowed-books" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => setAccountDropdown(false)}>
                      Borrowed Books
                    </Link>
                    <Link to="/student/overdue-books" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => setAccountDropdown(false)}>
                      Overdue Books
                    </Link>
                    <Link to="/student/borrowing-history" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100" onClick={() => setAccountDropdown(false)}>
                      Borrowing History
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">

                <Link
                  to="/student/signin"
                  className="btn-student-outline btn-pill-sm"
                >

                  Sign In
                </Link>
                <Link
                  to="/student/signup"

                  className="btn-student-primary btn-pill-sm"

                >
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        </div>
        {menuOpen && (
          <div className="border-t border-slate-200 bg-white lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-sm font-medium text-slate-700">
              {anchorSections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAnchorClick(item.id)}

                  className={`student-nav-link w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 ${
                    location.pathname === "/student" && activeAnchor === item.id ? "is-active" : ""
                  }`}

                >
                  {item.label}
                </button>
              ))}
              <Link
                to="/student/catalog"

                className={`student-nav-link w-full rounded-md px-3 py-2 hover:bg-slate-100 ${
                  isCatalog ? "is-active" : ""
                }`}

                onClick={() => setMenuOpen(false)}
              >
                Catalog
              </Link>
              {isStudent ? (
                <>
                  <div className="px-3 py-2 font-medium text-slate-900">My Account</div>
                  <Link
                    to="/student/account"
                    className="student-nav-link w-full rounded-md px-6 py-2 hover:bg-slate-100 text-slate-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    to="/student/borrowed-books"
                    className="student-nav-link w-full rounded-md px-6 py-2 hover:bg-slate-100 text-slate-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Books/Borrowed Books
                  </Link>
                  <Link
                    to="/student/overdue-books"
                    className="student-nav-link w-full rounded-md px-6 py-2 hover:bg-slate-100 text-slate-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    Overdue Books
                  </Link>
                  <Link
                    to="/student/borrowing-history"
                    className="student-nav-link w-full rounded-md px-6 py-2 hover:bg-slate-100 text-slate-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    Borrowing History
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/student/signin"

                    className="btn-student-outline btn-pill-sm w-full justify-center"

                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/student/signup"

                    className="btn-student-primary btn-pill-sm w-full justify-center"

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

      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-600 lg:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} LibReport Student Portal. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/student" className="hover:text-brand-green">Home</Link>
              <Link to="/student/catalog" className="hover:text-brand-green">Catalog</Link>
              <Link to="/signin" className="hover:text-brand-green">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentLayout;
