import React, { useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/SignIn";
import "./styles/Auth.css";
import { initTheme, applyTheme } from "./theme";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const UsageHeatmaps = lazy(() => import("./pages/UsageHeatmaps"));
const Tracker = lazy(() => import("./pages/Tracker"));
const Reports = lazy(() => import("./pages/Reports"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const BooksManagement = lazy(() => import("./pages/BooksManagement"));
const BooksLibrary = lazy(() => import("./pages/BooksLibrary"));
const Admins = lazy(() => import("./pages/Admins"));

function RequireAuth({ children }) {
  if (!hasStoredToken()) return <Navigate to="/signin" replace />;
  const user = getStoredUser();
  if (!user) return <Navigate to="/signin" replace />;
  if (user.role !== "librarian" && user.role !== "admin") {
    return <Navigate to="/student/account" replace />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const user = getStoredUser();
  if (!user || (user.role !== "librarian" && user.role !== "admin")) {
    return <Navigate to="/signin" replace />;
  }
  return children;
}

function RequireStudent({ children }) {
  if (!hasStoredToken()) return <Navigate to="/student/signin" replace />;
  const user = getStoredUser();
  if (!user || (user.role !== "student" && user.role !== "librarian" && user.role !== "admin")) {
    return <Navigate to="/student/signin" replace />;
  }
  return children;
}

function PublicOnly({ children }) {
  const user = getStoredUser();
  if (user?.role === "librarian" || user?.role === "admin") return <Navigate to="/dashboard" replace />;
  if (user?.role === "student") return <Navigate to="/student/account" replace />;
  if (hasStoredToken()) return <Navigate to="/dashboard" replace />;
  return children;
}

function StudentPublicOnly({ children }) {
  const user = getStoredUser();
  if (user?.role === "student") return <Navigate to="/student/account" replace />;
  return children;
}

function App() {
  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    window.__setTheme = (t) => {
      applyTheme(t);
    };
    return () => {
      delete window.__setTheme;
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <Suspense fallback={<div className="p-6 text-slate-600 dark:text-slate-300">Loading...</div>}>
          <Routes>
            <Route path="/" element={<SignIn />} />
            <Route path="/signin" element={<SignIn />} />
            {/* SignUp disabled for admin-only system */}
            <Route path="/forgot" element={<Navigate to="/signin" replace />} />
            <Route path="/reset" element={<Navigate to="/signin" replace />} />
            <Route
              path="/dashboard"
              element={(
                <RequireAuth>
                  <RequireAdmin>
                    <Dashboard />
                  </RequireAdmin>
                </RequireAuth>
              )}
            />
            <Route
              path="/usage-heatmaps"
              element={(
                <RequireAuth>
                  <RequireAdmin>
                    <UsageHeatmaps />
                  </RequireAdmin>
                </RequireAuth>
              )}
            />
            <Route
              path="/tracker"
              element={(
                <RequireAuth>
                  <RequireAdmin>
                    <Tracker />
                  </RequireAdmin>
                </RequireAuth>
              )}
            />
            {/* Legacy PHP route removed: app is React + Tailwind only */}
            <Route
              path="/reports"
              element={(
                <RequireAuth>
                  <RequireAdmin>
                    <Reports />
                  </RequireAdmin>
                </RequireAuth>
              )}
            />
            <Route
              path="/library"
              element={(
                <RequireAuth>
                  <RequireAdmin>
                    <BooksLibrary />
                  </RequireAdmin>
                </RequireAuth>
              )}
            />
            <Route
              path="/usermanagement"
              element={(
                <RequireAuth>
                  <RequireAdmin>
                    <UserManagement />
                  </RequireAdmin>
                </RequireAuth>
              )}
            />
            <Route
              path="/booksmanagement"
              element={(
                <RequireAuth>
                  <RequireAdmin>
                    <BooksManagement />
                  </RequireAdmin>
                </RequireAuth>
              )}
            />
            <Route
              path="/admins"
              element={(
                <RequireAuth>
                  <RequireAdmin>
                    <Admins />
                  </RequireAdmin>
                </RequireAuth>
              )}
            />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
