/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import pfp from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api from "../api";

const BooksManagement = () => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [books, setBooks] = useState([]);

  const [activeModal, setActiveModal] = useState(null); // 'return' | 'details' | 'delete'
  const [selectedBook, setSelectedBook] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('Account');
  const navigate = useNavigate();

  const handleLogout = () => {
    setShowLogoutModal(false);
    setIsDropdownOpen(false);
    try { localStorage.removeItem('lr_token'); localStorage.removeItem('lr_user'); } catch {}
    navigate("/signin", { replace: true });
  };

  const toggleDropdown = (id) => { setOpenDropdown(openDropdown === id ? null : id); };

  const loadActiveLoans = async () => {
    try {
      const { data } = await api.get('/loans/active');
      const items = (data.items || []).map((it) => ({
        id: it._id,
        title: it.title,
        student: it.student,
        borrowed: it.borrowedAt ? new Date(it.borrowedAt).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' }) : '-',
        due: it.dueAt ? new Date(it.dueAt).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' }) : '-',
        status: it.status || 'On Time',
      }));
      setBooks(items);
    } catch { setBooks([]); }
  };
  useEffect(() => { loadActiveLoans(); }, []);

  // Borrow/Return quick actions via lookup
  const [uInput, setUInput] = useState('');
  const [bInput, setBInput] = useState('');
  const [uSel, setUSel] = useState(null);
  const [bSel, setBSel] = useState(null);
  const [loanBusy, setLoanBusy] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [scanTarget, setScanTarget] = useState('user');
  const [detectorSupported, setDetectorSupported] = useState(true);
  const videoRef = useRef(null);
  const rafRef = useRef(null);
  const lastScanAtRef = useRef(0);
  // Catalog management (migrated from Material page)
  const [catalog, setCatalog] = useState([]);
  const [catSelected, setCatSelected] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [formCat, setFormCat] = useState({ type: "", title: "", author: "", stock: "" });
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState(null); // { msg, type }

  function showToast(msg, type = 'info') {
    setToast({ msg, type });
    try { clearTimeout(window.__bm_toast); } catch {}
    window.__bm_toast = setTimeout(() => setToast(null), 3000);
  }

  function validateForm(data) {
    const e = {};
    if (data.title !== undefined && String(data.title).trim() === '') e.title = 'Title is required';
    if (data.author !== undefined && String(data.author).trim() === '') e.author = 'Author is required';
    if (data.stock !== undefined && data.stock !== '') {
      const n = Number(data.stock);
      if (!Number.isFinite(n) || n < 0) e.stock = 'Stock must be a number ? 0';
    }
    return e;
  }

  async function lookupUser() {
    if (!uInput) return setUSel(null);
    try {
      const params = uInput.includes('@') ? { email: uInput } : (uInput.includes('-') ? { studentId: uInput } : { barcode: uInput });
      const { data } = await api.get('/users/lookup', { params });
      setUSel(data);
    } catch { setUSel(null); }
  }
  async function lookupBook() {
    if (!bInput) return setBSel(null);
    try {
      let found = null;
      try {
        const { data } = await api.get('/books/lookup', { params: { isbn: bInput } });
        if (data.items && data.items[0]) found = data.items[0];
      } catch {}
      if (!found) {
        const { data } = await api.get('/books/lookup', { params: { q: bInput } });
        found = (data.items || [])[0] || null;
      }
      setBSel(found);
    } catch { setBSel(null); }
  }

  async function doBorrow() {
    if (!uSel || !bSel) return;
    setLoanBusy(true);
    try {
      await api.post('/loans/borrow', { userId: uSel._id || uSel.id, bookId: bSel._id || bSel.id, days: 14 });
      await loadActiveLoans();
      setUSel(null); setBSel(null); setUInput(''); setBInput('');
    } catch {}
    finally { setLoanBusy(false); }
  }
  async function doReturn() {
    if (!uSel || !bSel) return;
    setLoanBusy(true);
    try {
      await api.post('/loans/return', { userId: uSel._id || uSel.id, bookId: bSel._id || bSel.id });
      await loadActiveLoans();
      setUSel(null); setBSel(null); setUInput(''); setBInput('');
    } catch {}
    finally { setLoanBusy(false); }
  }

  // Persist scanner sound preference
  useEffect(() => { try { const s = localStorage.getItem('lr_scan_sound'); if (s !== null) setSoundOn(s === '1'); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('lr_scan_sound', soundOn ? '1' : '0'); } catch {} }, [soundOn]);

  // Camera scanner using BarcodeDetector
  useEffect(() => {
    let cancelled = false; let stream; let detector;
    async function start() {
      try {
        if (!('BarcodeDetector' in window)) { setDetectorSupported(false); return; }
        detector = new window.BarcodeDetector({ formats: ['qr_code','code_128','code_39','ean_13','ean_8'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream; await videoRef.current.play();
        const loop = async () => {
          if (cancelled || !camOn) return;
          try {
            const det = await detector.detect(videoRef.current);
            if (det && det[0]?.rawValue) {
              const code = String(det[0].rawValue).trim();
              const now = Date.now();
              if (now - lastScanAtRef.current > 800) {
                lastScanAtRef.current = now;
                if (scanTarget === 'user') { setUInput(code); lookupUser(); }
                else { setBInput(code); lookupBook(); }
                beep();
              }
            }
          } catch {}
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
      } catch {}
    }
    if (camOn) start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks?.() || [];
        tracks.forEach(t => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [camOn, scanTarget]);

  function beep() {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start(); setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08); o.stop(ctx.currentTime + 0.1); }, 80);
    } catch {}
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lr_user');
      if (raw) {
        const u = JSON.parse(raw);
        const name = u?.fullName || u?.name || (u?.email ? String(u.email).split('@')[0] : null);
        if (name) setUserName(name);
      }
    } catch {}
  }, []);
  // Load catalog list
  async function loadCatalog() {
    try {
      const { data } = await api.get('/books');
      const items = (data || []).map(b => ({
        id: b._id || b.id,
        type: (b.tags && b.tags[0]) || 'Book',
        title: b.title,
        author: b.author,
        totalCopies: b.totalCopies ?? 0,
        availableCopies: b.availableCopies ?? 0,
      }));
      setCatalog(items);
    } catch { setCatalog([]); }
  }
  useEffect(() => { loadCatalog(); }, []);

  async function addCatalogItem() {
    const errs = validateForm({ title: formCat.title, author: formCat.author, stock: formCat.stock });
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      const body = { title: formCat.title, author: formCat.author, tags: formCat.type ? [formCat.type] : [], totalCopies: Number(formCat.stock || 1) };
      await api.post('/books', body);
      setFormCat({ type: "", title: "", author: "", stock: "" });
      setIsAddOpen(false);
      await loadCatalog();
      showToast('Book added', 'success');
    } catch {}
  }

  async function editCatalogItem() {
    if (!catSelected) return;
    try {
      const body = {
        title: formCat.title || catSelected.title,
        author: formCat.author || catSelected.author,
        totalCopies: formCat.stock ? Number(formCat.stock) : undefined,
        tags: formCat.type ? [formCat.type] : undefined,
      };
      const errs = validateForm({ title: body.title ?? '', author: body.author ?? '', stock: formCat.stock });
      setFormErrors(errs);
      if (Object.keys(errs).length) return;
      await api.patch(`/books/${catSelected.id}`, body);
      setIsEditOpen(false);
      setFormCat({ type: "", title: "", author: "", stock: "" });
      await loadCatalog();
      showToast('Book updated', 'success');
    } catch {}
  }

  async function deleteCatalogItem() {
    if (!catSelected) return;
    try { await api.delete(`/books/${catSelected.id}`); } catch {}
    setIsDeleteOpen(false);
    setCatSelected(null);
    await loadCatalog();
    showToast('Book deleted', 'success');
  }

  // Legacy books preview
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState([]);
  async function searchBooks() {
    try { const { data } = await api.get('/books/lookup', { params: q ? { q } : {} }); setPreview(data.items || []); } catch { setPreview([]); }
  }
  useEffect(() => { searchBooks(); }, []);

  const handleAction = (action, book) => {
    setSelectedBook(book);
    switch (action) {
      case 'Mark as Returned': setActiveModal('return'); break;
      case 'Borrow Details':
      case 'View History': setActiveModal('details'); break;
      case 'Delete Record': setActiveModal('delete'); break;
      default: break;
    }
    setOpenDropdown(null);
  };
  const closeModal = () => { setActiveModal(null); setSelectedBook(null); };
  const confirmReturn = async () => { try { await api.post('/loans/return', { loanId: selectedBook.id }); await loadActiveLoans(); } catch {} closeModal(); };
  const confirmDelete = () => { setBooks(prev => prev.filter(b => b.id !== selectedBook.id)); closeModal(); };

  function renderDropdownOptions(status, book) {
    return (
      <div className="flex flex-col">
        {(status === 'On Time' || status === 'Overdue') && (
          <>
            <button className="text-left rounded px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => handleAction('Mark as Returned', book)}>Mark as Returned</button>
            <button className="text-left rounded px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => handleAction('Borrow Details', book)}>Borrow Details</button>
            <button className="text-left rounded px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => handleAction('Delete Record', book)}>Delete Record</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        <div className="flex items-center justify-end">
          <div className="relative">
            <button className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-stone-900/60 ring-1 ring-slate-200 dark:ring-stone-700 px-2 py-1 shadow hover:shadow-md" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <img src={pfp} alt="Profile" className="h-8 w-8 rounded-full" />
              <span className="text-sm text-slate-700 dark:text-stone-200 max-w-[12rem] truncate" title={userName}>{userName}</span>
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 rounded-md bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg p-1">
                <button className="w-full text-left rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setShowLogoutModal(true)}>Logout</button>
              </div>
            )}
          </div>
        </div>

        <section className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Borrow/Return Quick Actions</h3>
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-sm" placeholder="Student ID / Email / Barcode" value={uInput} onChange={e=>setUInput(e.target.value)} />
                <button className="rounded-lg px-3 py-2 bg-brand-gold text-white hover:opacity-90" onClick={lookupUser}>Lookup User</button>
              </div>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-sm" placeholder="ISBN / Title" value={bInput} onChange={e=>setBInput(e.target.value)} />
                <button className="rounded-lg px-3 py-2 bg-brand-gold text-white hover:opacity-90" onClick={lookupBook}>Lookup Book</button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60" disabled={!uSel || !bSel || loanBusy} onClick={doBorrow}>Borrow 14d</button>
                <button className="rounded-lg px-3 py-2 bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-60" disabled={!uSel || !bSel || loanBusy} onClick={doReturn}>Return</button>
                <button className="rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200" onClick={() => setCamOn(!camOn)}>{camOn ? 'Stop Camera' : 'Start Camera'}</button>
                <button className="rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200" onClick={() => setSoundOn(!soundOn)}>{soundOn ? 'Sound On' : 'Sound Off'}</button>
                <select className="rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200" value={scanTarget} onChange={e=>setScanTarget(e.target.value)}>
                  <option value="user">Scan User</option>
                  <option value="book">Scan Book</option>
                </select>
              </div>
              {!detectorSupported && (
                <div className="text-xs text-slate-600 dark:text-stone-300">Camera scanning not supported in this browser. Use Chrome/Edge on HTTPS or http://localhost.</div>
              )}
              <div className="rounded-lg overflow-hidden ring-1 ring-slate-200 dark:ring-stone-700 bg-slate-900">
                <video ref={videoRef} className={`block w-full h-64 object-cover ${camOn ? '' : 'opacity-40'}`} playsInline muted></video>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg ring-1 ring-slate-200 dark:ring-stone-700 p-2 bg-white dark:bg-stone-950"><h4 className="font-semibold">User</h4><pre>{JSON.stringify(uSel || {}, null, 2)}</pre></div>
                <div className="rounded-lg ring-1 ring-slate-200 dark:ring-stone-700 p-2 bg-white dark:bg-stone-950"><h4 className="font-semibold">Book</h4><pre>{JSON.stringify(bSel || {}, null, 2)}</pre></div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Quick Lookup</h3>
            <div className="mt-3 flex gap-2">
              <input className="flex-1 rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-sm" placeholder="Search in library" value={q} onChange={e=>setQ(e.target.value)} />
              <button className="rounded-lg px-3 py-2 bg-brand-gold text-white hover:opacity-90" onClick={searchBooks}>Search</button>
            </div>
            <div className="mt-2 rounded-lg ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 p-2 text-xs overflow-auto max-h-60">
              <pre>{JSON.stringify(preview.slice(0,3), null, 2)}</pre>
            </div>
          </div>
        </section>

        {/* Catalog (Material merged) */}
        <section className="mt-6 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Catalog</h3>
            <div className="flex items-center gap-2">
              <button className="rounded-lg px-3 py-2 bg-brand-gold text-white hover:opacity-90" onClick={()=> setIsAddOpen(true)}>Add Book</button>
              <button className="rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-stone-700" onClick={()=> { if (!catSelected && catalog[0]) setCatSelected(catalog[0]); if (catSelected || catalog[0]) setIsEditOpen(true); }}>Edit</button>
              <button className="rounded-lg px-3 py-2 bg-rose-600 text-white hover:bg-rose-500" onClick={()=> { if (!catSelected && catalog[0]) setCatSelected(catalog[0]); if (catSelected || catalog[0]) setIsDeleteOpen(true); }}>Remove</button>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-stone-300">
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Author</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-stone-700">
                {catalog.map((b)=> (
                  <tr key={b.id} className={`cursor-pointer ${catSelected?.id===b.id? 'bg-slate-50 dark:bg-stone-900' : ''}`} onClick={()=> setCatSelected(b)}>
                    <td className="py-2 pr-4">{b.title}</td>
                    <td className="py-2 pr-4">{b.author}</td>
                    <td className="py-2 pr-4">{b.type}</td>
                    <td className="py-2 pr-4">{b.totalCopies}</td>
                    <td className="py-2 pr-4">{b.availableCopies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
          

        {activeModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">{activeModal === 'delete' ? 'Confirm Delete' : activeModal === 'return' ? 'Confirm Return' : 'Borrow Details'}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-stone-300">Selected Book: {selectedBook?.title}</p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200" onClick={closeModal}>Cancel</button>
                {activeModal === 'return' && (
                  <button className="rounded-lg px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500" onClick={confirmReturn}>Confirm Return</button>
                )}
                {activeModal === 'delete' && (
                  <button className="rounded-lg px-4 py-2 bg-rose-600 text-white hover:bg-rose-500" onClick={confirmDelete}>Delete Record</button>
                )}
              </div>
            </div>
          </div>
        )}

        
        {isAddOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Add Book</h3>
              <div className="mt-4 space-y-3"> 
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Type</label>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" value={formCat.type} onChange={e=>setFormCat({...formCat, type:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Title</label>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" value={formCat.title} onChange={e=>setFormCat({...formCat, title:e.target.value})} />
                  {formErrors.title && <div className="text-rose-500 text-xs mt-1">{formErrors.title}</div>}
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Author</label>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" value={formCat.author} onChange={e=>setFormCat({...formCat, author:e.target.value})} />
                  {formErrors.author && <div className="text-rose-500 text-xs mt-1">{formErrors.author}</div>}
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Stock</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" value={formCat.stock} onChange={e=>setFormCat({...formCat, stock:e.target.value})} />
                  {formErrors.stock && <div className="text-rose-500 text-xs mt-1">{formErrors.stock}</div>}
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700" onClick={()=> setIsAddOpen(false)}>Cancel</button>
                <button className="rounded-lg px-4 py-2 bg-brand-gold text-white hover:opacity-90" onClick={addCatalogItem}>Save</button>
              </div>
            </div>
          </div>
        )}

        {isEditOpen && catSelected && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Edit Book</h3>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Type</label>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" defaultValue={catSelected.type} onChange={e=>setFormCat({...formCat, type:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Title</label>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" defaultValue={catSelected.title} onChange={e=>setFormCat({...formCat, title:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Author</label>
                  <input className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" defaultValue={catSelected.author} onChange={e=>setFormCat({...formCat, author:e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-stone-300">Stock</label>
                  <input type="number" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" defaultValue={catSelected.totalCopies} onChange={e=>setFormCat({...formCat, stock:e.target.value})} />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700" onClick={()=> setIsEditOpen(false)}>Cancel</button>
                <button className="rounded-lg px-4 py-2 bg-brand-gold text-white hover:opacity-90" onClick={editCatalogItem}>Save</button>
              </div>
            </div>
          </div>
        )}

        {isDeleteOpen && catSelected && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Delete this record?</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-stone-300">{catSelected.title}</p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700" onClick={()=> setIsDeleteOpen(false)}>Cancel</button>
                <button className="rounded-lg px-4 py-2 bg-rose-600 text-white hover:bg-rose-500" onClick={deleteCatalogItem}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 rounded-md px-4 py-2 shadow ring-1 ${toast.type==='success' ? 'bg-emerald-600 text-white ring-emerald-500' : toast.type==='error' ? 'bg-rose-600 text-white ring-rose-500' : 'bg-stone-900 text-stone-100 ring-stone-700'}`}>
            {toast.msg}
          </div>
        )}

        {showLogoutModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Are you sure you want to logout?</h3>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200" onClick={() => setShowLogoutModal(false)}>Close</button>
                <button className="rounded-lg px-4 py-2 bg-red-600 text-white hover:bg-red-500" onClick={handleLogout}>Confirm</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BooksManagement;

// Catalog modals (co-located for simplicity)
// Note: Using inline modals for add/edit/delete to manage catalog



