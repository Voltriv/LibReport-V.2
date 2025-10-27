import React from "react";
import api, { resolveMediaUrl } from "../api";

const limit = 12;
const departments = ["CAHS", "CITE", "CCJE", "CEA", "CELA", "COL", "SHS"];

const StudentCatalog = () => {
  const [query, setQuery] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [withPdf, setWithPdf] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [skip, setSkip] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [initialLoading, setInitialLoading] = React.useState(true);
  const [resultCount, setResultCount] = React.useState(0);
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const loadingRef = React.useRef(false);
  
  // Borrowing state
  const [borrowing, setBorrowing] = React.useState(false);
  const [borrowSuccess, setBorrowSuccess] = React.useState(null);

  const load = React.useCallback(
    async ({ reset = false, overrideQuery, overrideTag, overrideWithPdf } = {}) => {
      if (loadingRef.current) return;

      const nextQuery = typeof overrideQuery === "string" ? overrideQuery : query;
      const nextTag = typeof overrideTag === "string" ? overrideTag : tag;
      const nextWithPdf = typeof overrideWithPdf === "boolean" ? overrideWithPdf : withPdf;
      const nextSkip = reset ? 0 : skip;

      loadingRef.current = true;
      setLoading(true);
      if (reset) {
        setError("");
        setInitialLoading(true);
      }
      try {
        const params = {
          limit,
          skip: nextSkip,
        };
        if (nextQuery.trim()) params.q = nextQuery.trim();
        if (nextTag) params.tag = nextTag;
        if (nextWithPdf) params.withPdf = true;
        const { data } = await api.get("/books/library", { params });
        const newItems = (data?.items || []).map((item) => {
          const coverRaw = item.imageUrl || item.coverImagePath || "";
          const pdfRaw = item.pdfUrl || item.pdfPath || "";

          let imageUrl = "";
          if (typeof coverRaw === "string") {
            const v = coverRaw.trim();
            if (v.startsWith("book_images") || v.startsWith("/book_images")) {
              const rel = v.replace(/^\/+/, "");
              imageUrl = resolveMediaUrl(`/uploads/${rel}`);
            } else if (v) {
              imageUrl = resolveMediaUrl(v);
            }
          }

          let pdfUrl = "";
          if (typeof pdfRaw === "string") {
            const pv = pdfRaw.trim();
            if (pv.startsWith("book_pdf") || pv.startsWith("/book_pdf")) {
              const relp = pv.replace(/^\/+/, "");
              pdfUrl = resolveMediaUrl(`/uploads/${relp}`);
            } else if (pv) {
              pdfUrl = resolveMediaUrl(pv);
            }
          }

          const isLikelyFileUrl = (u) => {
            if (!u) return false; const s = String(u);
            if (/\/api\/files\/[a-f0-9]{24}(?:\/|$)/i.test(s)) return true;
            if (/\/uploads\/.+\.(?:pdf|png|jpg|jpeg|webp)(?:\?|$)/i.test(s)) return true;
            return false;
          };
          if (!isLikelyFileUrl(pdfUrl)) pdfUrl = "";
          return {
            ...item,
            imageUrl: imageUrl || null,

            pdfUrl: pdfUrl || null,
          };
        });
        setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
        setSkip(reset ? newItems.length : nextSkip + newItems.length);
        setHasMore(newItems.length === limit);
        if (reset) {
          setResultCount(newItems.length);
        } else {
          setResultCount((prev) => prev + newItems.length);
        }
        setLastUpdated(new Date());

        if (reset && newItems.length === 0) {
          setError("No books matched your filters. Try another keyword or department.");
        }
      } catch (e) {
        const msg = e?.response?.data?.error || "Unable to load the catalog. Please try again.";
        setError(msg);
        if (reset) {
          setItems([]);
          setSkip(0);
          setHasMore(false);

          setResultCount(0);
          setLastUpdated(null);
        }
      } finally {
        setLoading(false);
        loadingRef.current = false;
        if (reset) {
          setInitialLoading(false);
        }
      }
    },
    [query, tag, withPdf, skip]
  );

  const handleBorrowBook = React.useCallback(async (bookId, bookTitle) => {
    if (borrowing) return;
    
    setBorrowing(true);
    setError("");
    
    try {
      const response = await api.post('/student/borrow', { bookId });
      
      setBorrowSuccess({
        title: bookTitle,
        dueDate: new Date(response.data.dueAt).toLocaleDateString()
      });
      
      // Refresh the catalog to update availability
      load({ reset: true });
      
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to borrow book. Please try again.');
    } finally {
      setBorrowing(false);
    }
  }, [borrowing, load]);

  React.useEffect(() => {
    load({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    load({ reset: true });
  };

  const trimmedQuery = query.trim();

  const clearQuery = React.useCallback(() => {
    if (!trimmedQuery) return;
    setQuery("");
    load({ reset: true, overrideQuery: "", overrideTag: tag, overrideWithPdf: withPdf });
  }, [trimmedQuery, load, tag, withPdf]);

  const clearTag = React.useCallback(() => {
    if (!tag) return;
    setTag("");
    load({ reset: true, overrideQuery: trimmedQuery, overrideTag: "", overrideWithPdf: withPdf });
  }, [tag, trimmedQuery, load, withPdf]);

  const clearWithPdf = React.useCallback(() => {
    if (!withPdf) return;
    setWithPdf(false);
    load({ reset: true, overrideQuery: trimmedQuery, overrideTag: tag, overrideWithPdf: false });
  }, [withPdf, trimmedQuery, load, tag]);

  const filterChips = [];
  if (trimmedQuery) filterChips.push({ label: `Keyword: ${trimmedQuery}`, onRemove: clearQuery });
  if (tag) filterChips.push({ label: `Department: ${tag}`, onRemove: clearTag });
  if (withPdf) filterChips.push({ label: "Downloadable PDFs", onRemove: clearWithPdf });

  const filterSummaryParts = [];
  if (trimmedQuery) filterSummaryParts.push(`“${trimmedQuery}”`);
  if (tag) filterSummaryParts.push(tag);
  if (withPdf) filterSummaryParts.push("with PDFs");
  const filterSummary = filterSummaryParts.join(" • ");

  const showSkeleton = initialLoading && loading;
  const totalToShow = resultCount || items.length;
  const baseLabel = totalToShow === 1 ? "title" : "titles";
  const filterLabel = filterSummary ? ` for ${filterSummary}` : " across the library";

  return (
    <div className="bg-slate-50">
      <div className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-br from-white via-slate-50 to-white">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-green-soft/10 via-transparent to-brand-gold-soft/10"></div>
        <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-greenDark text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900">Library Catalog</h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Search the LibReport collection by title, author, or book code. Filter by department tags or limit results to titles
            with available digital copies.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="grid gap-6 rounded-3xl bg-white/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-200/60 md:grid-cols-[2fr_1fr] md:items-end"
        >
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-slate-700">Search Keywords</label>
            <div className="relative">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, author, or book code"
                className="w-full rounded-xl border border-slate-300/60 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold transition-all duration-200"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-slate-700">Department</label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full rounded-xl border border-slate-300/60 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-brand-gold transition-all duration-200"
              >
                <option value="">All Departments</option>
                {departments.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-slate-700">Filter Options</label>
              <label className="inline-flex items-center gap-3 text-sm text-slate-700 p-3 rounded-xl border border-slate-200/60 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={withPdf}
                  onChange={(e) => setWithPdf(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-gold focus:ring-brand-gold"
                />
                <span>Only show titles with downloadable PDFs</span>
              </label>
            </div>
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4 pt-2">
            <button type="submit" disabled={loading} className="btn-student-primary px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  Search Catalog
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTag("");
                setWithPdf(false);
                load({ reset: true, overrideQuery: "", overrideTag: "", overrideWithPdf: false });
              }}
              className="btn-student-outline px-6 py-3 font-semibold hover:shadow-md transition-all duration-200"
            >
              Reset Filters
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {borrowSuccess && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
              <span>
                <strong>Success!</strong> You have borrowed "{borrowSuccess.title}". 
                Due date: {borrowSuccess.dueDate}
              </span>
            </div>
            <button
              onClick={() => setBorrowSuccess(null)}
              className="mt-2 text-green-600 hover:text-green-800 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {filterChips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold uppercase tracking-wide text-slate-500">Active filters:</span>
            {filterChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.onRemove}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-medium transition hover:border-brand-green hover:text-brand-green"
              >
                {chip.label}
                <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <div>
            {showSkeleton
              ? "Fetching results…"
              : `Showing ${totalToShow} ${baseLabel}${filterLabel}`}
          </div>
          {!showSkeleton && lastUpdated && (
            <div className="text-xs text-slate-500">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {showSkeleton &&
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`catalog-skeleton-${index}`}
                className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm p-6 shadow-sm ring-1 ring-slate-200/60 animate-pulse"
              >
                <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300" />
                <div className="mt-6 space-y-3">
                  <div className="h-5 w-3/4 rounded-lg bg-slate-200" />
                  <div className="h-4 w-2/3 rounded-lg bg-slate-200" />
                  <div className="h-3 w-1/2 rounded-lg bg-slate-200" />
                </div>
              </div>
            ))}

          {!showSkeleton && items.map((item) => {

            const parseCount = (value) => {
              const num = Number(value);
              return Number.isFinite(num) ? num : null;
            };

            const total = parseCount(item.totalCopies);
            const available = parseCount(item.availableCopies);
            const copiesLabel = (() => {

              if (total === null && available === null) return null;
              if (total !== null && available !== null) return `${available} of ${total} copies available`;
              if (available !== null) return `${available} copies available`;
              return `${total} total copies`;
            })();

            return (
              <article key={item._id} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white/95 backdrop-blur-sm shadow-sm ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:ring-brand-green/20">
                <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        <p className="text-sm">No cover available</p>
                      </div>
                    </div>
                  )}

                  {item.pdfUrl && (
                    <span className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-brand-green to-brand-greenDark px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
                      PDF Available
                    </span>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-brand-green bg-brand-green-soft px-3 py-1 rounded-full">
                      {item.bookCode || "N/A"}
                    </span>
                    {copiesLabel && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          available !== null && available > 0 
                            ? "bg-green-100 text-green-700" 
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {available !== null && available > 0 ? "Available" : "Waitlist"}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight line-clamp-2">{item.title}</h3>
                    <p className="text-slate-600 font-medium">{item.author}</p>
                    {copiesLabel && <p className="text-sm text-slate-500">{copiesLabel}</p>}
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.genre && (
                        <span className="rounded-full bg-gradient-to-r from-brand-green-soft to-brand-gold-soft px-3 py-1.5 text-xs font-semibold text-slate-700">
                          {item.genre}
                        </span>
                      )}
                      {item.tags?.slice(0, 2).map((t) => (
                        <span key={t} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                          {t}
                        </span>
                      ))}
                    </div>
                    
                    <div className="space-y-2">
                      {item.pdfUrl && (
                        <a
                          href={item.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full btn-student-outline text-center py-3 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14,2 14,8 20,8"/>
                              <line x1="16" y1="13" x2="8" y2="13"/>
                              <line x1="16" y1="17" x2="8" y2="17"/>
                              <polyline points="10,9 9,9 8,9"/>
                            </svg>
                            Open PDF
                          </span>
                        </a>
                      )}
                      
                      {available !== null && available > 0 ? (
                        <button
                          onClick={() => handleBorrowBook(item._id, item.title)}
                          disabled={borrowing}
                          className="w-full btn-student-primary text-center py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                          <span className="flex items-center justify-center gap-2">
                            {borrowing ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                              </svg>
                            )}
                            {borrowing ? 'Borrowing...' : 'Borrow Book'}
                          </span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full bg-slate-200 text-slate-500 text-center py-3 font-semibold rounded-xl cursor-not-allowed"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                            </svg>
                            Not Available
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!showSkeleton && loading && (
            <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="aspect-[3/4] animate-pulse rounded-xl bg-slate-200" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          )}

        </div>

        {items.length === 0 && !loading && !error && (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No books to display yet. Try adjusting your filters.
          </div>
        )}

        {hasMore && items.length > 0 && !showSkeleton && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="btn-student-outline"

            >
              {loading ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentCatalog;
