/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import pfp from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api from "../api";

const GENRE_DEFAULTS = [
  'Fiction',
  'Non-fiction',
  'Science',
  'Technology',
  'History',
  'Arts',
  'Education',
  'Reference',
  'Research',
];

const CUSTOM_GENRE_VALUE = '__custom__';

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
  // Catalog management (migrated from Material page)
  const [catalog, setCatalog] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formBusy, setFormBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toast, setToast] = useState(null); // { msg, type }

  function showToast(msg, type = 'info') {
    setToast({ msg, type });
    try { clearTimeout(window.__bm_toast); } catch {}
    window.__bm_toast = setTimeout(() => setToast(null), 3000);
  }

  const genreOptions = useMemo(() => {
    const opts = new Set(GENRE_DEFAULTS);
    catalog.forEach((item) => {
      if (item.genre) opts.add(item.genre);
    });
    return Array.from(opts);
  }, [catalog]);

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
      const items = (data || []).map((b) => ({
        id: b._id || b.id,
        title: b.title,
        author: b.author,
        bookCode: b.bookCode || '',
        genre: b.genre || (Array.isArray(b.tags) && b.tags[0]) || '',
        totalCopies: b.totalCopies ?? 0,
        availableCopies: b.availableCopies ?? 0,
        coverImagePath: b.coverImagePath || '',
        coverImageOriginalName: b.coverImageOriginalName || '',
        pdfPath: b.pdfPath || '',
        pdfOriginalName: b.pdfOriginalName || '',
        createdAt: b.createdAt ? new Date(b.createdAt) : null,
      }));
      items.sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return bTime - aTime;
      });
      setCatalog(items);
    } catch (error) {
      setCatalog([]);
      showToast('Failed to load catalog', 'error');
    }
  }
  useEffect(() => { loadCatalog(); }, []);

  async function handleCreateBook(payload) {
    setFormBusy(true);
    try {
      await api.post('/books', payload);
      await loadCatalog();
      setIsAddOpen(false);
      showToast('Book added', 'success');
      return true;
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to add book';
      showToast(msg, 'error');
      return false;
    } finally {
      setFormBusy(false);
    }
  }

  async function handleUpdateBook(payload) {
    if (!editingBook) return false;
    setFormBusy(true);
    try {
      await api.patch(`/books/${editingBook.id}`, payload);
      await loadCatalog();
      setEditingBook(null);
      showToast('Book updated', 'success');
      return true;
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to update book';
      showToast(msg, 'error');
      return false;
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDeleteBook() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.delete(`/books/${deleteTarget.id}`);
      await loadCatalog();
      showToast('Book deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to delete book';
      showToast(msg, 'error');
    } finally {
      setDeleteBusy(false);
    }
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
              </div>
              <div className="text-xs text-slate-600 dark:text-stone-300">
                Camera-based scanning has been removed. Use the lookup fields above to search for users and books before borrowing or returning.
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Books Catalog</h3>
              <p className="text-sm text-slate-500 dark:text-stone-400">Track physical copies and digital resources for your library.</p>
            </div>
            <button
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-500 transition"
              onClick={() => setIsAddOpen(true)}
            >
              Add Book
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-stone-400 bg-slate-100/60 dark:bg-stone-800/60">
                  <th className="px-4 py-3 text-left font-semibold">Book Cover</th>
                  <th className="px-4 py-3 text-left font-semibold">Title</th>
                  <th className="px-4 py-3 text-left font-semibold">Author</th>
                  <th className="px-4 py-3 text-left font-semibold">Book Code</th>
                  <th className="px-4 py-3 text-left font-semibold">Available Copies</th>
                  <th className="px-4 py-3 text-left font-semibold">Total Copies</th>
                  <th className="px-4 py-3 text-left font-semibold">Category</th>
                  <th className="px-4 py-3 text-left font-semibold">Book PDF</th>
                  <th className="px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-stone-700">
                {catalog.map((book) => (
                  <tr key={book.id} className="bg-white dark:bg-stone-900/70 transition-colors hover:bg-slate-50 dark:hover:bg-stone-800/70">
                    <td className="px-4 py-3">
                      {book.coverImagePath ? (
                        <img
                          src={book.coverImagePath}
                          alt={`Cover of ${book.title}`}
                          className="h-12 w-9 rounded object-cover shadow-sm"
                        />
                      ) : (
                        <div className="flex h-12 w-9 items-center justify-center rounded bg-slate-200 text-[10px] font-semibold text-slate-500">
                          No Cover
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-stone-100">{book.title}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-stone-300">{book.author}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-stone-200">{book.bookCode || '—'}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-stone-200">{book.availableCopies}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-stone-200">{book.totalCopies}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-stone-200">{book.genre || '—'}</td>
                    <td className="px-4 py-3">
                      {book.pdfPath ? (
                        <a
                          href={book.pdfPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {book.pdfOriginalName || 'Book PDF'}
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-stone-500">No PDF</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 dark:hover:bg-emerald-600/10"
                          onClick={() => setEditingBook(book)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full border border-rose-500 px-3 py-1 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          onClick={() => setDeleteTarget(book)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {catalog.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-6 text-center text-slate-500 dark:text-stone-400">
                      No books have been added yet.
                    </td>
                  </tr>
                )}
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

        
        <BookFormModal
          open={isAddOpen}
          mode="create"
          onCancel={() => setIsAddOpen(false)}
          onSubmit={handleCreateBook}
          submitting={formBusy}
          genreOptions={genreOptions}
        />

        <BookFormModal
          open={Boolean(editingBook)}
          mode="edit"
          onCancel={() => setEditingBook(null)}
          onSubmit={handleUpdateBook}
          submitting={formBusy}
          genreOptions={genreOptions}
          initialData={editingBook}
        />

        <DeleteConfirmModal
          open={Boolean(deleteTarget)}
          title={deleteTarget?.title}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteBook}
          loading={deleteBusy}
        />

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

function buildInitialBookForm(initialData, genreOptions) {
  const base = initialData || {};
  const tags = Array.isArray(base.tags) ? base.tags : [];
  const rawGenre = base.genre || tags[0] || '';
  let genreValue = '';
  let customGenre = '';
  if (rawGenre) {
    const match = (genreOptions || []).find((option) => String(option).toLowerCase() === String(rawGenre).toLowerCase());
    if (match) genreValue = match;
    else {
      genreValue = CUSTOM_GENRE_VALUE;
      customGenre = rawGenre;
    }
  }
  return {
    title: base.title || '',
    author: base.author || '',
    bookCode: base.bookCode || '',
    totalCopies: base.totalCopies !== undefined && base.totalCopies !== null ? String(base.totalCopies) : '',
    availableCopies: base.availableCopies !== undefined && base.availableCopies !== null ? String(base.availableCopies) : '',
    genre: genreValue,
    customGenre,
    coverImageData: null,
    coverImageName: '',
    coverPreview: base.coverImagePath || '',
    existingCoverName: base.coverImageOriginalName || '',
    pdfData: null,
    pdfName: '',
    existingPdfName: base.pdfOriginalName || '',
    existingPdfPath: base.pdfPath || '',
  };
}

const BookFormModal = ({ open, mode, onCancel, onSubmit, submitting, genreOptions, initialData }) => {
  const [form, setForm] = useState(() => buildInitialBookForm(initialData, genreOptions));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(buildInitialBookForm(initialData, genreOptions));
      setErrors({});
    }
  }, [open, initialData, genreOptions]);

  if (!open) return null;

  const heading = mode === 'edit' ? 'Edit Book' : 'Add Book';
  const primaryLabel = mode === 'edit' ? 'Save Changes' : 'Add Book';
  const resolvedGenre = form.genre === CUSTOM_GENRE_VALUE ? form.customGenre : form.genre;

  const setField = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleGenreChange = (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      genre: value,
      customGenre: value === CUSTOM_GENRE_VALUE ? prev.customGenre : '',
    }));
  };

  const handleCoverChange = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file && file.type && !file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, coverImageData: 'Please choose an image file (PNG, JPG, WEBP)' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        coverImageData: reader.result,
        coverImageName: file.name,
        coverPreview: reader.result,
      }));
      setErrors((prev) => ({ ...prev, coverImageData: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const handlePdfChange = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const lowerName = file.name.toLowerCase();
    if (file.type && file.type !== 'application/pdf' && !lowerName.endsWith('.pdf')) {
      setErrors((prev) => ({ ...prev, pdfData: 'Please choose a PDF file' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        pdfData: reader.result,
        pdfName: file.name,
      }));
      setErrors((prev) => ({ ...prev, pdfData: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const nextErrors = {};
    if (!form.title.trim()) nextErrors.title = 'Book title is required';
    if (!form.author.trim()) nextErrors.author = 'Author is required';
    if (!form.bookCode.trim()) nextErrors.bookCode = 'Book code is required';

    const totalRaw = form.totalCopies.trim();
    const totalNumber = totalRaw === '' ? 1 : Number(totalRaw);
    let normalizedTotal = 0;
    if (!Number.isFinite(totalNumber)) {
      nextErrors.totalCopies = 'Total copies must be a number';
    } else {
      normalizedTotal = Math.max(0, Math.trunc(totalNumber));
    }

    const availableRaw = form.availableCopies.trim();
    const availableNumber = availableRaw === '' ? normalizedTotal : Number(availableRaw);
    let normalizedAvailable = normalizedTotal;
    if (!Number.isFinite(availableNumber)) {
      nextErrors.availableCopies = 'Available copies must be a number';
    } else {
      normalizedAvailable = Math.max(0, Math.trunc(availableNumber));
    }

    if (!nextErrors.totalCopies && !nextErrors.availableCopies && normalizedAvailable > normalizedTotal) {
      nextErrors.availableCopies = 'Available copies cannot exceed total copies';
    }

    if (form.genre === CUSTOM_GENRE_VALUE && !form.customGenre.trim()) {
      nextErrors.customGenre = 'Please enter a category';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).some((key) => nextErrors[key])) return;

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      bookCode: form.bookCode.trim(),
      totalCopies: normalizedTotal,
      availableCopies: Math.min(normalizedTotal, normalizedAvailable),
    };

    const normalizedGenre = resolvedGenre ? resolvedGenre.trim() : '';
    if (normalizedGenre) {
      payload.genre = normalizedGenre;
      payload.tags = [normalizedGenre];
    }

    if (form.coverImageData) {
      payload.coverImageData = form.coverImageData;
      payload.coverImageName = form.coverImageName;
    }
    if (form.pdfData) {
      payload.pdfData = form.pdfData;
      payload.pdfName = form.pdfName;
    }

    const success = await onSubmit(payload);
    if (success) {
      setForm(buildInitialBookForm(null, genreOptions));
      setErrors({});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xs sm:max-w-sm rounded-3xl bg-[#6BAF7A] px-6 py-8 text-white shadow-xl">
        <h3 className="text-center text-2xl font-semibold leading-tight">{heading}</h3>
        <p className="mt-1 text-center text-sm text-white/80">
          {mode === 'edit' ? 'Update the details below to keep the catalog accurate.' : 'Fill out the information below to add a new title to the catalog.'}
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <input
              className="w-full rounded-full border-none bg-white/95 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Book Title"
              value={form.title}
              onChange={setField('title')}
            />
            {errors.title && <p className="mt-1 text-xs text-rose-100">{errors.title}</p>}
          </div>

          <div>
            <input
              className="w-full rounded-full border-none bg-white/95 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Author"
              value={form.author}
              onChange={setField('author')}
            />
            {errors.author && <p className="mt-1 text-xs text-rose-100">{errors.author}</p>}
          </div>

          <div>
            <input
              className="w-full rounded-full border-none bg-white/95 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Book Code"
              value={form.bookCode}
              onChange={setField('bookCode')}
            />
            {errors.bookCode && <p className="mt-1 text-xs text-rose-100">{errors.bookCode}</p>}
          </div>

          <div>
            <input
              type="number"
              min="0"
              className="w-full rounded-full border-none bg-white/95 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Available Copies"
              value={form.availableCopies}
              onChange={setField('availableCopies')}
            />
            {errors.availableCopies && <p className="mt-1 text-xs text-rose-100">{errors.availableCopies}</p>}
          </div>

          <div>
            <input
              type="number"
              min="0"
              className="w-full rounded-full border-none bg-white/95 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
              placeholder="Total Copies"
              value={form.totalCopies}
              onChange={setField('totalCopies')}
            />
            {errors.totalCopies && <p className="mt-1 text-xs text-rose-100">{errors.totalCopies}</p>}
          </div>

          <div>
            <select
              className="w-full appearance-none rounded-full border-none bg-white/95 px-4 py-2.5 text-sm text-stone-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
              value={form.genre || ''}
              onChange={handleGenreChange}
            >
              <option value="">Select Genre</option>
              {genreOptions?.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
              <option value={CUSTOM_GENRE_VALUE}>Custom...</option>
            </select>
            {form.genre === CUSTOM_GENRE_VALUE && (
              <div className="mt-2">
                <input
                  className="w-full rounded-full border-none bg-white/95 px-4 py-2.5 text-sm text-stone-700 placeholder-stone-400 shadow-inner focus:outline-none focus:ring-2 focus:ring-white"
                  placeholder="Enter custom category"
                  value={form.customGenre}
                  onChange={setField('customGenre')}
                />
                {errors.customGenre && <p className="mt-1 text-xs text-rose-100">{errors.customGenre}</p>}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex w-full cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
              Upload a photo
            </label>
            {(form.coverImageName || form.existingCoverName) && (
              <p className="text-center text-xs text-white/80">
                {form.coverImageName || `Current: ${form.existingCoverName}`}
              </p>
            )}
            {errors.coverImageData && <p className="text-center text-xs text-rose-100">{errors.coverImageData}</p>}
            {form.coverPreview && (
              <div className="flex justify-center">
                <img src={form.coverPreview} alt="Selected cover preview" className="mt-2 h-32 w-24 rounded-xl object-cover shadow" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex w-full cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20">
              <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfChange} />
              Upload a PDF
            </label>
            {form.pdfName && <p className="text-center text-xs text-white/80">Selected: {form.pdfName}</p>}
            {!form.pdfName && form.existingPdfName && form.existingPdfPath && (
              <p className="text-center text-xs text-white/80">
                <a href={form.existingPdfPath} target="_blank" rel="noopener noreferrer" className="underline">
                  Current: {form.existingPdfName}
                </a>
              </p>
            )}
            {errors.pdfData && <p className="text-center text-xs text-rose-100">{errors.pdfData}</p>}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            className="w-full rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#2d5a3a] shadow focus:outline-none disabled:opacity-70"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (mode === 'edit' ? 'Saving...' : 'Adding...') : primaryLabel}
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-white/70 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-70"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ open, onCancel, onConfirm, title, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Delete this book?</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-stone-300">
          {title ? `"${title}" will be removed from the catalog.` : 'The selected book will be removed from the catalog.'}
        </p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="rounded-lg px-4 py-2 bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-60"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};