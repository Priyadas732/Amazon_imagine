// frontend/src/features/seller/GradingResult.jsx
import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, AlertTriangle, Leaf, DollarSign, Award, ArrowLeft, RefreshCw, ShoppingBag, Sparkles } from "lucide-react";
import { getItem, updateItem } from "../../services/api";
import GradeBadge from "../../components/GradeBadge";
import StatusPill from "../../components/StatusPill";
import ValueCard from "../../components/ValueCard";
import Stepper from "../../components/Stepper";

export default function GradingResult({ role }) {
  const { id } = useParams();

  // Fetch item details
  const { data: item, isLoading, error, refetch } = useQuery({
    queryKey: ["item", id, role],
    queryFn: () => getItem(id, role),
    enabled: !!id,
  });

  const [donated, setDonated] = useState(false);
  const [laterallyRouted, setLaterallyRouted] = useState(false);
  const [extraCredits, setExtraCredits] = useState(0);

  // Synchronize state with backend item data once fetched
  React.useEffect(() => {
    if (item) {
      setDonated(item.status === "donated");
      setLaterallyRouted(item.status === "laterally_routed");
    }
  }, [item]);

  const handleDonate = async () => {
    try {
      await updateItem(id, {
        status: "donated",
        disposition: "Donate",
        extraCredits: 150,
      }, role);
      setDonated(true);
      setExtraCredits(150);
      refetch();
    } catch (err) {
      alert(`Donation failed: ${err.message}`);
    }
  };

  const handleLateralRoute = async () => {
    try {
      await updateItem(id, {
        status: "laterally_routed",
        disposition: "Resell (Lateral)",
        extraCredits: 50,
        co2Saved: 1.8,
        dispositionMatch: {
          partner: "Amit K. (Indiranagar)",
          target: "Local lateral order redirection",
          action: "dispatched via local electric courier",
          creditsBonus: 50
        }
      }, role);
      setLaterallyRouted(true);
      setExtraCredits(50);
      refetch();
    } catch (err) {
      alert(`Lateral routing failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-gray-500 font-sans">
        <RefreshCw className="animate-spin w-8 h-8 mx-auto text-amazon-teal mb-3" />
        Retrieving return inspection record from Amazon DynamoDB...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 font-sans">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-md flex items-start gap-2.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold">Failed to load return record</h3>
            <p className="text-xs text-rose-700 mt-1">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-xs font-bold text-amazon-teal hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  // Extract evaluations
  const model = item.provided?.model || item.category || "Returned Product";
  const category = item.category || "General";
  const photos = item.photos || [];
  const gradeVal = item.grade?.grade || "Good";
  const confidence = Math.round((item.grade?.confidence || 0.95) * 100);
  const completeness = item.grade?.completeness || "complete";
  const defects = item.grade?.defects || [];
  const notes = item.grade?.notes || "Inspection completed successfully.";
  const authenticityConcern = item.grade?.authenticityConcern || false;

  // Compute disposition & recovered values
  const originalPrice = item.provided?.originalPrice || (category === "electronics" ? 999 : 120);
  let valueRecovered = Math.round(originalPrice * (gradeVal === "New" ? 0.9 : gradeVal === "Like New" ? 0.8 : gradeVal === "Very Good" ? 0.7 : 0.5));
  
  // Decide routing
  let disposition = "Resell";
  let creditEarned = 100;
  let dispText = "Restocked in used warehouse for resell.";

  if (donated || item.status === "donated") {
    disposition = "Donate";
    valueRecovered = 0;
    creditEarned = 300;
    dispText = "Donation completed: Assigned to Goonj NGO.";
  } else if (laterallyRouted || item.status === "laterally_routed") {
    disposition = "Lateral Redirect";
    creditEarned = gradeVal === "New" || gradeVal === "Like New" ? 50 : 100;
    dispText = "Bypassed warehouse. Dispatched laterally to nearby buyer Amit K.";
  } else if (gradeVal === "New" || gradeVal === "Like New") {
    disposition = "Resell";
    creditEarned = 50;
    dispText = "Approved for direct restock as Open-Box/Like-New item.";
  } else if (gradeVal === "Very Good" || gradeVal === "Good") {
    disposition = "Refurbish";
    creditEarned = 150;
    dispText = "Routed to refurbishment center for detail clean & package restoration.";
  } else if (gradeVal === "Acceptable") {
    disposition = "Donate";
    valueRecovered = 0; // donating doesn't recover monetary sales, but gives high credits
    creditEarned = 300;
    dispText = "Donation routing: Assigned to NGO partner returns directory.";
  } else {
    disposition = "Recycle";
    valueRecovered = Math.round(originalPrice * 0.05); // scrap scrap value
    creditEarned = 450;
    dispText = "Recycler routing: Certified raw materials extraction.";
  }

  const finalCredits = creditEarned + (item.extraCredits || 0) + extraCredits;

  if (item.grade?.gradedBy === "fallback") {
    return (
      <div className="max-w-4xl mx-auto p-4 font-sans">
        <Stepper steps={["Category Selection", "Product Verification", "AI Assessment"]} currentStep={2} />

        {/* Title Header bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <Link
            to="/seller/return"
            className="text-xs font-bold text-amazon-teal hover:underline flex items-center gap-1 py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Grade another item
          </Link>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-md p-6 mb-6 text-center shadow-xs">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-amber-900">AI Assessment Temporarily Unavailable</h1>
          <p className="text-sm text-amber-800 mt-2 max-w-xl mx-auto">
            Gemini vision grading failed to process this return. The AI-certified result has been blocked to prevent incorrect assessment.
          </p>

          <div className="mt-4 p-3 bg-white border border-amber-200 rounded-md text-xs text-left max-w-xl mx-auto">
            <span className="font-bold text-gray-700 block mb-1">Technical Details:</span>
            <code className="text-rose-600 font-mono break-all leading-normal">
              {item.grade?.notes || "Error: API response was offline."}
            </code>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/seller/return"
              className="bg-amazon-orange hover:bg-amazon-orange-hover text-white px-4 py-2 rounded-md text-xs font-bold transition-all shadow-xs"
            >
              Try Grading Again
            </Link>
            <button
              onClick={() => refetch()}
              className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>

        {/* Let them view uploaded photos for manual verification */}
        {photos.length > 0 && (
          <div className="bg-white border border-[#D5D9D9] rounded-md p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
              Uploaded Returns Documentation (For Manual Inspection)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {photos.map((url, idx) => (
                <div key={idx} className="border border-gray-200 rounded-md p-2 bg-gray-50 flex items-center justify-center">
                  <img src={url} alt={`Documentation ${idx + 1}`} className="max-h-28 object-contain rounded-xs" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      <Stepper steps={["Category Selection", "Product Verification", "AI Assessment"]} currentStep={2} />

      {/* Title Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Link
          to="/seller/return"
          className="text-xs font-bold text-amazon-teal hover:underline flex items-center gap-1 py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Grade another item
        </Link>
        
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full text-xs font-bold">
          <Leaf className="w-4 h-4 text-amazon-green fill-current" />
          Earned +{finalCredits} Green Credits
        </div>
      </div>

      {/* Main Results card */}
      <div className="bg-white border border-[#D5D9D9] rounded-md shadow-xs p-6 mb-6">
        
        {/* Core evaluation summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-gray-100 pb-5 mb-5">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{model}</h1>
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
              <span>Category: {category}</span>
              <span className="text-gray-300">|</span>
              <span>ID: {item.itemId}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-1 bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-center flex-shrink-0 min-w-36">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Evaluation Grade</span>
            <div className="mt-1">
              <GradeBadge grade={gradeVal} size="md" />
            </div>
          </div>
        </div>

        {/* Authenticity concern warn card */}
        {authenticityConcern && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amazon-red flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">Authenticity or Visual Mismatch Detected</h4>
              <p className="text-xs text-rose-800 mt-1">
                Gemini flagged a mismatch between the provided model specification and the product photos:
                <br />
                <span className="font-semibold">{notes}</span>
              </p>
            </div>
          </div>
        )}

        {/* AI verification details */}
        <div className="flex items-center gap-1.5 text-amazon-teal font-extrabold text-sm mb-5">
          <ShieldCheck className="w-5 h-5 fill-cyan-50 text-cyan-600" />
          <span>Amazon Certified Returns Assessment</span>
        </div>

        {/* Disposition metrics summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <ValueCard
            label="Disposition Routing"
            value={disposition}
            subtitle={dispText}
          />
          <ValueCard
            label="Value Recovered"
            value={valueRecovered > 0 ? `$${valueRecovered}` : "N/A"}
            type="currency"
            subtitle={valueRecovered > 0 ? `Estimated resale value (original $${originalPrice})` : "Routed for social impact"}
          />
          <ValueCard
            label="AI Grading Confidence"
            value={`${confidence}%`}
            type="green"
            subtitle="Verified via Gemini Vision reasoning checks"
          />
        </div>

        {/* AI Circular Routing & Sustainability Dashboard */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6">
          <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-gray-200 pb-2">
            <Leaf className="w-5 h-5 text-amazon-green fill-current" />
            AI Circular Routing & Sustainability
          </h3>

          <div className="space-y-4">
            
            {/* Idea 1: Refurbisher / NGO Demand Matching */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amazon-teal animate-pulse" />
                NGO / Refurbisher Demand Matching
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Incoming return conditions are automatically matched against active want-lists from circular partners.
              </p>
              
              {gradeVal === "Acceptable" || gradeVal === "Damaged" || donated || item.status === "donated" ? (
                <div className="mt-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-md font-semibold inline-flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Matched active request: <strong>{gradeVal === "Damaged" ? "Cashify (Spare Parts harvesting)" : "Goonj NGO (Winter Drive)"}</strong>. Item routed automatically.
                </div>
              ) : (
                <div className="mt-2 text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-md inline-flex items-center gap-1.5">
                  No matching refurbish/donation want-lists. Routed for standard open-box resale.
                </div>
              )}
            </div>

            {/* Idea 2: User Gated Donation */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-tight">
                User Gated Donation (Consent Verification)
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                To protect user ownership, Amazon-owned items are automatically routed for donation, while user-owned items require explicit consent.
              </p>
              
              {donated || item.status === "donated" ? (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-md text-xs font-semibold flex items-center justify-between">
                  <div>
                    <span>✅ User-initiated donation verified. +150 credits added.</span>
                    <span className="block text-[10px] text-emerald-600 mt-0.5">Tax exemption receipt generated by Goonj NGO.</span>
                  </div>
                  <span className="bg-emerald-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">Donated</span>
                </div>
              ) : (
                <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-cyan-50/50 border border-cyan-100 rounded-md">
                  <span className="text-xs text-cyan-900 font-medium">
                    Donate this item to Goonj NGO instead of selling?
                  </span>
                  <button
                    onClick={handleDonate}
                    className="px-3 py-1.5 bg-amazon-teal hover:bg-cyan-700 text-white font-bold text-xs rounded-full cursor-pointer shadow-xs transition-all flex-shrink-0"
                  >
                    Donate (+150 Cr)
                  </button>
                </div>
              )}
            </div>

            {/* Idea 3: Local Lateral Redirect */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-tight">
                Local Lateral Routing (CO2 Reduction)
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Redirects high-quality returns directly to fulfill nearby buyer orders, bypassing warehouses to cut transport emissions.
              </p>

              {gradeVal === "New" || gradeVal === "Like New" || gradeVal === "Very Good" ? (
                laterallyRouted || item.status === "laterally_routed" ? (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 text-emerald-955 p-3.5 rounded-md text-xs font-semibold space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>Lateral dispatch locked! Fulfilling Amit K. (Indiranagar, 4.2 km away).</span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-medium">
                      Status: Dispatched via local courier. <strong>Saved 1.8 kg of CO2</strong> compared to standard warehouse shipping.
                    </p>
                    <span className="inline-block text-[9px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full uppercase mt-1">
                      +50 Bonus Credits Awarded
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 bg-amber-50 border border-amber-200 p-3.5 rounded-md text-xs space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-amber-900 block">✨ Local Redirect Opportunity Found!</span>
                        <p className="text-amber-850 text-[11px] mt-0.5">
                          Buyer <strong>Amit K.</strong> (Indiranagar, 4.2 km away) has a pending order for a certified open-box smartwatch.
                        </p>
                      </div>
                      <span className="bg-amber-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        4.2 km away
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-amber-200 pt-2.5 mt-1">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight">
                        Estimated CO2 Saved: 1.8 kg
                      </span>
                      <button
                        onClick={handleLateralRoute}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-full cursor-pointer shadow-xs transition-all"
                      >
                        Approve Lateral Route (+50 Cr)
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="mt-2 text-xs bg-gray-50 text-gray-600 border border-gray-200 px-3 py-1.5 rounded-md">
                  Item condition is too low for direct lateral order redirection. Routed to refurbish/recycle.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Defects Details */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
            Identified Damage / Wear
          </h3>
          {defects.length > 0 ? (
            <div className="space-y-1.5">
              {defects.map((defect, idx) => (
                <div key={idx} className="p-3 border-l-3 border-amazon-red bg-rose-50/20 text-xs text-gray-700 rounded-r-md">
                  {defect}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 border-l-3 border-amazon-green bg-emerald-50/20 text-xs text-gray-700 rounded-r-md">
              No physical cosmetic defects identified. Ready for directUsed restock.
            </div>
          )}
        </div>

        {/* Grading notes */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
            Condition Summary
          </h3>
          <p className="p-4 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 leading-relaxed font-medium">
            {notes}
          </p>
        </div>

        {/* Photos list */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
            Condition Photo Registry (S3)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {photos.map((url, idx) => (
              <div key={idx} className="border border-gray-200 rounded-md overflow-hidden h-32 bg-gray-50 flex items-center justify-center p-2">
                <img
                  src={url}
                  alt={`Graded Return ${idx + 1}`}
                  className="max-h-full max-w-full object-contain rounded"
                  onError={(e) => {
                    // Fallback to placeholder if S3 link is not public or load fails
                    e.target.src = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300";
                  }}
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Button redirects */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/buyer"
          className="px-6 py-2 bg-amazon-yellow hover:bg-amazon-yellowHover text-gray-900 font-bold rounded-full text-center shadow-sm border border-yellow-400 hover:border-yellow-500 text-xs flex items-center justify-center gap-1.5"
        >
          <ShoppingBag className="w-4 h-4" /> Go to Used Marketplace
        </Link>
        <Link
          to="/seller/return"
          className="px-6 py-2 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-full text-center shadow-sm border border-gray-300 text-xs"
        >
          Initiate New Return
        </Link>
      </div>
    </div>
  );
}
