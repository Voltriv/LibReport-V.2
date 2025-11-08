import React, { useCallback, useEffect, useState } from "react";
import AdminPageLayout from "../components/AdminPageLayout";
import api from "../api";

const STUDENT_ID_PATTERN = /^\d{2}-\d{4}-\d{6}$/;
const DEPARTMENTS = ["CAHS", "CITE", "CCJE", "CEA", "CELA", "COL", "SHS"];
const CREATE_FORM_DEFAULT = {
  fullName: "",
  studentId: "",
  email: "",
  department: "",
  password: "",
  confirmPassword: ""
};

// Normalize API status values to supported options.
const normalizeStatus = (status) => {
  const value = typeof status === "string" ? status.trim().toLowerCase() : "";
  return value === "disabled" ? "disabled" : "active"; // treats 'available', 'pending', etc. as 'active' for editing
};

const getStatusDisplay = (status) => {
  const normalized = normalizeStatus(status);
  if (normalized === "disabled") {
    return {
      label: "Disabled",
      badgeClass:
        "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      dotClass: "bg-red-400"
    };
  }
  return {
    label: "Active",
    badgeClass:
      "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    dotClass: "bg-green-400"
  };
};

const mapApiUsers = (rows = []) =>
  (rows || []).map((u) => {
    const role = typeof u.role === "string" ? u.role.trim().toLowerCase() : "student";
    const department = typeof u.department === "string" ? u.department.trim() : "";
    return {
      id: u._id || u.id,
      fullName: u.fullName || u.name || "-",
      studentId: u.studentId || "-",
      role,
      department,
      registrationDate: u.createdAt ? new Date(u.createdAt).toLocaleString() : "-",
      status: normalizeStatus(u.status)
    };
  });

const formatStudentId = (raw) => {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 12);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 6);
  const part3 = digits.slice(6, 12);
  return [part1, part2, part3].filter(Boolean).join("-");
};

const PAGE_SIZE = 10;

const UserManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...CREATE_FORM_DEFAULT });
  const [createErrors, setCreateErrors] = useState({});
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const refreshUsers = useCallback(async () => {
    try {
      const response = await api.get("/admin/users");
      setUsers(mapApiUsers(response.data || []));
      setCurrentPage(1);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil((users.length || 0) / PAGE_SIZE));
    setCurrentPage((prev) => {
      if (prev > maxPage) return maxPage;
      if (prev < 1) return 1;
      return prev;
    });
  }, [users]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserOriginal, setSelectedUserOriginal] = useState(null);
  const [editError, setEditError] = useState("");

  const closeEditModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setSelectedUserOriginal(null);
    setEditError("");
  };

  const handleEdit = (user) => {
    const normalized = {
      ...user,
      role: typeof user.role === "string" ? user.role.toLowerCase() : "student",
      status: normalizeStatus(user.status),
      department: typeof user.department === "string" ? user.department : "",
      newPassword: "",
      confirmPassword: ""
    };
    setSelectedUser(normalized);
    setSelectedUserOriginal({
      role: normalized.role,
      status: normalized.status,
      department: normalized.department || ""
    });
    setEditError("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) {
      closeEditModal();
      return;
    }
    try {
      setEditError("");
      const role = (selectedUser.role || "student").toLowerCase();
      const status = normalizeStatus(selectedUser.status);

      const department = String(selectedUser.department || "").trim();
      if (!department) {
        setEditError("Department is required.");
        return;
      }

      const newPassword = typeof selectedUser.newPassword === "string" ? selectedUser.newPassword.trim() : "";
      const confirmPassword =
        typeof selectedUser.confirmPassword === "string" ? selectedUser.confirmPassword.trim() : "";
      if (newPassword || confirmPassword) {
        if (newPassword.length < 8) {
          setEditError("New password must be at least 8 characters long.");
          return;
        }
        if (newPassword !== confirmPassword) {
          setEditError("New password and confirmation do not match.");
          return;
        }
      }

      const updates = [];
      if (!selectedUserOriginal || role !== selectedUserOriginal.role) {
        updates.push(api.patch(`/admin/users/${selectedUser.id}/role`, { role }));
      }
      if (!selectedUserOriginal || status !== selectedUserOriginal.status) {
        updates.push(api.patch(`/admin/users/${selectedUser.id}/status`, { status }));
      }
      if (!selectedUserOriginal || department !== selectedUserOriginal.department) {
        updates.push(api.patch(`/admin/users/${selectedUser.id}/department`, { department }));
      }
      if (newPassword) {
        updates.push(api.patch(`/admin/users/${selectedUser.id}/password`, { password: newPassword }));
      }

      if (updates.length === 0) {
        closeEditModal();
        return;
      }

      await Promise.all(updates);

      closeEditModal();
      await refreshUsers();
    } catch {
      closeEditModal();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let nextValue = value;
    if (name === "role") {
      nextValue = value.toLowerCase();
    } else if (name === "studentId") {
      nextValue = formatStudentId(value);
    }
    setSelectedUser((prev) => ({
      ...prev,
      [name]: nextValue
    }));
  };

  const openCreateModal = () => {
    setCreateForm({ ...CREATE_FORM_DEFAULT });
    setCreateErrors({});
    setCreateError("");
    setIsCreateModalOpen(true);
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === "studentId" ? formatStudentId(value) : value;
    setCreateForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const validateCreateForm = () => {
    const next = {};
    if (!STUDENT_ID_PATTERN.test(createForm.studentId.trim())) {
      next.studentId = "Format must be 00-0000-000000";
    }
    if (!createForm.email.includes("@")) {
      next.email = "Please enter a valid email";
    }
    if (!/^[A-Za-z .'-]+$/.test(createForm.fullName.trim())) {
      next.fullName = "Name may contain letters, spaces, apostrophes, hyphens, and periods";
    }
    if (!createForm.department.trim()) {
      next.department = "Select a department";
    }
    if (createForm.password.length < 8 || !/[A-Za-z]/.test(createForm.password) || !/[0-9]/.test(createForm.password)) {
      next.password = "Password must be 8+ characters with letters and numbers";
    }
    if (createForm.password !== createForm.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }
    setCreateErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError("");
    if (!validateCreateForm()) {
      setCreateError("Please correct the highlighted fields.");
      return;
    }
    try {
      setCreating(true);
      await api.post("/admin/users", {
        ...createForm,
        role: "faculty",
        status: "active" // keep consistent with Active/Disabled
      });
      await refreshUsers();
      setIsCreateModalOpen(false);
      setCreateForm({ ...CREATE_FORM_DEFAULT });
      setCreateErrors({});
      setCreateError("");
    } catch (err) {
      const msg = err?.response?.data?.error || "Unable to add faculty right now. Please try again.";
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil((users.length || 0) / PAGE_SIZE));
  const safePage = Math.min(Math.max(currentPage, 1), pageCount);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedUsers = users.slice(startIndex, startIndex + PAGE_SIZE);
  const showingStart = users.length === 0 ? 0 : startIndex + 1;
  const showingEnd = Math.min(startIndex + PAGE_SIZE, users.length);

  const headerActions = (
    <>
      <button
        onClick={openCreateModal}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-green text-white px-4 py-2 hover:bg-brand-greenDark transition-colors duration-200"
        type="button"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Faculty
      </button>
      <button
        onClick={refreshUsers}
        className="inline-flex items-center gap-2 rounded-xl bg-white/90 dark:bg-stone-900/80 ring-1 ring-slate-200 dark:ring-stone-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-stone-200 hover:bg-white dark:hover:bg-stone-800 transition-colors duration-200"
        type="button"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </>
  );

  const totalUsers = users.length;
  const disabledCount = users.filter((user) => normalizeStatus(user.status) === "disabled").length;

  return (
    <AdminPageLayout
      title="User Management"
      description="Manage library users and their permissions"
      actions={headerActions}
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="rounded-2xl bg-gradient-to-br from-brand-green/10 via-brand-green/5 to-white dark:from-brand-green/20 dark:via-brand-green/10 dark:to-stone-900 ring-1 ring-brand-green/20 p-6 shadow-sm">
          <p className="text-sm font-medium text-brand-greenDark">Total users</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-stone-100">{totalUsers}</p>
          <p className="text-xs text-slate-500 dark:text-stone-400 mt-1">Across all departments</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-brand-gold/15 via-white to-white dark:from-brand-gold/20 dark:via-brand-gold/10 dark:to-stone-900 ring-1 ring-brand-gold/25 p-6 shadow-sm">
          <p className="text-sm font-medium text-brand-gold-ink">Disabled accounts</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-stone-100">{disabledCount}</p>
          <p className="text-xs text-slate-500 dark:text-stone-400 mt-1">Require review</p>
        </div>
        <div className="rounded-2xl bg-white/90 dark:bg-stone-900/80 ring-1 ring-slate-200 dark:ring-stone-700 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-stone-300">Active faculty</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-stone-100">
              {totalUsers - disabledCount}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-greenDark transition-colors duration-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add faculty account
          </button>
        </div>
      </section>

      {/* Users Table */}
        <section className="rounded-2xl theme-panel ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg overflow-hidden">
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Registered</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-stone-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-stone-700">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-slate-500 dark:text-stone-400"
                    >
                      No users to display.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const statusDisplay = getStatusDisplay(user.status);
                    const initials = user.fullName
                      ? user.fullName
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0] || "")
                          .join("")
                          .toUpperCase()
                      : "";
                    return (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-stone-800 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-green to-brand-greenDark flex items-center justify-center">
                              <span className="text-sm font-bold text-white">{initials}</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-stone-100">{user.fullName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-stone-400 font-mono">{user.studentId}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-stone-400">{user.department || "-"}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-stone-700 text-slate-800 dark:text-stone-200">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-stone-400">{user.registrationDate}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusDisplay.badgeClass}`}
                          >
                            <div className={`h-1.5 w-1.5 rounded-full mr-1.5 ${statusDisplay.dotClass}`}></div>
                            {statusDisplay.label}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-stone-700 bg-slate-50/60 dark:bg-stone-900/60">
            <div className="text-sm text-slate-600 dark:text-stone-300">
              {users.length === 0
                ? "No users found"
                : `Showing ${showingStart}-${showingEnd} of ${users.length} ${users.length === 1 ? "user" : "users"}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-200 ring-1 ring-slate-200 dark:ring-stone-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-stone-700 transition-colors duration-200"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={safePage <= 1}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <div className="text-sm font-medium text-slate-600 dark:text-stone-200">
                Page {safePage} of {pageCount}
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-stone-800 text-slate-700 dark:text-stone-200 ring-1 ring-slate-200 dark:ring-stone-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-stone-700 transition-colors duration-200"
                onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
                disabled={safePage >= pageCount || users.length === 0}
              >
                Next
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl theme-panel ring-1 ring-slate-200 dark:ring-stone-700 p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
                  <svg className="h-5 w-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-stone-100">Add Faculty Account</h3>
              </div>

              {createError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  {createError}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleCreateSubmit}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={createForm.fullName}
                    onChange={handleCreateChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                    required
                  />
                  {createErrors.fullName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Faculty ID</label>
                  <input
                    type="text"
                    name="studentId"
                    value={createForm.studentId}
                    onChange={handleCreateChange}
                    placeholder="00-0000-000000"
                    inputMode="numeric"
                    className={`w-full rounded-xl px-4 py-3 font-mono transition-colors duration-200 ${
                      createErrors.studentId
                        ? "border border-red-400 text-red-700 focus:ring-2 focus:ring-red-400 focus:border-red-400 theme-panel"
                        : "border border-slate-300 dark:border-stone-600 theme-panel text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent"
                    }`}
                    maxLength={14}
                    required
                  />
                  {createErrors.studentId && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.studentId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={createForm.email}
                    onChange={handleCreateChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                    required
                  />
                  {createErrors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Department</label>
                  <select
                    name="department"
                    value={createForm.department}
                    onChange={handleCreateChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                    required
                  >
                    <option value="">Select a department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {createErrors.department && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.department}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={createForm.password}
                    onChange={handleCreateChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                    required
                  />
                  {createErrors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={createForm.confirmPassword}
                    onChange={handleCreateChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                    required
                  />
                  {createErrors.confirmPassword && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{createErrors.confirmPassword}</p>}
                </div>

                <div className="mt-8 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 theme-panel text-slate-700 dark:text-stone-200 hover:bg-slate-50 dark:hover:bg-stone-800 transition-colors duration-200"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setCreateErrors({});
                      setCreateError("");
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl px-4 py-2 bg-brand-green text-white hover:bg-brand-greenDark transition-colors duration-200 flex items-center gap-2 disabled:opacity-60"
                    disabled={creating}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {creating ? "Creating..." : "Save Faculty"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isModalOpen && selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl theme-panel ring-1 ring-slate-200 dark:ring-stone-700 p-6 shadow-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
                  <svg className="h-5 w-5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-stone-100">Edit User</h3>
              </div>
              {editError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  {editError}
                </div>
              )}

              <div className="space-y-4 overflow-y-auto pr-2 flex-1">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={selectedUser.fullName}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Student ID</label>
                  <input
                    type="text"
                    name="studentId"
                    value={selectedUser.studentId}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Department</label>
                  <select
                    name="department"
                    value={selectedUser.department || ""}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                  >
                    <option value="">Select a department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-stone-300 mb-2">Role</label>
                  <select
                    name="role"
                    value={selectedUser.role}
                    onChange={handleInputChange}
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
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
                    value={normalizeStatus(selectedUser.status)}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev,
                        status: normalizeStatus(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-4 py-3 text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div className="rounded-2xl border border-slate-200/60 bg-slate-50/80 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                    Reset Password
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-stone-300 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        value={selectedUser.newPassword || ""}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-3 py-2 text-sm text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                        placeholder="Leave blank to keep current password"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-stone-300 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={selectedUser.confirmPassword || ""}
                        onChange={handleInputChange}
                        className="w-full rounded-xl border border-slate-300 dark:border-stone-600 theme-panel px-3 py-2 text-sm text-slate-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-green focus:border-transparent transition-colors duration-200"
                        placeholder="Re-enter new password"
                      />
                    </div>
                    <p className="text-[0.7rem] text-slate-500 dark:text-stone-400">
                      Password must be at least 8 characters. Leave fields blank if you do not wish to change the password.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-stone-700">
                <button
                  className="rounded-xl px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 theme-panel text-slate-700 dark:text-stone-200 hover:bg-slate-50 dark:hover:bg-stone-800 transition-colors duration-200"
                  onClick={closeEditModal}
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
    </AdminPageLayout>
  );
};

export default UserManagement;
