"use client";

import { useState, useEffect } from "react";
import { Trophy, Search, Loader2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";

export default function Leaderboard() {
  const [topCitizens, setTopCitizens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await fetchAPI('/api/analytics/leaderboard');
        setTopCitizens(data.map((c: any, i: number) => {
          const level = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'slate';
          const rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
          const badges = ['Nagrik (Community Helper)', 'Sahayak (Active Agent)', 'Sathiya (Civic Friend)', 'Participant', 'Starter'];
          return {
            ...c,
            rank,
            level,
            badge: badges[Math.min(i, badges.length - 1)],
            points: (c.complaint_count || 0) * 3,
            resolved: c.complaint_count || 0,
            displayPhone: c.phone || 'N/A',
          };
        }));
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, []);

  const getRankStyle = (level: string) => {
      switch(level) {
          case 'gold': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.4)]';
          case 'silver': return 'bg-slate-300/20 text-slate-300 border-slate-300/50 shadow-[0_0_15px_rgba(203,213,225,0.4)]';
          case 'bronze': return 'bg-orange-700/20 text-orange-600 border-orange-700/50 shadow-[0_0_15px_rgba(194,65,12,0.4)]';
          default: return 'bg-slate-800 text-slate-400 border-slate-700 font-mono';
      }
  };

  return (
    <div className="space-y-6 pt-6 min-h-[calc(100vh-64px)] selection:bg-orange-500 selection:text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Citizen Leaderboard</h1>
            <p className="text-slate-400 mt-1 font-medium">System Admin View: Top Community Contributors & Activity</p>
        </div>
        <button className="flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all">
            <Trophy size={18} />
            <span>Monthly Rewards</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-[0_0_20px_rgba(16,185,129,0.1)] flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shadow-[inset_0_0_15px_rgba(16,185,129,0.2)] border border-emerald-500/30">
                <span className="text-2xl">CB</span>
            </div>
            <div>
                <h3 className="text-white font-bold text-lg">Community Helper</h3>
                <p className="text-slate-400 text-sm">Green Badge — 5+ complaints</p>
            </div>
        </div>
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-between px-10">
             <div className="flex flex-col">
                 <p className="text-slate-400 font-bold mb-1 tracking-wider text-xs uppercase">Total Participating Citizens</p>
                 <p className="text-3xl text-white font-black">{topCitizens.length > 0 ? `${topCitizens.length}+ Active Profiles` : '0 Active Profiles'}</p>
             </div>
             <div className="flex flex-col text-right">
                 <p className="text-slate-400 font-bold mb-1 tracking-wider text-xs uppercase">Avg Civic Score</p>
                 <p className="text-3xl text-orange-400 font-black">{Math.max(1, Math.round(topCitizens.reduce((a,b) => a + (b.points||0), 0) / (topCitizens.length || 1)))} <span className="text-lg">pts</span></p>
             </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white tracking-wide">Top Citizen Reporters</h2>
            <div className="relative w-full max-w-xs hidden md:block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Search phone (e.g. 98765)..." className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:ring-2 focus:ring-orange-500/50 outline-none transition-all placeholder:text-slate-600 shadow-inner" />
            </div>
        </div>
        <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-orange-500" size={32} /></div>
            ) : (
            <table className="w-full text-left">
                <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500 bg-slate-950">
                        <th className="p-5 font-bold w-20 text-center">Rank</th>
                        <th className="p-5 font-bold">Citizen Phone</th>
                        <th className="p-5 font-bold">Community Badge</th>
                        <th className="p-5 font-bold text-center">Tickets Filed</th>
                        <th className="p-5 font-bold text-right">Civic Score</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {topCitizens.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                            <td className="p-5 text-center">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-lg border-2 font-bold ${getRankStyle(c.level)}`}>
                                    {c.rank}
                                </span>
                            </td>
                            <td className="p-5 font-mono font-bold text-slate-200 tracking-wider">
                                {c.displayPhone}
                            </td>
                            <td className="p-5 font-bold text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]">
                                {c.badge}
                            </td>
                            <td className="p-5 text-center font-mono font-bold text-white">
                                {c.resolved}
                            </td>
                            <td className="p-5 text-right font-mono font-black text-orange-400 text-xl drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] group-hover:scale-110 transition-transform origin-right">
                                {c.points}
                            </td>
                        </tr>
                    ))}
                    {topCitizens.length === 0 && (
                        <tr><td colSpan={5} className="p-8 text-center text-slate-500">No citizen data yet</td></tr>
                    )}
                </tbody>
            </table>
            )}
        </div>
      </div>
    </div>
  );
}
