import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null); // { uid, token }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const { data } = await api.post('/auth/request-reset', { email });
      setSent({ uid: data.uid, token: data.token });
    } catch (err) {
      setError(err?.response?.data?.error || 'Request failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen w-full bg-stone-50 dark:bg-stone-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700 shadow p-6">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Forgot Password</h2>
        <p className="text-slate-600 dark:text-stone-300 mt-1">Enter your email to receive a reset link.</p>
        {error && <div className="mt-3 rounded border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
        {!sent && (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-stone-200">Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required
                     className="mt-1 w-full rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 text-slate-900 dark:text-stone-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-gold text-white font-medium py-2.5 hover:opacity-90 disabled:opacity-60">{loading ? 'Sending…' : 'Send reset link'}</button>
            <p className="text-center text-sm text-slate-600 dark:text-stone-300"><Link to="/signin" className="text-brand-gold hover:underline">Back to Sign In</Link></p>
          </form>
        )}
        {sent && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-700 dark:text-stone-200">Reset token generated. For this demo, click the button below to continue:</p>
            <button className="w-full rounded-lg bg-brand-gold text-white font-medium py-2.5 hover:opacity-90" onClick={()=> navigate(`/reset?uid=${encodeURIComponent(sent.uid)}&token=${encodeURIComponent(sent.token)}`)}>Continue to Reset</button>
            <p className="text-center text-sm text-slate-600 dark:text-stone-300"><Link to="/signin" className="text-brand-gold hover:underline">Back to Sign In</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

