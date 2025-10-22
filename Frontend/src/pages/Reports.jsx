import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import profileImage from "../assets/pfp.png";
import { useNavigate } from "react-router-dom";
import api from "../api";

const TIME_RANGES = [
  { label: "Daily", value: "daily", days: 1 },
  { label: "Weekly", value: "weekly", days: 7 },
  { label: "Monthly", value: "monthly", days: 30 },
];

const REPORT_OPTIONS = [
  { label: "Usage Report", value: "usage" },
  { label: "Overdue Report", value: "overdue" },
  { label: "Borrowed Books Summary", value: "borrowed" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const numberFormatter = new Intl.NumberFormat();

const Reports = () => {
  const [timeRange, setTimeRange] = useState(TIME_RANGES[0]);
  const [reportType, setReportType] = useState(REPORT_OPTIONS[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [userName, setUserName] = useState("Account");
  const [summaryRows, setSummaryRows] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartColor, setChartColor] = useState("#2563eb");
  const [chartLabel, setChartLabel] = useState("");
  const [tableColumns, setTableColumns] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogout = () => {
    setShowLogoutModal(false);
    setShowDropdown(false);
    try {
      localStorage.removeItem("lr_token");
      localStorage.removeItem("lr_user");
    } catch {}
    navigate("/signin", { replace: true });
  };

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

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoadingReport(true);
      setError("");

      try {
        let nextSummary = [];
        let nextChart = [];
        let nextChartLabel = "";
        let nextChartColor = "#2563eb";
        let nextColumns = [];
        let nextRows = [];

        if (reportType.value === "usage") {
          const { data } = await api.get("/heatmap/visits", { params: { days: timeRange.days } });
          const items = data.items || [];
          const hours = new Array(24).fill(0);
          const days = new Array(7).fill(0);
          items.forEach((it) => {
            const hour = Math.max(0, Math.min(23, Number(it.hour ?? 0)));
            const dowRaw = Number(it.dow ?? 1) - 1;
            const dow = Math.max(0, Math.min(6, dowRaw));
            const count = Number(it.count || 0);
            hours[hour] += count;
            days[dow] += count;
          });

          const total = hours.reduce((acc, v) => acc + v, 0);
          let peakHourIdx = 0;
          let peakHourVal = 0;
          hours.forEach((value, idx) => {
            if (value > peakHourVal) {
              peakHourVal = value;
              peakHourIdx = idx;
            }
          });
          let peakDayIdx = 0;
          let peakDayVal = 0;
          days.forEach((value, idx) => {
            if (value > peakDayVal) {
              peakDayVal = value;
              peakDayIdx = idx;
            }
          });

          const peakHourLabel = peakHourVal > 0 ? `${String(peakHourIdx).padStart(2, "0")}:00 (${numberFormatter.format(peakHourVal)})` : "—";
          const peakDayLabel = peakDayVal > 0 ? `${DAY_LABELS[peakDayIdx]} (${numberFormatter.format(peakDayVal)})` : "—";

          nextSummary = [
            { label: "Total Library Visits", value: numberFormatter.format(total) },
            { label: "Peak Hour", value: peakHourLabel },
            { label: "Busiest Day", value: peakDayLabel },
          ];
          nextChart = hours.map((value, hour) => ({ label: `${hour}:00`, value }));
          nextChartLabel = `Visits per hour (last ${timeRange.days} day${timeRange.days === 1 ? "" : "s"})`;
          nextChartColor = "#2563eb";
          nextColumns = [
            { key: "day", label: "Day" },
            { key: "visits", label: "Visits" },
          ];
          nextRows = DAY_LABELS.map((label, idx) => ({ day: label, visits: numberFormatter.format(days[idx]) }));
        } else if (reportType.value === "overdue") {
          const { data } = await api.get("/reports/overdue", { params: { days: timeRange.days, limit: 120 } });
          const items = data.items || [];
          const now = new Date();
          let oldest = 0;
          const grouped = new Map();
          let noDue = 0;
          nextRows = items.map((item) => {
            const due = item.dueAt ? new Date(item.dueAt) : null;
            const borrowed = item.borrowedAt ? new Date(item.borrowedAt) : null;
            if (due) {
              const key = due.toISOString().slice(0, 10);
              grouped.set(key, (grouped.get(key) || 0) + 1);
              const diff = Math.max(0, Math.floor((now - due) / (24 * 60 * 60 * 1000)));
              if (diff > oldest) oldest = diff;
            } else {
              noDue += 1;
            }
            return {
              borrower: item.user || "Unknown Borrower",
              title: item.title || "Untitled",
              due: due ? due.toLocaleString() : "No due date",
              borrowed: borrowed ? borrowed.toLocaleDateString() : "—",
            };
          });

          nextChart = Array.from(grouped.entries())
            .sort((a, b) => (a[0] < b[0] ? -1 : 1))
            .map(([key, value]) => ({ label: new Date(key).toLocaleDateString(), value }));
          if (noDue) {
            nextChart.push({ label: "No due date", value: noDue });
          }

          const oldestLabel = items.length
            ? oldest > 0
              ? `${oldest} day${oldest === 1 ? "" : "s"} overdue`
              : "Due today"
            : "—";

          nextSummary = [
            { label: "Total Overdue Loans", value: numberFormatter.format(items.length) },
            { label: "Oldest Overdue", value: oldestLabel },
          ];
          nextChartLabel = "Overdue loans by due date";
          nextChartColor = "#dc2626";
          nextColumns = [
            { key: "borrower", label: "Borrower" },
            { key: "title", label: "Title" },
            { key: "due", label: "Due Date" },
            { key: "borrowed", label: "Borrowed" },
          ];
        } else {
          const { data } = await api.get("/reports/top-books", { params: { days: timeRange.days, limit: 12 } });
          const items = data.items || [];
          const totalBorrows = items.reduce((acc, item) => acc + Number(item.borrows || 0), 0);
          const top = items[0];

          nextSummary = [
            { label: "Total Borrows", value: numberFormatter.format(totalBorrows) },
            {
              label: "Top Title",
              value: top ? `${top.title} (${numberFormatter.format(top.borrows || 0)})` : "—",
            },
          ];
          nextChart = items.map((item) => ({ label: item.title, value: Number(item.borrows || 0) }));
          nextChartLabel = "Borrows per title";
          nextChartColor = "#0f766e";
          nextColumns = [
            { key: "title", label: "Title" },
            { key: "author", label: "Author" },
            { key: "borrows", label: "Borrows" },
          ];
          nextRows = items.map((item) => ({
            title: item.title,
            author: item.author,
            borrows: numberFormatter.format(item.borrows || 0),
          }));
        }

        if (!ignore) {
          setSummaryRows(nextSummary);
          setChartData(nextChart);
          setChartLabel(nextChartLabel);
          setChartColor(nextChartColor);
          setTableColumns(nextColumns);
          setTableRows(nextRows);
        }
      } catch (err) {
        if (!ignore) {
          setError("Failed to load report data. Please try again.");
          setSummaryRows([]);
          setChartData([]);
          setTableColumns([]);
          setTableRows([]);
        }
      } finally {
        if (!ignore) setLoadingReport(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [reportType, timeRange]);

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
              <span className="text-sm text-slate-700 dark:text-stone-200 max-w-[12rem] truncate" title={userName}>
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

        <section className="mt-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Auto Reports</h2>

          <div className="mt-3 flex items-center gap-2">
            {TIME_RANGES.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range)}
                className={`rounded-lg px-3 py-1.5 ring-1 ring-slate-200 dark:ring-stone-700 ${
                  timeRange.value === range.value
                    ? "bg-brand-gold text-white"
                    : "bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <label className="text-sm text-slate-700 dark:text-stone-200">Report Type:</label>
            <select
              value={reportType.value}
              onChange={(e) => {
                const next = REPORT_OPTIONS.find((opt) => opt.value === e.target.value);
                if (next) setReportType(next);
              }}
              className="rounded-lg px-3 py-1.5 bg-white dark:bg-stone-950 ring-1 ring-slate-200 dark:ring-stone-700 text-slate-700 dark:text-stone-200"
            >
              {REPORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

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
                  {loadingReport && summaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-500 dark:text-stone-300">
                        Loading summary...
                      </td>
                    </tr>
                  ) : summaryRows.length ? (
                    summaryRows.map((row) => (
                      <tr key={row.label} className="text-slate-800 dark:text-stone-100">
                        <td className="py-2 pr-4">{row.label}</td>
                        <td className="py-2 pr-4">{row.value}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="py-6 text-center text-slate-500 dark:text-stone-300">
                        No summary data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4">
              <p className="text-sm text-slate-500 dark:text-stone-300 mb-2">{chartLabel}</p>
              <div className="h-[250px]">
                {loadingReport && chartData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-stone-300">
                    Loading chart...
                  </div>
                ) : chartData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" interval={chartData.length > 12 ? Math.ceil(chartData.length / 12) : 0} />
                      <YAxis allowDecimals={false} />
                      <Tooltip formatter={(value) => numberFormatter.format(value)} />
                      <Bar dataKey="value" fill={chartColor} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-stone-300">
                    No chart data available.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-stone-300">
                  {tableColumns.map((col) => (
                    <th key={col.key} className="py-2 pr-4">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loadingReport && tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, tableColumns.length)} className="py-6 text-center text-slate-500 dark:text-stone-300">
                      Loading records...
                    </td>
                  </tr>
                ) : tableRows.length ? (
                  tableRows.map((row, idx) => (
                    <tr key={row.id || `${idx}-${reportType.value}`} className="text-slate-800 dark:text-stone-100">
                      {tableColumns.map((col) => (
                        <td key={col.key} className="py-2 pr-4">
                          {row[col.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Math.max(1, tableColumns.length)} className="py-6 text-center text-slate-500 dark:text-stone-300">
                      No records available for the selected report.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              <button
                className="rounded-lg px-4 py-2 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 text-slate-700 dark:text-stone-200"
                onClick={() => setShowLogoutModal(false)}
              >
                Close
              </button>
              <button
                className="rounded-lg px-4 py-2 bg-red-600 text-white hover:bg-red-500"
                onClick={handleLogout}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
