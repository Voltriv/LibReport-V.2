import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import pfp from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api, { clearAuthSession, broadcastAuthChange, getStoredUser } from "../api";

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

    clearAuthSession();
    broadcastAuthChange();

    navigate("/signin", { replace: true });
  };

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      const name = stored?.fullName || stored?.name || (stored?.email ? String(stored.email).split("@")[0] : null);
      if (name) setUserName(name);
    }
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-6 md:pl-8 lg:pl-10 pr-6 py-8 md:ml-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-stone-100">User Management</h1>
            <p className="text-slate-600 dark:text-stone-400 mt-1">Manage library users and their permissions</p>
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
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
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
              {isDropdownOpen && (
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

        {/* Stats Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 ring-1 ring-blue-200 dark:ring-blue-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Users</p>
                <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">{users.length}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 ring-1 ring-green-200 dark:ring-green-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Active Users</p>
                <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-100">
                  {users.filter(u => u.status === 'active').length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-green-500 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 ring-1 ring-amber-200 dark:ring-amber-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending Users</p>
                <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {users.filter(u => u.status === 'pending').length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* Users Table */}
        <section className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-stone-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-stone-100">User Directory</h2>
              <div className="text-sm text-slate-500 dark:text-stone-400">
                {users.length} {users.length === 1 ? 'user' : 'users'} registered
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 dark:bg-stone-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-stone-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-stone-800 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-green to-brand-greenDark flex items-center justify-center">
                          <span className="text-sm font-bold text-white">
                            {user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-stone-100">{user.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-stone-400 font-mono">{user.studentId}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-stone-700 text-slate-800 dark:text-stone-200">
                        {user.course}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-stone-400">{user.registrationDate}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === "disabled"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                            : user.status === "pending"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                          user.status === "disabled"
                            ? "bg-red-400"
                            : user.status === "pending"
                            ? "bg-amber-400"
                            : "bg-green-400"
                        }`}></div>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-stone-300 bg-slate-100 dark:bg-stone-800 hover:bg-slate-200 dark:hover:bg-stone-700 transition-colors duration-200"
                        onClick={() => handleEdit(user)}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
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
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
                  <svg className="h-5 w-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-stone-100">Edit User</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={selectedUser.fullName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Student ID</label>
                  <input
                    type="text"
                    name="studentId"
                    value={selectedUser.studentId}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Role</label>
                  <select
                    name="course"
                    value={selectedUser.course}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Status</label>
                  <select
                    name="status"
                    value={selectedUser.status}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  className="rounded-xl px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200 hover:bg-slate-50 dark:hover:bg-stone-800 transition-colors duration-200"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="rounded-xl px-4 py-2 bg-brand-green text-white hover:bg-brand-greenDark transition-colors duration-200 flex items-center gap-2" 
                  onClick={handleSave}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {showLogoutModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-stone-100">Confirm Logout</h3>
              </div>
              <p className="text-slate-600 dark:text-stone-400 mb-6">Are you sure you want to logout? You'll need to sign in again to access the admin panel.</p>
              <div className="flex items-center justify-end gap-3">
                <button
                  className="rounded-xl px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200 hover:bg-slate-50 dark:hover:bg-stone-800 transition-colors duration-200"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="rounded-xl px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors duration-200 flex items-center gap-2" 
                  onClick={handleLogout}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
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
