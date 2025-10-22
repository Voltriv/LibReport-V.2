import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import ReportModal from "../components/GenReports";
import profileImage from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const [showReport, setShowReport] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('Account');
  const navigate = useNavigate();

  const handleLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    try {
      localStorage.removeItem('lr_token');
      localStorage.removeItem('lr_user');
    } catch {}
    navigate("/signin", { replace: true });
  };

  const [counts, setCounts] = useState({ users: 0, books: 0, activeLoans: 0, visitsToday: 0, overdue: 0 });
  const [topBooks, setTopBooks] = useState([]);
  const [heat, setHeat] = useState([]);

  useEffect(() => {
    // Load dashboard summary
    api.get('/dashboard').then(r => setCounts(c => ({ ...c, ...r.data.counts }))).catch(() => {});
    api.get('/reports/top-books').then(r => setTopBooks(r.data.items || [])).catch(() => {});
    api.get('/heatmap/visits', { params: { days: 7 } }).then(r => setHeat(r.data.items || [])).catch(() => {});
    api.get('/reports/overdue').then(r => setCounts(c => ({ ...c, overdue: (r.data.items || []).length })) ).catch(() => {});
  }, []);

  const chartData = useMemo(() => {
    const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const sums = new Array(7).fill(0);
    for (const row of heat) {
      // dow from Mongo $dayOfWeek is 1..7 (Sun..Sat)
      const idx = (row.dow ?? 1) - 1;
      sums[idx] += row.count || 0;
    }
    return names.map((name, i) => ({ day: name, value: sums[i] }));
  }, [heat]);

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

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        <div className="flex items-center justify-end">
          <div className="relative">
            <button onClick={() => setShowDropdown(!showDropdown)} className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-stone-900/60 ring-1 ring-slate-200 dark:ring-stone-700 px-2 py-1 shadow hover:shadow-md">
              <img src={profileImage} alt="Profile" className="h-8 w-8 rounded-full" />
              <span className="text-sm text-slate-700 dark:text-stone-200 max-w-[12rem] truncate" title={userName}>{userName}</span>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-40 rounded-md bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg p-1">
                <button className="w-full text-left rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setShowLogoutModal(true)}>Logout</button>
              </div>
            )}
          </div>
        </div>

        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <p className="text-sm text-slate-500 dark:text-stone-300">Total Books</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-stone-100">{counts.books}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <p className="text-sm text-slate-500 dark:text-stone-300">Books Borrowed</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-stone-100">{counts.activeLoans}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <p className="text-sm text-slate-500 dark:text-stone-300">Overdue Books</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-stone-100">{counts.overdue}</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <p className="text-sm text-slate-500 dark:text-stone-300">Active Users</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-stone-100">{counts.users}</p>
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100 mb-3">Usage Heatmaps</h3>
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Quick Reports</h3>
              <button className="inline-flex items-center rounded-lg bg-brand-gold text-white font-medium px-3 py-2 hover:opacity-90" onClick={() => setShowReport(true)}>Generate Report</button>
            </div>
            <p className="text-sm text-slate-500 dark:text-stone-300">Generate a quick overview report.</p>
          </div>

          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100 mb-2">Popular Books</h3>
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {topBooks.slice(0,5).map((b) => (
                <li key={b.bookId || b.title} className="py-2 text-sm text-slate-700 dark:text-stone-200">
                  <span className="font-medium">{b.title}</span> <span className="text-slate-500 dark:text-stone-400">by {b.author}</span> <span className="text-slate-500 dark:text-stone-400">({b.borrows})</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {showReport && <ReportModal onClose={() => setShowReport(false)} />}
      </main>

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
    </div>
  );
};

export default Dashboard;


