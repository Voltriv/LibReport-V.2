import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import Sidebar from "../components/Sidebar";
import pfp from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api, { resolveMediaUrl, clearAuthSession, broadcastAuthChange, getStoredUser } from "../api";
import BookFormModal from '../components/BookFormModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

// Default genre values
const GENRE_DEFAULTS = [
  'Fiction', 'Non-fiction', 'Science', 'Technology', 'History', 'Arts', 'Education', 'Reference', 'Research'
];

const CUSTOM_GENRE_VALUE = '__custom__';

const BooksManagement = () => {
  const [books, setBooks] = useState([]);
  const [toast, setToast] = useState(null); // { msg, type }
  const toastTimeoutRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('Account');
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnBusy, setReturnBusy] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false); // For Book Form Modal
  const [editingBook, setEditingBook] = useState(null); // For editing book
  const [deleteTarget, setDeleteTarget] = useState(null); // For book deletion
  const [formBusy, setFormBusy] = useState(false); // For form submission state
  const [deleteBusy, setDeleteBusy] = useState(false); // For delete state
  const navigate = useNavigate();

  const handleLogout = () => {
    setShowLogoutModal(false);
    setIsDropdownOpen(false);
    clearAuthSession();
    broadcastAuthChange();
    navigate("/signin", { replace: true });
  };

  const toggleDropdown = (id) => { setIsDropdownOpen(isDropdownOpen === id ? null : id); };

  const loadActiveLoans = useCallback(async () => {
    try {
      const { data } = await api.get('/loans/active');
      const items = (data.items || []).map((it) => ({
        id: it._id,
        title: it.title,
        student: it.student,
        borrowed: it.borrowedAt ? new Date(it.borrowedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-',
        due: it.dueAt ? new Date(it.dueAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '-',
        status: it.status || 'On Time',
      }));
      setBooks(items);
    } catch {
      setBooks([]);
    }
  }, []);

  useEffect(() => {
    loadActiveLoans();
  }, [loadActiveLoans]);

  const loadCatalog = useCallback(async () => {
    try {
      const { data } = await api.get('/books');
      const items = (data || []).map((b) => {
        const coverPath = resolveMediaUrl(b.coverImagePath || b.imageUrl || '');
        const pdfPath = resolveMediaUrl(b.pdfPath || b.pdfUrl || '');
        return {
          id: b._id || b.id,
          title: b.title,
          author: b.author,
          bookCode: b.bookCode || '',
          genre: b.genre || (Array.isArray(b.tags) && b.tags[0]) || '',
          totalCopies: b.totalCopies ?? 0,
          availableCopies: b.availableCopies ?? 0,
          coverImagePath: coverPath,
          coverImageOriginalName: b.coverImageOriginalName || '',
          pdfPath: pdfPath,
          pdfOriginalName: b.pdfOriginalName || '',
          createdAt: b.createdAt ? new Date(b.createdAt) : null,
        };
      });
      items.sort((a, b) => (b.createdAt ? b.createdAt.getTime() : 0) - (a.createdAt ? a.createdAt.getTime() : 0));
      setBooks(items);
    } catch (error) {
      setBooks([]);
      showToast('Failed to load catalog', 'error');
    }
  }, []);

  const showToast = (msg, type) => setToast({ msg, type });

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      const name = stored?.fullName || stored?.name || (stored?.email ? String(stored.email).split('@')[0] : null);
      if (name) setUserName(name);
    }
  }, []);

  // Create book
  async function handleCreateBook(payload) {
    setFormBusy(true);
    try {
      await api.post('/books', payload);
      await loadCatalog();
      setIsAddOpen(false);
      showToast('Book added', 'success');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to add book';
      showToast(msg, 'error');
    } finally {
      setFormBusy(false);
    }
  }

  // Update book
  async function handleUpdateBook(payload) {
    if (!editingBook) return;
    setFormBusy(true);
    try {
      await api.patch(`/books/${editingBook.id}`, payload);
      await loadCatalog();
      setEditingBook(null);
      showToast('Book updated', 'success');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to update book';
      showToast(msg, 'error');
    } finally {
      setFormBusy(false);
    }
  }

  // Delete book
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

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />
      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        {/* Rest of your JSX code... */}
        <BookFormModal open={isAddOpen} mode="create" onCancel={() => setIsAddOpen(false)} onSubmit={handleCreateBook} />
        <DeleteConfirmModal open={Boolean(deleteTarget)} title={deleteTarget?.title} onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteBook} />
      </main>
    </div>
  );
};

export default BooksManagement;
