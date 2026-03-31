import Link from "next/link";
import { LayoutDashboard, FileText, Map as MapIcon, Users, BarChart3, Trophy, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Complaints", href: "/admin/complaints", icon: FileText },
    { label: "Map View", href: "/admin/map", icon: MapIcon },
    { label: "Worker Management", href: "/admin/workers", icon: Users },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "Leaderboard", href: "/admin/leaderboard", icon: Trophy },
  ];

  return (
    <div className="flex bg-slate-950 min-h-screen selection:bg-orange-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 text-slate-300 flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.8)] z-20">
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center space-x-2 text-white font-bold text-xl tracking-tight group">
             <span className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)] group-hover:shadow-[0_0_20px_rgba(249,115,22,0.6)] transition-all">J</span>
             <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Civic Admin</span>
          </Link>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu</div>
            {navItems.map((item) => {
                const Icon = item.icon;
                return (
                    <Link key={item.href} href={item.href} className="flex items-center space-x-3 px-3 py-3 rounded-xl hover:bg-slate-900 hover:text-orange-400 transition-all group font-bold">
                        <Icon size={20} className="text-slate-500 group-hover:text-orange-500 transition-colors drop-shadow-[0_0_5px_rgba(249,115,22,0)] group-hover:drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]" />
                        <span>{item.label}</span>
                    </Link>
                )
            })}
        </div>

        <div className="p-4 border-t border-slate-800">
            <button className="flex items-center justify-center space-x-2 w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl transition-all font-bold group">
                <LogOut size={18} className="group-hover:text-red-400 transition-colors" />
                <span>Log Out</span>
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        <div className="absolute inset-x-0 -top-40 h-80 bg-orange-500/10 blur-[100px] pointer-events-none z-0"></div>

        {/* Top Header */}
        <header className="h-16 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800 flex items-center justify-between px-8 shadow-sm z-10 sticky top-0">
            <div className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-emerald-400 text-lg drop-shadow-[0_0_5px_rgba(255,255,255,0.1)]">Admin / Overview</div>
            <div className="flex items-center space-x-4">
                <div className="text-sm font-bold text-slate-300">Admin User</div>
                <div className="w-9 h-9 bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center font-black border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                    A
                </div>
            </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-auto p-8 relative z-10 w-full">
            <div className="max-w-7xl mx-auto h-full space-y-8 animate-in fade-in duration-500">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
}
