// frontend/src/components/ItemCard.jsx
import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, MapPin } from "lucide-react";
import GradeBadge from "./GradeBadge";

export default function ItemCard({ item }) {
  // Extract item details
  const itemId = item.itemId;
  const model = item.provided?.model || item.category || "Refurbished Product";
  const photo = item.photos?.[0] || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300";
  const grade = item.grade?.grade || "Good";
  
  // Fake locations and pricing for marketplace variety
  const distance = item.provided?.distance || Math.floor(Math.random() * 8) + 1;
  const originalPrice = Number(item.provided?.originalPrice) || 599;
  const price = Number(item.provided?.price) || Math.round(originalPrice * (grade === "New" ? 0.9 : grade === "Like New" ? 0.8 : grade === "Very Good" ? 0.7 : 0.55));
  const savings = Math.round(((originalPrice - price) / originalPrice) * 100);

  return (
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full font-sans">
      {/* Product Image */}
      <div className="relative bg-gray-50 h-48 flex items-center justify-center p-4 border-b border-gray-100 flex-shrink-0">
        <img
          src={photo}
          alt={model}
          className="max-h-full max-w-full object-contain mix-blend-multiply"
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300";
          }}
        />
        {/* Distance Pin */}
        <div className="absolute top-2 left-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1">
          <MapPin className="w-3 h-3 text-emerald-600 fill-current" />
          {distance} km away
        </div>
      </div>

      {/* Product Body */}
      <div className="p-4 flex-grow flex flex-col">
        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-amazon-teal mb-1">
          <Link to={`/buyer/item/${itemId}`}>{model}</Link>
        </h3>

        {/* Certified Badge */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-amazon-teal mb-3">
          <ShieldCheck className="w-4 h-4 fill-cyan-50 text-cyan-600" />
          <span>
            {item.grade?.gradedBy === "fallback" 
              ? "Amazon Certified · Standard Return" 
              : "Amazon Certified · AI-Verified"}
          </span>
        </div>

        {/* Grade */}
        <div className="mb-3">
          <GradeBadge grade={grade} size="sm" />
        </div>

        {/* Pricing */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-lg font-bold text-amazon-red">${price}</span>
            <span className="text-xs text-gray-500 line-through">${originalPrice}</span>
            <span className="text-xs font-bold text-amazon-green">({savings}% off)</span>
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Eligible for FREE Shipping
          </div>
        </div>
      </div>

      {/* Button footer */}
      <div className="px-4 pb-4 flex-shrink-0">
        <Link
          to={`/buyer/item/${itemId}`}
          className="w-full text-center block bg-amazon-yellow hover:bg-amazon-yellowHover text-gray-900 font-semibold text-xs py-1.5 px-3 rounded-full shadow-xs border border-yellow-400 hover:border-yellow-500"
        >
          See Details
        </Link>
      </div>
    </div>
  );
}
