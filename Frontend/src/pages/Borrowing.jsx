import React from "react";
import Sidebar from "../components/Sidebar";
import api from "../api";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" }
];

function useToast(timeout = 4000) {
  const [toast, setToast] = React.useState(null);
  const timeoutRef = React.useRef(null);
  const timerSource = React.useMemo(() => {
    if (typeof window !== "undefined") return window;
    return { setTimeout, clearTimeout };
  }, []);

  const showToast = React.useCallback((message, type = "success") => {
    setToast({ message, type });
    if (timeoutRef.current) {
      (timerSource.clearTimeout || clearTimeout)(timeoutRef.current);
    }
    timeoutRef.current = (timerSource.setTimeout || setTimeout)(() => setToast(null), timeout);
  }, [timeout, timerSource]);

  const hideToast = React.useCallback(() => {
    if (timeoutRef.current) {
      (timerSource.clearTimeout || clearTimeout)(timeoutRef.current);
    }
    setToast(null);
  }, [timerSource]);

  React.useEffect(
    () => () => {
      if (timeoutRef.current) {
        (timerSource.clearTimeout || clearTimeout)(timeoutRef.current);
      }
    },
    [timerSource]
  );

  return { toast, showToast, hideToast };
}

const Borrowing = () => {
  const [statusFilter, setStatusFilter] = React.useState("pending");
  const [requests, setRequests] = React.useState([]);
  const [requestsLoading, setRequestsLoading] = React.useState(false);
  const [requestsError, setRequestsError] = React.useState(null);

  const [activeLoans, setActiveLoans] = React.useState([]);
  const [loansLoading, setLoansLoading] = React.useState(false);
  const [loansError, setLoansError] = React.useState(null);

  const [approvalTarget, setApprovalTarget] = React.useState(null);
  const [approvalBusy, setApprovalBusy] = React.useState(false);
  const [approvalError, setApprovalError] = React.useState(null);

  const [rejectTarget, setRejectTarget] = React.useState(null);
  const [rejectBusy, setRejectBusy] = React.useState(false);
  const [rejectError, setRejectError] = React.useState(null);

  const [renewTarget, setRenewTarget] = React.useState(null);
  const [renewBusy, setRenewBusy] = React.useState(false);
  const [renewError, setRenewError] = React.useState(null);

  const { toast, showToast, hideToast } = useToast();

  const loadRequests = React.useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const { data } = await api.get("/loans/requests", { params });
      const items = Array.isArray(data?.items) ? data.items : [];
      setRequests(
        items.map((item) => ({
          ...item,
          requestedAt: item.requestedAt ? new Date(item.requestedAt) : null,
          processedAt: item.processedAt ? new Date(item.processedAt) : null,
          dueAt: item.dueAt ? new Date(item.dueAt) : null
        }))
      );
    } catch (err) {
      setRequests([]);
      setRequestsError(err?.response?.data?.error || "Failed to load borrow requests.");
    } finally {
      setRequestsLoading(false);
    }
  }, [statusFilter]);

  const loadActiveLoans = React.useCallback(async () => {
    setLoansLoading(true);
    setLoansError(null);
    try {
      const { data } = await api.get("/loans/active");
      const items = Array.isArray(data?.items) ? data.items : [];
      setActiveLoans(
        items.map((item) => ({
          id: item._id || item.id,
          title: item.title,
          student: item.student,
          borrowedAt: item.borrowedAt ? new Date(item.borrowedAt) : null,
          dueAt: item.dueAt ? new Date(item.dueAt) : null,
          status: item.status || "On Time"
        }))
      );
    } catch (err) {
      setActiveLoans([]);
      setLoansError(err?.response?.data?.error || "Failed to load active loans.");
    } finally {
      setLoansLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  React.useEffect(() => {
    loadActiveLoans();
  }, [loadActiveLoans]);

  const pendingCount = React.useMemo(
    () => requests.filter((req) => req.status === "pending").length,
    [requests]
  );

  const handleApprove = React.useCallback(
    async ({ days, note }) => {
      if (!approvalTarget) return;
      setApprovalBusy(true);
      setApprovalError(null);
      try {
        const payload = {};
        const numericDays = Number(days);
        if (Number.isFinite(numericDays) && numericDays > 0) {
          payload.days = numericDays;
        }
        if (note && note.trim()) {
          payload.note = note.trim();
        }
        await api.post(`/loans/requests/${approvalTarget.id}/approve`, payload);
        setApprovalTarget(null);
        showToast("Request approved");
        await Promise.all([loadRequests(), loadActiveLoans()]);
      } catch (err) {
        setApprovalError(err?.response?.data?.error || "Failed to approve request.");
      } finally {
        setApprovalBusy(false);
      }
    },
    [approvalTarget, loadActiveLoans, loadRequests, showToast]
  );

  const handleReject = React.useCallback(
    async ({ note }) => {
      if (!rejectTarget) return;
      setRejectBusy(true);
      setRejectError(null);
      try {
        const payload = {};
        if (note && note.trim()) {
          payload.note = note.trim();
        }
        await api.post(`/loans/requests/${rejectTarget.id}/reject`, payload);
        setRejectTarget(null);
        showToast("Request rejected");
        await loadRequests();
      } catch (err) {
        setRejectError(err?.response?.data?.error || "Failed to reject request.");
      } finally {
        setRejectBusy(false);
      }
    },
    [rejectTarget, loadRequests, showToast]
  );

  const handleRenew = React.useCallback(
    async ({ days, dueAt }) => {
      if (!renewTarget) return;
      setRenewBusy(true);
      setRenewError(null);
      try {
        const payload = {};
        const numericDays = Number(days);
        if (dueAt && dueAt.trim()) {
          const parsed = new Date(dueAt);
          if (Number.isNaN(parsed.getTime())) {
            throw new Error("Please provide a valid renewal date");
          }
          payload.dueAt = parsed.toISOString();
        } else if (Number.isFinite(numericDays) && numericDays > 0) {
          payload.days = numericDays;
        }
        await api.post(`/loans/${renewTarget.id}/renewal`, payload);
        setRenewTarget(null);
        showToast("Loan renewed");
        await loadActiveLoans();
      } catch (err) {
        const message = err?.response?.data?.error || err?.message || "Failed to renew loan.";
        setRenewError(message);
      } finally {
        setRenewBusy(false);
      }
    },
    [renewTarget, loadActiveLoans, showToast]
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />
      <main className="px-6 md:pl-8 lg:pl-10 pr-6 py-8 md:ml-80">
        {toast && (
          <div className={`mb-6 rounded-2xl border px-4 py-3 shadow ${
            toast.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-medium">{toast.message}</span>
              <button
                onClick={hideToast}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-green-dark/80 dark:text-brand-gold-soft">
              Circulation
            </p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-stone-100">Borrowing</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-stone-400">
              Review student borrowing requests, approve or decline loans, and adjust renewal schedules for active checkouts.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow ring-1 ring-slate-200 dark:bg-stone-900 dark:ring-stone-700">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green-dark">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v-3.375a2.625 2.625 0 00-2.625-2.625h-6.75" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.75a3 3 0 11-6 0 3 3 0 016 0zM19.5 21l-4.5-4.5"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending requests</p>
                <p className="text-xl font-bold text-slate-900 dark:text-stone-100">{pendingCount}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-12">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {STATUS_OPTIONS.map((option) => {
              const isActive = statusFilter === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-green text-white shadow"
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-stone-900 dark:ring-stone-700">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-stone-100">Borrow requests</h2>
              <button
                onClick={loadRequests}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                type="button"
              >
                <svg
                  className={`h-4 w-4 ${requestsLoading ? "animate-spin" : ""}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 4.5v5h.008v.008H9"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 19.5v-5h-.008v-.008H15"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 19.5a7.5 7.5 0 01-3.504-6.305M15.75 4.5A7.5 7.5 0 0119.254 10.8"
                  />
                </svg>
                Refresh
              </button>
            </div>

            {requestsError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {requestsError}
              </div>
            )}

            {requestsLoading ? (
              <div className="space-y-4">
                {[0, 1, 2].map((index) => (
                  <div
                    key={index}
                    className="h-24 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-stone-800"
                  />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-stone-700 dark:bg-stone-950/40 dark:text-stone-400">
                No requests to display for this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => {
                  const { book, user } = request;
                  return (
                    <div
                      key={request.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-stone-700 dark:bg-stone-900/80"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-green-dark">
                              {request.status.toUpperCase()}
                            </span>
                            {request.dueAt && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-stone-800 dark:text-stone-300">
                                Due {request.dueAt.toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-stone-100">
                            {book?.title || "Untitled"}
                          </h3>
                          {book?.author && (
                            <p className="text-sm text-slate-500 dark:text-stone-400">by {book.author}</p>
                          )}
                          <div className="mt-4 grid gap-2 text-sm text-slate-600 dark:text-stone-300">
                            <p>
                              <span className="font-medium">Requested by:</span> {user?.name || "Unknown student"}
                              {user?.studentId ? ` · ${user.studentId}` : ""}
                            </p>
                            {request.daysRequested && (
                              <p>
                                <span className="font-medium">Loan duration:</span> {request.daysRequested} day{request.daysRequested === 1 ? "" : "s"}
                              </p>
                            )}
                            {request.requestedAt && (
                              <p>
                                <span className="font-medium">Requested:</span> {request.requestedAt.toLocaleString()}
                              </p>
                            )}
                            {request.message && (
                              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs italic text-slate-500 dark:bg-stone-800 dark:text-stone-300">
                                “{request.message}”
                              </p>
                            )}
                            {request.adminNote && request.status !== "pending" && (
                              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                                Admin note: {request.adminNote}
                              </p>
                            )}
                          </div>
                        </div>
                        {request.status === "pending" ? (
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => {
                                setApprovalTarget(request);
                                setApprovalError(null);
                              }}
                              className="inline-flex items-center justify-center rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-greenDark focus:outline-none focus:ring-2 focus:ring-brand-green/40"
                              type="button"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectTarget(request);
                                setRejectError(null);
                              }}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                              type="button"
                            >
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-stone-100">Active loans</h2>
            <button
              onClick={loadActiveLoans}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              type="button"
            >
              <svg
                className={`h-4 w-4 ${loansLoading ? "animate-spin" : ""}`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5v5H9M19.5 19.5v-5H15" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 19.5a7.5 7.5 0 01-3.504-6.305M15.75 4.5A7.5 7.5 0 0119.254 10.8" />
              </svg>
              Refresh
            </button>
          </div>

          {loansError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loansError}
            </div>
          )}

          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-stone-900 dark:ring-stone-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-stone-800">
                <thead className="bg-slate-50 dark:bg-stone-900/40">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                      Book
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                      Borrower
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                      Borrowed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                      Due
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-sm dark:divide-stone-800 dark:bg-stone-900/60">
                  {loansLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-slate-500 dark:text-stone-400">
                        Loading loans...
                      </td>
                    </tr>
                  ) : activeLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-slate-500 dark:text-stone-400">
                        No active loans to display.
                      </td>
                    </tr>
                  ) : (
                    activeLoans.map((loan) => (
                      <tr key={loan.id || loan.title}>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-stone-100">{loan.title}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-stone-300">{loan.student || "—"}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-stone-400">
                          {loan.borrowedAt ? loan.borrowedAt.toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-stone-400">
                          {loan.dueAt ? loan.dueAt.toLocaleDateString() : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              loan.status === "Overdue"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                            }`}
                          >
                            {loan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setRenewTarget(loan);
                              setRenewError(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                            type="button"
                          >
                            Renew
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <ApprovalDialog
        request={approvalTarget}
        busy={approvalBusy}
        error={approvalError}
        onClose={() => setApprovalTarget(null)}
        onSubmit={handleApprove}
      />
      <RejectDialog
        request={rejectTarget}
        busy={rejectBusy}
        error={rejectError}
        onClose={() => setRejectTarget(null)}
        onSubmit={handleReject}
      />
      <RenewDialog
        loan={renewTarget}
        busy={renewBusy}
        error={renewError}
        onClose={() => setRenewTarget(null)}
        onSubmit={handleRenew}
      />
    </div>
  );
};

function ApprovalDialog({ request, busy, error, onClose, onSubmit }) {
  const [days, setDays] = React.useState(0);
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (request) {
      setDays(request.daysRequested || 28);
      setNote("");
    }
  }, [request]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-stone-100">Approve request</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-stone-300">
          Set the loan duration for <span className="font-semibold">{request.book?.title}</span> requested by
          <span className="font-semibold"> {request.user?.name || "student"}</span>.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ days, note });
          }}
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-stone-200">
              Loan duration (days)
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
              Defaults to {request.daysRequested || 28} days if left unchanged.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-stone-200">
              Admin note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-greenDark focus:outline-none focus:ring-2 focus:ring-brand-green/30 disabled:opacity-60"
            >
              {busy ? "Approving..." : "Approve"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RejectDialog({ request, busy, error, onClose, onSubmit }) {
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (request) {
      setNote("");
    }
  }, [request]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-stone-100">Reject request</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-stone-300">
          Optionally share a note with <span className="font-semibold">{request.user?.name || "the student"}</span> explaining why
          the request for <span className="font-semibold">{request.book?.title}</span> was declined.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ note });
          }}
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-stone-200">
              Admin note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400/60 disabled:opacity-60"
            >
              {busy ? "Rejecting..." : "Reject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RenewDialog({ loan, busy, error, onClose, onSubmit }) {
  const [days, setDays] = React.useState(7);
  const [dueAt, setDueAt] = React.useState("");

  React.useEffect(() => {
    if (loan) {
      setDays(7);
      setDueAt("");
    }
  }, [loan]);

  if (!loan) return null;

  const existingDue = loan.dueAt ? loan.dueAt.toLocaleString() : "—";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-stone-100">Renew loan</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-stone-300">
          Extend the due date for <span className="font-semibold">{loan.title}</span> currently borrowed by
          <span className="font-semibold"> {loan.student || "a student"}</span>.
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">Current due date: {existingDue}</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({ days, dueAt });
          }}
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-stone-200">
              Extend by (days)
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">
              Provide a custom date below to override the duration.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-stone-200">
              Set exact due date (optional)
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-greenDark focus:outline-none focus:ring-2 focus:ring-brand-green/30 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save renewal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Borrowing;
