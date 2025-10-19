/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';

const toMediaUrl = (p) => {
  if (!p) return null;
  if (p.startsWith('http')) return p;
  // Legacy static assets are no longer served; hide broken links
  if (p.startsWith('book_images') || p.startsWith('book_pdf')) return null;
  return p;
};

const BooksLibrary = () => {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 24;
  const sentinelRef = React.useRef(null);
  const [tag, setTag] = useState('');
  const [withPdf, setWithPdf] = useState(false);

  async function load(reset=false) {
    if (loading) return;
    setLoading(true);
    try {
      const params = { limit, skip: reset ? 0 : skip };
      if (q) params.q = q;
      if (tag) params.tag = tag;
      if (withPdf) params.withPdf = true;
      const { data } = await api.get('/books/library', { params });
      const newItems = data.items || [];
      if (reset) {
        setItems(newItems);
        setSkip(newItems.length);
      } else {
        setItems(prev => [...prev, ...newItems]);
        setSkip(prev => prev + newItems.length);
      }
      setHasMore(newItems.length === limit);
    } catch {
      if (reset) { setItems([]); setSkip(0); }
      setHasMore(false);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(true); }, []);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && hasMore && !loading) load(false);
      });
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [sentinelRef.current, hasMore, loading, q, skip]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />
      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Library</h2>
        <div className="mt-4 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search title or author"
                   className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold" />
            <select value={tag} onChange={(e)=>{ setTag(e.target.value); setSkip(0); setItems([]); setHasMore(true); load(true); }}
                    className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100">
              <option value="">All Departments</option>
              {['CAHS','CITE','CCJE','CEA','CELA','COL','SHS'].map(dep => <option key={dep} value={dep}>{dep}</option>)}
            </select>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-stone-200">
              <input type="checkbox" className="rounded border-slate-300 text-brand-gold focus:ring-brand-gold"
                     checked={withPdf} onChange={(e)=>{ setWithPdf(e.target.checked); setSkip(0); setItems([]); setHasMore(true); load(true); }} /> Only with PDFs
            </label>
            <button className="rounded-lg bg-brand-gold text-white font-medium px-3 py-2 hover:opacity-90 disabled:opacity-60" onClick={() => load(true)} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((b, i) => {
              const img = toMediaUrl(b.imageUrl);
              const pdf = toMediaUrl(b.pdfUrl);
              return (
                <div key={b._id || i} className="rounded-xl ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 overflow-hidden">
                  <div className="aspect-[3/4] bg-slate-100 dark:bg-stone-900 flex items-center justify-center">
                    {img ? (<img src={img} alt={b.title} className="w-full h-full object-cover" />) : (<div className="text-slate-500">No image</div>)}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-slate-900 dark:text-stone-100 line-clamp-2">{b.title}</div>
                    <div className="text-xs text-slate-500 dark:text-stone-400">{b.author}</div>
                    {pdf && <a className="mt-2 inline-flex items-center rounded-lg bg-brand-gold text-white text-sm px-3 py-1.5 hover:opacity-90" href={pdf} target="_blank" rel="noreferrer">Open PDF</a>}
                  </div>
                </div>
              );
            })}
          </div>

          <div ref={sentinelRef} className="h-1" />
          {!hasMore && items.length === 0 && !loading && (
            <div className="text-sm text-slate-500 mt-2">No books found.</div>
          )}
          {!hasMore && items.length > 0 && (
            <div className="text-sm text-slate-500 mt-2">End of results.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BooksLibrary;


