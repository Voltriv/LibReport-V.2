import React, { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import pfp from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api, { broadcastAuthChange, clearAuthSession, getStoredUser } from "../api";

const FACULTY_ID_PATTERN = /^\d{2}-\d{4}-\d{6}$/;
const departments = ["CAHS", "CITE", "CCJE", "CEA", "CELA", "COL", "SHS", "Other"];

function formatFacultyId(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 12);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 6);
  const part3 = digits.slice(6, 12);
  return [part1, part2, part3].filter(Boolean).join("-");
}

const Faculty = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState("Account");

  const [form, setForm] = useState({
    fullName: "",
    facultyId: "",
    email: "",
    department: "",
    password: "",
    confirmPassword: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const loadFaculty = useCallback(async (term = "") => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/faculty", { params: term ? { q: term } : {} });
      const items = Array.isArray(data)
        ? data.map((item) => {
            const rawId = item.id || item._id;
            return { ...item, id: rawId ? String(rawId) : undefined };
          })
        : [];
      setFaculty(items);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to load faculty list");
      setFaculty([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaculty();
  }, [loadFaculty]);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      const name = stored?.fullName || stored?.name || (stored?.email ? String(stored.email).split("@")[0] : null);
      if (name) setUserName(name);
    }
  }, []);

  const handleChange = (field) => (event) => {
    const value = field === "facultyId" ? formatFacultyId(event.target.value) : event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const facultyId = formatFacultyId(form.facultyId);
    if (!FACULTY_ID_PATTERN.test(facultyId)) {
      setError("Faculty ID must match 00-0000-000000");
      return;
    }
    if (!form.department) {
      setError("Please select a department");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError("Password must be at least 8 characters with letters and numbers");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/faculty", { ...form, facultyId });
      setSuccess("Faculty account created successfully");
      setForm({ fullName: "", facultyId: "", email: "", department: "", password: "", confirmPassword: "" });
      loadFaculty(search);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to create faculty account");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaculty = useMemo(() => faculty, [faculty]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/faculty/${id}`, { status });
      setFaculty((prev) =>
        prev.map((item) => {
          const matches = item.id === id || (item._id && String(item._id) === id);
          return matches ? { ...item, status } : item;
        })
      );
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to update status");
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    clearAuthSession();
    broadcastAuthChange();
    navigate("/signin", { replace: true });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    loadFaculty(search.trim());
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-6 md:pl-8 lg:pl-10 pr-6 py-8 md:ml-80">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-stone-100">Add Faculty Account</h1>
            <p className="text-slate-600 dark:text-stone-400 mt-1">Register faculty members to provide portal access.</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="inline-flex items-center gap-3 rounded-xl bg-white/90 dark:bg-stone-900/80 ring-1 ring-slate-200 dark:ring-stone-700 px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <img src={pfp} alt="Profile" className="h-9 w-9 rounded-full ring-2 ring-brand-gold/20" />
              <span className="text-sm font-medium text-slate-700 dark:text-stone-200 max-w-[12rem] truncate" title={userName}>
                {userName}
              </span>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-3 w-48 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-xl p-2 z-50">
                <button
                  className="w-full text-left rounded-lg px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 flex items-center gap-2"
                  onClick={() => setShowLogoutModal(true)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-stone-100 mb-4">Faculty Details</h2>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={handleChange("fullName")}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    placeholder="Juan Dela Cruz"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Faculty ID</label>
                  <input
                    type="text"
                    value={form.facultyId}
                    onChange={handleChange("facultyId")}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 font-mono text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    placeholder="00-0000-000000"
                    inputMode="numeric"
                    maxLength={14}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange("email")}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Department</label>
                  <select
                    value={form.department}
                    onChange={handleChange("department")}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    required
                  >
                    <option value="" disabled>
                      Select a department
                    </option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={handleChange("password")}
                      className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Confirm Password</label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                      className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {error && <div className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 px-4 py-3 text-sm">{error}</div>}
                {success && <div className="rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 px-4 py-3 text-sm">{success}</div>}

                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center gap-2 rounded-xl bg-brand-green text-white px-4 py-3 font-semibold hover:bg-brand-greenDark transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Save Faculty
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg p-6 h-full flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-stone-100">Faculty Directory</h2>
                  <p className="text-sm text-slate-500 dark:text-stone-400">{loading ? "Loading faculty..." : `${faculty.length} entr${faculty.length === 1 ? "y" : "ies"}`} found</p>
                </div>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-2 text-sm"
                    placeholder="Search faculty name, ID, or department"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 px-4 py-2 text-sm hover:bg-slate-200 dark:hover:bg-stone-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto -mx-6 sm:-mx-4 px-6 sm:px-4">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500 dark:text-stone-400">
                    <tr>
                      <th className="py-3 pr-4 font-semibold">Full Name</th>
                      <th className="py-3 pr-4 font-semibold">Faculty ID</th>
                      <th className="py-3 pr-4 font-semibold">Department</th>
                      <th className="py-3 pr-4 font-semibold">Email</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-stone-700">
                    {filteredFaculty.map((item) => {
                      const id = item.id || (item._id ? String(item._id) : undefined);
                      return (
                        <tr key={id} className="text-slate-800 dark:text-stone-100">
                          <td className="py-3 pr-4 font-medium">{item.fullName}</td>
                          <td className="py-3 pr-4 font-mono">{item.facultyId}</td>
                          <td className="py-3 pr-4">{item.department || "-"}</td>
                          <td className="py-3 pr-4">{item.email || "-"}</td>
                          <td className="py-3 pr-4">
                            <select
                              value={item.status || "active"}
                              onChange={(e) => handleStatusChange(id, e.target.value)}
                              className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-2 py-1 text-xs"
                            >
                              <option value="active">Active</option>
                              <option value="disabled">Disabled</option>
                              <option value="pending">Pending</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                    {!filteredFaculty.length && !loading && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-stone-400">
                          No faculty records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Are you sure you want to logout?</h3>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-lg px-4 py-2 bg-red-600 text-white hover:bg-red-500"
                onClick={handleLogout}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Faculty;
