// frontend/src/pages/warehouse/index.jsx
import React, { useState, useEffect } from "react";
import WarehouseLayout from "../../components/warehouse/WarehouseLayout";
import useWarehouseReturns from "../../hooks/useWarehouseReturns";
import ReturnDetailPanel from "../../components/warehouse/ReturnDetailPanel";
import { 
  Calendar, 
  ChevronDown, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  X, 
  Wrench, 
  Tag, 
  Heart, 
  Package, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Image
} from "lucide-react";

function getOrderNumber(returnId) {
  const mapping = {
    "ret-samsung-m34-001": "408-7291-3847",
    "ret-nike-pegasus-002": "312-4481-9920",
    "ret-prestige-induction-003": "501-2234-7712",
    "ret-lego-classic-004": "219-8843-0034",
    "ret-boat-rockerz-005": "773-5590-2281",
    "ret-prestige-mixer-006": "660-1127-8854"
  };
  if (mapping[returnId]) return mapping[returnId];
  if (!returnId) return "000-0000-0000";
  
  // Deterministic hash of returnId to 14 digits
  let hash = 0;
  for (let i = 0; i < returnId.length; i++) {
    hash = (hash << 5) - hash + returnId.charCodeAt(i);
    hash |= 0;
  }
  let hashStr = Math.abs(hash).toString();
  while (hashStr.length < 14) {
    hashStr += (hashStr.charCodeAt(hashStr.length - 1) || 7).toString();
  }
  const p1 = hashStr.slice(0, 3);
  const p2 = hashStr.slice(3, 10);
  const p3 = hashStr.slice(10, 14);
  return `${p1}-${p2}-${p3}`;
}


export default function WarehouseDashboard() {
  const token = localStorage.getItem("warehouse_token");
  
  // State
  const [selectedReturnId, setSelectedReturnId] = useState("ret-samsung-m34-001"); // Default to Samsung Galaxy M34
  const [filterLabel, setFilterLabel] = useState("All items");
  const [page, setPage] = useState(1);
  const limit = 6;

  // Data hook for returns list + statistics
  const { 
    returns, 
    total, 
    stats, 
    isLoading: listLoading, 
    error: listError, 
    refetchReturns 
  } = useWarehouseReturns(token, filterLabel, page, limit);

  // Auto-select first item when returns load, if no selected item or selected item not found
  useEffect(() => {
    if (returns.length > 0 && !selectedReturnId) {
      setSelectedReturnId(returns[0].return_id);
    }
  }, [returns, selectedReturnId]);

  const handleTabClick = (label) => {
    setFilterLabel(label);
    setPage(1); // Reset page on filter change
  };

  const handleRowClick = (returnId) => {
    setSelectedReturnId(returnId);
  };

  // Helper formatting values
  const formatValue = (val) => {
    if (val === undefined || val === null || val === "—") return "—";
    const num = Number(val);
    if (isNaN(num)) return val;
    return `₹${num.toLocaleString("en-IN")}`;
  };

  // Get color badges for AI Grades
  const getGradeBadge = (grade) => {
    const g = String(grade || "").toLowerCase();
    if (g.includes("new")) {
      return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold">Like New</span>;
    }
    if (g.includes("very good")) {
      return <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-[11px] font-bold">Very Good</span>;
    }
    if (g.includes("good")) {
      return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[11px] font-bold">Good</span>;
    }
    if (g.includes("acceptable")) {
      return <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-[11px] font-bold">Acceptable</span>;
    }
    if (g.includes("damaged") || g.includes("recycle")) {
      return <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[11px] font-bold">Damaged</span>;
    }
    return <span className="bg-gray-100 text-gray-500 px-2.5 py-1 rounded-md text-[11px] font-bold">Pending</span>;
  };

  // Get color badges & icon for Action Labels
  const getActionLabelBadge = (action) => {
    const a = String(action || "").toUpperCase();
    if (a.includes("RESELL") || a.includes("RESALE")) {
      return (
        <span className="inline-flex items-center gap-1 bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
          <Tag className="w-3.5 h-3.5" /> Resale
        </span>
      );
    }
    if (a.includes("REFURBISH")) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
          <Wrench className="w-3.5 h-3.5" /> Refurbish
        </span>
      );
    }
    if (a.includes("DONATE")) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
          <Heart className="w-3.5 h-3.5" /> Donate
        </span>
      );
    }
    if (a.includes("RECYCLE") || a.includes("LIQUIDATE")) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-[11px] font-bold">
          <Package className="w-3.5 h-3.5" /> Liquidate
        </span>
      );
    }
    return <span className="bg-gray-100 text-gray-400 px-2.5 py-1 rounded-md text-[11px] font-bold">Pending</span>;
  };

  // Get Media uploads column styling
  const getMediaText = (uploadedCount, totalExpected = 4) => {
    const ratio = uploadedCount / totalExpected;
    if (uploadedCount === 0) {
      return <span className="text-red-600 font-bold flex items-center gap-1.5 text-xs"><Image className="w-3.5 h-3.5" /> 0/{totalExpected}</span>;
    }
    if (ratio < 1.0) {
      return <span className="text-amber-600 font-bold flex items-center gap-1.5 text-xs"><Image className="w-3.5 h-3.5 animate-pulse" /> {uploadedCount}/{totalExpected}</span>;
    }
    return <span className="text-gray-500 font-semibold flex items-center gap-1.5 text-xs"><Image className="w-3.5 h-3.5" /> {uploadedCount}/{totalExpected}</span>;
  };

  // Get status label color elements
  const getStatusDot = (status) => {
    const s = String(status || "").toUpperCase();
    if (s.includes("BINNED")) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-gray-900 font-semibold">
          <span className="w-2 h-2 rounded-full bg-green-500"></span> Arrived — binned
        </span>
      );
    }
    if (s.includes("DISPATCH")) {
      return (
        <span className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
          <span className="w-2 h-2 rounded-full bg-gray-400"></span> Dispatched
        </span>
      );
    }
    if (s.includes("INCOMPLETE")) {
      return (
        <span className="flex items-center gap-1 text-xs text-amber-600 font-bold">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Photos incomplete
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span> Awaiting arrival
      </span>
    );
  };

  // Check stats loading status
  const statsToday = stats?.total_today ?? 1284;
  const statsPending = stats?.pending_arrival ?? 847;
  const statsRouted = stats?.routed_successfully ?? 312;
  const statsAvg = stats?.avg_recovery ?? 8400;

  return (
    <>
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-56px)] bg-[#F4F6F8]">
        
        {/* ================= LEFT MAIN WORKSPACE ================= */}
        <div className="flex-grow p-6 space-y-6 lg:max-w-[calc(100%-420px)] xl:max-w-[calc(100%-450px)]">
          
          {/* Header titles */}
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Returned Items Overview</h1>
            <p className="text-xs text-gray-500 font-semibold mt-0.5">Real-time recovery tracking for Warehouse Node Alpha (DXB1)</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Returned */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Total returned today</span>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold text-gray-900">{statsToday.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 font-bold ml-2">items received</span>
              </div>
            </div>

            {/* Card 2: Pending Arrival */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Pending arrival</span>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold text-[#FF9900]">{statsPending.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 font-bold ml-2">graded, not arrived</span>
              </div>
            </div>

            {/* Card 3: Routed Successfully */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Routed successfully</span>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold text-teal-600">{statsRouted.toLocaleString()}</span>
                <span className="text-[10px] text-gray-400 font-bold ml-2">assigned to best path</span>
              </div>
            </div>

            {/* Card 4: Avg Recovery Value */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Avg recovery value</span>
              <div className="flex items-baseline mt-2">
                <span className="text-3xl font-extrabold text-gray-950">₹{statsAvg.toLocaleString("en-IN")}</span>
                <span className="text-[10px] text-gray-400 font-bold ml-2">per item today</span>
              </div>
            </div>

          </div>

          {/* Filter Bar Panel */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
            {/* Row 1: Filter pills */}
            <div className="flex flex-wrap items-center gap-2">
              {["All items", "Refurbish", "Resale", "Donate", "Liquidate"].map((label) => (
                <button
                  key={label}
                  onClick={() => handleTabClick(label)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    filterLabel === label
                      ? "bg-gray-950 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Divider line */}
            <div className="h-[1px] bg-gray-100"></div>

            {/* Row 2: Secondary controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Static date badge */}
                <div className="bg-white border border-gray-300 rounded-lg px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>Jun 14, 2026</span>
                </div>

                {/* Dropdown select */}
                <div className="relative">
                  <select className="appearance-none bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-gray-500 cursor-pointer">
                    <option>All warehouses</option>
                    <option>DXB1 (Dubai)</option>
                    <option>BLR2 (Bengaluru)</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              {/* CSV export button */}
              <button className="bg-[#007185] hover:bg-[#005a6a] text-white rounded-lg px-4 py-2 text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>

          </div>

          {/* Returns Table Grid */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden select-none">
            
            {listLoading ? (
              <div className="py-24 text-center text-gray-400 font-semibold space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#FF9900]" />
                <p className="text-xs">Fetching returns list...</p>
              </div>
            ) : listError ? (
              <div className="py-16 text-center text-red-600 font-bold p-4 flex flex-col items-center gap-2">
                <AlertTriangle className="w-8 h-8" />
                <span className="text-sm">Database connection timeout: {listError}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Order ID & Product</th>
                      <th className="py-3.5 px-4">Media</th>
                      <th className="py-3.5 px-4">Grade</th>
                      <th className="py-3.5 px-4">Action Label</th>
                      <th className="py-3.5 px-4">Route Target</th>
                      <th className="py-3.5 px-4">Est. Value</th>
                      <th className="py-3.5 px-5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((item) => {
                      const isSelected = item.return_id === selectedReturnId;
                      const isIncomplete = item.status === "PHOTOS_INCOMPLETE";
                      
                      // Highlight logic
                      let rowStyle = "border-b border-gray-150 transition-colors cursor-pointer hover:bg-gray-50/50 ";
                      if (isSelected) {
                        rowStyle += "bg-blue-50/50 border-l-[3px] border-l-blue-600";
                      } else if (isIncomplete) {
                        rowStyle += "bg-amber-50/20 border-l-[3px] border-l-amber-500";
                      } else {
                        rowStyle += "bg-white";
                      }

                      return (
                        <tr
                          key={item.return_id}
                          onClick={() => handleRowClick(item.return_id)}
                          className={rowStyle}
                        >
                          {/* Order ID & Product name */}
                          <td className="py-3 px-5">
                            <div className="font-semibold text-gray-400 text-[11px]">#{getOrderNumber(item.return_id)}</div>
                            <div className="font-extrabold text-gray-950 text-xs mt-0.5">{item.product_name}</div>
                          </td>

                          {/* Media count */}
                          <td className="py-3 px-4">
                            {getMediaText(item.photos_uploaded?.length || 0)}
                          </td>

                          {/* Grade badge */}
                          <td className="py-3 px-4">
                            {getGradeBadge(item.ai_grade)}
                          </td>

                          {/* Action label badge */}
                          <td className="py-3 px-4">
                            {getActionLabelBadge(item.routed_to)}
                          </td>

                          {/* Route Target */}
                          <td className="py-3 px-4 text-xs font-semibold text-gray-600">
                            {item.status === "PHOTOS_INCOMPLETE" ? "—" : (item.routed_to === "RESELL" ? "Warehouse Deals" : item.routed_to === "REFURBISH" ? "Cashify" : item.routed_to === "DONATE" ? "Good360 India" : "B-Stock")}
                          </td>

                          {/* Est. Recovery Value */}
                          <td className="py-3 px-4 font-black text-xs text-gray-950">
                            {formatValue(item.expected_recovery)}
                          </td>

                          {/* Status code */}
                          <td className="py-3 px-5">
                            {getStatusDot(item.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Footer */}
            <div className="bg-gray-50 px-5 py-3.5 border-t border-gray-200 flex items-center justify-between select-none">
              <span className="text-[11px] text-gray-400 font-bold">Showing 1-{returns.length} of {total.toLocaleString()}</span>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="bg-gray-950 text-white rounded px-2.5 py-0.5 text-xs font-bold">
                  {page}
                </span>
                <span className="text-xs text-gray-500 font-bold mx-1">/ {Math.ceil(total / limit) || 1}</span>
                <button 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                  className="p-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                <span>Items per page:</span>
                <select className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none">
                  <option>50</option>
                  <option>10</option>
                  <option>6</option>
                </select>
              </div>
            </div>

          </div>

        </div>

        {/* ================= RIGHT DETAIL SIDEBAR PANEL ================= */}
        {selectedReturnId ? (
          <ReturnDetailPanel 
            returnId={selectedReturnId} 
            onClose={() => setSelectedReturnId(null)} 
            onSuccess={() => refetchReturns()} 
          />
        ) : (
          <div className="w-full lg:w-[420px] xl:w-[450px] border-t lg:border-t-0 lg:border-l border-gray-250 bg-white flex flex-col shrink-0 select-none justify-center items-center p-8 text-center text-gray-400">
            <Package className="w-12 h-12 text-gray-300 mb-2" />
            <h3 className="font-bold text-sm text-gray-700">No Return Selected</h3>
            <p className="text-xs text-gray-500">Click on any row in the returns table to inspect its AI metrics and routing pipeline.</p>
          </div>
        )}

      </div>
    </>
  );
}
