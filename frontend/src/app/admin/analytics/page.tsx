"use client";

import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Activity, BarChart2, Loader2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [summary, departments, workerStats] = await Promise.all([
          fetchAPI('/api/analytics/summary'),
          fetchAPI('/api/analytics/departments'),
          fetchAPI('/api/analytics/workers'),
        ]);

        const total = summary.total_complaints || 0;
        const resolved = summary.resolved_complaints || 0;
        const resolutionRate = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0';

        // Build categories for pie chart from summary
        const categories = (summary.chart_data || []).map((c: any) => ({
          name: c.name,
          value: c.count,
        }));

        setData({
          total,
          resolved,
          resolutionRate: `${resolutionRate}%`,
          categories,
          departments: departments || [],
          workers: workerStats || [],
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#eab308'];

  if (loading) return (
    <div className="flex items-center justify-center p-20 min-h-[calc(100vh-64px)] bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-800 border-t-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center p-20 min-h-[calc(100vh-64px)]">
      <p className="text-slate-500">Failed to load analytics data.</p>
    </div>
  );

  return (
    <div className="space-y-8 p-6 min-h-[calc(100vh-64px)] fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Analytics & Insights</h1>
        <button className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white shadow-sm transition-colors">
            <BarChart2 size={16} />
            <span>Generate Report</span>
        </button>
      </div>
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-[0_0_20px_rgba(249,115,22,0.1)] flex items-center space-x-4">
            <div className="p-4 bg-orange-500/20 text-orange-500 rounded-2xl shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <TrendingUp size={28} />
            </div>
            <div>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Total Complaints</p>
                <h3 className="text-2xl font-black text-white">{data.total}</h3>
            </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-[0_0_20px_rgba(16,185,129,0.1)] flex items-center space-x-4">
            <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Activity size={28} />
            </div>
            <div>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Resolution Rate</p>
                <h3 className="text-2xl font-black text-white">{data.resolutionRate}</h3>
            </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-[0_0_20px_rgba(59,130,246,0.1)] flex items-center space-x-4">
            <div className="p-4 bg-blue-500/20 text-blue-400 rounded-2xl shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                <Users size={28} />
            </div>
            <div>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider">Active Workers</p>
                <h3 className="text-2xl font-black text-white">{data.workers.length}</h3>
            </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pie Chart — Category Distribution */}
        <div className="lg:col-span-2 bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
            <h2 className="text-xl font-bold text-white mb-8 tracking-wide">Category Distribution</h2>
            {data.categories.length > 0 ? (
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data.categories}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            label={({ name, value }: any) => `${name}: ${value}`}
                        >
                            {data.categories.map((_: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <RechartsTooltip 
                            contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#f8fafc', fontWeight: 'bold'}}
                            itemStyle={{color: '#f8fafc'}}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            ) : (
                <div className="h-80 flex items-center justify-center text-slate-500">No category data yet</div>
            )}
        </div>

        {/* Category Legend */}
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col justify-center">
            <h2 className="text-xl font-bold text-white mb-6 tracking-wide">Categories</h2>
            <div className="space-y-4">
                {data.categories.map((cat: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length], boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}`}}></div>
                            <span className="text-sm font-semibold text-slate-300">{cat.name}</span>
                        </div>
                        <span className="text-sm font-bold text-white">{cat.value}</span>
                    </div>
                ))}
                {data.categories.length === 0 && <p className="text-slate-500 text-sm">No data yet</p>}
            </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Department Performance */}
        <div className="bg-slate-900 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                <h2 className="text-xl font-bold text-white tracking-wide">Department Performance</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500 bg-slate-950">
                            <th className="p-4 font-bold">Department</th>
                            <th className="p-4 font-bold text-center">Total</th>
                            <th className="p-4 font-bold text-center">Resolved</th>
                            <th className="p-4 font-bold text-right">Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.departments.map((d: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-4 font-bold text-slate-200">{d.name}</td>
                                <td className="p-4 font-mono font-bold text-white text-center">{d.total}</td>
                                <td className="p-4 font-mono font-bold text-emerald-400 text-center drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">{d.resolved}</td>
                                <td className="p-4 text-right">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/50">{d.rate}</span>
                                </td>
                            </tr>
                        ))}
                        {data.departments.length === 0 && (
                            <tr><td colSpan={4} className="p-6 text-center text-slate-500">No department data</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Worker Performance */}
        <div className="bg-slate-900 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-800 bg-slate-950/50">
                <h2 className="text-xl font-bold text-white tracking-wide">Top Field Workers</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500 bg-slate-950">
                            <th className="p-4 font-bold">Worker Name</th>
                            <th className="p-4 font-bold">Department</th>
                            <th className="p-4 font-bold text-center">Resolved</th>
                            <th className="p-4 font-bold text-right">Assigned</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {data.workers.map((w: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-4 font-bold text-orange-400 drop-shadow-[0_0_5px_rgba(249,115,22,0.4)]">{w.name}</td>
                                <td className="p-4 font-medium text-slate-400">{w.department}</td>
                                <td className="p-4 font-mono font-bold text-white text-center">{w.resolved}</td>
                                <td className="p-4 font-mono font-bold text-slate-400 text-right">{w.total_assigned}</td>
                            </tr>
                        ))}
                        {data.workers.length === 0 && (
                            <tr><td colSpan={4} className="p-6 text-center text-slate-500">No worker data</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}
