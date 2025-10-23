import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
<<<<<<< ours
=======
import { getStoredUser } from "../api";
>>>>>>> theirs

const anchorSections = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "sections", label: "Library Sections" },
  { id: "services", label: "Library Services" },
<<<<<<< ours
  { id: "resources", label: "Electronic Resources" },
  { id: "ebooks", label: "Ebook Collection" }
];

function readStoredUser() {
  try {
    const raw = localStorage.getItem("lr_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

=======
  { id: "ebooks", label: "Ebook Collection" },
  { id: "support", label: "Support" }
];

>>>>>>> theirs
const StudentLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);
<<<<<<< ours
  const [user, setUser] = React.useState(() => readStoredUser());

  React.useEffect(() => {
    const updateUser = () => setUser(readStoredUser());
=======
  const [user, setUser] = React.useState(() => getStoredUser());
  const [activeAnchor, setActiveAnchor] = React.useState("home");

  React.useEffect(() => {
    const updateUser = () => setUser(getStoredUser());
>>>>>>> theirs
    window.addEventListener("storage", updateUser);
    window.addEventListener("lr-auth-change", updateUser);
    return () => {
      window.removeEventListener("storage", updateUser);
      window.removeEventListener("lr-auth-change", updateUser);
    };
  }, []);

  React.useEffect(() => {
    setMenuOpen(false);
<<<<<<< ours
  }, [location.pathname]);

  const isStudent = user?.role === "student";
=======
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
>>>>>>> theirs

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
<<<<<<< ours
=======
    setActiveAnchor(target);
>>>>>>> theirs
    scrollToSection(target);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
<<<<<<< ours
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
=======
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
>>>>>>> theirs
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
<<<<<<< ours
                className="transition hover:text-brand-green"
=======
                className={`student-nav-link ${
                  location.pathname === "/student" && activeAnchor === item.id ? "is-active" : ""
                }`}
>>>>>>> theirs
              >
                {item.label}
              </button>
            ))}
<<<<<<< ours
            <Link to="/student/catalog" className="transition hover:text-brand-green">
              Catalog
            </Link>
            {isStudent ? (
              <Link to="/student/account" className="rounded-full bg-brand-green px-4 py-2 text-white shadow-sm transition hover:bg-brand-greenDark">
=======
            <Link
              to="/student/catalog"
              className={`student-nav-link ${isCatalog ? "is-active" : ""}`}
            >
              Catalog
            </Link>
            {isStudent ? (
              <Link
                to="/student/account"
                className={`btn-student-primary btn-pill-sm ${isAccount ? "shadow-lg" : ""}`}
              >
>>>>>>> theirs
                My Account
              </Link>
            ) : (
              <div className="flex items-center gap-3">
<<<<<<< ours
                <Link to="/student/signin" className="transition hover:text-brand-green">
=======
                <Link
                  to="/student/signin"
                  className="btn-student-outline btn-pill-sm"
                >
>>>>>>> theirs
                  Sign In
                </Link>
                <Link
                  to="/student/signup"
<<<<<<< ours
                  className="rounded-full bg-brand-green px-4 py-2 text-white shadow-sm transition hover:bg-brand-greenDark"
=======
                  className="btn-student-primary btn-pill-sm"
>>>>>>> theirs
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
<<<<<<< ours
                  className="w-full rounded-md px-3 py-2 text-left hover:bg-slate-100"
=======
                  className={`student-nav-link w-full rounded-md px-3 py-2 text-left hover:bg-slate-100 ${
                    location.pathname === "/student" && activeAnchor === item.id ? "is-active" : ""
                  }`}
>>>>>>> theirs
                >
                  {item.label}
                </button>
              ))}
              <Link
                to="/student/catalog"
<<<<<<< ours
                className="rounded-md px-3 py-2 hover:bg-slate-100"
=======
                className={`student-nav-link w-full rounded-md px-3 py-2 hover:bg-slate-100 ${
                  isCatalog ? "is-active" : ""
                }`}
>>>>>>> theirs
                onClick={() => setMenuOpen(false)}
              >
                Catalog
              </Link>
              {isStudent ? (
                <Link
                  to="/student/account"
<<<<<<< ours
                  className="rounded-md px-3 py-2 hover:bg-slate-100"
=======
                  className={`student-nav-link w-full rounded-md px-3 py-2 hover:bg-slate-100 ${
                    isAccount ? "is-active" : ""
                  }`}
>>>>>>> theirs
                  onClick={() => setMenuOpen(false)}
                >
                  My Account
                </Link>
              ) : (
                <>
                  <Link
                    to="/student/signin"
<<<<<<< ours
                    className="rounded-md px-3 py-2 hover:bg-slate-100"
=======
                    className="btn-student-outline btn-pill-sm w-full justify-center"
>>>>>>> theirs
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/student/signup"
<<<<<<< ours
                    className="rounded-md px-3 py-2 hover:bg-slate-100"
=======
                    className="btn-student-primary btn-pill-sm w-full justify-center"
>>>>>>> theirs
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
