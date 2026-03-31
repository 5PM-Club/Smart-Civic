"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auto-redirect if already logged in
  useState(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem("admin_token");
      if (token === "super-secret-admin-session") {
        router.push("/admin");
      }
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    // Validate credentials
    if (password === "admin123") {
      // Set both Cookie and LocalStorage
      document.cookie = "adminAuth=true; path=/; max-age=86400"; 
      localStorage.setItem("admin_token", "super-secret-admin-session");
      
      // Use window.location.href for a full refresh to ensure all layers pick up the auth
      window.location.href = "/admin";
    } else {
      setError("Invalid access credentials");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-orange-500 selection:text-white relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        <div className="text-center space-y-4 mb-10">
            <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto shadow-[inset_0_0_20px_rgba(249,115,22,0.1)] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-emerald-500/20 rounded-2xl"></div>
                <Shield size={40} className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)] relative z-10" />
            </div>
            <div>
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-white to-emerald-400 tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Admin Gateway</h1>
                <p className="text-slate-400 mt-2 font-medium">Authorized personnel only</p>
            </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-300 tracking-wide uppercase">Access Key</label>
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-500" />
                    </div>
                    <input 
                        type="password" 
                        required
                        placeholder="Enter credentials..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all placeholder:text-slate-600 shadow-inner font-mono text-lg"
                    />
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-in headShake">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <button 
                type="submit"
                disabled={loading || !password}
                className="w-full flex justify-center items-center space-x-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] transition-all duration-300 active:scale-[0.98]"
            >
                <span>{loading ? 'Authenticating...' : 'Secure Login'}</span>
            </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Monitored</p>
        </div>
      </div>
    </main>
  );
}
