"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // If already logged in, redirect to admin dashboard
    if (localStorage.getItem("admin_token") === "super-secret-admin-session") {
      router.push("/admin");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetchAPI("/api/admin/auth", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      if (res.success) {
        localStorage.setItem("admin_token", res.token);
        router.push("/admin");
      } else {
        setError(res.error || "Invalid credentials");
      }
    } catch (err: any) {
      setError(err.message || "Failed to authenticate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-orange-500 selection:text-white">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-white to-emerald-500"></div>
      
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-orange-500/20 text-orange-500 rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(249,115,22,0.3)] border border-orange-500/30">
            <Shield size={40} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Supervisor Access</h1>
            <p className="text-slate-400 mt-2 font-medium">Enter your administrative key to continue.</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl"></div>
          
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none group-focus-within:text-orange-500 transition-colors">
                  <div className="w-10 flex justify-center"><Lock size={18} className="text-slate-600 group-focus-within:text-orange-500" /></div>
                </div>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all placeholder:text-slate-800 font-mono text-xl tracking-widest shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 text-red-400 p-4 rounded-xl flex items-center space-x-3 border border-red-500/20 animate-shake">
                <AlertCircle size={18} />
                <span className="text-sm font-bold">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="group flex items-center justify-center space-x-3 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 px-6 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] active:scale-[0.98] uppercase tracking-wider"
            >
              {loading ? (
                <Loader2 size={24} className="animate-spin text-white" />
              ) : (
                <>
                  <span>Unlock Dashboard</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">
            System Security Protocol • JanataFlow 2026
          </p>
        </div>
      </div>
    </main>
  );
}
