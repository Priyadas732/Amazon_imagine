// frontend/src/components/ItemCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, MapPin } from "lucide-react";
import GradeBadge from "./GradeBadge";

export default function ItemCard({ item }) {
  // Extract item details
  const itemId = item.itemId;
  const model = item.provided?.model || item.category || "Refurbished Product";
  const photo = item.photos?.[0] || "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg";
  const grade = item.grade?.grade || "Good";
  
  // Fake locations and pricing for marketplace variety
  const distance = item.provided?.distance || Math.floor(Math.random() * 8) + 1;
  const originalPrice = Number(item.provided?.originalPrice) || 599;
  const price = Number(item.provided?.price) || Math.round(originalPrice * (grade === "New" ? 0.9 : grade === "Like New" ? 0.8 : grade === "Very Good" ? 0.7 : 0.55));
  const savings = Math.round(((originalPrice - price) / originalPrice) * 100);

  return (
    <div className="bg-white border-[0.5px] border-outline-variant rounded-xl overflow-hidden hover:border-deep-navy transition-colors flex flex-col h-full font-sans shadow-none">
      {/* Product Image */}
      <div className="relative bg-surface-container-low h-48 flex items-center justify-center p-4 border-b border-surface-container flex-shrink-0">
        <img
          src={photo}
          alt={model}
          className="max-h-full max-w-full object-contain mix-blend-multiply"
          onError={(e) => {
            e.target.src = "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg";
          }}
        />
        {/* Distance Pin */}
        <div className="absolute top-3 left-3 bg-emerald-50 text-emerald-800 border-[0.5px] border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
          <MapPin className="w-3 h-3 text-emerald-600 fill-current" />
          {distance} km away
        </div>
      </div>

      {/* Product Body */}
      <div className="p-5 flex-grow flex flex-col">
        {/* Title */}
        <h3 className="text-sm font-bold text-ink-black line-clamp-2 hover:text-link-blue mb-1 leading-snug">
          <Link to={`/buyer/item/${itemId}`}>{model}</Link>
        </h3>

        {/* Certified Badge */}
        <div className="flex items-center gap-1 text-[10px] font-bold text-link-blue mb-3 uppercase tracking-tight">
          <ShieldCheck className="w-4 h-4 fill-cyan-50 text-cyan-600" />
          <span>
            {item.grade?.gradedBy === "fallback" 
              ? "Certified · Standard Return" 
              : "Certified · AI-Verified"}
          </span>
        </div>

        {/* Grade */}
        <div className="mb-4">
          <GradeBadge grade={grade} size="sm" />
        </div>

        {/* Pricing */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg font-black text-amazon-red">${price}</span>
            <span className="text-xs text-outline line-through">${originalPrice}</span>
            <span className="text-xs font-bold text-green-700">({savings}% off)</span>
          </div>
          <div className="text-[10px] text-outline mt-1 font-medium">
            Eligible for FREE Shipping
          </div>
        </div>
      </div>

      {/* Button footer */}
      <div className="px-5 pb-5 flex-shrink-0">
        <Link
          to={`/buyer/item/${itemId}`}
          className="w-full text-center block bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold text-xs py-2 px-4 rounded-xl border-[0.5px] border-outline-variant transition-colors uppercase tracking-wider"
        >
          See Details
        </Link>
      </div>
    </div>
  );
}
