import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import profileImage from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api from "../api";

const Tracker = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState('Account');
  const navigate = useNavigate();

  const handleLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    try { localStorage.removeItem('lr_token'); localStorage.removeItem('lr_user'); } catch {}
    navigate("/signin", { replace: true });
  };

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ outbound: 0, inbound: 0, overdue: 0, active: 0 });
  const [feed, setFeed] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [camOn, setCamOn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const videoRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    api.get('/reports/overdue').then(r => {
      const items = r.data?.items || [];
      const mapped = items.map(o => ({
        status: 'Overdue',
        borrowedDate: o.borrowedAt ? new Date(o.borrowedAt).toLocaleString() : '-',
        dueDate: o.dueAt ? new Date(o.dueAt).toLocaleString() : '-',
        material: o.title,
        user: o.user,
        color: 'red'
      }));
      setLogs(mapped);
      setStats({ outbound: 0, inbound: 0, overdue: mapped.length, active: mapped.length });
    }).catch(() => { setLogs([]); });
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lr_scan_sound');
      if (saved !== null) setSoundOn(saved === '1');
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('lr_scan_sound', soundOn ? '1' : '0'); } catch {}
  }, [soundOn]);

  useEffect(() => {
    let t;
    const tick = async () => {
      try {
        const { data } = await api.get('/visits/recent', { params: { minutes: 180 } });
        setFeed((data.items || []).map(v => ({
          name: v.name || v.studentId || v.barcode,
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

  useEffect(() => {
    let stream;
    let detector;
    let cancelled = false;
    async function start() {
      try {
        if (!('BarcodeDetector' in window)) return;
        detector = new window.BarcodeDetector({ formats: ['qr_code','code_128','code_39','ean_13','ean_8'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const loop = async () => {
          if (cancelled || !camOn) return;
          try {
            const det = await detector.detect(videoRef.current);
            if (det && det[0]?.rawValue) {
              const code = String(det[0].rawValue).trim();
              setInput(code);
              beep();
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
  }, [camOn]);

  function beep() {
    if (!soundOn) return;
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
    try {
      const raw = localStorage.getItem('lr_user');
      if (raw) {
        const u = JSON.parse(raw);
        const name = u?.fullName || u?.name || (u?.email ? String(u.email).split('@')[0] : null);
        if (name) setUserName(name);
      }
    } catch {}
  }, []);

  function toPayload(code) {
    const s = String(code || '').trim();
    if (!s) return null;
    return (s.includes('@') || /\d{2}-\d{4}-\d{6}/.test(s)) ? { studentId: s } : { barcode: s };
  }

  async function doEnter() {
    const payload = toPayload(input);
    if (!payload) return;
    setBusy(true); setMessage('');
    try {
      const { data } = await api.post('/visit/enter', payload);
      setMessage(`Entered: ${data?.user?.fullName || payload.studentId || payload.barcode}`);
      beep();
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Enter failed');
    } finally { setBusy(false); }
  }
  async function doExit() {
    const payload = toPayload(input);
    if (!payload) return;
    setBusy(true); setMessage('');
    try {
      const { data } = await api.post('/visit/exit', payload);
      setMessage(`Exited at ${new Date(data.exitedAt).toLocaleTimeString()}`);
      beep();
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
            { label: 'Active', value: stats.active }
          ].map((c) => (
            <div key={c.label} className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
              <p className="text-sm text-slate-500 dark:text-stone-300">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-stone-100">{c.value}</p>
            </div>
          ))}
        </section>

        {/* Scanner */}
        <section className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Scan or enter Student ID / Barcode</label>
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="03-2324-000000 or barcode"
                   className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200" onClick={()=>setCamOn(!camOn)}>{camOn ? 'Stop Camera' : 'Start Camera'}</button>
              <button className="rounded-lg px-3 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200" onClick={()=>setSoundOn(!soundOn)}>{soundOn ? 'Sound On' : 'Sound Off'}</button>
              <button className="rounded-lg px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60" disabled={busy || !input} onClick={doEnter}>Enter</button>
              <button className="rounded-lg px-3 py-2 bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-60" disabled={busy || !input} onClick={doExit}>Exit</button>
            </div>
            {message && <div className="mt-3 text-sm text-slate-700 dark:text-stone-200">{message}</div>}
          </div>
          <div className="rounded-xl overflow-hidden bg-slate-900 ring-1 ring-slate-700">
            <video ref={videoRef} className={`block w-full h-64 object-cover ${camOn ? '' : 'opacity-40'}`} playsInline muted></video>
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
                    <td className="py-2 pr-4"><span className="inline-flex items-center rounded px-2 py-0.5 bg-rose-600 text-white text-xs">{log.status}</span></td>
                    <td className="py-2 pr-4">{log.borrowedDate}</td>
                    <td className="py-2 pr-4">{log.dueDate}</td>
                    <td className="py-2 pr-4">{log.material}</td>
                    <td className="py-2 pr-4">{log.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
