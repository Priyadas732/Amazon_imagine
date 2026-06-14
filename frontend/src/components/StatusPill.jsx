// frontend/src/components/StatusPill.jsx
import React from "react";

export default function StatusPill({ status }) {
  const getStyles = () => {
    const s = String(status || "").toLowerCase();
    if (s === "graded" || s === "resell" || s === "restock") {
      return "bg-emerald-50 text-green-800 border-green-300";
    }
    if (s === "refurbish" || s === "refurbished") {
      return "bg-blue-50 text-blue-800 border-blue-300";
    }
    if (s === "donate" || s === "donated" || s === "ngo") {
      return "bg-purple-50 text-purple-800 border-purple-300";
    }
    if (s === "recycle" || s === "recycled" || s === "scrap") {
      return "bg-surface-container-low text-outline border-outline-variant";
    }
    return "bg-amber-50 text-amber-800 border-amber-300";
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border-[0.5px] rounded-lg uppercase tracking-wider ${getStyles()}`}>
      {status}
    </span>
  );
}
