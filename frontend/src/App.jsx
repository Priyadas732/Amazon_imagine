// frontend/src/App.jsx
import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import TopBar from "./components/TopBar";
import SellerReturnFlow from "./features/seller/SellerReturnFlow";
import GradingResult from "./features/seller/GradingResult";
import BuyerMarketplace from "./features/buyer/BuyerMarketplace";
import ItemDetail from "./features/buyer/ItemDetail";
import GreenCredits from "./features/credits/GreenCredits";
import Partners from "./features/seller/Partners";
import AmazonEntryPage from "./features/seller/AmazonEntryPage";
import SignInPage from "./features/seller/SignInPage";
import CustomerDashboard from "./features/seller/CustomerDashboard";
import DonationForm from "./features/seller/DonationForm";

export default function App() {
  const location = useLocation();
  
  // Global role state (shared across top navigation and page routes)
  const [role, setRole] = useState(() => {
    return localStorage.getItem("current_session_role") || "seller";
  });

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    localStorage.setItem("current_session_role", newRole);
  };

  const showGlobalHeader = location.pathname !== "/" && location.pathname !== "/signin";

  return (
    <div className="min-h-screen bg-amazon-bg flex flex-col font-sans">
      {/* Top Header Navigation */}
      {showGlobalHeader && <TopBar currentRole={role} onRoleChange={handleRoleChange} />}

      {/* Pages Container */}
      <div className={`flex-grow ${showGlobalHeader ? "py-6" : ""}`}>
        <Routes>
          {/* Amazon Replica Landing & Credentials */}
          <Route path="/" element={<AmazonEntryPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/donate" element={<DonationForm />} />

          {/* Main returns wizard */}
          <Route path="/seller/return" element={<SellerReturnFlow role={role} />} />
          
          {/* Grading results */}
          <Route path="/seller/result/:id" element={<GradingResult role={role} />} />
          
          {/* Buyer marketplace */}
          <Route path="/buyer" element={<BuyerMarketplace role={role} />} />
          
          {/* Product Detail checkout */}
          <Route path="/buyer/item/:id" element={<ItemDetail role={role} />} />
          
          {/* Green credits ledgers */}
          <Route path="/credits" element={<GreenCredits />} />
          
          {/* Ecosystem Partners directory */}
          <Route path="/partners" element={<Partners role={role} />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Subtle footer */}
      <footer className="py-8 bg-amazon-navy text-xs text-gray-400 text-center border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-4 space-y-1">
          <p>© 1996-2026, Amazon.com, Inc. or its affiliates. All rights reserved.</p>
          <p className="text-gray-500">SecondLife Circular Commerce Returns grading platform verified by Google Gemini AI vision.</p>
        </div>
      </footer>
    </div>
  );
}
