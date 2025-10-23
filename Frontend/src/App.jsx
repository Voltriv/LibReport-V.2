import React, { useEffect, Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/SignIn";
import "./styles/Auth.css";
import { initTheme, applyTheme } from "./theme";
import { getStoredUser, hasStoredToken } from "./api";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const UsageHeatmaps = lazy(() => import("./pages/UsageHeatmaps"));
const Tracker = lazy(() => import("./pages/Tracker"));
const Reports = lazy(() => import("./pages/Reports"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const BooksManagement = lazy(() => import("./pages/BooksManagement"));
const BooksLibrary = lazy(() => import("./pages/BooksLibrary"));
const Admins = lazy(() => import("./pages/Admins"));
const StudentLayout = lazy(() => import("./student/StudentLayout"));
const StudentLanding = lazy(() => import("./student/StudentLanding"));
const StudentCatalog = lazy(() => import("./student/StudentCatalog"));
const StudentSignIn = lazy(() => import("./student/StudentSignIn"));
const StudentSignUp = lazy(() => import("./student/StudentSignUp"));
const StudentAccount = lazy(() => import("./student/StudentAccount"));
const StudentBorrowedBooks = lazy(() => import("./student/StudentBorrowedBooks"));
const StudentOverdueBooks = lazy(() => import("./student/StudentOverdueBooks"));
const StudentBorrowingHistory = lazy(() => import("./student/StudentBorrowingHistory"));

function RequireAuth({ children }) {
  if (!hasStoredToken()) return <Navigate to="/signin" replace />;
  const user = getStoredUser();
  if (!user) return <Navigate to="/signin" replace />;
  if (user.role !== "librarian" && user.role !== "admin" && user.role !== "librarian_staff") {
    return <Navigate to="/student/account" replace />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const user = getStoredUser();
  if (!user || (user.role !== "librarian" && user.role !== "admin" && user.role !== "librarian_staff")) {
    return <Navigate to="/signin" replace />;

  }
  return children;
}

function RequireStudent({ children }) {
  if (!hasStoredToken()) return <Navigate to="/student/signin" replace />;
  const user = getStoredUser();
  if (!user || (user.role !== "student" && user.role !== "librarian" && user.role !== "admin" && user.role !== "librarian_staff")) {

    return <Navigate to="/student/signin" replace />;
  }
  return children;
}

function PublicOnly({ children }) {
  const user = getStoredUser();

  if (user?.role === "librarian" || user?.role === "admin" || user?.role === "librarian_staff") return <Navigate to="/dashboard" replace />;

  if (user?.role === "student") return <Navigate to="/student/account" replace />;
  if (hasStoredToken()) return <Navigate to="/dashboard" replace />;
  return children;
}

function StudentPublicOnly({ children }) {
  const user = getStoredUser();
  if (user?.role === "student") return <Navigate to="/student/account" replace />;
  return children;
}

function DefaultRedirect() {
  const user = getStoredUser();

  if (user?.role === "librarian" || user?.role === "admin" || user?.role === "librarian_staff") return <Navigate to="/dashboard" replace />;
  if (user?.role === "student") return <Navigate to="/student/account" replace />;
  return <Navigate to="/student/signin" replace />;

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
            <Route path="/" element={<DefaultRedirect />} />
            <Route path="/student/*" element={<StudentLayout />}>
              <Route index element={<StudentLanding />} />
              <Route path="catalog" element={<RequireStudent><StudentCatalog /></RequireStudent>} />
              <Route path="account" element={<RequireStudent><StudentAccount /></RequireStudent>} />
              <Route path="borrowed-books" element={<RequireStudent><StudentBorrowedBooks /></RequireStudent>} />
              <Route path="overdue-books" element={<RequireStudent><StudentOverdueBooks /></RequireStudent>} />
              <Route path="borrowing-history" element={<RequireStudent><StudentBorrowingHistory /></RequireStudent>} />
              <Route path="signin" element={<StudentPublicOnly><StudentSignIn /></StudentPublicOnly>} />
              <Route path="signup" element={<StudentPublicOnly><StudentSignUp /></StudentPublicOnly>} />
            </Route>
            <Route path="/signin" element={<PublicOnly><SignIn /></PublicOnly>} />
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

            <Route path="*" element={<Navigate to="/student/signin" replace />} />

          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
