// frontend/src/components/GradeBadge.jsx
import React from "react";

/**
 * Component to display color-coded AI condition grade badge.
 * @param {object} props
 * @param {string} props.grade - The grade value (e.g. New, Like New, Very Good, Good, Acceptable, Damaged)
 * @param {string} props.size - 'sm', 'md', 'lg'
 */
export default function GradeBadge({ grade, size = "md" }) {
  const getStyles = () => {
    const g = String(grade || "").trim();
    if (g === "New" || g === "Like New") {
      return {
        bg: "bg-emerald-50 text-emerald-800 border-emerald-300",
        label: "New / Mint",
      };
    }
    if (g === "Very Good") {
      return {
        bg: "bg-blue-50 text-blue-800 border-blue-300",
        label: "Very Good",
      };
    }
    if (g === "Good" || g === "Acceptable") {
      return {
        bg: "bg-amber-50 text-amber-800 border-amber-300",
        label: "Good / Used",
      };
    }
    return {
      bg: "bg-red-50 text-red-800 border-red-300",
      label: "Damaged / Scrap",
    };
  };

  const styles = getStyles();
  
  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] font-bold border-[0.5px] rounded-lg tracking-tight",
    md: "px-3.5 py-1 text-xs font-bold border-[0.5px] rounded-lg tracking-normal",
    lg: "px-5 py-2 text-sm font-black border-[0.5px] rounded-xl tracking-wider uppercase",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 font-sans uppercase ${sizeClasses[size]} ${styles.bg}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {styles.label} ({grade})
    </span>
  );
}
