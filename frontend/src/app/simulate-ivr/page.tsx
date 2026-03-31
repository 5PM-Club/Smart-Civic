'use client';

import React, { useState } from 'react';
import { Phone, Play, Send, RefreshCcw } from 'lucide-react';

export default function IVRSimulator() {
    const [phone, setPhone] = useState('+919876543210');
    const [digits, setDigits] = useState('');
    const [logs, setLogs] = useState<{ action: string, response: string, timestamp: string }[]>([]);
    const [currentPath, setCurrentPath] = useState('/webhook/ivr');
    const [isLoading, setIsLoading] = useState(false);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

    const simulateStep = async (inputDigits?: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${backendUrl}${currentPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    From: phone,
                    Digits: inputDigits || ''
                })
            });

            const twiml = await res.text();
            
            // Extract next action from TwiML
            const actionMatch = twiml.match(/action="([^"]+)"/);
            const nextPath = actionMatch ? actionMatch[1] : '/webhook/ivr';

            setLogs(prev => [{
                action: inputDigits ? `Pressed ${inputDigits} -> ${currentPath}` : `Started Call -> ${currentPath}`,
                response: twiml,
                timestamp: new Date().toLocaleTimeString()
            }, ...prev]);

            setCurrentPath(nextPath);
            setDigits('');
        } catch (err) {
            setLogs(prev => [{
                action: 'Error',
                response: 'Failed to connect to backend. Ensure it is running on port 5000.',
                timestamp: new Date().toLocaleTimeString()
            }, ...prev]);
        } finally {
            setIsLoading(false);
        }
    };

    const resetSimulator = () => {
        setCurrentPath('/webhook/ivr');
        setLogs([]);
        setDigits('');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-6 text-white min-h-[calc(100vh-64px)] bg-slate-950">
            <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
                <Phone className="text-orange-500" /> IVR Flow Simulator
            </h1>
            <p className="text-slate-400">Test the voice reporting flow without making real calls.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Controls */}
                <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 shadow-xl space-y-6">
                    <h2 className="text-xl font-bold">Phone Simulator</h2>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-400 block uppercase tracking-wider">Caller Phone Number</label>
                            <input 
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value)} 
                                placeholder="+91..."
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => simulateStep()} 
                                disabled={isLoading || logs.length > 0}
                                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                <Play className="w-4 h-4" /> Start Call
                            </button>
                            <button 
                                onClick={resetSimulator} 
                                className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" /> Reset
                            </button>
                        </div>

                        <div className="pt-6 border-t border-slate-800/50 space-y-3">
                            <label className="text-sm font-semibold text-slate-400 block uppercase tracking-wider">Dial Pad Input</label>
                            <div className="flex gap-2">
                                <input 
                                    value={digits} 
                                    onChange={(e) => setDigits(e.target.value)} 
                                    placeholder="Enter digit (1-9)"
                                    maxLength={1}
                                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500/50 outline-none transition-all"
                                />
                                <button 
                                    onClick={() => simulateStep(digits)}
                                    disabled={isLoading || logs.length === 0}
                                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-lg"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TwiML Output */}
                <div className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden h-[550px] flex flex-col font-mono text-sm">
                    <div className="bg-slate-800 p-4 border-b border-slate-700 font-bold flex items-center justify-between">
                        <span>TwiML Response Log</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                        {logs.map((log, i) => (
                            <div key={i} className="pb-6 border-b border-slate-800 last:border-0 relative animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="text-orange-400 text-xs font-bold mb-2 flex items-center gap-2">
                                    <span className="opacity-50">[{log.timestamp}]</span>
                                    {log.action}
                                </div>
                                <pre className="whitespace-pre-wrap break-all text-xs text-slate-300 opacity-90 leading-relaxed">
                                    {log.response}
                                </pre>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 italic space-y-4">
                                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-800 flex items-center justify-center opacity-30">
                                    <Phone size={32} />
                                </div>
                                <span>Press 'Start Call' to begin simulation...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
