import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import api, { setAuthToken } from "../api";

const SignUp = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ studentId: "", email: "", fullName: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const validate = () => {
    const e = {};
    if (!/^\d{2}-\d{4}-\d{6}$/.test(form.studentId)) e.studentId = "Format: 00-0000-000000";
    if (!form.email.includes("@")) e.email = "Must contain @";
    if (!/^[A-Za-z .'-]+$/.test(form.fullName)) e.fullName = "Letters, spaces, apostrophes, hyphens, periods only";
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) e.password = "Min 8 chars, include letters and numbers";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const ok = validate();
    if (!ok) { setError("Please fix the highlighted fields"); return; }
    try {
      setLoading(true);
      const { data } = await api.post('/auth/signup', form);
      if (data?.token) setAuthToken(data.token);
      try { localStorage.setItem('lr_user', JSON.stringify(data.user || {})); } catch {}
      navigate("/dashboard");
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err.message || 'Signup failed';
      setError(status === 404 ? 'Service temporarily unavailable. Please try again.' : msg);
      if (/email/i.test(msg) && /exists|in use|duplicate/i.test(msg)) setErrors(s => ({ ...s, email: 'Email already in use' }));
      if (/studentid/i.test(msg) && /exists|in use|duplicate/i.test(msg)) setErrors(s => ({ ...s, studentId: 'Student ID already in use' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-50 dark:bg-stone-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-2xl shadow-lg bg-white/90 dark:bg-stone-900/70 ring-1 ring-slate-200 dark:ring-stone-700">
        {/* Brand panel */}
        <div className="hidden md:flex flex-col items-center justify-center gap-6 p-10 bg-gradient-to-br from-brand-green to-brand-greenDark text-white">
          <img src={logo} alt="University Logo" className="h-20 w-20 rounded-full shadow-md" />
          <h1 className="text-3xl font-semibold tracking-tight">LibReport</h1>
          <p className="text-white/90 text-center max-w-xs">Create your account to get started.</p>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Create Account</h2>
            <p className="text-slate-600 dark:text-stone-300 mt-1">Sign up to get started</p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Student ID</label>
              <input
                name="studentId"
                value={form.studentId}
                onChange={onChange}
                type="text"
                placeholder="e.g. 03-2324-032246"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              />
              {errors.studentId && <div className="mt-1 text-sm text-red-600">{errors.studentId}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Email Address</label>
              <input
                name="email"
                value={form.email}
                onChange={onChange}
                type="email"
                placeholder="Use an active email for verification"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              />
              {errors.email && <div className="mt-1 text-sm text-red-600">{errors.email}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Full Name</label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={onChange}
                type="text"
                placeholder="Enter your full name"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              />
              {errors.fullName && <div className="mt-1 text-sm text-red-600">{errors.fullName}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Password</label>
              <input
                name="password"
                value={form.password}
                onChange={onChange}
                type="password"
                placeholder="Must be at least 8 characters, with letters and numbers"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              />
              {errors.password && <div className="mt-1 text-sm text-red-600">{errors.password}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Confirm Password</label>
              <input
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={onChange}
                type="password"
                placeholder="Re-enter your password"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              />
              {errors.confirmPassword && <div className="mt-1 text-sm text-red-600">{errors.confirmPassword}</div>}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-stone-200">
                <input type="checkbox" required className="rounded border-slate-300 text-sky-600 dark:text-emerald-500 focus:ring-brand-gold" />
                I agree to the Terms and Conditions
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-stone-200">
                <input type="checkbox" required className="rounded border-slate-300 text-sky-600 dark:text-emerald-500 focus:ring-brand-gold" />
                I agree to the Privacy Policy
              </label>
            </div>

            <button
              type="submit"
              className="w-full inline-flex justify-center items-center rounded-lg bg-brand-gold text-white font-medium py-2.5 shadow-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
              disabled={loading}
            >
              {loading ? 'Signing Up…' : 'Sign Up'}
            </button>

            <p className="text-center text-sm text-slate-600 dark:text-stone-300">
              Already have an account? <Link to="/" className="text-brand-gold hover:underline">Log in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
