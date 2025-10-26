import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import pfp from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api, { clearAuthSession, broadcastAuthChange, getStoredUser } from "../api";

const STUDENT_ID_PATTERN = /^\d{2}-\d{4}-\d{5,6}$/;

function formatStudentId(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 12);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 6);
  const part3 = digits.slice(6, 12);
  return [part1, part2, part3].filter(Boolean).join("-");
}

const Admins = () => {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState({ adminId: "", fullName: "", email: "", password: "", role: "librarian_staff" });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState("Account");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/admins", { params: { q } });
      setItems(data || []);
    } catch (e) {
      setError("Failed to load admins");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      const name = stored?.fullName || stored?.name || (stored?.email ? String(stored.email).split("@")[0] : null);
      if (name) setUserName(name);
    }
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    const adminId = formatStudentId(creating.adminId);
    if (!STUDENT_ID_PATTERN.test(adminId)) {
      setError("Admin ID must match 00-0000-00000 or 00-0000-000000");
      return;
    }
    try {
      await api.post("/admins", { ...creating, adminId });
      setCreating({ adminId: "", fullName: "", email: "", password: "", role: "librarian_staff" });
      load();
    } catch (e) {
      setError(e?.response?.data?.error || "Create failed");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this admin?")) return;
    try {
      await api.delete(`/admins/${id}`);
      load();
    } catch {}
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);

    clearAuthSession();
    broadcastAuthChange();

    navigate("/signin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-6 md:pl-8 lg:pl-10 pr-6 py-8 md:ml-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-stone-100">Admins</h1>
            <p className="text-slate-600 dark:text-stone-400 mt-1">Manage administrator accounts and permissions</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-stone-800 text-slate-700 dark:text-stone-300 px-4 py-2 hover:bg-slate-200 dark:hover:bg-stone-700 transition-colors duration-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
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
        </div>

        <h2 className="mt-6 text-2xl font-semibold text-slate-900 dark:text-stone-100">Admins</h2>

        <form
          className="mt-4 grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700"
          onSubmit={onCreate}
        >
          <input
            className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2"
            placeholder="Admin ID"
            value={creating.adminId}
            onChange={(e) =>
              setCreating((s) => ({ ...s, adminId: formatStudentId(e.target.value) }))
            }
            maxLength={14}
            inputMode="numeric"
            required
          />
          <input
            className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2"
            placeholder="Full Name"
            value={creating.fullName}
            onChange={(e) => setCreating((s) => ({ ...s, fullName: e.target.value }))}
            required
          />
          <input
            className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2"
            placeholder="Email (optional)"
            value={creating.email}
            onChange={(e) => setCreating((s) => ({ ...s, email: e.target.value }))}
          />
          <input
            type="password"
            className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2"
            placeholder="Password"
            value={creating.password}
            onChange={(e) => setCreating((s) => ({ ...s, password: e.target.value }))}
            required
          />
          <select
            className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2"
            value={creating.role}
            onChange={(e) => setCreating((s) => ({ ...s, role: e.target.value }))}
            required
          >
            <option value="librarian">Librarian</option>
            <option value="librarian_staff">Librarian Staffs</option>
          </select>
          <button type="submit" className="rounded-lg btn-brand px-4 py-2 text-white">
            Add
          </button>
          {error && <div className="md:col-span-6 text-sm text-red-600">{error}</div>}
        </form>

        <div className="mt-6 p-4 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 flex-1"
              placeholder="Search adminId / name / email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="rounded-lg px-3 py-2 btn-brand text-white" onClick={load} disabled={loading} type="button">
              {loading ? "Loading..." : "Search"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-stone-300">
                  <th className="py-2 pr-4">Admin ID</th>
                  <th className="py-2 pr-4">Full Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-stone-700">
                {items.map((a) => (
                  <tr key={a._id || a.id} className="text-slate-800 dark:text-stone-100">
                    <td className="py-2 pr-4">{a.adminId}</td>
                    <td className="py-2 pr-4">{a.fullName}</td>
                    <td className="py-2 pr-4">{a.email || "-"}</td>
                    <td className="py-2 pr-4">{a.role === 'librarian' ? 'Librarian' : a.role === 'librarian_staff' ? 'Librarian Staffs' : a.role}</td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        className="rounded px-3 py-1.5 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 mr-2"
                        onClick={() => {
                          const np = prompt(`New password for ${a.fullName}`);
                          if (!np) return;
                          api.patch(`/admins/${a._id || a.id}`, { newPassword: np }).then(load);
                        }}
                        type="button"
                      >
                        Reset Password
                      </button>
                      <button
                        className="rounded px-3 py-1.5 ring-1 ring-red-300 bg-white text-red-600"
                        onClick={() => onDelete(a._id || a.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
                Close
              </button>
              <button className="rounded-lg px-4 py-2 bg-red-600 text-white hover:bg-red-500" onClick={handleLogout}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admins;
