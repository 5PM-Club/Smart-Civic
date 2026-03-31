"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ClientNav() {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;

  return (
    <nav className="bg-slate-950 border-b border-orange-500/20 sticky top-0 z-50 shadow-[0_4px_30px_rgba(249,115,22,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex">
            <Link href="/" className="flex items-center space-x-2 text-xl font-extrabold tracking-tight text-white group">
              <span className="w-8 h-8 font-sans bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white text-lg shadow-[0_0_15px_rgba(249,115,22,0.5)] group-hover:shadow-[0_0_25px_rgba(249,115,22,0.8)] transition-all">S</span>
              <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Smart Civic</span>
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-slate-300 hover:text-orange-400 font-semibold transition-colors drop-shadow-sm hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
              Report Issue
            </Link>
            <Link href="/track" className="text-slate-300 hover:text-emerald-400 font-semibold transition-colors drop-shadow-sm hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
              Track Ticket
            </Link>
            <Link href="/admin" className="px-5 py-2.5 bg-slate-900 border border-slate-700 hover:border-orange-500/50 hover:bg-slate-800 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              Admin Gateway
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
