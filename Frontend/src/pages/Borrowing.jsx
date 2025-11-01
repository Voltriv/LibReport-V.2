import React from "react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import usePagination from "../hooks/usePagination";

const PAGE_SIZE = 10;

const REQUEST_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" }
];

const HISTORY_STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "returned", label: "Returned" },
  { value: "overdue", label: "Overdue" },
  { value: "active", label: "Active" }
];

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  cancelled_by_admin: "Cancelled",
  cancelled_by_student: "Cancelled",
  returned: "Returned",
  overdue: "Overdue",
  active: "Active",
  due_soon: "Due Soon"
};

function normalizeLoanEntry(raw = {}, { statusFallback = "Active" } = {}) {
  const book = raw.book || {};
  const user = raw.user || {};

  const borrowedAt = raw.borrowedAt ? new Date(raw.borrowedAt) : null;
  const dueAt = raw.dueAt ? new Date(raw.dueAt) : null;
  const returnedAt = raw.returnedAt ? new Date(raw.returnedAt) : null;

  // Determine a status string robustly
  const source = raw.statusLabel || raw.status || raw.statusKey || "";
  const rawStatusString = typeof source === "string" ? source.trim() : "";
  let status = rawStatusString || statusFallback;
  if (status && status.toLowerCase() === "on time") {
    status = "On Time";
  } else if (status) {
    status = status
      .split(/\s+/)
      .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ""))
      .join(" ");
  }

  return {
    ...raw,
    id: raw.id || raw._id || raw.loanId || raw.requestId || undefined,
    bookId: raw.bookId || book.id || book._id || null,
    title: raw.title || book.title || "",
    bookCode: raw.bookCode || book.bookCode || book.code || "",
    borrowerId: raw.borrowerId || user.id || user._id || raw.userId || null,
    borrowerName: raw.borrowerName || user.fullName || user.name || raw.student || "",
    borrowerStudentId: raw.borrowerStudentId || user.studentId || "",
    borrowedAt,
    dueAt,
    returnedAt,
    statusKey: raw.statusKey || (status === "Returned" ? "returned" : status === "Overdue" ? "overdue" : undefined),
    status,
    statusLabel: status
  };
}

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

  const [loanHistory, setLoanHistory] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState(null);
  const [historyStatusFilter, setHistoryStatusFilter] = React.useState("all");

  const [approvalTarget, setApprovalTarget] = React.useState(null);
  const [approvalBusy, setApprovalBusy] = React.useState(false);
  const [approvalError, setApprovalError] = React.useState(null);

  const [rejectTarget, setRejectTarget] = React.useState(null);
  const [rejectBusy, setRejectBusy] = React.useState(false);
  const [rejectError, setRejectError] = React.useState(null);

  const [renewTarget, setRenewTarget] = React.useState(null);
  const [renewBusy, setRenewBusy] = React.useState(false);
  const [renewError, setRenewError] = React.useState(null);
  const [returnTarget, setReturnTarget] = React.useState(null);
  const [returnBusy, setReturnBusy] = React.useState(false);
  const [returnError, setReturnError] = React.useState(null);

  const { toast, showToast, hideToast } = useToast();

  const {
    page: requestPage,
    pageCount: requestPageCount,
    pageItems: paginatedRequests,
    showingStart: requestShowingStart,
    showingEnd: requestShowingEnd,
    nextPage: goToNextRequestPage,
    prevPage: goToPreviousRequestPage,
    totalItems: totalRequestCount
  } = usePagination(requests, PAGE_SIZE);

  const {
    page: loanPage,
    pageCount: loanPageCount,
    pageItems: paginatedLoans,
    showingStart: loanShowingStart,
    showingEnd: loanShowingEnd,
    nextPage: goToNextLoanPage,
    prevPage: goToPreviousLoanPage,
    totalItems: totalLoanCount
  } = usePagination(activeLoans, PAGE_SIZE);

  const {
    page: historyPage,
    pageCount: historyPageCount,
    pageItems: paginatedHistory,
    showingStart: historyShowingStart,
    showingEnd: historyShowingEnd,
    nextPage: goToNextHistoryPage,
    prevPage: goToPreviousHistoryPage,
    totalItems: totalHistoryCount
  } = usePagination(loanHistory, PAGE_SIZE);

  const loadRequests = React.useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const params = {};
      // Map UI filters to backend query model (processed/outcome)
      if (statusFilter === "pending") {
        params.processed = false;
      } else if (statusFilter === "approved") {
        params.processed = true;
        params.outcome = "approved";
      } else if (statusFilter === "rejected") {
        params.processed = true;
        params.outcome = "rejected";
      }
      const { data } = await api.get("/loans/requests", { params });
      const items = Array.isArray(data?.items) ? data.items : [];
      setRequests(
        items.map((item) => {
          const idSource = item.id ?? item._id ?? item.requestId;
          const book = item.book
            ? {
                ...item.book,
                id:
                  item.book.id || item.book._id
                    ? String(item.book.id || item.book._id)
                    : item.book.id
              }
            : item.book;
          const user = item.user
            ? {
                ...item.user,
                id:
                  item.user.id || item.user._id
                    ? String(item.user.id || item.user._id)
                    : item.user.id
              }
            : item.user;
          const normalizedStatus = typeof item.status === "string" ? item.status.toLowerCase() : "";
          return {
            ...item,
            id: idSource ? String(idSource) : undefined,
            book,
            user,
            status: normalizedStatus || item.status || "",
            requestedAt: item.requestedAt ? new Date(item.requestedAt) : null,
            processedAt: item.processedAt ? new Date(item.processedAt) : null,
            dueAt: item.dueAt ? new Date(item.dueAt) : null
          };
        })
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
      setActiveLoans(items.map((item) => normalizeLoanEntry(item, { statusFallback: "On Time" })));
    } catch (err) {
      setActiveLoans([]);
      setLoansError(err?.response?.data?.error || "Failed to load active loans.");
    } finally {
      setLoansLoading(false);
    }
  }, []);

  const loadLoanHistory = React.useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const params = {};
      if (historyStatusFilter !== "all") params.status = historyStatusFilter;
      const { data } = await api.get("/loans/history", { params });
      const items = Array.isArray(data?.items) ? data.items : [];
      setLoanHistory(items.map((item) => normalizeLoanEntry(item, { statusFallback: "Returned" })));
    } catch (err) {
      setLoanHistory([]);
      setHistoryError(err?.response?.data?.error || "Failed to load loan history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [historyStatusFilter]);

  React.useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  React.useEffect(() => {
    loadActiveLoans();
  }, [loadActiveLoans]);

  React.useEffect(() => {
    loadLoanHistory();
  }, [loadLoanHistory]);
    
  const pendingCount = React.useMemo(
    () =>
      requests.filter((req) => typeof req.status === "string" && req.status.toLowerCase() === "pending").length,
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

  const handleReturn = React.useCallback(async () => {
    if (!returnTarget) return;
    setReturnBusy(true);
    setReturnError(null);
    try {
      await api.post(`/loans/${returnTarget.id}/return`);
      setReturnTarget(null);
      showToast("Loan marked as returned");
      await Promise.all([loadActiveLoans(), loadLoanHistory()]);
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to mark loan as returned.";
      setReturnError(message);
    } finally {
      setReturnBusy(false);
    }
  }, [returnTarget, loadActiveLoans, loadLoanHistory, showToast]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />
      <main className="admin-main px-6 md:pl-8 lg:pl-10 pr-6 py-8">
        {toast ? <InlineToast toast={toast} onClose={hideToast} /> : null}

        <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-green-dark/80 dark:text-brand-gold-soft">
              Circulation
            </p>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-stone-100">Borrowing</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-stone-400">
              Review student borrowing requests, approve or decline loans, and adjust renewal schedules for active checkouts.
            </p>
          </div>
          <StatsCard pendingCount={pendingCount} />
        </header>

        <div className="space-y-10">
          <SectionCard
            title="Borrow requests"
            subtitle="Monitor and approve pending requests from students."
            action={<RefreshButton onClick={loadRequests} busy={requestsLoading} label="Refresh" />}
            toolbar={<StatusFilter value={statusFilter} onChange={setStatusFilter} options={REQUEST_STATUS_OPTIONS} />}
            footer={
              !requestsLoading ? (
                <SectionPagination
                  isEmpty={totalRequestCount === 0}
                  page={requestPage}
                  pageCount={requestPageCount}
                  showingStart={requestShowingStart}
                  showingEnd={requestShowingEnd}
                  total={totalRequestCount}
                  noun="request"
                  onPrev={goToPreviousRequestPage}
                  onNext={goToNextRequestPage}
                />
              ) : null
            }
          >
            {requestsError ? <ErrorBanner message={requestsError} /> : null}

            {requestsLoading ? (
              <SkeletonList count={3} />
            ) : requests.length === 0 ? (
              <EmptyState message="No requests to display for this filter." />
            ) : (
              <div className="space-y-4">
                {paginatedRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={() => {
                      setApprovalTarget(request);
                      setApprovalError(null);
                    }}
                    onReject={() => {
                      setRejectTarget(request);
                      setRejectError(null);
                    }}
                  />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Active loans"
            subtitle="Track ongoing loans and manage renewals or returns."
            action={<RefreshButton onClick={loadActiveLoans} busy={loansLoading} label="Refresh" />}
            footer={
              <SectionPagination
                isEmpty={totalLoanCount === 0}
                page={loanPage}
                pageCount={loanPageCount}
                showingStart={loanShowingStart}
                showingEnd={loanShowingEnd}
                total={totalLoanCount}
                noun="loan"
                onPrev={goToPreviousLoanPage}
                onNext={goToNextLoanPage}
                loading={loansLoading}
              />
            }
          >
            {loansError ? <ErrorBanner message={loansError} /> : null}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-stone-800">
                <thead className="bg-slate-50/80 dark:bg-stone-900/60">
                  <tr>
                    <TableHead>Book</TableHead>
                    <TableHead>Borrower</TableHead>
                    <TableHead>Borrowed</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead align="right">Actions</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-stone-800 dark:bg-stone-900/60">
                  {loansLoading ? (
                    <TableMessage colSpan={6}>Loading loans...</TableMessage>
                  ) : activeLoans.length === 0 ? (
                    <TableMessage colSpan={6}>No active loans to display.</TableMessage>
                  ) : (
                    paginatedLoans.map((loan) => (
                      <ActiveLoanRow
                        key={loan.id || loan.bookId || loan.title}
                        loan={loan}
                        onRenew={() => {
                          setRenewTarget(loan);
                          setRenewError(null);
                        }}
                        onReturn={() => {
                          setReturnTarget(loan);
                          setReturnError(null);
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="History logs"
            subtitle="Review returned, overdue, or still-active loans."
            action={<RefreshButton onClick={loadLoanHistory} busy={historyLoading} label="Refresh" />}
            toolbar={
              <StatusFilter
                value={historyStatusFilter}
                onChange={setHistoryStatusFilter}
                options={HISTORY_STATUS_OPTIONS}
              />
            }
            footer={
              !historyLoading ? (
                <SectionPagination
                  isEmpty={totalHistoryCount === 0}
                  page={historyPage}
                  pageCount={historyPageCount}
                  showingStart={historyShowingStart}
                  showingEnd={historyShowingEnd}
                  total={totalHistoryCount}
                  noun="record"
                  onPrev={goToPreviousHistoryPage}
                  onNext={goToNextHistoryPage}
                />
              ) : null
            }
          >
            {historyError ? <ErrorBanner message={historyError} /> : null}
            {historyLoading ? (
              <SkeletonList count={3} />
            ) : loanHistory.length === 0 ? (
              <EmptyState message="No history logs to display for this filter." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-stone-800">
                  <thead className="bg-slate-50/80 dark:bg-stone-900/60">
                    <tr>
                      <TableHead>Book</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Borrowed</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Returned</TableHead>
                      <TableHead>Status</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-stone-800 dark:bg-stone-900/60">
                    {paginatedHistory.map((loan) => (
                      <tr key={loan.id || loan.bookId || loan.title}>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 dark:text-stone-100">{loan.title || "Untitled"}</span>
                            {loan.bookCode ? (
                              <span className="text-xs text-slate-500 dark:text-stone-400">{loan.bookCode}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-600 dark:text-stone-200">{loan.borrowerName || loan.student || "Unknown"}</span>
                            {loan.borrowerStudentId ? (
                              <span className="text-xs text-slate-500 dark:text-stone-400">{loan.borrowerStudentId}</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-stone-400">{loan.borrowedAt ? loan.borrowedAt.toLocaleDateString() : "--"}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-stone-400">{loan.dueAt ? loan.dueAt.toLocaleDateString() : "--"}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-stone-400">{loan.returnedAt ? loan.returnedAt.toLocaleDateString() : "--"}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-stone-800 dark:text-stone-200">
                            {STATUS_LABELS[loan.statusKey] || loan.status || "Completed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
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
      <ReturnDialog
        loan={returnTarget}
        busy={returnBusy}
        error={returnError}
        onClose={() => setReturnTarget(null)}
        onSubmit={handleReturn}
      />
    </div>
  );
};

function InlineToast({ toast, onClose }) {
  return (
    <div
      className={`mb-6 rounded-2xl border px-4 py-3 shadow ${
        toast.type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          onClick={onClose}
          className="text-sm font-semibold text-slate-500 transition hover:text-slate-700"
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function StatsCard({ pendingCount }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow ring-1 ring-slate-200 dark:bg-stone-900 dark:ring-stone-700">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green-dark">
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
        <p className="text-2xl font-semibold text-slate-900 dark:text-stone-100">{pendingCount}</p>
      </div>
    </div>
  );
}

function SectionCard({ title, subtitle, action, toolbar, footer, children }) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-stone-900 dark:ring-stone-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-stone-100">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-600 dark:text-stone-300">{subtitle}</p> : null}
        </div>
        {action ? <div className="flex-shrink-0">{action}</div> : null}
      </div>

      {toolbar ? <div className="mt-6">{toolbar}</div> : null}

      <div className="mt-6 space-y-4">{children}</div>

      {footer ? <div className="mt-6 border-t border-slate-200 pt-4 dark:border-stone-800">{footer}</div> : null}
    </section>
  );
}

function StatusFilter({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-brand-green text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            }`}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

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

  const existingDue = loan.dueAt ? loan.dueAt.toLocaleString() : "--";

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

function ReturnDialog({ loan, busy, error, onClose, onSubmit }) {
  if (!loan) return null;

  const borrowedLabel = loan.borrowedAt ? loan.borrowedAt.toLocaleDateString() : "--";
  const dueLabel = loan.dueAt ? loan.dueAt.toLocaleDateString() : "--";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-stone-900">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-stone-100">Mark loan as returned</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-stone-300">
          Confirm that <span className="font-semibold">{loan.title}</span> borrowed by
          <span className="font-semibold"> {loan.student || "a student"}</span> has been returned.
        </p>
        <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-stone-300 sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Borrowed</dt>
            <dd>{borrowedLabel}</dd>
          </div>
          <div>
            <dt className="font-semibold">Due</dt>
            <dd>{dueLabel}</dd>
          </div>
        </dl>
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSubmit}
            className="inline-flex items-center justify-center rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white shadow hover:bg-brand-greenDark focus:outline-none focus:ring-2 focus:ring-brand-green/30 disabled:opacity-60"
          >
            {busy ? "Marking..." : "Confirm return"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Local lightweight UI components to satisfy references ---
function RefreshButton({ onClick, busy, label = "Refresh" }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      type="button"
      className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-60 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
    >
      <svg
        className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5v5H9M19.5 19.5v-5H15" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 19.5a7.5 7.5 0 01-3.504-6.305M15.75 4.5A7.5 7.5 0 0119.254 10.8" />
      </svg>
      {label}
    </button>
  );
}

function SectionPagination({ isEmpty, page, pageCount, showingStart, showingEnd, total, noun, onPrev, onNext, loading }) {
  if (isEmpty) return null;
  const safePageCount = Math.max(1, Number.isFinite(pageCount) ? pageCount : 1);
  const safePageIndex = Math.min(Math.max(0, page || 0), safePageCount - 1);
  const isPrevDisabled = safePageIndex <= 0;
  const isNextDisabled = safePageIndex >= safePageCount - 1;
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-slate-600 dark:text-stone-400">
        {loading ? "Loading..." : `Showing ${showingStart}-${showingEnd} of ${total} ${noun}${total === 1 ? "" : "s"}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isPrevDisabled}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Prev
        </button>
        <span className="text-sm text-slate-600 dark:text-stone-400">Page {normalizedPage} of {safePageCount}</span>
        <button
          type="button"
          onClick={handleNext}
          disabled={isNextDisabled}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
  );
}

function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-stone-800" />
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
      {message}
    </div>
  );
}

function RequestCard({ request, onApprove, onReject }) {
  const requestedAt = request.requestedAt ? request.requestedAt.toLocaleString() : "--";
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-stone-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-stone-100">{request.book?.title || "Untitled"}</p>
        <p className="truncate text-sm text-slate-600 dark:text-stone-300">
          {request.user?.name || "Student"} • {requestedAt}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button onClick={onReject} type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
          Reject
        </button>
        <button onClick={onApprove} type="button" className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-greenDark">
          Approve
        </button>
      </div>
    </div>
  );
}

function TableHead({ children, align = "left" }) {
  return (
    <th className={`px-6 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400`}>
      {children}
    </th>
  );
}

function TableMessage({ colSpan = 1, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-6 text-center text-slate-500 dark:text-stone-400">{children}</td>
    </tr>
  );
}

function ActiveLoanRow({ loan, onRenew, onReturn }) {
  return (
    <tr>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-stone-100">{loan.title || "Untitled"}</span>
          {loan.bookCode ? (
            <span className="text-xs text-slate-500 dark:text-stone-400">{loan.bookCode}</span>
          ) : null}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-600 dark:text-stone-200">{loan.borrowerName || loan.student || "Unknown"}</span>
          {loan.borrowerStudentId ? (
            <span className="text-xs text-slate-500 dark:text-stone-400">{loan.borrowerStudentId}</span>
          ) : null}
        </div>
      </td>
      <td className="px-6 py-4 text-slate-500 dark:text-stone-400">{loan.borrowedAt ? loan.borrowedAt.toLocaleDateString() : "--"}</td>
      <td className="px-6 py-4 text-slate-500 dark:text-stone-400">{loan.dueAt ? loan.dueAt.toLocaleDateString() : "--"}</td>
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
        <button onClick={onRenew} type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
          Renew
        </button>
        <button onClick={onReturn} type="button" className="ml-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800">
          Mark returned
        </button>
      </td>
    </tr>
  );
}

export default Borrowing;
