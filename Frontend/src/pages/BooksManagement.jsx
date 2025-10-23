/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
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
      await loadCatalog();
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
      await loadCatalog();
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
      const items = (data || []).map(b => ({
        id: b._id || b.id,
        type: (b.tags && b.tags[0]) || 'Book',
        title: b.title,
        author: b.author,
        totalCopies: b.totalCopies ?? 0,
        availableCopies: b.availableCopies ?? 0,
      }));
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
      setEditingBook(null);
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
  const confirmReturn = async () => { try { await api.post('/loans/return', { loanId: selectedBook.id }); await loadActiveLoans(); await loadCatalog(); } catch {} closeModal(); };
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

// Catalog modals (co-located for simplicity)
// Note: Using inline modals for add/edit/delete to manage catalog



