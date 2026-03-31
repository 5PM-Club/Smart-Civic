"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Clock, CheckCircle2, AlertCircle, User, HardHat, List, Image as ImageIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { fetchAPI } from "@/lib/api";

export default function TrackTicket() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const ticketId = searchParams.get('id');
    if (ticketId) {
      setSearchQuery(ticketId);
      performSearch(ticketId);
    }
  }, [searchParams]);

  const getExpectedDepartment = (categoryStr: string) => {
      if (!categoryStr) return null;
      const cat = categoryStr.toLowerCase();
      if (cat.includes('garbage') || cat.includes('sanitation')) return 'Sanitation';
      if (cat.includes('pothole') || cat.includes('road')) return 'Roads & PWD';
      if (cat.includes('drainage') || cat.includes('water leak') || cat.includes('water_leak')) return 'Water & Sewage';
      if (cat.includes('street') || cat.includes('electric')) return 'Electricity Board';
      return null;
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError("");
    setSelectedTicket(null);
    setResults([]);

    try {
      const q = query.trim();

      // If it looks like a ticket ID, search by ticket endpoint
      if (q.toUpperCase().startsWith("CMP-")) {
        try {
          const ticket = await fetchAPI(`/api/tickets/${q.toUpperCase()}/status`);
          const locationStr = ticket.address_ward || (ticket.lat ? `${ticket.lat.toFixed(4)}, ${ticket.lng.toFixed(4)}` : 'Location not specified');
          setSelectedTicket({
            ...ticket,
            address: locationStr,
            has_gps: !!ticket.lat,
            worker: ticket.workers?.name || 'Pending Assignment',
            citizen: 'Citizen',
          });
          setLoading(false);
          return;
        } catch {
          // Ticket not found, fall through to general search
        }
      }

      // Search complaints by general query
      const complaints = await fetchAPI('/api/complaints');
      const filtered = complaints.filter((c: any) =>
        c.ticket_id?.toLowerCase().includes(q.toLowerCase()) ||
        c.address_ward?.toLowerCase().includes(q.toLowerCase()) ||
        (c.workers?.name || '').toLowerCase().includes(q.toLowerCase())
      );

      if (filtered.length === 0) {
        setError(`No complaints found for "${q}". Please check your ticket ID or search term.`);
      } else if (filtered.length === 1) {
        const c = filtered[0];
        const locationStr = c.address_ward || (c.lat ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}` : 'Location not specified');
        setSelectedTicket({
          ...c,
          address: locationStr,
          has_gps: !!c.lat,
          worker: c.workers?.name || 'Pending Assignment',
          citizen: 'Citizen',
          status_history: c.status_history || [
            { status: c.status, notes: `Current status`, created_at: c.updated_at },
            { status: 'open', notes: 'Complaint logged.', created_at: c.created_at }
          ]
        });
      } else {
        setResults(filtered.map((c: any) => ({
          ...c,
          address: c.address_ward || (c.lat ? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}` : 'Location not specified'),
          has_gps: !!c.lat,
          worker: c.workers?.name || 'Pending Assignment',
        })));
      }
    } catch (err: any) {
      setError(err.message || "Failed to search. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  const selectTicket = async (ticket: any) => {
    try {
      // Fetch full ticket details with status history
      const full = await fetchAPI(`/api/tickets/${ticket.ticket_id}/status`);
      const locationStr = full.address_ward || ticket.address || (full.lat ? `${full.lat.toFixed(4)}, ${full.lng.toFixed(4)}` : 'Location not specified');
      setSelectedTicket({
        ...full,
        address: locationStr,
        has_gps: !!full.lat,
        worker: full.workers?.name || ticket.worker || 'Pending Assignment',
        citizen: 'Citizen',
      });
    } catch {
      // Fallback to what we have
      setSelectedTicket({
        ...ticket,
        status_history: [
          { status: ticket.status, notes: 'Current status', created_at: ticket.updated_at },
          { status: 'open', notes: 'Complaint logged.', created_at: ticket.created_at }
        ]
      });
    }
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'open': return 'bg-slate-800 text-slate-300 border-slate-700 shadow-[0_0_10px_rgba(148,163,184,0.2)]';
          case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
          case 'in_progress': return 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]';
          case 'resolved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
          case 'escalated': return 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]';
          default: return 'bg-slate-800 text-slate-300 border-slate-700';
      }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 py-12 px-4 selection:bg-orange-500 selection:text-white relative">
      <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        
        {/* Search Section */}
        <div className="text-center space-y-4 mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-white to-emerald-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Track Your Complaint</h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Enter your Ticket ID, Name, Location, or assigned Worker to see real-time updates.</p>
        </div>

        <div className="bg-slate-900 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-slate-800 p-4 md:p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 relative z-10">
            <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-500" />
                </div>
                <input
                type="text"
                placeholder="e.g. CMP-2026-73663, or a location name"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-700 bg-slate-950 text-white focus:bg-slate-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all placeholder:normal-case font-medium text-lg shadow-inner placeholder:text-slate-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <button 
                type="submit"
                disabled={loading || !searchQuery.trim()}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-[0_0_15px_rgba(249,115,22,0.4)] hover:shadow-[0_0_25px_rgba(249,115,22,0.6)] active:scale-[0.98]"
            >
              {loading ? "Searching..." : "Track Status"}
            </button>
          </form>
        </div>

        {error && (
            <div className="bg-red-500/10 text-red-400 p-4 rounded-xl flex items-center space-x-3 border border-red-500/20 animate-in fade-in duration-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <AlertCircle size={20} />
                <span className="font-medium text-lg">{error}</span>
            </div>
        )}

        {/* Multi-Results Section */}
        {results.length > 0 && !selectedTicket && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2"><List size={20} className="text-orange-500"/> <span>Multiple Matches Found</span></h3>
                {results.map((ticket, idx) => (
                    <button key={idx} onClick={() => selectTicket(ticket)} className="w-full text-left bg-slate-900 rounded-2xl p-5 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/80 transition-all shadow-md hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="text-orange-400 font-mono font-bold text-lg">{ticket.ticket_id}</div>
                            <div className="text-slate-300 font-medium mt-1 flex items-center space-x-2"><MapPin size={16} className="text-slate-500"/> <span>{ticket.address}</span></div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-xl border-2 font-bold text-sm tracking-wide capitalize ${getStatusColor(ticket.status)}`}>
                            {ticket.status.replace('_', ' ')}
                        </div>
                    </button>
                ))}
            </div>
        )}

        {/* Single Result Section */}
        {selectedTicket && (
          <div className="bg-slate-900 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] overflow-hidden border border-slate-800 animate-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-950/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center space-x-2">
                           {results.length > 1 && <button onClick={() => setSelectedTicket(null)} className="text-orange-500 hover:text-white underline mr-2">← Back to List</button>}
                           Ticket ID
                        </div>
                        <div className="text-3xl font-mono font-bold text-orange-400 tracking-widest drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">{selectedTicket.ticket_id}</div>
                    </div>
                    <div className={`px-6 py-3 rounded-xl border-2 font-bold tracking-wide capitalize self-start md:self-auto ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ')}
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 mt-8 gap-4">
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] flex flex-col justify-center relative group">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center space-x-1"><MapPin size={14}/> <span>Location</span></div>
                        <div className="font-semibold text-slate-200 text-lg">{selectedTicket.address}</div>
                        {selectedTicket.has_gps && (
                            <a 
                                href={`https://www.google.com/maps?q=${selectedTicket.lat},${selectedTicket.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-orange-500 hover:text-white bg-orange-500/10 hover:bg-orange-500 px-3 py-1.5 rounded-lg border border-orange-500/20 transition-all opacity-0 group-hover:opacity-100"
                            >
                                View on Map ↗
                            </a>
                        )}
                    </div>
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] flex flex-col justify-center">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center space-x-1"><HardHat size={14}/> <span>Assigned Worker</span></div>
                        <div className="font-semibold text-slate-200 text-lg">{selectedTicket.worker}</div>
                    </div>
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] flex flex-col justify-center">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center space-x-1"><AlertCircle size={14}/> <span>Category</span></div>
                        <div className="font-semibold capitalize text-slate-200 text-lg">{selectedTicket.category.replace('_', ' ')}</div>
                    </div>
                    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] flex flex-col justify-center">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center space-x-1"><User size={14}/> <span>Department</span></div>
                        <div className="font-semibold text-slate-200 text-lg">{selectedTicket.departments?.name || getExpectedDepartment(selectedTicket.category) || 'Pending Assignment'}</div>
                    </div>
                </div>

                {selectedTicket.photo_url && (
                    <div className="mt-8 bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-[0_0_20px_rgba(0,0,0,0.5)] animate-in fade-in duration-500">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-3 flex items-center space-x-1"><ImageIcon size={14} className="text-orange-500"/> <span>Uploaded Evidence</span></div>
                        <div className="border border-slate-800 rounded-lg overflow-hidden max-h-96 flex items-center justify-center bg-slate-900/50">
                            <img src={selectedTicket.photo_url} alt="Civic Issue Evidence" className="max-w-full max-h-96 object-contain shadow-inner" />
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div className="p-6 md:p-8">
                <h3 className="text-xl font-bold text-white mb-8 tracking-wide">Status History</h3>
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-orange-500/50 before:via-emerald-500/50 before:to-transparent">
                    {(selectedTicket.status_history || []).map((history: any, index: number) => (
                        <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            
                            {/* Icon */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-900 shadow-[0_0_15px_rgba(0,0,0,0.5)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ${index === 0 ? 'bg-orange-500/20 text-orange-400 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-slate-800 text-slate-400'}`}>
                                {index === 0 ? <CheckCircle2 size={18} /> : <Clock size={16} />}
                            </div>
                            
                            {/* Content */}
                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-950 hover:bg-slate-900 transition-colors p-5 rounded-2xl border border-slate-800 shadow-md hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-emerald-500/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                                    <div className="font-bold text-white capitalize text-lg tracking-wide">{history.status.replace('_', ' ')}</div>
                                    <time className="text-xs font-bold text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700/50 self-start">{new Date(history.created_at).toLocaleDateString()}</time>
                                </div>
                                <div className="text-sm font-medium text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{history.notes || `Status changed to ${history.status}`}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
