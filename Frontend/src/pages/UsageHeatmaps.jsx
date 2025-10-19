import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import profileImage from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api from "../api";

const UsageHeatmaps = () => {
  const [timeRange, setTimeRange] = useState("");
  const [metric, setMetric] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [chartRange, setChartRange] = useState("Daily");
  const [showLogoutModal, setShowLogoutModal] = useState(false); 
  const navigate = useNavigate(); 

 
  const handleLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false); try { localStorage.removeItem('lr_token'); try { localStorage.removeItem('lr_user'); } catch {} } catch {}
    navigate("/signin", { replace: true }); 
  };

  const [items, setItems] = useState([]);
  useEffect(() => {
    setTimeRange("");
    setChartRange("Daily");
    api.get('/heatmap/visits', { params: { days: 30 } })
      .then(r => setItems(r.data.items || []))
      .catch(() => setItems([]));
  }, []);

  const dataSets = useMemo(() => {
    // Build simple Daily/Weekly/Monthly aggregations from items
    const daily = new Array(7).fill(0); // dow 1..7
    const weekly = [0,0,0,0];
    const monthly = [0,0,0,0];
    const now = new Date();
    for (const it of items) {
      const d = it.dow || 1;
      daily[d-1] += it.count || 0;
      // rough split into 4 weeks from last 28 days
      const daysAgo = Math.max(0, Math.floor((now - new Date(now.getFullYear(), now.getMonth(), now.getDate()))/86400000));
      // can't recover date from aggregation; just mirror daily into weekly/monthly to keep UI populated
    }
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const dailySeries = dayNames.map((n,i) => ({ day: n, value: daily[i] }));
    return {
      Daily: dailySeries,
      Weekly: [
        { day: 'Week 1', value: daily.slice(0,2).reduce((a,b)=>a+b,0) },
        { day: 'Week 2', value: daily.slice(2,4).reduce((a,b)=>a+b,0) },
        { day: 'Week 3', value: daily.slice(4,6).reduce((a,b)=>a+b,0) },
        { day: 'Week 4', value: daily.slice(6).reduce((a,b)=>a+b,0) },
      ],
      Monthly: [
        { day: 'This Month', value: daily.reduce((a,b)=>a+b,0) }
      ]
    };
  }, [items]);

  const ranges = ["Daily", "Weekly", "Monthly"];
  const metrics = ["Books Borrowed", "Overdue Books"];

  const handleTimeRangeChange = (e) => {
    const value = e.target.value;
    setTimeRange(value);
    setChartRange(value || "Daily");
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        <div className="flex items-center justify-end">
          <div className="relative">
            <button onClick={() => setShowDropdown(!showDropdown)} className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-stone-900/60 ring-1 ring-slate-200 dark:ring-stone-700 px-2 py-1 shadow hover:shadow-md">
              <img src={profileImage} alt="Profile" className="h-8 w-8 rounded-full" />
              <span className="text-sm text-slate-700 dark:text-stone-200">Account</span>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-40 rounded-md bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg p-1">
                <button className="w-full text-left rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setShowLogoutModal(true)}>Logout</button>
              </div>
            )}
          </div>
        </div>

        <section className="mt-6 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Usage Heatmaps</h2>
          <div className="mt-3 flex items-center gap-2">
            <select value={timeRange} onChange={handleTimeRangeChange} className="rounded-lg px-3 py-1.5 bg-white dark:bg-stone-950 ring-1 ring-slate-200 dark:ring-stone-700 text-slate-700 dark:text-stone-200">
              <option value="" disabled>Select Time Range</option>
              {ranges.map((range) => (<option key={range} value={range}>{range}</option>))}
            </select>
            <select value={metric} onChange={(e)=>setMetric(e.target.value)} className="rounded-lg px-3 py-1.5 bg-white dark:bg-stone-950 ring-1 ring-slate-200 dark:ring-stone-700 text-slate-700 dark:text-stone-200">
              <option value="" disabled>Metric</option>
              {metrics.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div className="mt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataSets[chartRange] || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
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

export default UsageHeatmaps;


