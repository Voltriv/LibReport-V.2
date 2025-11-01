import React from "react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import usePagination from "../hooks/usePagination";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" }
];

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  cancelled_by_admin: "Cancelled",
  cancelled_by_student: "Cancelled"
};

function stringifyId(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  try {
    const str = typeof value === "string" ? value : String(value);
    const trimmed = str.trim();
    return trimmed && trimmed !== "[object Object]" ? trimmed : fallback;
  } catch {
    return fallback;
  }
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : new Date(time);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeLoanEntry(raw = {}, { statusFallback = "Active" } = {}) {
  const book = raw.book || {};
  const user = raw.user || {};

  const borrowedAt = toDate(raw.borrowedAt);
  const dueAt = toDate(raw.dueAt);
  const returnedAt = toDate(raw.returnedAt);

  const statusKey =
    raw.statusKey ||
    (returnedAt ? "returned" : dueAt && dueAt.getTime() < Date.now() ? "overdue" : "active");

  const statusSource =
    raw.statusLabel ||
    raw.status ||
    raw.statusKey ||
    (statusKey === "returned" ? "Returned" : statusKey === "overdue" ? "Overdue" : statusFallback);

  const rawStatusString = typeof statusSource === "string" ? statusSource.trim() : "";
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
    id: stringifyId(raw.id ?? raw._id ?? raw.loanId ?? raw.requestId, null),
    loanId: stringifyId(raw.loanId, null),
    bookId: stringifyId(raw.bookId ?? book.id ?? book._id, null),
    title: raw.title || book.title || "",
    bookCode: raw.bookCode || book.bookCode || "",
    borrowerId: stringifyId(raw.borrowerId ?? user.id ?? user._id ?? raw.userId, null),
    borrowerName: raw.borrowerName || user.fullName || user.name || raw.student || "",
    borrowerStudentId: raw.borrowerStudentId || user.studentId || "",
    borrowedAt,
    dueAt,
    returnedAt,
    statusKey,
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

  const showToast = React.useCallback(
    (message, type = "success") => {
      setToast({ message, type });
      if (timeoutRef.current) {
        (timerSource.clearTimeout || clearTimeout)(timeoutRef.current);
      }
      timeoutRef.current = (timerSource.setTimeout || setTimeout)(
        () => setToast(null),
        timeout
      );
    },
    [timeout, timerSource]
  );

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
    isFirstPage: isRequestFirstPage,
    isLastPage: isRequestLastPage,
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
    isFirstPage: isLoanFirstPage,
    isLastPage: isLoanLastPage,
    nextPage: goToNextLoanPage,
    prevPage: goToPreviousLoanPage,
    totalItems: totalLoanCount
  } = usePagination(activeLoans, PAGE_SIZE);

  const loadRequests = React.useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
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
          return {
            ...item,
            id: idSource ? String(idSource) : undefined,
            book,
            user,
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

  const handleReturn = React.useCallback(async () => {
    if (!returnTarget) return;
    setReturnBusy(true);
    setReturnError(null);
    try {
      await api.post(`/loans/${returnTarget.id}/return`);
      setReturnTarget(null);
      showToast("Loan marked as returned");
      await loadActiveLoans();
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to mark loan as returned.";
      setReturnError(message);
    } finally {
      setReturnBusy(false);
    }
  }, [returnTarget, loadActiveLoans, showToast]);

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
            toolbar={<StatusFilter value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />}
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
                  disablePrev={isRequestFirstPage}
                  disableNext={isRequestLastPage}
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
                disablePrev={isLoanFirstPage}
                disableNext={isLoanLastPage}
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

function RefreshButton({ onClick, busy, label }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
      type="button"
      disabled={busy}
    >
      <svg
        className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5v5h.008v.008H9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 19.5v-5h-.008v-.008H15" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 19.5a7.5 7.5 0 01-3.504-6.305M15.75 4.5A7.5 7.5 0 0119.254 10.8" />
      </svg>
      {label}
    </button>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-950/30 dark:text-red-200">
      {message}
    </div>
  );
}

function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-24 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-stone-800" />
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500 dark:border-stone-700 dark:bg-stone-950/40 dark:text-stone-400">
      {message}
    </div>
  );
}

function SectionPagination({
  isEmpty,
  page,
  pageCount,
  showingStart,
  showingEnd,
  total,
  noun,
  onPrev,
  onNext,
  disablePrev,
  disableNext,
  loading
}) {
  if (isEmpty) {
    return (
      <p className="text-sm text-slate-500 dark:text-stone-400">
        {loading ? "" : `No ${noun}${noun.endsWith("s") ? "" : "s"} found`}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm text-slate-600 dark:text-stone-300 sm:flex-row sm:items-center sm:justify-between">
      <div>{`Showing ${showingStart}-${showingEnd} of ${total} ${total === 1 ? noun : `${noun}s`}`}</div>
      <div className="flex items-center gap-2">
        <PaginationButton onClick={onPrev} disabled={disablePrev} direction="prev" />
        <span className="font-medium text-slate-700 dark:text-stone-200">Page {page} of {pageCount}</span>
        <PaginationButton onClick={onNext} disabled={disableNext} direction="next" />
      </div>
    </div>
  );
}

function PaginationButton({ direction, onClick, disabled }) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition-colors duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700 dark:hover:bg-stone-700"
    >
      {isPrev ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      ) : null}
      {isPrev ? "Previous" : "Next"}
      {!isPrev ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      ) : null}
    </button>
  );
}

function RequestCard({ request, onApprove, onReject }) {
  const { book, user } = request;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-stone-700 dark:bg-stone-900/80">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-green-dark">
              {STATUS_LABELS[request.status] || request.status}
            </span>
            {request.dueAt ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-stone-800 dark:text-stone-300">
                Due {request.dueAt.toLocaleDateString()}
              </span>
            ) : null}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">{book?.title || "Untitled"}</h3>
            {book?.author ? (
              <p className="text-sm text-slate-500 dark:text-stone-400">by {book.author}</p>
            ) : null}
          </div>
          <div className="space-y-2 text-sm text-slate-600 dark:text-stone-300">
            <p>
              <span className="font-medium">Requested by:</span> {user?.name || "Unknown student"}
              {user?.studentId ? ` - ${user.studentId}` : ""}
            </p>
            {request.daysRequested ? (
              <p>
                <span className="font-medium">Loan duration:</span> {request.daysRequested} day{request.daysRequested === 1 ? "" : "s"}
              </p>
            ) : null}
            {request.requestedAt ? (
              <p>
                <span className="font-medium">Requested:</span> {request.requestedAt.toLocaleString()}
              </p>
            ) : null}
            {request.message ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs italic text-slate-500 dark:bg-stone-800 dark:text-stone-300">
                "{request.message}"
              </p>
            ) : null}
            {request.adminNote && request.status !== "pending" ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                Admin note: {request.adminNote}
              </p>
            ) : null}
          </div>
        </div>
        {request.status === "pending" ? (
          <div className="flex flex-col gap-2">
            <ActionButton onClick={onApprove} variant="primary">
              Approve
            </ActionButton>
            <ActionButton onClick={onReject} variant="secondary">
              Reject
            </ActionButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ActionButton({ variant, children, ...props }) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2";
  const variants = {
    primary: `${base} bg-brand-green text-white shadow hover:bg-brand-greenDark focus:ring-brand-green/40`,
    secondary: `${base} border border-slate-200 text-slate-600 hover:bg-slate-100 focus:ring-slate-200 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800`
  };

  return (
    <button type="button" className={variants[variant]} {...props}>
      {children}
    </button>
  );
}

function TableHead({ children, align = "left" }) {
  const alignmentClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`px-6 py-3 ${alignmentClass} text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-stone-400`}>
      {children}
    </th>
  );
}

function TableMessage({ children, colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-6 text-center text-slate-500 dark:text-stone-400">
        {children}
      </td>
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
      <td className="px-6 py-4 text-slate-500 dark:text-stone-400">
        {loan.borrowedAt ? loan.borrowedAt.toLocaleDateString() : "--"}
      </td>
      <td className="px-6 py-4 text-slate-500 dark:text-stone-400">
        {loan.dueAt ? loan.dueAt.toLocaleDateString() : "--"}
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            loan.statusKey === "overdue"
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
          }`}
        >
          {loan.status}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="inline-flex gap-2">
          <SmallActionButton onClick={onRenew}>Renew</SmallActionButton>
          <SmallActionButton onClick={onReturn}>Mark returned</SmallActionButton>
        </div>
      </td>
    </tr>
  );
}

function SmallActionButton({ children, ...props }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
      {...props}
    >
      {children}
    </button>
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
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
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
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
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
            <p className="mt-1 text-xs text-slate-500 dark:text-stone-400">Provide a custom date below to override the duration.</p>
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
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
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
        {error ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
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

export default Borrowing;
