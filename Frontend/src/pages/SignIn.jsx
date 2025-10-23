import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import api, { persistAuthSession } from "../api";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { ArrowLeft } from "lucide-react"; // 👈 Add this import

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent";

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    try {
      const last = localStorage.getItem("lr_last_admin_id");
      if (last && typeof last === "string") setEmail(last);
    } catch {}
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", {
        studentId: email,
        password,
      });
      persistAuthSession({ token: data?.token, user: data?.user });
      try {
        localStorage.setItem("lr_last_admin_id", email || "");
      } catch {}
      try {
        localStorage.setItem("lr_user", JSON.stringify(data.user || {}));
      } catch {}
      navigate("/dashboard");
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || "Login failed";
      setError(
        status === 404
          ? "Service temporarily unavailable. Please try again."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-50 dark:bg-stone-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 overflow-hidden rounded-2xl shadow-lg bg-white/90 dark:bg-stone-900/70 ring-1 ring-slate-200 dark:ring-stone-700">
        {/* LEFT SIDE */}
        <div className="hidden md:flex flex-col items-center justify-center gap-6 p-10 bg-gradient-to-br from-brand-green to-brand-greenDark text-white">
          <img
            src={logo}
            alt="University Logo"
            className="h-24 w-24 rounded-full shadow-md"
          />
          <h1 className="text-3xl font-semibold tracking-tight">LibReport</h1>
          <p className="text-white/90 text-center max-w-xs">
            Library tracking, usage, and reporting made simple.
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="p-8 sm:p-10 relative">
          {/*BACK BUTTON HERE */}
          <button
            onClick={() => navigate("/studentsignin")}
            className="absolute top-4 left-4 flex items-center gap-2 text-slate-600 dark:text-stone-300 hover:text-brand-gold transition"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="mt-10 mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">
              Sign in to LibReport
            </h2>
            <p className="text-slate-600 dark:text-stone-300 mt-1">
              Log in to your account
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            {/* EMAIL / ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">
                Admin ID
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="Admin ID"
                autoFocus
                autoComplete="username"
              />
            </div>

            {/* PASSWORD FIELD */}
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-10`}
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-stone-200"
                >
                  {showPassword ? (
                    <AiOutlineEyeInvisible size={22} />
                  ) : (
                    <AiOutlineEye size={22} />
                  )}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center rounded-lg bg-brand-gold text-white font-medium py-2.5 shadow-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? "Signing in..." : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
