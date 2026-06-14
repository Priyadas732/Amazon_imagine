// frontend/src/components/ValueCard.jsx
import React from "react";
import { Leaf, Award, DollarSign } from "lucide-react";

export default function ValueCard({ label, value, type = "default", subtitle = "" }) {
  const getStyle = () => {
    switch (type) {
      case "green":
        return {
          bg: "bg-emerald-50/50 border-emerald-250",
          icon: <Leaf className="w-5 h-5 text-green-700 fill-current" />,
          color: "text-green-700"
        };
      case "currency":
        return {
          bg: "bg-red-50/50 border-red-250",
          icon: <DollarSign className="w-5 h-5 text-red-700" />,
          color: "text-red-700"
        };
      default:
        return {
          bg: "bg-blue-50/50 border-blue-250",
          icon: <Award className="w-5 h-5 text-link-blue" />,
          color: "text-link-blue"
        };
    }
  };

  const style = getStyle();

  return (
    <div className={`p-4 border-[0.5px] rounded-xl flex items-start gap-3 w-full ${style.bg} shadow-none`}>
      <div className="p-2 bg-white rounded-lg border-[0.5px] border-outline-variant flex-shrink-0">
        {style.icon}
      </div>
      <div>
        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">
          {label}
        </span>
        <span className={`text-base font-black tracking-tight block mt-0.5 ${style.color}`}>
          {value}
        </span>
        {subtitle && (
          <span className="text-[10px] font-medium text-outline mt-1 block leading-tight">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
