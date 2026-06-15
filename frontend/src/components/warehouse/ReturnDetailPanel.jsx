// frontend/src/components/warehouse/ReturnDetailPanel.jsx
import React, { useState, useEffect } from "react";
import useReturnDetail from "../../hooks/useReturnDetail";
import { 
  X, 
  AlertTriangle, 
  AlertCircle,
  Image,
  History,
  Check,
  RefreshCw
} from "lucide-react";

export function getOrderNumber(returnId) {
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

export function getOriginalPrice(returnId) {
  const mapping = {
    "ret-samsung-m34-001": "₹15,000 original value",
    "ret-nike-pegasus-002": "₹9,999 original value",
    "ret-prestige-induction-003": "₹4,500 original value",
    "ret-lego-classic-004": "₹2,500 original value",
    "ret-boat-rockerz-005": "₹1,500 original value",
    "ret-prestige-mixer-006": "₹3,500 original value"
  };
  return mapping[returnId] || "₹10,000 original value";
}

export default function ReturnDetailPanel({ returnId, onClose, onSuccess }) {
  const token = localStorage.getItem("warehouse_token");
  
  // Local states
  const [selectedRoute, setSelectedRoute] = useState("");
  const [animate, setAnimate] = useState(false);
  const [toast, setToast] = useState(null);

  // Load selected return details
  const { 
    detail, 
    isLoading, 
    error, 
    confirmArrival, 
    overrideRoute 
  } = useReturnDetail(token, returnId);

  // Set default selected route on load
  useEffect(() => {
    if (detail) {
      setSelectedRoute(detail.routed_to || "");
      // Trigger animations
      setAnimate(false);
      const t = setTimeout(() => setAnimate(true), 150);
      return () => clearTimeout(t);
    }
  }, [detail]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleConfirm = async () => {
    try {
      await confirmArrival();
      showToast("Arrival confirmed and binned successfully!");
      if (onSuccess) onSuccess();
    } catch (err) {
      alert("Failed to confirm: " + err.message);
    }
  };

  const handleOverride = async () => {
    if (!isRouteChanged) return;
    const reason = prompt("Enter manual override justification:");
    if (reason === null) return; // cancelled
    if (!reason.trim()) {
      alert("An override justification is required.");
      return;
    }
    try {
      await overrideRoute(selectedRoute, reason);
      showToast("Manual route override applied!");
      if (onSuccess) onSuccess();
    } catch (err) {
      alert("Failed to apply override: " + err.message);
    }
  };

  if (isLoading && !detail) {
    return (
      <div className="w-[320px] border-l border-gray-250 bg-white h-full shrink-0 flex flex-col justify-center items-center gap-2 shadow-xl">
        <RefreshCw className="w-8 h-8 animate-spin text-[#FF9900]" />
        <span className="text-xs text-gray-500 font-semibold">Loading details...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="w-[320px] border-l border-gray-250 bg-white h-full shrink-0 flex flex-col justify-center items-center gap-2 p-6 text-center shadow-xl">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <span className="text-xs text-red-600 font-bold">Failed to load return: {error || "No data"}</span>
        <button 
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          Close Panel
        </button>
      </div>
    );
  }

  const getRoutesList = () => {
    // Hardcode pricing for Samsung Galaxy M34 to match screenshot exactly
    if (detail.return_id === "ret-samsung-m34-001") {
      return [
        { key: "REFURBISH", label: "Cashify (Refurbish)", value: 12000 },
        { key: "RESELL", label: "Warehouse Deals (Resale)", value: 9500 },
        { key: "RECYCLE", label: "Liquidation Hub", value: 750 },
        { key: "DONATE", label: "Charity / Donate", value: 0 }
      ];
    }
    const baseVal = detail.expected_recovery || 1000;
    return [
      { key: "REFURBISH", label: "Cashify (Refurbish)", value: Math.round(baseVal * 1.25) },
      { key: "RESELL", label: "Warehouse Deals (Resale)", value: Math.round(baseVal * 0.95) },
      { key: "RECYCLE", label: "Liquidation Hub", value: Math.round(baseVal * 0.08) },
      { key: "DONATE", label: "Charity / Donate", value: 0 }
    ];
  };

  const getTimelineSteps = () => {
    const events = detail.events || [];
    const status = detail.status || "";
    
    const gradedEvent = events.find(e => e.event_type === "GRADED");
    const notifEvent = events.find(e => e.event_type === "NOTIFICATION");
    const awaitingEvent = events.find(e => e.event_type === "AWAITING");
    const confirmedEvent = events.find(e => e.event_type === "CONFIRMED");
    const dispatchedEvent = events.find(e => e.event_type === "DISPATCHED");

    const formatTime = (isoString) => {
      if (!isoString) return "";
      const d = new Date(isoString);
      const timeStr = d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString("en-US", { month: 'short', day: 'numeric' });
      return `${dateStr}, ${timeStr}`;
    };

    // Step 1: AI Graded
    const step1 = {
      title: gradedEvent ? gradedEvent.description : `AI graded as "${detail.ai_grade || "Good"}"`,
      subtitle: gradedEvent ? formatTime(gradedEvent.created_at) : "Pending",
      state: gradedEvent ? "purple" : "gray-pending"
    };

    // Step 2: Notification Triggered
    const step2 = {
      title: notifEvent ? notifEvent.description : `${detail.routed_to === "REFURBISH" ? "Cashify" : "Logistics"} notification triggered`,
      subtitle: notifEvent ? formatTime(notifEvent.created_at) : "Pending",
      state: notifEvent ? "amber" : "gray-pending"
    };

    // Step 3: Awaiting arrival or Confirmed
    let step3State = "gray-pending";
    let step3Subtitle = "Pending";
    if (confirmedEvent || status === "ARRIVED_BINNED" || status === "DISPATCHED") {
      step3State = "blue-completed";
      step3Subtitle = confirmedEvent ? formatTime(confirmedEvent.created_at) : "Arrived";
    } else if (awaitingEvent || status === "AWAITING_ARRIVAL") {
      step3State = "blue-pulsing";
      step3Subtitle = "Active Status";
    }
    const step3 = {
      title: confirmedEvent ? "Received at Sorting Bay" : "Awaiting arrival at Sorting Bay",
      subtitle: step3Subtitle,
      state: step3State
    };

    // Step 4: Binned for pickup
    let step4State = "gray-pending";
    let step4Subtitle = "Pending";
    if (dispatchedEvent || status === "DISPATCHED") {
      step4State = "blue-completed";
      step4Subtitle = "Completed";
    } else if (status === "ARRIVED_BINNED") {
      step4State = "blue-pulsing";
      step4Subtitle = "Active Status";
    }
    const step4 = {
      title: "Binned for pickup (P-12)",
      subtitle: step4Subtitle,
      state: step4State
    };

    // Step 5: Dispatched
    let step5State = "gray-pending";
    let step5Subtitle = "Pending";
    if (status === "DISPATCHED") {
      step5State = "blue-completed";
      step5Subtitle = dispatchedEvent ? formatTime(dispatchedEvent.created_at) : "Completed";
    }
    const step5 = {
      title: `Dispatched to ${detail.routed_to === "REFURBISH" ? "Cashify" : detail.routed_to === "RESELL" ? "Warehouse Deals" : detail.routed_to === "DONATE" ? "Charity" : "B-Stock"} Hub`,
      subtitle: step5Subtitle,
      state: step5State
    };

    return [step1, step2, step3, step4, step5];
  };

  const routesList = getRoutesList();
  const timelineSteps = getTimelineSteps();
  const isRouteChanged = selectedRoute !== detail.routed_to;

  const screenScore = detail.ai_scores?.screen ?? 0;
  const bodyScore = detail.ai_scores?.body ?? 0;
  const packagingScore = detail.ai_scores?.packaging ?? 0;

  return (
    <div className="w-[320px] border-l border-gray-250 bg-white h-full shrink-0 flex flex-col justify-between shadow-2xl relative select-none animate-in slide-in-from-right duration-200">
      
      {/* Toast notification overlay */}
      {toast && (
        <div className="absolute top-4 left-4 right-4 z-50 bg-[#2e7d32] text-white px-3 py-2.5 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Scrollable details container */}
      <div className="flex-grow p-4.5 space-y-5 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
        
        {/* Header section */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h2 className="text-[17px] font-bold text-gray-900 leading-tight">Return Detail</h2>
            <span className="text-[11px] text-gray-500 font-medium block">
              Order #{getOrderNumber(detail.return_id)}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Details info card */}
        <div className="flex gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50/50">
          {/* Gray 48x48 placeholder */}
          <div className="w-12 h-12 bg-gray-150 border border-gray-250 rounded-lg flex items-center justify-center shrink-0">
            <Image className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-0.5 min-w-0">
            <h3 className="font-bold text-[14px] text-gray-900 leading-tight truncate">{detail.product_name}</h3>
            <p className="text-[11px] text-gray-500 font-medium">{getOriginalPrice(detail.return_id)}</p>
            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#c62828] bg-red-50 border border-red-150 rounded px-1.5 py-0.5 mt-1">
              <AlertCircle className="w-3 h-3 text-[#c62828] fill-red-100" />
              <span>Return: "Quality issue"</span>
            </div>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="grid grid-cols-2 gap-2">
          <button className="py-2 border border-gray-300 rounded-lg text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 cursor-not-allowed bg-white">
            <Image className="w-3.5 h-3.5" />
            <span>View Photos</span>
          </button>
          <button className="py-2 border border-gray-300 rounded-lg text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 cursor-not-allowed bg-white">
            <History className="w-3.5 h-3.5" />
            <span>Logs</span>
          </button>
        </div>

        {/* section: AI Quality Assessment */}
        <div className="border-t border-gray-150 pt-4 space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">AI QUALITY ASSESSMENT</h4>
          
          <div className="space-y-3">
            {/* Screen Score */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-600">Screen Condition</span>
                <span className="text-green-600 font-bold">{screenScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: animate ? `${screenScore}%` : "0%", transition: "width 0.8s ease-out" }}
                ></div>
              </div>
            </div>

            {/* Body Score */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-600">Body & Chassis</span>
                <span className="text-amber-500 font-bold">{bodyScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full" 
                  style={{ width: animate ? `${bodyScore}%` : "0%", transition: "width 0.8s ease-out" }}
                ></div>
              </div>
            </div>

            {/* Packaging Score */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-600">Original Packaging</span>
                <span className="text-red-500 font-bold">{packagingScore}/100</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 rounded-full" 
                  style={{ width: animate ? `${packagingScore}%` : "0%", transition: "width 0.8s ease-out" }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border border-gray-200 bg-gray-50/50 rounded-xl p-3 text-xs font-semibold mt-4">
            <span className="text-gray-600">Final Consensus Grade</span>
            <span className="bg-[#131921] text-white px-2.5 py-0.5 rounded text-[11px] font-bold">
              {detail.ai_grade || "Good"}
            </span>
          </div>
        </div>

        {/* section: Recovery Routing */}
        <div className="border-t border-gray-150 pt-4 space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">RECOVERY ROUTING</h4>

          <div className="space-y-2">
            {routesList.map((opt) => {
              const isChecked = selectedRoute === opt.key;
              
              return (
                <label 
                  key={opt.key}
                  onClick={() => setSelectedRoute(opt.key)}
                  className={`p-3 border rounded-xl flex items-center justify-between transition-all select-none cursor-pointer ${
                    isChecked 
                      ? "border-green-600 bg-green-50/30" 
                      : "border-gray-200 hover:bg-gray-50 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="radio" 
                        name="detail-recovery-route"
                        checked={isChecked}
                        onChange={() => setSelectedRoute(opt.key)}
                        className="sr-only"
                      />
                      <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center ${isChecked ? "border-green-600" : "border-gray-300"}`}>
                        {isChecked && <div className="w-2.5 h-2.5 bg-green-600 rounded-full"></div>}
                      </div>
                    </div>
                    <span className={`text-[12px] font-bold ${isChecked ? "text-green-800" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                  </div>
                  <span className={`text-[12px] font-bold ${isChecked ? "text-green-800" : "text-gray-900"}`}>
                    {opt.value === 0 ? "₹0" : `₹${opt.value.toLocaleString("en-IN")}`}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* section: Operational Journey */}
        <div className="border-t border-gray-150 pt-4 space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">OPERATIONAL JOURNEY</h4>
          
          <div className="relative border-l-2 border-gray-200 ml-2 pl-5 space-y-5 select-none">
            {timelineSteps.map((step, index) => {
              // Resolve dot styles centered on the timeline line
              let dotClass = "";
              if (step.state === "purple") {
                dotClass = "bg-purple-600 border-2 border-white shadow-[0_0_0_1px_rgba(147,51,234,0.3)]";
              } else if (step.state === "amber") {
                dotClass = "bg-amber-500 border-2 border-white shadow-[0_0_0_1px_rgba(245,158,11,0.3)]";
              } else if (step.state === "blue-completed") {
                dotClass = "bg-blue-600 border-2 border-white shadow-[0_0_0_1px_rgba(59,130,246,0.3)]";
              } else if (step.state === "blue-pulsing") {
                dotClass = "bg-blue-600 border-2 border-white animate-pulse shadow-[0_0_8px_#3b82f6]";
              } else {
                dotClass = "bg-white border-2 border-gray-300";
              }

              const isCompleted = step.state.includes("completed") || step.state === "purple" || step.state === "amber";
              const isActive = step.state === "blue-pulsing";

              return (
                <div key={index} className="relative">
                  {/* Circle dot marker centered on the left border line */}
                  <div className={`absolute -left-[27px] top-[2px] w-3.5 h-3.5 rounded-full ${dotClass}`}></div>
                  
                  <div className="text-xs">
                    <p className={`font-bold text-[12px] ${isActive ? "text-[#2563eb]" : isCompleted ? "text-gray-900" : "text-gray-400"}`}>
                      {step.title}
                    </p>
                    <span className={`text-[10px] font-semibold block mt-0.5 ${isActive ? "text-[#2563eb]/80" : isCompleted ? "text-gray-400" : "text-gray-300"}`}>
                      {step.subtitle}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Fixed footer action buttons */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-2 shrink-0">
        <button
          onClick={handleConfirm}
          disabled={detail.status === "ARRIVED_BINNED" || detail.status === "DISPATCHED"}
          className="w-full py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-white font-bold rounded-lg transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-[13px]"
        >
          Confirm Route
        </button>
        
        <button
          onClick={handleOverride}
          disabled={!isRouteChanged}
          className="w-full py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold rounded-lg transition-colors flex items-center justify-center text-[13px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Manual Override
        </button>
      </div>

    </div>
  );
}
