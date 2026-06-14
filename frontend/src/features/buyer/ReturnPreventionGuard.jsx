// frontend/src/features/buyer/ReturnPreventionGuard.jsx
import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, Sparkles, RefreshCw, RefreshCw as SwapIcon } from "lucide-react";
import { evaluateRisk } from "../../services/api";

export default function ReturnPreventionGuard({
  productId,
  currentSpecs,
  userId,
  role,
  onLaunchCamera,
  onSwapSpec,
  sizeScanned,
  onEngineDirectiveLoaded
}) {
  const [engineDirective, setEngineDirective] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const specsKey = JSON.stringify(currentSpecs);

  useEffect(() => {
    let active = true;
    setLoading(true);
    
    // Call the unified backend risk engine
    evaluateRisk({ productId, currentSpecs, userId, role })
      .then((data) => {
        if (active) {
          setEngineDirective(data);
          setLoading(false);
          if (onEngineDirectiveLoaded) {
            onEngineDirectiveLoaded(data);
          }
        }
      })
      .catch((err) => {
        console.error("Risk assessment failed:", err);
        if (active) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [productId, specsKey, userId, role, sizeScanned]);

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center gap-3 text-xs text-gray-500 font-sans">
        <RefreshCw className="animate-spin w-4 h-4 text-amazon-teal" />
        AI checking user history and product return cohorts...
      </div>
    );
  }

  if (error || !engineDirective) {
    return null; // Silent fallback if endpoint fails
  }

  const { riskPercent, showAlert, interventionStrategy, uiCopy, suggestedAlternativeSpecs, preventionRules, checksBreakdown, gradedBy } = engineDirective;

  // Determine colors based on risk severity
  const isHighRisk = riskPercent >= 50;
  const isScannedOrOptimized = riskPercent < 10;

  return (
    <div className={`border rounded-lg p-5 font-sans transition-all duration-300 shadow-md ${
      isScannedOrOptimized
        ? "bg-emerald-50 border-emerald-200 text-emerald-950 shadow-emerald-50/10"
        : "bg-slate-900 border-slate-800 text-white shadow-xl"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2">
          {isScannedOrOptimized ? (
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
          )}
          <span className="font-bold text-xs uppercase tracking-wider text-cyan-400">
            {isScannedOrOptimized ? "AI Size Optimization Active" : "AI Return Prevention Engine"}
          </span>
          {gradedBy === "fallback" && (
            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
              Local Fallback
            </span>
          )}
        </div>
        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
          isScannedOrOptimized ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
        }`}>
          Risk Probability: {riskPercent}%
        </span>
      </div>

      <div className="space-y-4">
        {/* Risk meter */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-bold text-gray-400">
            <span>Minimum Return Risk</span>
            <span>Unmitigated Risk</span>
          </div>
          <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isScannedOrOptimized ? "bg-emerald-500" : "bg-red-500"
              }`}
              style={{ width: `${Math.max(4, riskPercent)}%` }}
            ></div>
          </div>
        </div>

        {/* Telemetry signals list (Hidden payload) */}
        {!isScannedOrOptimized && (
          <div className="space-y-2 bg-white/5 rounded-lg p-3 border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block border-b border-white/5 pb-1">
              Background Telemetry Signals (Connected DBs):
            </span>
            <ul className="text-xs space-y-2 text-gray-200">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold mt-0.5">•</span>
                <div className="leading-relaxed">
                  <strong className="text-gray-300">Personal History Check:</strong> {checksBreakdown?.history || "You returned similar items recently in this category."}
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold mt-0.5">•</span>
                <div className="leading-relaxed">
                  <strong className="text-gray-300">Product Return Pattern:</strong> {checksBreakdown?.pattern || "This specific ASIN shows a pattern of sizing mismatch returns."}
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold mt-0.5">•</span>
                <div className="leading-relaxed">
                  <strong className="text-gray-300">Similar Cohort Choice:</strong> {checksBreakdown?.cohort || "Buyers with your profile successfully ordered a different size."}
                </div>
              </li>
            </ul>
          </div>
        )}

        {/* Suggestion Copy */}
        <div className="text-xs bg-white/5 p-3 rounded-lg border border-white/10">
          <p className="font-semibold text-gray-100">
            {uiCopy.body}
          </p>
        </div>

        {/* Action button triggers */}
        <div className="flex gap-2.5 pt-1">
          {/* Smart Spec Swap */}
          {interventionStrategy === "SMART_SWAP" && suggestedAlternativeSpecs && (
            <button
              onClick={() => onSwapSpec(suggestedAlternativeSpecs)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-md shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <SwapIcon className="w-3.5 h-3.5" />
              {uiCopy.actionButtonText || "Swap specification"}
            </button>
          )}

          {/* Camera Scan Calibration */}
          {interventionStrategy === "CAMERA_VERIFICATION" && (
            <button
              onClick={() => onLaunchCamera(preventionRules?.virtualTestType || "A4_SPATIAL_SCAN")}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-black text-xs rounded-md shadow-sm transition-all cursor-pointer flex items-center gap-1.5 animate-pulse"
            >
              <Sparkles className="w-4 h-4" />
              {uiCopy.actionButtonText || "Scan Fit with AI"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
