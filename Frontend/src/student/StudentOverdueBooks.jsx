import React from "react";
import api from "../api";

const StudentOverdueBooks = () => {
  const [loading, setLoading] = React.useState(true);
  const [books, setBooks] = React.useState([]);
  const [error, setError] = React.useState("");

  const [returning, setReturning] = React.useState(false);
  const [returnSuccess, setReturnSuccess] = React.useState(null);

  React.useEffect(() => {
    const fetchOverdueBooks = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/student/overdue-books");
        setBooks(data.books || []);
      } catch (err) {
        setError("Failed to load your overdue books. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverdueBooks();
  }, []);

  const handleReturnBook = React.useCallback(async (bookId, bookTitle) => {
    if (returning) return;
    
    setReturning(true);
    setError("");
    
    try {
      await api.post('/student/return', { bookId });
      
      setReturnSuccess({
        title: bookTitle
      });
      
      // Refresh the overdue books list
      const { data } = await api.get("/student/overdue-books");
      setBooks(data.books || []);
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to return book. Please try again.');
    } finally {
      setReturning(false);
    }
  }, [returning]);

  return (
    <div className="bg-slate-50">
      <div className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12">
          <h1 className="text-3xl font-semibold text-slate-900">Overdue Books</h1>
          <p className="text-sm text-slate-600">
            View and manage your overdue books that need to be returned to the library.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {returnSuccess && (
          <div className="mb-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              <span>
                <strong>Success!</strong> You have returned "{returnSuccess.title}".
              </span>
            </div>
            <button
              onClick={() => setReturnSuccess(null)}
              className="mt-2 text-green-600 hover:text-green-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-lg bg-white p-6 shadow-sm animate-pulse">
                <div className="h-6 w-1/3 bg-slate-200 rounded mb-4"></div>
                <div className="h-4 w-1/2 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : books.length > 0 ? (
          <div className="space-y-4">
            {books.map((book) => {
              const key = book.id || book._id || book.bookId || `overdue-${book.title}`;
              const title = book.title || "Untitled item";
              const author = book.author || "Unknown author";
              const dueLabel = book.dueAt ? new Date(book.dueAt).toLocaleDateString() : "--";
              const borrowedLabel = book.borrowedAt ? new Date(book.borrowedAt).toLocaleDateString() : "--";
              const canManage = Boolean(book.bookId);
              return (
                <div key={key} className="rounded-lg bg-white p-6 shadow-sm border-l-4 border-red-500">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                      <p className="text-sm text-slate-600">By {author}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          Due: {dueLabel}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                          Days Overdue: {book.daysOverdue}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Fine: ${book.fine.toFixed(2)}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Borrowed: {borrowedLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-student-primary btn-pill-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => canManage && handleReturnBook(book.bookId, title)}
                        disabled={returning || !canManage}
                      >
                        {returning ? 'Returning...' : 'Return Now'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="text-lg font-medium text-slate-900">No overdue books</h3>
            <p className="mt-2 text-sm text-slate-600">
              Great job! You don't have any overdue books at the moment.
            </p>
            <div className="mt-6">
              <a href="/student/requests" className="btn-student-primary">
                View Borrow Requests
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentOverdueBooks;
