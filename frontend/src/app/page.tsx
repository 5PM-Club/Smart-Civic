"use client";

import { useState } from "react";
import { Camera, MapPin, MapPinOff, Send, AlertCircle, CheckCircle2, Image as ImageIcon, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";

export default function Home() {
  const [ticketId, setTicketId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    category: "",
    zone: "",
    ward: "",
    locality: "",
    description: "",
    lat: null as number | null,
    lng: null as number | null,
    photo: null as File | null
  });

  const categories = [
    { id: "garbage", label: "Garbage Collection" },
    { id: "pothole", label: "Pothole Repair" },
    { id: "drainage", label: "Drainage Issue" },
    { id: "water_leak", label: "Water Leak" },
    { id: "streetlight", label: "Streetlight Fault" },
  ];

  const handleLocationToggle = () => {
    if (formData.lat) {
      setFormData({
        ...formData,
        lat: null,
        lng: null
      });
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          setFormData({
            ...formData,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          alert("Location captured successfully!");
        }, () => {
          alert("Unable to retrieve your location.");
        });
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({...formData, photo: e.target.files[0]});
    }
  };

  const removePhoto = () => {
    setFormData({...formData, photo: null});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) {
        alert("Please select a category.");
        return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      // Auto-geocode based on selected locality if GPS is off
      const LOCALITY_COORDS: Record<string, {lat: number, lng: number}> = {
        "Virudhunagar Town": {lat: 9.5872, lng: 77.9514},
        "Sivakasi": {lat: 9.4533, lng: 77.7925},
        "Rajapalayam": {lat: 9.4526, lng: 77.5539},
        "Srivilliputhur": {lat: 9.5088, lng: 77.6322},
        "Aruppukkottai": {lat: 9.5135, lng: 78.0988},
        "Sattur": {lat: 9.3562, lng: 77.9250}
      };

      let finalLat = formData.lat;
      let finalLng = formData.lng;

      if (!finalLat && formData.ward && LOCALITY_COORDS[formData.ward]) {
        // Add slight randomization to prevent markers from perfectly overlapping
        finalLat = LOCALITY_COORDS[formData.ward].lat + (Math.random() - 0.5) * 0.005;
        finalLng = LOCALITY_COORDS[formData.ward].lng + (Math.random() - 0.5) * 0.005;
      }

      let photo_url = null;
      if (formData.photo) {
        // Basic conversion to Base64 for rapid prototyping without a heavy storage bucket setup
        photo_url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(formData.photo as File);
        });
      }

      const complaint = await fetchAPI('/api/complaints', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          category: formData.category,
          zone: formData.zone,
          ward: formData.ward,
          locality: formData.locality,
          description: formData.description,
          lat: finalLat,
          lng: finalLng,
          photo_url: photo_url,
        }),
      });

      setTicketId(complaint.ticket_id);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit complaint. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (ticketId) {
    return (
      <main className="min-h-[calc(100vh-64px)] bg-slate-950 flex flex-col items-center pt-24 px-4 font-sans selection:bg-orange-500 selection:text-white">
        <div className="bg-slate-900 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.3)] p-8 max-w-md w-full text-center space-y-6 border border-emerald-500/30 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Complaint Submitted!</h1>
          <p className="text-slate-300 leading-relaxed">Your issue has been reported successfully. You can track its status using the ticket ID below.</p>
          <div className="bg-slate-950 p-6 rounded-xl border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]">
            <div className="text-sm font-medium text-emerald-400/80 mb-2 uppercase tracking-wider">Ticket ID</div>
            <div className="text-2xl font-mono font-bold text-emerald-400 tracking-widest drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]">{ticketId}</div>
          </div>
          <div className="space-y-3 pt-4">
              <Link
                href="/track"
                className="block w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] active:scale-[0.98]"
              >
                Track My Ticket
              </Link>
              <button 
                onClick={() => setTicketId("")}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-3 px-6 rounded-xl transition-all border border-slate-700 active:scale-[0.98]"
              >
                Report Another Issue
              </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-slate-950 font-sans selection:bg-orange-500 selection:text-white">
      {/* Hero Section */}
      <div className="relative py-20 px-4 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-slate-950 to-emerald-600/20 opacity-80 z-0"></div>
        <div className="absolute top-10 left-10 w-72 h-72 bg-orange-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500 rounded-full mix-blend-screen filter blur-[100px] opacity-30 animate-pulse delay-700"></div>
        
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-slate-900 border border-orange-500/30 rounded-full px-4 py-1.5 text-sm font-medium text-orange-400 mb-4 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
            <AlertCircle size={16} />
            <span className="tracking-wide uppercase text-xs">Fast • Transparent • Accountable</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-white to-emerald-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            Smart Civic Reporting
          </h1>
          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Report civic issues in your area instantly. We automatically route them to the right municipal department and track them until resolved.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <div className="max-w-3xl mx-auto px-4 -mt-10 pb-20 relative z-20">
        <div className="bg-slate-900 rounded-3xl p-6 md:p-10 border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-slate-800/50">
            <div className="w-12 h-12 bg-orange-500/20 text-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
             <AlertCircle size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-wide">Report an Issue</h2>
              <p className="text-slate-400 text-sm mt-1">Fill out the form below to alert local authorities.</p>
            </div>
          </div>

          {submitError && (
            <div className="mb-6 bg-red-500/10 text-red-400 p-4 rounded-xl flex items-center space-x-3 border border-red-500/20">
              <AlertCircle size={20} />
              <span className="font-medium">{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 block">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Aarav Sharma"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 block">Phone Number</label>
                <input 
                  type="tel" 
                  required
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300 block">Issue Category (Simulating IVR Step 2)</label>
              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({...formData, category: cat.id})}
                    className={`px-5 py-3 rounded-xl border text-sm font-semibold transition-all duration-300 ${
                      formData.category === cat.id 
                        ? 'border-orange-500 bg-orange-500/20 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                        : 'border-slate-800 bg-slate-950 hover:border-orange-500/50 hover:bg-orange-500/10 text-slate-400'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800/50">
                <label className="text-sm font-semibold text-slate-300 block">Administrative Location (Simulating IVR Step 3)</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select required value={formData.zone} onChange={(e) => setFormData({...formData, zone: e.target.value})} className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all shadow-inner">
                        <option value="" disabled>Select Zone</option>
                        <option>Central Zone</option>
                        <option>North Zone</option>
                        <option>South Zone</option>
                        <option>East Zone</option>
                        <option>West Zone</option>
                    </select>
                    <select required value={formData.ward} onChange={(e) => setFormData({...formData, ward: e.target.value})} className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all shadow-inner">
                        <option value="" disabled>Select Locality</option>
                        <option>Virudhunagar Town</option>
                        <option>Aruppukkottai</option>
                        <option>Sattur</option>
                        <option>Sivakasi</option>
                        <option>Rajapalayam</option>
                        <option>Srivilliputhur</option>
                    </select>
                    <input type="text" value={formData.locality} onChange={(e) => setFormData({...formData, locality: e.target.value})} placeholder="Street / Landmark" className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all shadow-inner" />
                </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 block">Extra Specific Details</label>
              <textarea 
                rows={2}
                placeholder="Describe landmark or issue details..."
                className="w-full px-4 py-3.5 rounded-xl border border-slate-800 bg-slate-950 text-white focus:bg-slate-900 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all resize-none placeholder:text-slate-600 shadow-inner"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                type="button"
                onClick={handleLocationToggle}
                className={`flex items-center justify-center space-x-2 w-full py-4 px-4 rounded-xl border-2 transition-all duration-300 font-semibold ${
                  formData.lat ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-slate-800 border-dashed text-slate-500 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5'
                }`}
              >
                {formData.lat ? <MapPin size={20} className="text-emerald-400" /> : <MapPinOff size={20} />}
                <span>{formData.lat ? 'Location: ON' : 'Live GPS (Optional)'}</span>
              </button>

              {formData.photo ? (
                <div className="flex items-center justify-between w-full py-4 px-4 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <ImageIcon size={20} className="text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-semibold truncate text-sm">{formData.photo.name}</span>
                    </div>
                    <button type="button" onClick={removePhoto} className="text-emerald-400 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/50 rounded-full p-1.5 transition-colors shrink-0">
                        <X size={16} />
                    </button>
                </div>
              ) : (
                <label className="flex items-center justify-center space-x-2 w-full py-4 px-4 rounded-xl border-2 border-slate-800 border-dashed text-slate-500 hover:border-orange-500/50 hover:text-orange-400 hover:bg-orange-500/5 transition-all duration-300 font-semibold cursor-pointer">
                    <Camera size={20} />
                    <span>Upload Issue Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={submitting}
                className="group flex items-center justify-center space-x-3 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.4)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-lg tracking-wide">Submitting...</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg tracking-wide">Register Complaint</span>
                    <Send size={20} className="group-hover:translate-x-1 transition-transform drop-shadow-md" />
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </main>
  );
}
