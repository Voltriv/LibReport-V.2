import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import api from '../api';

const Admins = () => {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState({ adminId: '', fullName: '', email: '', password: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admins', { params: { q } });
      setItems(data || []);
    } catch (e) { setError('Failed to load admins'); }
    finally { setLoading(false); }
  
  }, [q]);

  useEffect(() => { load(); }, [load]);

  const onCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/admins', creating);
      setCreating({ adminId: '', fullName: '', email: '', password: '' });
      load();
    } catch (e) { setError(e?.response?.data?.error || 'Create failed'); }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this admin?')) return;
    try { await api.delete(`/admins/${id}`); load(); } catch {}
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Sidebar />
      <main className="px-4 md:pl-6 lg:pl-8 pr-4 py-6 md:ml-72">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-stone-100">Admins</h2>

        <form className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700" onSubmit={onCreate}>
          <input className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" placeholder="Admin ID" value={creating.adminId} onChange={e=>setCreating(s=>({...s, adminId:e.target.value}))} required />
          <input className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" placeholder="Full Name" value={creating.fullName} onChange={e=>setCreating(s=>({...s, fullName:e.target.value}))} required />
          <input className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" placeholder="Email (optional)" value={creating.email} onChange={e=>setCreating(s=>({...s, email:e.target.value}))} />
          <input type="password" className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2" placeholder="Password" value={creating.password} onChange={e=>setCreating(s=>({...s, password:e.target.value}))} required />
          <button type="submit" className="rounded-lg btn-brand px-4 py-2 text-white">Add</button>
          {error && <div className="md:col-span-5 text-sm text-red-600">{error}</div>}
        </form>

        <div className="mt-6 p-4 rounded-xl bg-white dark:bg-stone-900 ring-1 ring-slate-200 dark:ring-stone-700">
          <div className="flex items-center gap-2 mb-3">
            <input className="rounded-lg border border-slate-300 dark:border-stone-600 bg-white dark:bg-stone-950 px-3 py-2 flex-1" placeholder="Search adminId / name / email" value={q} onChange={e=>setQ(e.target.value)} />
            <button className="rounded-lg px-3 py-2 btn-brand text-white" onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Search'}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-stone-300">
                  <th className="py-2 pr-4">Admin ID</th>
                  <th className="py-2 pr-4">Full Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-stone-700">
                {items.map(a => (
                  <tr key={a._id || a.id} className="text-slate-800 dark:text-stone-100">
                    <td className="py-2 pr-4">{a.adminId}</td>
                    <td className="py-2 pr-4">{a.fullName}</td>
                    <td className="py-2 pr-4">{a.email || '-'}</td>
                    <td className="py-2 pr-4">{a.role}</td>
                    <td className="py-2 pr-4 text-right">
                      <button className="rounded px-3 py-1.5 ring-1 ring-slate-200 dark:ring-stone-700 bg-white dark:bg-stone-950 mr-2" onClick={()=>{
                        const np = prompt('New password for '+a.fullName);
                        if (!np) return; api.patch(`/admins/${a._id || a.id}`, { newPassword: np }).then(load);
                      }}>Reset Password</button>
                      <button className="rounded px-3 py-1.5 ring-1 ring-red-300 bg-white text-red-600" onClick={()=>onDelete(a._id || a.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admins;





