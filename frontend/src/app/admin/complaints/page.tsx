"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, MoreVertical, MapPin, Loader2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";

export default function ComplaintsList() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [assigningWorkerFor, setAssigningWorkerFor] = useState<string | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<any[]>([]);

  const loadComplaints = async () => {
    try {
      const data = await fetchAPI('/api/complaints');
      setComplaints(data.map((c: any) => ({
        id: c.ticket_id,
        dbId: c.id,
        departmentId: c.department_id,
        category: c.category.charAt(0).toUpperCase() + c.category.slice(1).replace('_', ' '),
        status: c.status,
        date: new Date(c.created_at).toLocaleDateString(),
        address: c.address_ward || 'N/A',
        worker: c.workers?.name || 'Unassigned',
      })));
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleUpdateStatus = async (dbId: string, status: string, worker_id?: string) => {
      try {
          const body: any = { status };
          if (worker_id) body.worker_id = worker_id;
          
          await fetchAPI(`/api/complaints/${dbId}/status`, {
              method: 'PATCH',
              body: JSON.stringify(body)
          });
          loadComplaints();
          setActionOpen(null);
          setAssigningWorkerFor(null);
      } catch (err) {
          console.error(err);
          alert('Failed to update status');
      }
  };

  const getExpectedDepartment = (categoryStr: string) => {
      const cat = categoryStr.toLowerCase();
      if (cat.includes('garbage') || cat.includes('sanitation')) return 'Sanitation';
      if (cat.includes('pothole') || cat.includes('road')) return 'Roads & PWD';
      if (cat.includes('drainage') || cat.includes('water leak') || cat.includes('water_leak')) return 'Water & Sewage';
      if (cat.includes('street') || cat.includes('electric')) return 'Electricity Board';
      return null;
  };

  const handleAssignClick = async (e: React.MouseEvent, dbId: string, categoryName: string) => {
      e.stopPropagation();
      setAssigningWorkerFor(assigningWorkerFor === dbId ? null : dbId);
      setActionOpen(null);
      
      // Fetch all workers and rigidly filter by category frontend-side to handle legacy/mocked data without department_id.
      if (assigningWorkerFor !== dbId) {
          try {
              const data = await fetchAPI(`/api/workers`);
              const expectedDept = getExpectedDepartment(categoryName);
              if (expectedDept) {
                  setAvailableWorkers(data.filter((w: any) => w.departments?.name === expectedDept));
              } else {
                  setAvailableWorkers(data);
              }
          } catch (err) {
              console.error('Failed to load workers', err);
          }
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'open': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600 shadow-[0_0_10px_rgba(148,163,184,0.2)]">Open</span>;
          case 'assigned': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]">Assigned</span>;
          case 'in_progress': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]">In Progress</span>;
          case 'resolved': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">Resolved</span>;
          case 'escalated': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/50 flex items-center space-x-1 shadow-[0_0_15px_rgba(249,115,22,0.4)]"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(249,115,22,0.8)]"></span><span>Escalated</span></span>;
          default: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600">{status}</span>;
      }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
        const matchesSearch = c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              c.address.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
        return matchesSearch && matchesStatus;
    });
  }, [complaints, searchQuery, filterStatus]);

  // Close dropdown if clicked outside
  useEffect(() => {
      const clickHandler = () => {
          setActionOpen(null);
          setAssigningWorkerFor(null);
      };
      if (actionOpen || assigningWorkerFor) {
          window.addEventListener('click', clickHandler);
      }
      return () => window.removeEventListener('click', clickHandler);
  }, [actionOpen, assigningWorkerFor]);

  return (
    <div className="space-y-6 pt-6 min-h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Complaints Management</h1>
        <div className="flex items-center space-x-3">
            <div className="relative">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
                    className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white shadow-sm transition-colors"
                >
                    <Filter size={16} />
                    <span>{filterStatus === 'all' ? 'Filters' : filterStatus.replace('_', ' ').toUpperCase()}</span>
                </button>
                
                {isFilterOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                        {['all', 'open', 'assigned', 'in_progress', 'resolved', 'escalated'].map(status => (
                            <button
                                key={status}
                                onClick={() => { setFilterStatus(status); setIsFilterOpen(false); }}
                                className={`block w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-slate-800 transition-colors capitalize ${filterStatus === status ? 'text-orange-400 bg-slate-800/50' : 'text-slate-300'}`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all">
                Export CSV
            </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800 overflow-visible relative">
        <div className="p-4 rounded-t-3xl border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Search ticket ID or location..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all font-medium placeholder:text-slate-600 shadow-inner"
                />
            </div>
            <div className="text-sm font-bold text-slate-500">
                Found {filteredComplaints.length} tickets
            </div>
        </div>

        <div className="overflow-visible items-center relative z-10 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
            ) : (
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500 bg-slate-950">
                        <th className="p-5 font-bold">Ticket ID</th>
                        <th className="p-5 font-bold">Category</th>
                        <th className="p-5 font-bold">Location</th>
                        <th className="p-5 font-bold">Status</th>
                        <th className="p-5 font-bold">Worker</th>
                        <th className="p-5 font-bold text-right pt-5 pb-5 pr-10">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {filteredComplaints.map((c) => (
                        <tr key={c.id} onClick={() => window.location.href = `/track?id=${c.id}`} className="hover:bg-slate-800/40 transition-colors group cursor-pointer">
                            <td className="p-5 font-mono font-bold text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.4)]">{c.id}</td>
                            <td className="p-5 font-semibold text-slate-200">{c.category}</td>
                            <td className="p-5">
                                <div className="flex items-center space-x-2 text-slate-400 font-medium">
                                    <MapPin size={16} className="text-slate-500 group-hover:text-orange-500 transition-colors" />
                                    <span className="group-hover:text-slate-300 transition-colors">{c.address}</span>
                                </div>
                            </td>
                            <td className="p-5">{getStatusBadge(c.status)}</td>
                            <td className="p-5 font-medium relative min-w-[140px]">
                                {c.worker === 'Unassigned' ? (
                                    <button 
                                        onClick={(e) => handleAssignClick(e, c.dbId, c.category)}
                                        className="text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500 px-3 py-1.5 rounded-lg transition-colors text-xs font-bold ring-1 ring-orange-500/30"
                                    >
                                        Assign Worker
                                    </button>
                                ) : (
                                    <span className="text-emerald-400 font-bold">{c.worker}</span>
                                )}
                                
                                {assigningWorkerFor === c.dbId && (
                                    <div className="absolute top-1/2 left-4 mt-4 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] overflow-hidden" onClick={e => e.stopPropagation()}>
                                        <div className="py-2 px-3 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-950">
                                            Select Worker
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                          {availableWorkers.length === 0 ? (
                                              <div className="p-4 text-xs text-slate-400 text-center italic">No workers found.</div>
                                          ) : (
                                              availableWorkers.map(w => (
                                                  <button 
                                                      key={w.id}
                                                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(c.dbId, 'assigned', w.id); }}
                                                      className="block w-full text-left px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800/50"
                                                  >
                                                      {w.name}
                                                  </button>
                                              ))
                                          )}
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td className="p-5 text-right relative min-w-[120px]">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setActionOpen(actionOpen === c.id ? null : c.id); setAssigningWorkerFor(null); }}
                                    className={`p-2 rounded-lg transition-colors inline-flex mr-4 ${actionOpen === c.id ? 'text-orange-400 bg-orange-500/20' : 'text-slate-500 hover:text-orange-400 hover:bg-orange-500/10'}`}
                                >
                                    <MoreVertical size={20} />
                                </button>
                                
                                {actionOpen === c.id && (
                                    <div className="absolute right-14 top-1/2 -translate-y-1/2 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100] overflow-hidden" onClick={e => e.stopPropagation()}>
                                        <div className="py-1">
                                            <a href={`/track?id=${c.id}`} className="block px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800/50">
                                                View Details
                                            </a>
                                            {c.status !== 'resolved' && (
                                                <button onClick={() => handleUpdateStatus(c.dbId, 'resolved')} className="block w-full text-left px-4 py-2.5 text-sm font-bold text-emerald-400 hover:bg-slate-800 transition-colors border-b border-slate-800/50">
                                                    Mark Resolved
                                                </button>
                                            )}
                                            {c.status !== 'escalated' && (
                                                <button onClick={() => handleUpdateStatus(c.dbId, 'escalated')} className="block w-full text-left px-4 py-2.5 text-sm font-bold text-orange-400 hover:bg-slate-800 transition-colors">
                                                    Escalate Ticket
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                    {filteredComplaints.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-500">No complaints found.</td></tr>
                    )}
                </tbody>
            </table>
            )}
        </div>
      </div>
    </div>
  );
}
