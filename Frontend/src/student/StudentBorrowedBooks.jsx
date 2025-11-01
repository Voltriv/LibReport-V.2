import React from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { normalizeStudentLoan, parseDate } from "./utils/data";

const LOAD_ERROR_MESSAGE = "Failed to load your borrowed books. Please try again later.";
const RETURN_ERROR_MESSAGE = "Failed to return book. Please try again.";
const RENEW_ERROR_MESSAGE = "Failed to renew book. Please try again.";

function normalizeBorrowedItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const normalized = normalizeStudentLoan(item, index);
    const pending = item?.pendingRenewal;
    const pendingRenewal = pending
      ? {
          ...pending,
          requestedAt: parseDate(pending.requestedAt),
          processedAt: parseDate(pending.processedAt),
          dueAt: parseDate(pending.dueAt)
        }
      : null;

    return {
      ...normalized,
      pendingRenewal
    };
  });
}

const StudentBorrowedBooks = () => {
  const [loading, setLoading] = React.useState(true);
  const [books, setBooks] = React.useState([]);
  const [error, setError] = React.useState("");
  const [returningId, setReturningId] = React.useState(null);
  const [returnSuccess, setReturnSuccess] = React.useState(null);
  const [renewingId, setRenewingId] = React.useState(null);
  const [renewFeedback, setRenewFeedback] = React.useState(null);

  const applyBooks = React.useCallback((items) => {
    setBooks(normalizeBorrowedItems(items));
  }, []);

  React.useEffect(() => {
    const fetchBorrowedBooks = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/student/borrowed");
        applyBooks(data.books);
      } catch (err) {
        setError(err?.response?.data?.error || LOAD_ERROR_MESSAGE);
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowedBooks();
  }, [applyBooks]);

  const refreshBorrowed = React.useCallback(async () => {
    try {
      const { data } = await api.get("/student/borrowed");
      applyBooks(data.books);
    } catch (err) {
      setError(err?.response?.data?.error || LOAD_ERROR_MESSAGE);
    }
  }, [applyBooks]);

  const handleReturnBook = React.useCallback(async (bookId, bookTitle) => {
    if (returningId || renewingId) return;
    
    setReturningId(bookId);
    setError("");
    setRenewFeedback(null);
    
    try {
      await api.post("/student/return", { bookId });

      setReturnSuccess({
        title: bookTitle
      });

      // Refresh the borrowed books list
      await refreshBorrowed();

    } catch (err) {
      setError(err?.response?.data?.error || RETURN_ERROR_MESSAGE);
    } finally {
      setReturningId(null);
    }
  }, [returningId, renewingId, refreshBorrowed]);

  const handleRenewBook = React.useCallback(async (bookId, bookTitle) => {
    if (renewingId) return;

    setRenewingId(bookId);
    setError("");
    setReturnSuccess(null);
    setRenewFeedback(null);

    try {
      const { data } = await api.post("/student/renew", { bookId });
      const estimated = data?.request?.estimatedDueAt
        ? new Date(data.request.estimatedDueAt).toLocaleDateString()
        : null;

      setRenewFeedback({
        type: "success",
        title: bookTitle,
        dueDate: estimated,
        message:
          data?.message ||
          "Your renewal request has been submitted and is awaiting librarian approval."
      });

      await refreshBorrowed();
    } catch (err) {
      setError(err?.response?.data?.error || RENEW_ERROR_MESSAGE);
      setRenewFeedback(null);
    } finally {
      setRenewingId(null);
    }
  }, [renewingId, refreshBorrowed]);

  return (
    <div className="bg-slate-50">
      <div className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12">
          <h1 className="text-3xl font-semibold text-slate-900">My Books</h1>
          <p className="text-sm text-slate-600">
            View and manage your currently borrowed books from the library.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {returnSuccess && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </span>
                <div>
                  <p className="font-semibold text-green-800">Book returned</p>
                  <p className="mt-1 leading-relaxed">
                    You have returned "<strong>{returnSuccess.title}</strong>".
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnSuccess(null)}
                className="rounded-full border border-green-200 px-3 py-1 text-xs font-semibold text-green-700 transition hover:bg-green-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {renewFeedback && (
          <div
            className={`mb-6 rounded-md border px-4 py-3 text-sm ${
              renewFeedback.type === 'success'
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}
          >
            <div className="flex items-start gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5"
              >
                {renewFeedback.type === 'success' ? (
                  <>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3" />
                    <path d="M12 7v5l3 3" />
                  </>
                ) : (
                  <>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </>
                )}
              </svg>
              <div className="flex-1">
                <p className="font-semibold">
                  {renewFeedback.type === 'success'
                    ? `Renewal request sent for "${renewFeedback.title}"`
                    : renewFeedback.title || 'Renewal update'}
                </p>
                <p className="mt-1 leading-relaxed">
                  {renewFeedback.message}
                  {renewFeedback.dueDate && (
                    <>
                      {' '}
                      Estimated new due date: {renewFeedback.dueDate}.
                    </>
                  )}
                </p>
                <div className="mt-2 text-xs">
                  <Link
                    to="/student/borrow-requests"
                    className="font-semibold text-blue-600 underline-offset-2 hover:text-blue-800 hover:underline"
                    onClick={() => setRenewFeedback(null)}
                  >
                    View request status
                  </Link>
                </div>
              </div>
            </div>
            <button
              onClick={() => setRenewFeedback(null)}
              className={`mt-2 inline-flex items-center text-xs font-semibold underline transition ${
                renewFeedback.type === 'success'
                  ? 'text-blue-600 hover:text-blue-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg bg-white p-6 shadow-sm animate-pulse">
                <div className="mb-4 h-6 w-1/3 rounded bg-slate-200" />
                <div className="mb-2 h-4 w-1/2 rounded bg-slate-200" />
                <div className="h-4 w-1/4 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="space-y-4">
            {books.map((loan, index) => {
              const title = loan.title || "Untitled item";
              const author = loan.author || "Unknown author";
              const dueLabel = loan.dueAt ? loan.dueAt.toLocaleDateString() : "--";
              const borrowedLabel = loan.borrowedAt ? loan.borrowedAt.toLocaleDateString() : "--";
              const renewalPending = Boolean(loan.pendingRenewal);
              const renewalDetails = loan.pendingRenewal || null;
              const isRenewingThis = renewingId === loan.bookId;
              const isRenewingAny = Boolean(renewingId);
              const isReturningThis = returningId === loan.bookId;
              const isReturningAny = Boolean(returningId);
              return (
                <div key={loan.id || `borrowed-${index}`} className="rounded-lg bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                      <p className="text-sm text-slate-600">By {author}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-brand-green-soft px-3 py-1 text-xs font-medium text-brand-green">
                          Due: {dueLabel}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Borrowed: {borrowedLabel}
                        </span>
                        {renewalPending ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            Renewal pending approval
                          </span>
                        ) : null}
                      </div>
                      {renewalDetails ? (
                        <p className="mt-2 text-xs text-slate-500">
                          Requested on {renewalDetails.requestedAt ? renewalDetails.requestedAt.toLocaleString() : "pending"}
                          {typeof renewalDetails.daysRequested === "number" ? (
                            <>
                              {" • "}Extends by {renewalDetails.daysRequested} day
                              {renewalDetails.daysRequested === 1 ? "" : "s"}
                            </>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-student-outline btn-pill-sm disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleRenewBook(loan.bookId, loan.title)}
                        disabled={isRenewingAny || isReturningAny}
                      >
                        {isRenewingThis ? "Renewing..." : "Renew"}
                      </button>
                      <button
                        className="btn-student-primary btn-pill-sm disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleReturnBook(loan.bookId, loan.title)}
                        disabled={isRenewingAny || isReturningAny}
                      >
                        {isReturningThis ? "Returning..." : "Return"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="text-lg font-medium text-slate-900">No books currently borrowed</h3>
            <p className="mt-2 text-sm text-slate-600">
              You don't have any books checked out at the moment.
            </p>
            <div className="mt-6">
              <a href="/student/catalog" className="btn-student-primary">
                Browse Catalog
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentBorrowedBooks;
