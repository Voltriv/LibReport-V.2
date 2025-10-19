import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import "./styles/Auth.css";
import Dashboard from "./pages/Dashboard";
import UsageHeatmaps from "./pages/UsageHeatmaps";
import Tracker from "./pages/Tracker";
import Reports from "./pages/Reports";
import UserManagement from "./pages/UserManagement";
import BooksManagement from "./pages/BooksManagement";
import BooksLibrary from "./pages/BooksLibrary";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { initTheme, applyTheme } from "./theme";

function RequireAuth({ children }) {
  try {
    const t = localStorage.getItem('lr_token');
    if (!t) return <Navigate to="/signin" replace />;
  } catch {}
  return children;
}

function RequireAdmin({ children }) {
  try {
    const raw = localStorage.getItem('lr_user');
    const u = raw ? JSON.parse(raw) : null;
    if (!u || u.role !== 'admin') return <Navigate to="/dashboard" replace />;
  } catch {}
  return children;
}

function App() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const t = initTheme();
    setTheme(t);
  }, []);

  // Provide lightweight theme setter via window for quick access (optional)
  useEffect(() => {
    window.__setTheme = (t) => { applyTheme(t); setTheme(t); };
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
    
          <Route path="/" element={<SignIn />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset" element={<ResetPassword />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/usage-heatmaps" element={<RequireAuth><UsageHeatmaps /></RequireAuth>} />
          <Route path="/tracker" element={<RequireAuth><Tracker /></RequireAuth>} />
          {/* Legacy PHP route removed: app is React + Tailwind only */}
          <Route path="/reports" element={<RequireAuth><Reports /></RequireAuth>} />
          <Route path="/library" element={<RequireAuth><BooksLibrary /></RequireAuth>} />
          <Route path="/usermanagement" element={<RequireAuth><RequireAdmin><UserManagement /></RequireAdmin></RequireAuth>} />
          <Route path="/booksmanagement" element={<RequireAuth><RequireAdmin><BooksManagement /></RequireAdmin></RequireAuth>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
