import React from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { persistAuthSession } from "../api";

const STUDENT_ID_PATTERN = /^\d{2}-\d{4}-\d{6}$/;
const DEPARTMENTS = ["CAHS", "CITE", "CCJE", "CEA", "CELA", "COL", "SHS"];

function formatStudentId(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 12);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 6);
  const part3 = digits.slice(6, 12);
  return [part1, part2, part3].filter(Boolean).join('-');
}

const StudentSignUp = () => {
  const navigate = useNavigate();
  const [form, setForm] = React.useState({
    studentId: "",
    email: "",
    fullName: "",
    department: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState({});
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const onChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "studentId") {
      nextValue = formatStudentId(value);
    }
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!STUDENT_ID_PATTERN.test(form.studentId.trim())) {
      nextErrors.studentId = "Format must be 00-0000-000000";

    }
    if (!form.email.includes("@")) {
      nextErrors.email = "Please enter a valid email";
    }
    if (!/^[A-Za-z .'-]+$/.test(form.fullName.trim())) {
      nextErrors.fullName = "Name may contain letters, spaces, apostrophes, hyphens, and periods";
    }
    if (!form.department.trim()) {
      nextErrors.department = "Please select your department";
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      nextErrors.password = "Password must be 8+ characters with letters and numbers";
    }
    if (form.password !== form.confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) {
      setError("Please correct the highlighted fields.");
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.post("/auth/signup", form);

      persistAuthSession({ token: data?.token, user: data?.user });

      navigate("/student/account", { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.error || "Unable to sign up right now. Please try again.";
      setError(msg);
      if (/studentid/i.test(msg) && /exists|in use|duplicate/i.test(msg)) {
        setErrors((prev) => ({ ...prev, studentId: "Student ID already registered" }));
      }
      if (/email/i.test(msg) && /exists|in use|duplicate/i.test(msg)) {
        setErrors((prev) => ({ ...prev, email: "Email already registered" }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2">

          <div className="relative hidden bg-gradient-to-br from-brand-green via-brand-greenDark to-[#183321] md:flex md:flex-col md:justify-between">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center opacity-30" />
            <div className="relative flex h-full flex-col justify-between p-10 text-white">
              <div className="space-y-4">
                <span className="btn-pill-sm bg-white/15 text-white/85">

                  Join the library community
                </span>
                <h2 className="mt-4 text-2xl font-semibold">Create your LibReport student account</h2>
                <p className="mt-3 text-sm text-white/80">
                  Register to save catalog searches, download ebooks, and request services tailored to your program.
                </p>
              </div>

              <div className="text-xs text-white/75">
                Already part of the team?{" "}
                <Link to="/signin" className="student-inline-link text-white">
                  Librarian sign-in
                </Link>

              </div>
            </div>
          </div>
          <div className="p-8 sm:p-10">
            <h1 className="text-2xl font-semibold text-slate-900">Student Sign Up</h1>
            <p className="mt-1 text-sm text-slate-500">Fill in your details to activate the student portal.</p>
            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm font-medium text-slate-700">Student ID</label>
                <input
                  name="studentId"
                  value={form.studentId}
                  onChange={onChange}
                  placeholder="00-0000-000000"
                  maxLength={14}
                  inputMode="numeric"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  required
                />
                {errors.studentId && <p className="mt-1 text-xs text-red-600">{errors.studentId}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="library.fvr.up@phinmaed.com"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  required
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={onChange}
                  placeholder="Your complete name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  required
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Department</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={onChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  required
                >
                  <option value="">Select your department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {errors.department && <p className="mt-1 text-xs text-red-600">{errors.department}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Password</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="Minimum 8 characters with letters and numbers"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  required
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={onChange}
                  placeholder="Re-enter your password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  required
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={loading} className="btn-student-primary w-full">

                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-slate-600">

              Already have an account?{" "}
              <Link to="/student/signin" className="student-inline-link">
                Sign in
              </Link>

            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSignUp;
