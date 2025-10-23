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
<<<<<<< ours

  const load = React.useCallback(
    async (reset = false) => {
      if (loading) return;
      setLoading(true);
      if (reset) setError("");
      try {
        const params = {
          limit,
          skip: reset ? 0 : skip,
        };
        if (query.trim()) params.q = query.trim();
        if (tag) params.tag = tag;
        if (withPdf) params.withPdf = true;
        const { data } = await api.get("/books/library", { params });
        const newItems = (data?.items || []).map((item) => {
          const coverRaw = item.imageUrl || item.coverImagePath || '';
          const pdfRaw = item.pdfUrl || item.pdfPath || '';
=======
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [resultCount, setResultCount] = React.useState(0);
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const loadingRef = React.useRef(false);

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
>>>>>>> theirs
          const imageUrl = resolveMediaUrl(coverRaw);
          const pdfUrl = resolveMediaUrl(pdfRaw);
          return {
            ...item,
            imageUrl: imageUrl || null,
<<<<<<< ours
            pdfUrl: pdfUrl || null
          };
        });
        setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
        setSkip((prev) => (reset ? newItems.length : prev + newItems.length));
        setHasMore(newItems.length === limit);
=======
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
>>>>>>> theirs
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
<<<<<<< ours
        }
      } finally {
        setLoading(false);
      }
    },
    [loading, query, tag, withPdf, skip]
  );

  React.useEffect(() => {
    load(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = (e) => {
    e.preventDefault();
    load(true);
  };

=======
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

>>>>>>> theirs
  return (
    <div className="bg-slate-50">
      <div className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12 text-center">
          <h1 className="text-3xl font-semibold text-slate-900">Library Catalog</h1>
          <p className="text-sm text-slate-600">
            Search the LibReport collection by title, author, or book code. Filter by department tags or limit results to titles
            with available digital copies.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="grid gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 md:grid-cols-[2fr_1fr] md:items-end"
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Keyword</label>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, author, or book code"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Department</label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="">All Departments</option>
                {departments.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-6 inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={withPdf}
                onChange={(e) => setWithPdf(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-gold focus:ring-brand-gold"
              />
              Only show titles with downloadable PDFs
            </label>
          </div>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
<<<<<<< ours
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-greenDark disabled:cursor-not-allowed disabled:opacity-70"
            >
=======
            <button type="submit" disabled={loading} className="btn-student-primary">
>>>>>>> theirs
              {loading ? "Searching..." : "Search Catalog"}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTag("");
                setWithPdf(false);
<<<<<<< ours
                load(true);
              }}
              className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Reset Filters
            </button>
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </form>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
=======
                load({ reset: true, overrideQuery: "", overrideTag: "", overrideWithPdf: false });
              }}
              className="btn-student-outline"
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

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {showSkeleton &&
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`catalog-skeleton-${index}`}
                className="flex h-full flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div className="aspect-[3/4] animate-pulse rounded-xl bg-slate-200" />
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ))}

          {!showSkeleton && items.map((item) => {
>>>>>>> theirs
            const parseCount = (value) => {
              const num = Number(value);
              return Number.isFinite(num) ? num : null;
            };
<<<<<<< ours
            const copiesLabel = (() => {
              const total = parseCount(item.totalCopies);
              const available = parseCount(item.availableCopies);
=======
            const total = parseCount(item.totalCopies);
            const available = parseCount(item.availableCopies);
            const copiesLabel = (() => {
>>>>>>> theirs
              if (total === null && available === null) return null;
              if (total !== null && available !== null) return `${available} of ${total} copies available`;
              if (available !== null) return `${available} copies available`;
              return `${total} total copies`;
            })();

            return (
              <article key={item._id} className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
<<<<<<< ours
                <div className="aspect-[3/4] bg-slate-100">
=======
                <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
>>>>>>> theirs
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">No cover available</div>
                  )}
<<<<<<< ours
=======
                  {item.pdfUrl && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-green shadow">
                      PDF
                    </span>
                  )}
>>>>>>> theirs
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-medium uppercase tracking-wide text-brand-green/80">{item.bookCode || "--"}</span>
<<<<<<< ours
                    {copiesLabel && <span>{copiesLabel}</span>}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.author}</p>
=======
                    {copiesLabel && (
                      <span
                        className={`badge-pill ${
                          available !== null && available > 0 ? "badge-available" : "badge-waitlist"
                        }`}
                      >
                        {available !== null && available > 0 ? "Available" : "Waitlist"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.author}</p>
                  {copiesLabel && <p className="text-xs text-slate-500">{copiesLabel}</p>}
>>>>>>> theirs
                  <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {item.genre && <span className="rounded-full bg-slate-100 px-3 py-1">{item.genre}</span>}
                    {item.tags?.slice(0, 2).map((t) => (
                      <span key={t} className="rounded-full bg-slate-100 px-3 py-1">
                        {t}
                      </span>
                    ))}
                  </div>
                  {item.pdfUrl && (
                    <a
                      href={item.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
<<<<<<< ours
                      className="inline-flex items-center justify-center rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-greenDark"
=======
                      className="btn-student-primary"
>>>>>>> theirs
                    >
                      Open PDF
                    </a>
                  )}
                </div>
              </article>
            );
          })}
<<<<<<< ours
=======

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
>>>>>>> theirs
        </div>

        {items.length === 0 && !loading && !error && (
          <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No books to display yet. Try adjusting your filters.
          </div>
        )}

<<<<<<< ours
        {hasMore && items.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => load(false)}
              disabled={loading}
              className="rounded-full border border-brand-green px-5 py-2 text-sm font-semibold text-brand-green transition hover:bg-brand-green hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
=======
        {hasMore && items.length > 0 && !showSkeleton && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="btn-student-outline"
>>>>>>> theirs
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
