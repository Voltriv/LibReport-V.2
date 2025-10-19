import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';

const ResetPassword = () => {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw1 !== pw2) { setError('Passwords do not match'); return; }
    try {
      setLoading(true);
      await api.post('/auth/reset', { uid, token, newPassword: pw1 });
      setOk(true);
      setTimeout(()=> navigate('/signin'), 1200);
    } catch (err) {
      setError(err?.response?.data?.error || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-stone-50 dark:bg-stone-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow p-6">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Reset Password</h2>
        <p className="text-slate-600 dark:text-stone-300 mt-1">Enter a new password for your account.</p>
        {error && <div className="mt-3 rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        {ok ? (
          <div className="mt-3 text-slate-700 dark:text-stone-200">Success! Redirecting to sign in…</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">New Password</label>
              <input type="password" value={pw1} onChange={e=>setPw1(e.target.value)} required
                     className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Confirm Password</label>
              <input type="password" value={pw2} onChange={e=>setPw2(e.target.value)} required
                     className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-gold text-white font-medium py-2.5 hover:opacity-90 disabled:opacity-60">{loading ? 'Saving…' : 'Save'}</button>
            <p className="text-center text-sm text-slate-600 dark:text-stone-300"><Link to="/signin" className="text-brand-gold hover:underline">Back to Sign In</Link></p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

