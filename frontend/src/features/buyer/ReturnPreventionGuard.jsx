// frontend/src/features/buyer/ReturnPreventionGuard.jsx
import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, Sparkles, RefreshCw, XCircle, CheckCircle } from "lucide-react";
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

  if (loading && !engineDirective) {
    return (
      <div className="bg-white border-[0.5px] border-outline-variant rounded-xl p-5 text-center text-outline animate-pulse">
        <RefreshCw className="animate-spin w-5 h-5 mx-auto text-secondary-container mb-2" />
        Running return prevention checks...
      </div>
    );
  }

  if (error || !engineDirective) {
    return null; // Silent fallback if endpoint fails
  }

  const { riskPercent, showAlert, interventionStrategy, uiCopy, suggestedAlternativeSpecs, preventionRules, checksBreakdown, gradedBy } = engineDirective;

  const isScannedOrOptimized = riskPercent < 10;

  return (
    <div className="space-y-4">
      {/* Sizing Caution Alert if risk is high */}
      {showAlert && uiCopy && (
        <div className="bg-[#FFF8E1] border-[0.5px] border-secondary-container p-4 rounded-lg flex gap-3 select-none">
          <AlertTriangle className="w-5 h-5 text-secondary-container flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider">Sizing Caution</p>
            <p className="text-xs text-ink-black mt-1 font-medium leading-relaxed">
              {uiCopy.body || "Sizing parameters show higher return risk."}
            </p>
          </div>
        </div>
      )}

      {/* Action button triggers */}
      <div className="space-y-3">
        {/* Smart Spec Swap */}
        {interventionStrategy === "SMART_SWAP" && suggestedAlternativeSpecs && (
          <button
            type="button"
            onClick={() => onSwapSpec(suggestedAlternativeSpecs)}
            className="w-full bg-[#fbbc04] hover:bg-[#e68a00] text-ink-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-[13px] cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined font-bold text-[18px]">swap_horiz</span>
            {uiCopy.actionButtonText || `Switch to Size ${suggestedAlternativeSpecs.size || suggestedAlternativeSpecs.carrier}`}
          </button>
        )}

        {/* Camera Scan Calibration */}
        {interventionStrategy === "CAMERA_VERIFICATION" && (
          <button
            type="button"
            onClick={() => onLaunchCamera(preventionRules?.virtualTestType || "A4_SPATIAL_SCAN")}
            className="w-full bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer border-[0.5px] border-outline-variant"
          >
            <span className="material-symbols-outlined">view_in_ar</span>
            {uiCopy.actionButtonText || "Launch AR Try-on"}
          </button>
        )}

        {/* Default / fallback Scan Button if no warning or not camera-verification */}
        {(!showAlert || interventionStrategy !== "CAMERA_VERIFICATION") && (
          <button
            type="button"
            onClick={() => onLaunchCamera(preventionRules?.virtualTestType || "A4_SPATIAL_SCAN")}
            className="w-full bg-white border border-outline-variant text-ink-black font-bold py-3.5 rounded-xl hover:bg-surface-container-low transition-all flex items-center justify-center gap-2 text-[13px] shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined font-bold text-[18px]">view_in_ar</span>
            Launch AR Try-on
          </button>
        )}

        <button
          type="button"
          onClick={() => onLaunchCamera(preventionRules?.virtualTestType || "A4_SPATIAL_SCAN")}
          className="w-full text-[#008296] font-bold text-[11px] hover:underline flex items-center justify-center gap-2 pt-2 bg-transparent border-none cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">rule</span>
          Interactive Size Guide
        </button>
      </div>
    </div>
  );
}
