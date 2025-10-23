import React from "react";
import { Link, useNavigate } from "react-router-dom";

import api, { clearAuthSession, broadcastAuthChange } from "../api";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const StudentAccount = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState(null);
  const [hours, setHours] = React.useState([]);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [hoursLoading, setHoursLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadProfile = React.useCallback(async () => {
    try {
      setLoadingProfile(true);
      const { data } = await api.get("/student/me");
      setProfile(data);
    } catch (e) {
      const msg = e?.response?.data?.error || "Unable to load your profile.";
      setError(msg);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const loadHours = React.useCallback(async () => {
    try {
      const { data } = await api.get("/hours");
      setHours(data?.items || []);
    } catch {
      setHours([]);
    } finally {
      setHoursLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
    loadHours();
  }, [loadProfile, loadHours]);

  const onLogout = () => {

    clearAuthSession();
    broadcastAuthChange();

    navigate("/student/signin", { replace: true });
  };

  return (
    <div className="bg-slate-50">
      <div className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-12">
          <h1 className="text-3xl font-semibold text-slate-900">My Account</h1>
          <p className="text-sm text-slate-600">
            Manage your student profile, review library hours, and jump back into the catalog to borrow titles.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Profile details</h2>
            {loadingProfile ? (
              <div className="mt-4 space-y-3 text-sm text-slate-500">Loading your information...</div>
            ) : profile ? (
              <dl className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="grid grid-cols-3 gap-3">
                  <dt className="font-medium text-slate-500">Student ID</dt>
                  <dd className="col-span-2 text-slate-900">{profile.studentId}</dd>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <dt className="font-medium text-slate-500">Full name</dt>
                  <dd className="col-span-2 text-slate-900">{profile.fullName}</dd>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <dt className="font-medium text-slate-500">Email</dt>
                  <dd className="col-span-2 text-slate-900">{profile.email}</dd>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <dt className="font-medium text-slate-500">Status</dt>
                  <dd className="col-span-2 capitalize text-slate-900">{profile.status}</dd>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <dt className="font-medium text-slate-500">Member since</dt>
                  <dd className="col-span-2 text-slate-900">
                    {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "--"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No profile information available.</p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">

              <Link to="/student/catalog" className="btn-student-primary">

                Go to catalog
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Library hours</h2>
            {hoursLoading ? (
              <p className="mt-3 text-sm text-slate-500">Loading schedule...</p>
            ) : hours.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {hours.map((row) => (
                  <li key={`${row.dayOfWeek}-${row.open}-${row.close}`} className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{dayNames[row.dayOfWeek] || `Day ${row.dayOfWeek}`}</span>
                    <span>{row.open} – {row.close}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No posted hours yet. Please check back soon.</p>
            )}
            <p className="mt-5 text-xs text-slate-500">
              Need assistance outside library hours? Submit a request and our librarians will reach out on the next business day.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StudentAccount;
