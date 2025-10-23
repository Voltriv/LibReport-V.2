import React from "react";
import api from "../api";

const StudentBorrowingHistory = () => {
  const [loading, setLoading] = React.useState(true);
  const [history, setHistory] = React.useState([]);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const fetchBorrowingHistory = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/student/borrowing-history");
        setHistory(data.history || []);
      } catch (err) {
        setError("Failed to load your borrowing history. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowingHistory();
  }, []);

  return (
    <div className="bg-slate-50">
      <div className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12">
          <h1 className="text-3xl font-semibold text-slate-900">Borrowing History</h1>
          <p className="text-sm text-slate-600">
            View your complete borrowing history from the library.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg bg-white p-6 shadow-sm animate-pulse">
                <div className="h-6 w-1/3 bg-slate-200 rounded mb-4"></div>
                <div className="h-4 w-1/2 bg-slate-200 rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : history.length > 0 ? (
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Book Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Borrowed Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Return Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {history.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-slate-900">{item.title}</div>
                      <div className="text-sm text-slate-500">{item.author}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {new Date(item.borrowDate).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {item.returnDate ? new Date(item.returnDate).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        item.status === "Returned" 
                          ? "bg-green-100 text-green-800" 
                          : item.status === "Overdue" 
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="text-lg font-medium text-slate-900">No borrowing history</h3>
            <p className="mt-2 text-sm text-slate-600">
              You haven't borrowed any books from the library yet.
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

export default StudentBorrowingHistory;