"use client";

import { useState, useEffect, useCallback } from "react";
import { Filter, Search, Map as MapIcon, Layers, Loader2, MapPin } from "lucide-react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { fetchAPI } from "@/lib/api";

const VIRUDHUNAGAR_CENTER = { lat: 9.5872, lng: 77.9514 };

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const darkMapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      {
        elementType: "geometry",
        stylers: [{ color: "#020617" }],
      },
      {
        elementType: "labels.text.fill",
        stylers: [{ color: "#64748b" }],
      },
      {
        elementType: "labels.text.stroke",
        stylers: [{ color: "#020617" }],
      },
      {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#fb923c" }],
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#64748b" }],
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#0f172a" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#1e293b" }],
      },
      {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#020617" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#334155" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#0f172a" }],
      },
    ],
  };

export default function MapView() {
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [filterWard, setFilterWard] = useState("All Wards");
  const [filterStatus, setFilterStatus] = useState("All Statuses");
  const [openCount, setOpenCount] = useState(0);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [mapTypeId, setMapTypeId] = useState<string>("roadmap");

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  });

  useEffect(() => {
    const loadComplaints = async () => {
      try {
        const data = await fetchAPI('/api/complaints');
        setComplaints(data.filter((c: any) => c.lat && c.lng));
        setOpenCount(data.filter((c: any) => c.status === 'open' || c.status === 'escalated').length);
      } catch (err) {
        console.error('Failed to load complaint data for map:', err);
      }
    };
    loadComplaints();
  }, []);

  const getMarkerIcon = (status: string) => {
    let color = "#ef4444"; // Default Red
    if (status === 'resolved') color = "#10b981";
    if (status === 'in_progress' || status === 'assigned') color = "#3b82f6";
    if (status === 'escalated') color = "#f97316";

    return {
        path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
        fillColor: color,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
        scale: 1.5,
    };
  };

  return (
    <div className="space-y-6 pt-6 min-h-[calc(100vh-64px)] selection:bg-orange-500 selection:text-white flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">Live Virudhunagar Map</h1>
            <p className="text-slate-400 mt-1 font-medium italic">Real-time civic monitoring for Virudhunagar Municipality</p>
        </div>
        <div className="flex bg-slate-900 rounded-xl border border-slate-800 p-1 shadow-[0_0_15px_rgba(0,0,0,0.5)]">
            <button 
                onClick={() => setMapTypeId("roadmap")}
                className={`font-bold py-2 px-4 rounded-lg shadow-sm transition-all text-sm flex items-center space-x-2 border ${mapTypeId === "roadmap" ? "bg-slate-800 text-white border-slate-700 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]" : "text-slate-500 hover:text-slate-400 border-transparent"}`}
            >
                <MapIcon size={16} /><span>Heatmap</span>
            </button>
            <button 
                onClick={() => setMapTypeId("satellite")}
                className={`font-bold py-2 px-4 rounded-lg transition-all text-sm flex items-center space-x-2 border ${mapTypeId === "satellite" ? "bg-slate-800 text-white border-slate-700 shadow-[inset_0_0_10px_rgba(255,255,255,0.05)]" : "text-slate-500 hover:text-slate-400 border-transparent"}`}
            >
                <Layers size={16} /><span>Satellite</span>
            </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-800 overflow-hidden flex-1 flex flex-col ring-1 ring-orange-500/20 relative">
        
        {/* Top Filters Row */}
        <div className="p-4 border-b border-slate-800 bg-slate-950 flex flex-wrap gap-4 items-center justify-between z-40 relative">
            <div className="flex flex-wrap gap-4">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/50 font-semibold cursor-pointer">
                    <option>All Categories</option>
                    <option>Garbage</option>
                    <option>Drainage</option>
                    <option>Pothole</option>
                    <option>Water Leak</option>
                    <option>Streetlight</option>
                </select>
                <select value={filterWard} onChange={(e) => setFilterWard(e.target.value)} className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/50 font-semibold cursor-pointer">
                    <option>All Localities</option>
                    <option>Virudhunagar Town</option>
                    <option>Aruppukkottai</option>
                    <option>Sattur</option>
                    <option>Sivakasi</option>
                    <option>Rajapalayam</option>
                    <option>Srivilliputhur</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-orange-500/50 font-semibold cursor-pointer">
                    <option>All Statuses</option>
                    <option>Open Only</option>
                    <option>In Progress</option>
                </select>
            </div>
            
            <div className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
                <span>{openCount} Active Complaints in Virudhunagar</span>
            </div>
        </div>

        {/* Map Area */}
        <div className="relative flex-1 bg-slate-950 min-h-[650px] overflow-hidden">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '650px' }}
                center={VIRUDHUNAGAR_CENTER}
                zoom={13}
                options={darkMapOptions}
                mapTypeId={mapTypeId}
              >
                {complaints.map((c) => (
                  <Marker
                    key={c.id}
                    position={{ lat: parseFloat(c.lat), lng: parseFloat(c.lng) }}
                    icon={getMarkerIcon(c.status)}
                    onClick={() => setSelectedPin(c)}
                  />
                ))}

                {selectedPin && (
                  <InfoWindow
                    position={{ lat: parseFloat(selectedPin.lat), lng: parseFloat(selectedPin.lng) }}
                    onCloseClick={() => setSelectedPin(null)}
                  >
                    <div className="p-3 bg-white text-slate-950 min-w-[200px] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{selectedPin.ticket_id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${selectedPin.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{selectedPin.status}</span>
                      </div>
                      <h4 className="font-black text-slate-900 capitalize">{selectedPin.category}</h4>
                      <p className="text-xs mt-1 font-medium text-slate-600 line-clamp-2">{selectedPin.description}</p>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <MapPin size={10} className="mr-1" /> {selectedPin.address_ward || "Virudhunagar Locality"}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                   <div className="flex flex-col items-center space-y-4">
                        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                        <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Live Map...</span>
                   </div>
              </div>
            )}

            {/* Map Legend */}
            <div className="absolute bottom-6 right-6 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] z-30">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 underline decoration-orange-500 underline-offset-4 decoration-2">Status Legend</h4>
                <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        <span className="text-slate-300 text-sm font-semibold">Open</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                        <span className="text-slate-300 text-sm font-semibold">In Progress</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
                        <span className="text-slate-300 text-sm font-semibold">Escalated</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <span className="text-slate-300 text-sm font-semibold">Resolved</span>
                    </div>
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
}
