/* eslint-disable react-hooks/exhaustive-deps, no-unused-vars */
import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import profileImage from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api, { clearAuthSession, broadcastAuthChange, getStoredUser } from "../api";

const STUDENT_ID_PATTERN = /^\d{2}-\d{4}-\d{5,6}$/;

const Tracker = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('Account');
  const navigate = useNavigate();

  const handleLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    clearAuthSession();
    broadcastAuthChange();
    navigate("/signin", { replace: true });
  };

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ outbound: 0, inbound: 0, overdue: 0, active: 0, activeLoans: 0 });
  const [feed, setFeed] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refreshStats = useCallback(async () => {
    try {
      const { data } = await api.get('/tracker/stats');
      setStats({
        outbound: data.outbound || 0,
        inbound: data.inbound || 0,
        overdue: data.overdue || 0,
        active: data.active || 0,
        activeLoans: data.activeLoans || 0
      });
    } catch {
      setStats({ outbound: 0, inbound: 0, overdue: 0, active: 0, activeLoans: 0 });
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const { data } = await api.get('/tracker/logs', { params: { limit: 25 } });
      const items = (data.items || []).map((row) => ({
        status: row.status,
        borrowedDate: row.borrowedAt ? new Date(row.borrowedAt).toLocaleString() : '-',
        dueDate: row.returnedAt
          ? `Returned ${new Date(row.returnedAt).toLocaleString()}`
          : row.dueAt
          ? new Date(row.dueAt).toLocaleString()
          : '-',
        material: row.material || 'Unknown material',
        user: row.user || 'Unknown user'
      }));
      setLogs(items);
    } catch {
      setLogs([]);
    }
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    refreshLogs();
    const timer = setInterval(refreshLogs, 30000);
    return () => clearInterval(timer);
  }, [refreshLogs]);

  useEffect(() => {
    let t;
    const tick = async () => {
      try {
        const { data } = await api.get('/visits/recent', { params: { minutes: 180 } });
        setFeed((data.items || []).map(v => ({
          name: v.name || v.studentId,
          enteredAt: v.enteredAt ? new Date(v.enteredAt).toLocaleTimeString() : '-',
          exitedAt: v.exitedAt ? new Date(v.exitedAt).toLocaleTimeString() : null,
          branch: v.branch
        })));
      } catch { setFeed([]); }
      t = setTimeout(tick, 5000);
    };
    tick();
    return () => { if (t) clearTimeout(t); };
  }, []);

  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      setTimeout(() => { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08); o.stop(ctx.currentTime + 0.1); }, 80);
    } catch {}
  }

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      const name = stored?.fullName || stored?.name || (stored?.email ? String(stored.email).split('@')[0] : null);
      if (name) setUserName(name);
    }
  }, []);

  function toPayload(code) {
    const s = String(code || '').trim();
    if (!STUDENT_ID_PATTERN.test(s)) return null;
    return { studentId: s };
  }

  async function doEnter() {
    const payload = toPayload(input);
    if (!payload) {
      setMessage('Student ID must match 03-0000-00000');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const { data } = await api.post('/visit/enter', payload);
      setMessage(`Entered: ${data?.user?.fullName || payload.studentId || payload.barcode}`);
      beep();
      refreshStats();
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Enter failed');
    } finally { setBusy(false); }
  }
  async function doExit() {
    const payload = toPayload(input);
    if (!payload) {
      setMessage('Student ID must match 03-0000-00000');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const { data } = await api.post('/visit/exit', payload);
      setMessage(`Exited at ${new Date(data.exitedAt).toLocaleTimeString()}`);
      beep();
      refreshStats();
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Exit failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        {/* Topbar */}
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

        {/* Cards */}
        <section className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Outbound', value: stats.outbound },
            { label: 'Inbound', value: stats.inbound },
            { label: 'Overdue', value: stats.overdue },
            { label: 'Active Visits', value: stats.active }
          ].map((c) => (
            <div key={c.label} className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
              <p className="text-sm text-slate-500 dark:text-stone-300">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-stone-100">{c.value}</p>
            </div>
          ))}
        </section>

        {/* Manual entry */}
        <section className="mt-6 grid grid-cols-1 gap-4">
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Enter Student ID</label>
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="03-0000-00000"
                   className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60" disabled={busy || !STUDENT_ID_PATTERN.test(String(input).trim())} onClick={doEnter}>Enter</button>
              <button className="rounded-lg px-3 py-2 bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-60" disabled={busy || !STUDENT_ID_PATTERN.test(String(input).trim())} onClick={doExit}>Exit</button>
            </div>
            {message && <div className="mt-3 text-sm text-slate-700 dark:text-stone-200">{message}</div>}
          </div>
        </section>

        {/* Quick logs */}
        <section className="mt-6 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Quick Logs</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-stone-300">
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Borrowed Date</th>
                  <th className="py-2 pr-4">Due Date</th>
                  <th className="py-2 pr-4">Material</th>
                  <th className="py-2 pr-4">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {logs.map((log, i) => (
                  <tr key={i} className="text-slate-800 dark:text-stone-100">
                    <td className="py-2 pr-4">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs text-white ${
                          log.status === 'Overdue'
                            ? 'bg-rose-600'
                            : log.status === 'Returned'
                            ? 'bg-emerald-600'
                            : 'bg-indigo-600'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{log.borrowedDate}</td>
                    <td className="py-2 pr-4">{log.dueDate}</td>
                    <td className="py-2 pr-4">{log.material}</td>
                    <td className="py-2 pr-4">{log.user}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-slate-500 dark:text-stone-400">
                      No recent loan activity.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-stone-400">Active loans: {stats.activeLoans}</p>
        </section>

        {/* Recent visits feed */}
        <section className="mt-6 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Recent Visits</h3>
          <ul className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
            {feed.map((v, i) => (
              <li key={i} className="py-2 text-sm text-slate-700 dark:text-stone-200 flex items-center justify-between">
                <span>{v.name} <span className="text-slate-500">@ {v.branch}</span></span>
                <span className="text-slate-500">{v.enteredAt}{v.exitedAt ? ` → ${v.exitedAt}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>

        
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

export default Tracker;


