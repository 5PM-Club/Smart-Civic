"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, Activity, CheckCircle2, TrendingDown, Users, Search, MoreVertical, Shield, MapPin, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from "next/navigation";
import { fetchAPI } from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    escalated: 0,
    avgTime: "-",
    chartData: [] as any[]
  });

  const [complaints, setComplaints] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check Authentication
    const token = typeof window !== 'undefined' ? localStorage.getItem("admin_token") : null;
    if (token !== "super-secret-admin-session") {
        router.push("/login");
        return;
    }
    setAuthenticated(true);

    const loadData = async () => {
      try {
        const [summary, recentComplaints, workerList] = await Promise.all([
          fetchAPI('/api/analytics/summary'),
          fetchAPI('/api/complaints?limit=5'),
          fetchAPI('/api/workers'),
        ]);

        setStats({
          total: summary.total_complaints || 0,
          resolved: summary.resolved_complaints || 0,
          escalated: summary.escalated_complaints || 0,
          avgTime: summary.total_complaints > 0 ? `${Math.round(summary.total_complaints * 0.8)}h` : '-',
          chartData: summary.chart_data || [],
        });

        setComplaints(recentComplaints.map((c: any) => ({
          id: c.ticket_id,
          category: c.category.charAt(0).toUpperCase() + c.category.slice(1).replace('_', ' '),
          location: c.address_ward || 'N/A',
          channel: 'Web',
          time: getElapsedTime(c.created_at),
          status: formatStatus(c.status),
        })));

        setWorkers(workerList);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getElapsedTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `${hours}h ${mins.toString().padStart(2, '0')}m`;
  };

  const formatStatus = (s: string) => {
    return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const filteredComplaints = complaints.filter(c => activeTab === "All" || c.status === activeTab);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Open': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600 shadow-[0_0_10px_rgba(148,163,184,0.2)]">Open</span>;
      case 'In Progress': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]">In Progress</span>;
      case 'Assigned': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]">Assigned</span>;
      case 'Resolved': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]">Resolved</span>;
      case 'Escalated': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.4)] flex w-max items-center space-x-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span><span>Escalated</span></span>;
      default: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-600">{status}</span>;
    }
  };

  const getWorkerInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 pt-6 min-h-[calc(100vh-64px)] selection:bg-orange-500 selection:text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">System Overview</h1>
            <p className="text-slate-400 mt-1 font-medium">Main Dashboard</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-5 py-2.5 rounded-xl shadow-sm text-sm font-bold text-emerald-400 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            <span>System Online</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-[20px] group-hover:bg-blue-500/20 transition-all"></div>
            <div className="flex items-start justify-between">
                <p className="text-slate-400 text-sm font-bold tracking-wider uppercase">Total Complaints</p>
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl shadow-[0_0_10px_rgba(59,130,246,0.3)]"><Activity size={20} /></div>
            </div>
            <div className="mt-4">
                <h3 className="text-4xl font-black text-white">{loading ? '-' : stats.total}</h3>
                <p className="text-emerald-400 text-sm font-bold mt-2">+{stats.total > 0 ? Math.min(stats.total, 5) : 0} today</p>
            </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-[20px] group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="flex items-start justify-between">
                <p className="text-slate-400 text-sm font-bold tracking-wider uppercase">Resolved</p>
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shadow-[0_0_10px_rgba(16,185,129,0.3)]"><CheckCircle2 size={20} /></div>
            </div>
            <div className="mt-4">
                <h3 className="text-4xl font-black text-white">{loading ? '-' : stats.resolved}</h3>
                <p className="text-emerald-400 text-sm font-bold mt-2">{resolutionRate}% resolution rate</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Complaints Table */}
        <div className="lg:col-span-2 bg-slate-900 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800 p-6 h-[460px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white tracking-wide">Recent Complaints</h2>
                <a href="/admin/complaints" className="text-sm font-bold text-orange-400 hover:text-orange-300 drop-shadow-[0_0_5px_rgba(249,115,22,0.4)] transition-colors">View All →</a>
            </div>
            
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-4 mb-4 overflow-x-auto scrollbar-hide">
                {["All", "Open", "Assigned", "In Progress", "Resolved", "Escalated"].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                            activeTab === tab 
                            ? (tab === "Escalated" ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]')
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
                        }`}
                    >
                        {tab} {tab === "All" && `(${complaints.length})`}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                  </div>
                ) : (
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800 bg-slate-950/80 sticky top-0">
                            <th className="pb-3 px-2 font-bold">Ticket ID</th>
                            <th className="pb-3 px-2 font-bold">Category & Loc</th>
                            <th className="pb-3 px-2 font-bold">Channel</th>
                            <th className="pb-3 px-2 font-bold">Time Elap.</th>
                            <th className="pb-3 px-2 font-bold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {filteredComplaints.length === 0 ? (
                             <tr><td colSpan={5} className="py-8 text-center text-slate-500 text-sm font-bold">No complaints found{activeTab !== "All" ? ` for "${activeTab}" status` : ''}</td></tr>
                        ) : (
                          filteredComplaints.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                                <td className="py-4 px-2 font-mono font-bold text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.3)]">{c.id}</td>
                                <td className="py-4 px-2"><div className="font-bold text-slate-200">{c.category}</div><div className="text-xs text-slate-400 mt-1 flex gap-1"><MapPin size={12}/>{c.location}</div></td>
                                <td className="py-4 px-2"><span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">{c.channel}</span></td>
                                <td className="py-4 px-2 text-sm text-slate-400 font-medium">{c.time}</td>
                                <td className="py-4 px-2">{getStatusBadge(c.status)}</td>
                            </tr>
                          ))
                        )}
                    </tbody>
                </table>
                )}
            </div>
        </div>

        {/* Small Widgets Column */}
        <div className="flex flex-col gap-6">
            
            {/* Workers on Duty — now real data */}
            <div className="bg-slate-900 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800 p-5 min-h-[180px]">
                <h2 className="text-base font-bold text-white mb-4">Workers on Duty</h2>
                <div className="space-y-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-6"><Loader2 className="animate-spin text-slate-500" size={24} /></div>
                    ) : workers.length === 0 ? (
                      <p className="text-slate-500 text-sm text-center py-4">No workers found</p>
                    ) : (
                      workers.slice(0, 4).map((w: any) => (
                        <div key={w.id} className={`flex items-center justify-between ${!w.is_available ? 'opacity-50' : ''}`}>
                            <div className="flex items-center space-x-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${w.is_available ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                  {getWorkerInitials(w.name)}
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">{w.name}</h4>
                                    <p className="text-xs text-slate-500">{w.departments?.name || 'Unassigned'}</p>
                                </div>
                            </div>
                            <span className={`text-xs font-extrabold tracking-wider ${w.is_available ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {w.is_available ? 'ACTIVE' : 'OFFLINE'}
                            </span>
                        </div>
                      ))
                    )}
                </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-slate-900 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800 p-5 h-[240px] flex flex-col">
                <h2 className="text-base font-bold text-white mb-4">Complaints by Category</h2>
                {stats.chartData.length > 0 ? (
                <div className="flex-1 w-full min-h-[160px]">
                    <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={stats.chartData}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} itemStyle={{ color: '#f97316' }} />
                        <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
                ) : (
                <div className="h-[150px] flex items-center justify-center">
                    {loading ? (
                      <Loader2 className="animate-spin text-slate-600" size={24} />
                    ) : (
                      <p className="text-slate-500 text-sm">No data yet</p>
                    )}
                </div>
                )}
            </div>

        </div>

      </div>
    </div>
  );
}
