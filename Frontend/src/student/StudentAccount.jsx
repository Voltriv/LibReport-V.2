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
    <div className="bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="relative overflow-hidden border-b border-slate-200/60 bg-gradient-to-r from-white via-slate-50 to-white">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-green-soft/10 via-transparent to-brand-gold-soft/10"></div>
        <div className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green to-brand-greenDark text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">My Account</h1>
              <p className="text-lg text-slate-600 mt-2">
                Manage your student profile, review library hours, and jump back into the catalog to borrow titles.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-3xl bg-white/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-200/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green-soft to-brand-gold-soft">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Profile Details</h2>
            </div>
            
            {loadingProfile ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                  <div className="h-6 bg-slate-200 rounded w-3/4"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                  <div className="h-6 bg-slate-200 rounded w-2/3"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
                  <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ) : profile ? (
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-brand-green-soft/20 to-brand-gold-soft/20 border border-brand-green/10">
                    <div>
                      <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Student ID</dt>
                      <dd className="text-lg font-bold text-slate-900 mt-1">{profile.studentId || "--"}</dd>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                      <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Full Name</dt>
                      <dd className="text-lg font-bold text-slate-900 mt-1">{profile.fullName}</dd>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                      <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Status</dt>
                      <dd className="text-lg font-bold text-slate-900 mt-1 capitalize">{profile.status || "--"}</dd>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                      <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Department</dt>
                      <dd className="text-lg font-bold text-slate-900 mt-1">{profile.department || "--"}</dd>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Email Address</dt>
                    <dd className="text-lg font-bold text-slate-900 mt-1">{profile.email}</dd>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
                    <dt className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Member Since</dt>
                    <dd className="text-lg font-bold text-slate-900 mt-1">
                      {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : "--"}
                    </dd>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <p className="text-slate-500">No profile information available.</p>
              </div>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/student/catalog" className="btn-student-primary px-6 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  Go to catalog
                </span>
              </Link>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 rounded-xl border border-red-300/60 px-6 py-3 text-sm font-semibold text-red-600 transition-all duration-200 hover:bg-red-50 hover:shadow-md hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign out
              </button>
            </div>
          </section>

          <aside className="rounded-3xl bg-white/95 backdrop-blur-sm p-8 shadow-xl ring-1 ring-slate-200/60">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green-soft to-brand-gold-soft">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Library Hours</h2>
            </div>
            
            {hoursLoading ? (
              <div className="space-y-3">
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                </div>
              </div>
            ) : hours.length > 0 ? (
              <div className="space-y-3">
                {hours.map((row) => (
                  <div key={`${row.dayOfWeek}-${row.open}-${row.close}`} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                    <span className="font-semibold text-slate-700">{dayNames[row.dayOfWeek] || `Day ${row.dayOfWeek}`}</span>
                    <span className="text-sm font-medium text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      {row.open} – {row.close}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">No posted hours yet. Please check back soon.</p>
              </div>
            )}
            
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-brand-green-soft/20 to-brand-gold-soft/20 border border-brand-green/10">
              <p className="text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-700">Need assistance outside library hours?</span><br/>
                Email <a href="mailto:librarian@university.edu" className="font-semibold text-brand-greenDark underline decoration-brand-green/40 decoration-2 underline-offset-4 hover:text-brand-gold">librarian@university.edu</a> and our team will follow up on the next business day.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default StudentAccount;
