import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import pfp from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api from "../api";

const UserManagement = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState("Account");
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  useEffect(() => {
    api
      .get("/admin/users")
      .then((r) => {
        const items = (r.data || []).map((u) => ({
          id: u._id || u.id,
          fullName: u.fullName || u.name || "-",
          studentId: u.studentId || "-",
          course: u.role || "-",
          registrationDate: u.createdAt ? new Date(u.createdAt).toLocaleString() : "-",
          status: u.status || "active",
        }));
        setUsers(items);
      })
      .catch(() => setUsers([]));
  }, []);

  const [selectedUser, setSelectedUser] = useState(null);
  const handleEdit = (user) => {
    setSelectedUser({ ...user });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return setIsModalOpen(false);
    try {
      await api.patch(`/admin/users/${selectedUser.id}/role`, { role: selectedUser.course || "student" });
      if (selectedUser.status) {
        await api.patch(`/admin/users/${selectedUser.id}/status`, { status: selectedUser.status });
      }
      setIsModalOpen(false);
      const r = await api.get("/admin/users");
      const items = (r.data || []).map((u) => ({
        id: u._id || u.id,
        fullName: u.fullName || u.name || "-",
        studentId: u.studentId || "-",
        course: u.role || "-",
        registrationDate: u.createdAt ? new Date(u.createdAt).toLocaleString() : "-",
        status: u.status || "active",
      }));
      setUsers(items);
    } catch {
      setIsModalOpen(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    setIsDropdownOpen(false);
    try {
      localStorage.removeItem("lr_token");
      localStorage.removeItem("lr_user");
    } catch {}
    navigate("/signin", { replace: true });
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lr_user");
      if (raw) {
        const u = JSON.parse(raw);
        const name = u?.fullName || u?.name || (u?.email ? String(u.email).split("@")[0] : null);
        if (name) setUserName(name);
      }
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        <div className="flex items-center justify-end">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-stone-900/60 ring-1 ring-slate-200 dark:ring-stone-700 px-2 py-1 shadow hover:shadow-md"
            >
              <img src={pfp} alt="Profile" className="h-8 w-8 rounded-full" />
              <span className="text-sm text-slate-700 dark:text-stone-200 max-w-[12rem] truncate" title={userName}>
                {userName}
              </span>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-md bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg p-1">
                <button
                  className="w-full text-left rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setShowLogoutModal(true)}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <section className="mt-6 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">User Management</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-stone-300">
                  <th className="py-2 pr-4">Full Name</th>
                  <th className="py-2 pr-4">Student ID</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Registered</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="text-slate-800 dark:text-stone-100">
                    <td className="py-2 pr-4">{user.fullName}</td>
                    <td className="py-2 pr-4">{user.studentId}</td>
                    <td className="py-2 pr-4">{user.course}</td>
                    <td className="py-2 pr-4">{user.registrationDate}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                          user.status === "disabled"
                            ? "bg-rose-600 text-white"
                            : user.status === "pending"
                            ? "bg-amber-500 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        className="rounded-lg px-3 py-1.5 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Edit User</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={selectedUser.fullName}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Student ID</label>
                  <input
                    type="text"
                    name="studentId"
                    value={selectedUser.studentId}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Role</label>
                  <input
                    type="text"
                    name="course"
                    value={selectedUser.course}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Status</label>
                  <select
                    name="status"
                    value={selectedUser.status}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button className="rounded-lg px-4 py-2 bg-brand-gold text-white hover:opacity-90" onClick={handleSave}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

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
      </main>
    </div>
  );
};

export default UserManagement;
