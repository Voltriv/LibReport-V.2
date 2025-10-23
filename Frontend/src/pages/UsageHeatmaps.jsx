import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const ranges = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

const UsageHeatmaps = () => {
  const [range, setRange] = useState(ranges[1]);
  const [view, setView] = useState("daily");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState("Account");
  const navigate = useNavigate();

  const load = useCallback(async (days) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/heatmap/visits", { params: { days } });
      setItems(data.items || []);
    } catch {
      setItems([]);
      setError("Failed to load usage data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range.value);
  }, [load, range]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lr_user");
      if (raw) {
        const u = JSON.parse(raw);
        const name = u?.fullName || u?.name || (u?.email ? String(u.email).split("@")[0] : null);
        if (name) setUserName(name);
      }
    } catch {}
  }, []);

  const handleLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    try {
      localStorage.removeItem("lr_token");
      localStorage.removeItem("lr_user");
    } catch {}
    try {
      window.dispatchEvent(new Event("lr-auth-change"));
    } catch {}
    navigate("/signin", { replace: true });
  };

  const dailySeries = useMemo(() => {
    const sums = new Array(7).fill(0);
    for (const it of items) {
      const dow = (it.dow ?? 1) - 1;
      if (dow >= 0 && dow < 7) sums[dow] += it.count || 0;
    }
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return labels.map((label, idx) => ({ label, value: sums[idx] }));
  }, [items]);

  const hourlySeries = useMemo(() => {
    const sums = new Array(24).fill(0);
    for (const it of items) {
      const hour = it.hour ?? 0;
      if (hour >= 0 && hour < 24) sums[hour] += it.count || 0;
    }
    return sums.map((value, hour) => ({ label: `${hour}:00`, value }));
  }, [items]);

  const summary = useMemo(() => {
    const total = items.reduce((acc, it) => acc + (it.count || 0), 0);
    const peakDay = dailySeries.reduce((best, row) => (row.value > best.value ? row : best), {
      label: "-",
      value: 0,
    });
    const peakHour = hourlySeries.reduce((best, row) => (row.value > best.value ? row : best), {
      label: "-",
      value: 0,
    });
    return { total, peakDay, peakHour };
  }, [dailySeries, hourlySeries, items]);

  const chartData = view === "hourly" ? hourlySeries : dailySeries;
  const chartLabel = view === "hourly" ? "Visits by Hour" : "Visits by Day of Week";

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />

      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        <div className="flex items-center justify-end">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-stone-900/60 ring-1 ring-slate-200 dark:ring-stone-700 px-2 py-1 shadow hover:shadow-md"
            >
              <img src={profileImage} alt="Profile" className="h-8 w-8 rounded-full" />
              <span className="text-sm text-slate-700 dark:text-stone-200" title={userName}>
                {userName}
              </span>
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-40 rounded-md bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow-lg p-1">
                <button
                  className="w-full text-left rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => setShowLogoutModal(true)}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <section className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
              <p className="text-sm text-slate-500 dark:text-stone-300">Total Visits</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-stone-100">{summary.total}</p>
            </div>
            <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
              <p className="text-sm text-slate-500 dark:text-stone-300">Busiest Day</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-stone-100">
                {summary.peakDay.label} ({summary.peakDay.value})
              </p>
            </div>
            <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
              <p className="text-sm text-slate-500 dark:text-stone-300">Peak Hour</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-stone-100">
                {summary.peakHour.label} ({summary.peakHour.value})
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Usage Heatmaps</h2>
                <p className="text-sm text-slate-500 dark:text-stone-300">{chartLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg bg-slate-100 dark:bg-stone-800 p-1">
                  <button
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "daily" ? "bg-white dark:bg-stone-900 text-slate-900 dark:text-stone-100 shadow" : "text-slate-600 dark:text-stone-300"}`}
                    onClick={() => setView("daily")}
                  >
                    Day of week
                  </button>
                  <button
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === "hourly" ? "bg-white dark:bg-stone-900 text-slate-900 dark:text-stone-100 shadow" : "text-slate-600 dark:text-stone-300"}`}
                    onClick={() => setView("hourly")}
                  >
                    Hour of day
                  </button>
                </div>
                <select
                  className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-1.5 text-sm text-slate-700 dark:text-stone-200"
                  value={range.value}
                  onChange={(e) => {
                    const next = ranges.find((r) => r.value === Number(e.target.value));
                    if (next) setRange(next);
                  }}
                >
                  {ranges.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [value, "Visits"]} />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={!loading} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="mt-2 text-xs text-slate-500 dark:text-stone-400">
              Showing visitor check-ins {range.label.toLowerCase()}.
            </p>
          </div>
        </section>
      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-stone-100">Are you sure you want to logout?</h3>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200"
                onClick={() => setShowLogoutModal(false)}
              >
                Close
              </button>
              <button className="rounded-lg px-4 py-2 bg-red-600 text-white hover:bg-red-500" onClick={handleLogout}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageHeatmaps;
