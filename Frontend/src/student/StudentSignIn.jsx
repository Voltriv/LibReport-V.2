import React from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { setAuthToken } from "../api";

const StudentSignIn = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Please enter your student ID or email and password.");
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { studentId: identifier.trim(), password });
      if (data?.token) {
        setAuthToken(data.token);
      }
      try {
        localStorage.setItem("lr_user", JSON.stringify(data?.user || {}));
      } catch {}
      try {
        window.dispatchEvent(new Event("lr-auth-change"));
      } catch {}
      const role = data?.user?.role;
      if (role === "librarian" || role === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/student/account", { replace: true });
      }
    } catch (e) {
      const msg = e?.response?.data?.error || "Unable to sign in. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative hidden bg-gradient-to-br from-brand-green via-brand-greenDark to-brand-green lg:block">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1529158062015-cad636e69505?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center opacity-40" />
            <div className="relative flex h-full flex-col items-start justify-end gap-4 p-10 text-white">
              <h2 className="text-2xl font-semibold">Welcome back!</h2>
              <p className="text-sm text-white/80">
                Sign in with your LibReport student account to explore the digital library, request services, and manage your visit
                history.
              </p>
            </div>
          </div>
          <div className="p-8 sm:p-10">
            <h1 className="text-2xl font-semibold text-slate-900">Student Sign In</h1>
            <p className="mt-1 text-sm text-slate-500">Use your student ID (00-0000-000000) or registered email.</p>
            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700">Student ID or Email</label>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  type="text"
                  placeholder="e.g. 03-2324-032246 or you@example.edu"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="Enter your password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-greenDark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">
              Need an account?{" "}
              <Link to="/student/signup" className="text-brand-green hover:underline">
                Sign up now
              </Link>
            </p>
            <p className="mt-2 text-center text-xs text-slate-500">
              Library staff can access the admin dashboard through the <Link to="/signin" className="text-brand-green hover:underline">librarian sign-in</Link> page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSignIn;
