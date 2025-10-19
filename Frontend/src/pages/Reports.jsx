import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import profileImage from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api from "../api";

const Reports = () => {
  const [timeRange, setTimeRange] = useState("Daily");
  const [reportType, setReportType] = useState("Usage Report");
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

  const [summary, setSummary] = useState({ visits: 0, peak: 0 });
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get('/heatmap/visits', { params: { days: 1 } }).then(r => {
      const items = r.data.items || [];
      const hours = new Array(24).fill(0);
      for (const it of items) hours[it.hour ?? 0] += it.count || 0;
      const series = hours.map((v,h) => ({ time: `${h}:00`, visits: v }));
      const total = hours.reduce((a,b)=>a+b,0);
      const peak = Math.max(...hours);
      setData(series);
      setSummary({ visits: total, peak });
    }).catch(()=>{});
  }, []);

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

        <section className="mt-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Auto Reports</h2>

          <div className="mt-3 flex items-center gap-2">
            {['Daily','Weekly','Monthly'].map((t) => (
              <button key={t} onClick={()=>setTimeRange(t)} className={`rounded-lg px-3 py-1.5 ring-1 ring-slate-200 dark:ring-stone-700 ${timeRange===t ? 'bg-brand-gold text-white' : 'bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200'}`}>{t}</button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label className="text-sm text-slate-700 dark:text-stone-200">Report Type:</label>
            <select value={reportType} onChange={e=>setReportType(e.target.value)} className="rounded-lg px-3 py-1.5 bg-white dark:bg-stone-950 ring-1 ring-slate-200 dark:ring-stone-700 text-slate-700 dark:text-stone-200">
              <option>Usage Report</option>
              <option>Overdue Report</option>
              <option>Borrowed Books Summary</option>
            </select>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600 dark:text-stone-300">
                    <th className="py-2 pr-4">Metric</th>
                    <th className="py-2 pr-4">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr className="text-slate-800 dark:text-stone-100">
                    <td className="py-2 pr-4">Total Library Visits</td>
                    <td className="py-2 pr-4">{summary.visits}</td>
                  </tr>
                  <tr className="text-slate-800 dark:text-stone-100">
                    <td className="py-2 pr-4">Peak Hour Count</td>
                    <td className="py-2 pr-4">{summary.peak}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="visits" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button className="rounded-lg px-4 py-2 bg-brand-gold text-white hover:opacity-90">Download as PDF</button>
          </div>
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

export default Reports;
