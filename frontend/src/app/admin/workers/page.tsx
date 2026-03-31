"use client";

import { useState, useEffect } from "react";
import { UserPlus, Trash2, X, Loader2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";

export default function WorkersManagement() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', department: 'Sanitation' });

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      const data = await fetchAPI('/api/workers');
      setWorkers(data);
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchAPI('/api/workers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', department: 'Sanitation' });
      loadWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to add worker');
    }
  };

  const removeWorker = async (id: string) => {
    if (!confirm('Are you sure you want to remove this worker?')) return;
    try {
      await fetchAPI(`/api/workers/${id}`, { method: 'DELETE' });
      loadWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to remove worker');
    }
  };

  return (
    <div className="space-y-6 pt-6 min-h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Worker Management</h1>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-colors"
        >
            <UserPlus size={18} />
            <span>Add Worker</span>
        </button>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
            ) : (
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500 bg-slate-950">
                        <th className="p-5 font-bold">Name</th>
                        <th className="p-5 font-bold">Phone</th>
                        <th className="p-5 font-bold">Department</th>
                        <th className="p-5 font-bold">Status</th>
                        <th className="p-5 font-bold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                    {workers.map((w: any) => (
                        <tr key={w.id} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="p-5 font-bold text-slate-200">{w.name}</td>
                            <td className="p-5 font-medium text-slate-400">{w.phone}</td>
                            <td className="p-5 font-medium text-slate-400">{w.departments?.name || 'Unassigned'}</td>
                            <td className="p-5">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${w.is_available ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]'}`}>
                                    {w.is_available ? 'Available' : 'Busy'}
                                </span>
                            </td>
                            <td className="p-5 text-right flex justify-end space-x-2">
                                <button onClick={() => removeWorker(w.id)} className="p-2 text-red-500 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {workers.length === 0 && (
                        <tr>
                            <td colSpan={5} className="p-10 text-center text-slate-500">No workers found. Add one above.</td>
                        </tr>
                    )}
                </tbody>
            </table>
            )}
        </div>
      </div>

      {/* Add Worker Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">Add New Worker</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleAddWorker} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-1">Full Name</label>
                        <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="e.g. Ramesh Kumar" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-1">Phone Number</label>
                        <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-500 outline-none transition-colors" placeholder="+91-XXXXX-XXXXX" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-400 block mb-1">Department</label>
                        <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-950 text-white focus:border-emerald-500 outline-none transition-colors">
                            <option>Sanitation</option>
                            <option>Roads & PWD</option>
                            <option>Water & Sewage</option>
                            <option>Electricity Board</option>
                        </select>
                    </div>
                    <div className="pt-4">
                        <button type="submit" className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">Save Worker</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
