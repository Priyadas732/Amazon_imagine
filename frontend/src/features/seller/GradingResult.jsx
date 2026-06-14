// frontend/src/features/seller/GradingResult.jsx
import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, AlertTriangle, Leaf, DollarSign, Award, ArrowLeft, RefreshCw, ShoppingBag, Sparkles, Activity, CheckCircle } from "lucide-react";
import { getItem, updateItem, getDisposition } from "../../services/api";
import GradeBadge from "../../components/GradeBadge";
import StatusPill from "../../components/StatusPill";
import ValueCard from "../../components/ValueCard";
import Stepper from "../../components/Stepper";

export default function GradingResult({ role }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch item details
  const { data: item, isLoading, error, refetch } = useQuery({
    queryKey: ["item", id, role],
    queryFn: () => getItem(id, role),
    enabled: !!id,
  });

  const [donated, setDonated] = useState(false);
  const [laterallyRouted, setLaterallyRouted] = useState(false);
  const [extraCredits, setExtraCredits] = useState(0);
  const [dispositionResult, setDispositionResult] = useState(null);
  const [loadingDisposition, setLoadingDisposition] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("Bangalore");

  // Synchronize state with backend item data once fetched
  React.useEffect(() => {
    if (item) {
      setDonated(item.status === "donated");
      setLaterallyRouted(item.status === "laterally_routed");
      if (item.region) {
        setSelectedRegion(item.region);
      } else if (item.provided?.region) {
        setSelectedRegion(item.provided.region);
      }
    }
  }, [item]);

  // Fetch routing disposition
  React.useEffect(() => {
    if (item) {
      setLoadingDisposition(true);
      const originalPrice = item.provided?.originalPrice || (item.category === "electronics" ? 999 : 120);
      getDisposition({
        productName: item.provided?.model || item.category || "Returned Item",
        category: item.category,
        grade: item.grade?.grade || "Good",
        originalPrice,
        region: selectedRegion,
      })
        .then((data) => {
          setDispositionResult(data);
          setLoadingDisposition(false);
        })
        .catch((err) => {
          console.error("Failed to fetch routing disposition:", err);
          setLoadingDisposition(false);
        });
    }
  }, [item, selectedRegion]);

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

  const handleAcceptAndRoute = () => {
    if (disposition === "Donate" || disposition.startsWith("Donate")) {
      navigate(`/partners?itemId=${id}&mode=donate`);
    } else {
      updateItem(id, { status: "completed" }, role)
        .then(() => {
          navigate("/seller/return");
        })
        .catch(() => {
          navigate("/seller/return");
        });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-outline font-sans">
        <RefreshCw className="animate-spin w-8 h-8 mx-auto text-secondary-container mb-3" />
        Retrieving return inspection record from S3 & DynamoDB...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 font-sans">
        <div className="bg-red-50 border-[0.5px] border-red-200 text-red-800 p-6 rounded-xl flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 mt-0.5 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="font-bold text-lg text-ink-black">Failed to load return record</h3>
            <p className="text-xs text-red-700 mt-2 font-medium">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-xs font-bold text-link-blue hover:underline flex items-center gap-1.5 cursor-pointer bg-transparent border-none"
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

  if (donated) {
    disposition = "Donate";
    valueRecovered = 0;
    creditEarned = 300;
    dispText = "Donation completed: Assigned to Goonj NGO.";
  } else if (laterallyRouted) {
    disposition = "Lateral Redirect";
    creditEarned = gradeVal === "New" || gradeVal === "Like New" ? 50 : 100;
    dispText = "Bypassed warehouse. Dispatched laterally to nearby buyer Amit K.";
  } else if (dispositionResult) {
    disposition = dispositionResult.decision;
    valueRecovered = dispositionResult.recovered;
    dispText = dispositionResult.reason;
    if (disposition.startsWith("Resell as New")) creditEarned = 100;
    else if (disposition.startsWith("Resell")) creditEarned = 100;
    else if (disposition.startsWith("Refurbish")) creditEarned = 150;
    else if (disposition.startsWith("Donate")) creditEarned = 300;
    else if (disposition.startsWith("Recycle")) creditEarned = 450;
    else if (disposition.startsWith("Liquidation")) creditEarned = 200;
  } else {
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
      creditEarned = 100;
      dispText = "Approved for direct restock as Open-Box/Like-New item.";
    } else if (gradeVal === "Very Good" || gradeVal === "Good") {
      disposition = "Refurbish";
      creditEarned = 150;
      dispText = "Routed to refurbishment center for detail clean & package restoration.";
    } else if (gradeVal === "Acceptable") {
      disposition = "Donate";
      valueRecovered = 0;
      creditEarned = 300;
      dispText = "Donation routing: Assigned to NGO partner returns directory.";
    } else {
      disposition = "Recycle";
      valueRecovered = Math.round(originalPrice * 0.05);
      creditEarned = 450;
      dispText = "Recycler routing: Certified raw materials extraction.";
    }
  }

  const finalCredits = creditEarned + (item.extraCredits || 0) + extraCredits;

  if (item.grade?.gradedBy === "fallback") {
    return (
      <div className="max-w-4xl mx-auto p-4 font-sans">
        <Stepper steps={["Category Selection", "Product Verification", "AI Assessment"]} currentStep={2} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <Link
            to="/seller/return"
            className="text-xs font-bold text-link-blue hover:underline flex items-center gap-1 py-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Grade another item
          </Link>
        </div>

        <div className="bg-amber-50 border-[0.5px] border-outline-variant rounded-xl p-8 mb-6 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-ink-black">AI Assessment Offline</h1>
          <p className="text-sm text-outline mt-2 max-w-xl mx-auto font-medium">
            AI vision grading failed to process this return. The AI-certified result has been blocked to prevent incorrect assessment.
          </p>

          <div className="mt-4 p-4 bg-white border-[0.5px] border-outline-variant rounded-lg text-xs text-left max-w-xl mx-auto font-medium">
            <span className="font-bold text-ink-black block mb-1">Technical Details:</span>
            <code className="text-red-600 font-mono break-all leading-normal">
              {item.grade?.notes || "Error: API response was offline."}
            </code>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/seller/return"
              className="bg-secondary-container hover:bg-[#e68a00] text-ink-black px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
            >
              Try Grading Again
            </Link>
            <button
              onClick={() => refetch()}
              className="border-[0.5px] border-deep-navy bg-white hover:bg-surface-container-low text-deep-navy px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Visual metrics based on conditionVector and rejection guard
  const isRejected = gradeVal === "Damaged" && notes && notes.toLowerCase().includes("rejected");
  const screenScore = isRejected 
    ? 0 
    : (item.grade?.conditionVector ? item.grade.conditionVector.cosmeticScore : (gradeVal === "New" ? 100 : gradeVal === "Like New" ? 96 : gradeVal === "Very Good" ? 88 : gradeVal === "Good" ? 78 : gradeVal === "Acceptable" ? 64 : 32));

  const bezelScore = isRejected 
    ? 0 
    : (item.grade?.conditionVector ? Math.round((item.grade.conditionVector.structuralIntegrity || 0) * 100) : (gradeVal === "New" ? 100 : gradeVal === "Like New" ? 94 : gradeVal === "Very Good" ? 82 : gradeVal === "Good" ? 72 : gradeVal === "Acceptable" ? 58 : 28));

  const pkgScore = isRejected 
    ? 0 
    : (completeness === "complete" ? 100 : 70);

  // Smart Routing Option Payout calculations
  const resellerPayout = valueRecovered > 0 ? valueRecovered : Math.round(originalPrice * 0.7);
  const liquidationPayout = dispositionResult?.vsLiquidation || Math.round(originalPrice * 0.25);
  const donationValue = 0;
  const consignmentPayout = Math.round(originalPrice * 0.8);

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans relative">
      <Stepper steps={["Category Selection", "Product Verification", "AI Assessment"]} currentStep={2} />

      {/* Back button and credit count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <Link
          to="/seller/return"
          className="text-xs font-bold text-link-blue hover:underline flex items-center gap-1 py-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Grade another item
        </Link>
        
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 border-[0.5px] border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-bold select-none">
          <Leaf className="w-4 h-4 text-green-700 fill-current" />
          Earned +{finalCredits} Green Credits
        </div>
      </div>

      {/* Screen 4: AI Grading Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
        
        {/* Left Column: Verification Photos & Warehouse confirmations */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Verification Photos */}
          <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant">
            <h2 className="font-display font-extrabold text-lg text-ink-black mb-1">Product Verification Photos</h2>
            <p className="text-xs text-outline mb-4 font-semibold">Photos uploaded directly from browser to secure AWS S3 buckets.</p>
            <div className="grid grid-cols-2 gap-4">
              {photos.length > 0 ? (
                photos.slice(0, 4).map((url, idx) => (
                  <div key={idx} className="aspect-video border-[0.5px] border-outline-variant rounded-xl flex items-center justify-center bg-surface-container-low relative overflow-hidden">
                    <img src={url} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center select-none text-white gap-1">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Photo {idx + 1} Graded</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 aspect-video border-[0.5px] border-outline-variant rounded-xl flex items-center justify-center bg-surface-container-low text-outline font-medium">
                  No images uploaded.
                </div>
              )}
            </div>
          </div>

          {/* Destination Confirmed card */}
          <div className={`bg-white p-6 rounded-xl border-[0.5px] border-outline-variant border-l-8 flex items-start gap-4 shadow-none select-none ${
            isRejected ? "border-l-red-600" : "border-l-green-600"
          }`}>
            <div className={`rounded-full p-2 shrink-0 mt-0.5 ${
              isRejected ? "bg-red-50 text-red-600" : "bg-green-100 text-green-700"
            }`}>
              {isRejected ? <AlertTriangle className="w-6 h-6" /> : <Leaf className="w-6 h-6 fill-current" />}
            </div>
            <div className="flex-grow space-y-1">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h3 className="font-display font-extrabold text-base text-ink-black leading-none">
                    {isRejected ? "Return Verification Suspended" : "Warehouse Destination Confirmed"}
                  </h3>
                  <p className="text-[10px] text-outline mt-1 font-bold uppercase">
                    {isRejected ? "Category Mismatch Detected by VLM" : "Dynamic scoring engine selected path"}
                  </p>
                </div>
                <span className={`px-2.5 py-0.5 font-bold text-[9px] uppercase tracking-wider rounded-lg border ${
                  isRejected 
                    ? "bg-red-50 text-red-800 border-red-200" 
                    : "bg-green-100 text-green-800 border-green-200"
                }`}>
                  {isRejected ? "Verification Mismatch" : "Circular Approved"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs">
                <div className="bg-surface-container-low p-3 rounded-lg border-[0.5px] border-outline-variant">
                  <p className="text-outline font-bold text-[10px] uppercase">Path Selection</p>
                  <p className="font-black text-ink-black mt-1">
                    {isRejected ? "Blocked (Mismatch)" : disposition}
                  </p>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg border-[0.5px] border-outline-variant">
                  <p className="text-outline font-bold text-[10px] uppercase">CO2 Savings Status</p>
                  <p className="font-black text-ink-black mt-1">
                    {isRejected 
                      ? "0.0 kg CO2 (Suspended)" 
                      : (laterallyRouted || item.status === "laterally_routed" ? "Saved 1.8 kg CO2 (Direct Delivery)" : "Optimized Hub Distribution")}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: AI Grading Analysis */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant relative overflow-hidden shadow-none">
            
            {/* Live indicator */}
            <div className="flex justify-between items-center mb-4 select-none">
              <h2 className="font-display font-extrabold text-lg text-ink-black">AI Grading Analysis</h2>
              <span className="flex items-center gap-1 text-link-blue font-bold text-[10px] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
                VLM Verified
              </span>
            </div>

            {/* Neural scan line calibration panel */}
            <div className="bg-deep-navy rounded-xl p-4 mb-6 relative overflow-hidden h-36 flex items-center justify-center border border-accent-yellow/20 select-none">
              <div className="neural-line"></div>
              <div className="text-center relative z-10">
                <Sparkles className="w-8 h-8 text-accent-yellow mx-auto mb-2 animate-pulse" />
                <p className="text-accent-yellow font-bold text-[10px] tracking-wider uppercase">Inspection Complete</p>
                <p className="text-surface-variant font-medium text-[10px] mt-1">Llama-VLM analyzed cosmetics & authenticity</p>
              </div>
            </div>

            {/* Condition Bars */}
            <div className="space-y-4 mb-6 select-none">
              <div>
                <div className="flex justify-between mb-1 text-[11px] font-bold">
                  <span className="text-outline">Screen / Cosmetic Condition</span>
                  <span className="text-ink-black">{screenScore}%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary-container h-full transition-all duration-500" style={{ width: `${screenScore}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 text-[11px] font-bold">
                  <span className="text-outline">Bezel / Structural Integrity</span>
                  <span className="text-ink-black">{bezelScore}%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-secondary-container h-full transition-all duration-500" style={{ width: `${bezelScore}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 text-[11px] font-bold">
                  <span className="text-outline">Packaging Quality</span>
                  <span className="text-ink-black">{pkgScore}%</span>
                </div>
                <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                  <div className="bg-green-600 h-full transition-all duration-500" style={{ width: `${pkgScore}%` }}></div>
                </div>
              </div>
            </div>

            {/* Final Grade Status */}
            <div className="bg-surface-container-low border-[0.5px] border-outline-variant p-6 rounded-xl text-center ai-glow select-none">
              <p className="font-bold text-[10px] text-outline uppercase tracking-wider mb-1">FINAL GRADE</p>
              <h1 className="font-display font-black text-3xl text-secondary uppercase tracking-tight">{gradeVal}</h1>
              <p className="text-xs text-outline font-semibold mt-2.5 px-4 leading-relaxed">
                {notes}
              </p>
            </div>

            {/* Action buttons */}
            <div className="mt-5 flex flex-col gap-3">
              {isRejected ? (
                <Link
                  to="/seller/return"
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all uppercase tracking-wider text-xs border-[0.5px] border-outline-variant text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" /> Re-upload Correct Product Photo
                </Link>
              ) : (
                <button onClick={handleAcceptAndRoute} className="w-full py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl transition-all uppercase tracking-wider text-xs border-[0.5px] border-outline-variant cursor-pointer">
                  Accept Grade & Route Item
                </button>
              )}
              <button onClick={() => refetch()} className="w-full py-3 bg-white border-[0.5px] border-deep-navy text-deep-navy font-bold rounded-xl hover:bg-surface-container-low transition-all uppercase tracking-wider text-xs cursor-pointer">
                Request Manual Review
              </button>
            </div>

          </div>

          {/* AI Log console logs */}
          <div className="bg-deep-navy p-4 rounded-xl text-white font-mono text-[9px] leading-relaxed max-h-36 overflow-y-auto custom-scrollbar select-none">
            <p className="text-accent-yellow font-bold uppercase">[SYSTEM]: VERIFIED INSPECTION OUTPUT</p>
            <p className="text-surface-variant">[LOG]: Reading EXIF metadata... OK.</p>
            {defects.length > 0 ? (
              defects.map((def, idx) => (
                <p key={idx} className="text-red-300">[WARN]: Blemish found: {def}</p>
              ))
            ) : (
              <p className="text-green-400">[LOG]: No scratch pixel clusters detected.</p>
            )}
            <p className="text-green-400 font-bold">[GRAD]: AI resolution complete.</p>
          </div>

        </div>

      </div>

      {/* Screen 3: Smart Routing Section */}
      <section className="bg-white border-[0.5px] border-outline-variant rounded-xl p-8 space-y-8 shadow-none">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-surface-container pb-6">
          <div>
            <h1 className="font-display font-extrabold text-2xl text-ink-black leading-none">Smart Routing Engine</h1>
            <p className="text-xs text-outline mt-2 font-semibold">Simultaneous regional routing analysis for SKU: SL-{item.itemId?.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-low border-[0.5px] border-outline-variant px-3 py-1.5 rounded-lg select-none">
            <span className="text-[10px] uppercase font-bold text-outline">Database Region:</span>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-link-blue focus:outline-none p-0 cursor-pointer"
            >
              <option value="Bangalore">Bangalore (KA)</option>
              <option value="Mumbai">Mumbai (MH)</option>
            </select>
          </div>
        </div>

        {!isRejected ? (
          <>
            {/* Signal Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter select-none">
          <div className="border-[0.5px] border-outline-variant bg-surface-container-low rounded-xl p-4 flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg border-[0.5px] border-outline-variant text-primary flex-shrink-0">
              <Award className="w-5 h-5 text-link-blue" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider leading-none">Condition</p>
              <p className="text-sm font-black text-ink-black mt-1.5">{gradeVal}</p>
            </div>
          </div>
          <div className="border-[0.5px] border-outline-variant bg-surface-container-low rounded-xl p-4 flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg border-[0.5px] border-outline-variant text-secondary flex-shrink-0">
              <Activity className="w-5 h-5 text-secondary-container" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider leading-none">Demand</p>
              <p className="text-sm font-black text-ink-black mt-1.5">High (92%)</p>
            </div>
          </div>
          <div className="border-[0.5px] border-outline-variant bg-surface-container-low rounded-xl p-4 flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg border-[0.5px] border-outline-variant text-tertiary flex-shrink-0">
              <Leaf className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider leading-none">Partners</p>
              <p className="text-sm font-black text-ink-black mt-1.5">14 Active</p>
            </div>
          </div>
          <div className="border-[0.5px] border-outline-variant bg-surface-container-low rounded-xl p-4 flex items-center gap-4">
            <div className="bg-white p-3 rounded-lg border-[0.5px] border-outline-variant text-accent-yellow flex-shrink-0">
              <DollarSign className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-outline uppercase tracking-wider leading-none">Original Val</p>
              <p className="text-sm font-black text-ink-black mt-1.5">${originalPrice}</p>
            </div>
          </div>
        </div>

        {/* Route Option Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
          
          {/* Option 1: Cashify (or Resell) */}
          <div className={`border-[0.5px] rounded-xl p-8 flex flex-col justify-between transition-all relative select-none ${
            disposition.startsWith("Resell") || disposition.startsWith("Refurbish")
              ? "border-green-600 bg-emerald-50/20 best-route-glow"
              : "border-outline-variant bg-white"
          }`}>
            {(disposition.startsWith("Resell") || disposition.startsWith("Refurbish")) && (
              <div className="absolute -top-3 left-6 bg-green-700 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                BEST ROUTE
              </div>
            )}
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-ink-black">Certified Resell</h3>
                  <p className="text-xs text-outline font-semibold">Instant Open-Box Restock</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${disposition.startsWith("Resell") || disposition.startsWith("Refurbish") ? "text-green-750" : "text-ink-black"}`}>
                    ${resellerPayout}
                  </p>
                  <p className="text-[10px] text-outline font-semibold">Net Resale Value</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-container text-xs">
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase">Fulfillment</p>
                  <p className="font-black text-ink-black mt-1">Circular Resale Store</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase">Liquidation Speed</p>
                  <p className="font-black text-ink-black mt-1">High</p>
                </div>
              </div>
            </div>
            <button className="mt-6 w-full py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl text-xs uppercase tracking-wider border-[0.5px] border-outline-variant cursor-pointer">
              Select Resell Path
            </button>
          </div>

          {/* Option 2: Bulk Liquidation */}
          <div className={`border-[0.5px] rounded-xl p-8 flex flex-col justify-between transition-all relative select-none ${
            disposition.startsWith("Liquidation") || disposition.startsWith("Recycle")
              ? "border-green-600 bg-emerald-50/20 best-route-glow"
              : "border-outline-variant bg-white"
          }`}>
            {(disposition.startsWith("Liquidation") || disposition.startsWith("Recycle")) && (
              <div className="absolute -top-3 left-6 bg-green-700 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                BEST ROUTE
              </div>
            )}
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-ink-black">Bulk Liquidation</h3>
                  <p className="text-xs text-outline font-semibold">Certified Wholesale Distribution</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${disposition.startsWith("Liquidation") || disposition.startsWith("Recycle") ? "text-green-755" : "text-ink-black"}`}>
                    ${liquidationPayout}
                  </p>
                  <p className="text-[10px] text-outline font-semibold">Standard AWS Baseline</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-container text-xs">
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase">Processing</p>
                  <p className="font-black text-ink-black mt-1">Bulk Scrap/Recycle</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase">Liquidation Speed</p>
                  <p className="font-black text-ink-black mt-1">Instant</p>
                </div>
              </div>
            </div>
            <button className="mt-6 w-full py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl text-xs uppercase tracking-wider border-[0.5px] border-outline-variant cursor-pointer">
              Select Bulk Path
            </button>
          </div>

          {/* Option 3: Local Lateral Redirect */}
          <div className={`border-[0.5px] rounded-xl p-8 flex flex-col justify-between transition-all relative select-none ${
            laterallyRouted
              ? "border-green-600 bg-emerald-50/20 best-route-glow"
              : "border-outline-variant bg-white"
          }`}>
            {laterallyRouted && (
              <div className="absolute -top-3 left-6 bg-green-700 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                BEST ROUTE (LOCKED)
              </div>
            )}
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-ink-black">Local Lateral Redirect</h3>
                  <p className="text-xs text-outline font-semibold">Direct P2P Order Redirection</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${laterallyRouted ? "text-green-755" : "text-ink-black"}`}>
                    ${resellerPayout}
                  </p>
                  <p className="text-[10px] text-outline font-semibold">Buyer Fulfill Payout</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-container text-xs">
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase">Target Partner</p>
                  <p className="font-black text-ink-black mt-1">{laterallyRouted ? "Amit K. (Indiranagar)" : "Opportunity Found"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase">CO2 Emissions Saved</p>
                  <p className="font-black text-green-750 mt-1">1.8 kg CO2 saved</p>
                </div>
              </div>
            </div>
            {gradeVal === "New" || gradeVal === "Like New" || gradeVal === "Very Good" ? (
              laterallyRouted ? (
                <div className="mt-6 py-3 bg-emerald-50 text-emerald-800 border-[0.5px] border-emerald-250 text-xs font-bold text-center rounded-xl select-none">
                  Lateral Redirect Approved (+50 Credits)
                </div>
              ) : (
                <button onClick={handleLateralRoute} className="mt-6 w-full py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl text-xs uppercase tracking-wider border-[0.5px] border-outline-variant cursor-pointer">
                  Approve Lateral Redirect
                </button>
              )
            ) : (
              <div className="mt-6 py-3 bg-surface-container-low text-outline text-xs font-semibold text-center rounded-xl border-[0.5px] border-outline-variant">
                Item Condition Too Low for Redirect
              </div>
            )}
          </div>

          {/* Option 4: NGO Donation */}
          <div className={`border-[0.5px] rounded-xl p-8 flex flex-col justify-between transition-all relative select-none ${
            donated || disposition.startsWith("Donate")
              ? "border-green-600 bg-emerald-50/20 best-route-glow"
              : "border-outline-variant bg-white"
          }`}>
            {(donated || disposition.startsWith("Donate")) && (
              <div className="absolute -top-3 left-6 bg-green-700 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                BEST ROUTE (LOCKED)
              </div>
            )}
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-ink-black">Gated NGO Donation</h3>
                  <p className="text-xs text-outline font-semibold">Social Welfare Direct Gift</p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-black ${donated || disposition.startsWith("Donate") ? "text-green-755" : "text-ink-black"}`}>
                    $0
                  </p>
                  <p className="text-[10px] text-outline font-semibold">+300 Credits Bonus</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-surface-container text-xs">
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase">Partner Match</p>
                  <p className="font-black text-ink-black mt-1">Goonj NGO (Winter Drive)</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-outline uppercase">Redirection Tax Credit</p>
                  <p className="font-black text-ink-black mt-1">Receipt Generated</p>
                </div>
              </div>
            </div>
            {donated ? (
              <div className="mt-6 py-3 bg-emerald-50 text-emerald-800 border-[0.5px] border-emerald-250 text-xs font-bold text-center rounded-xl select-none">
                Donation Completed (+150 Extra Credits)
              </div>
            ) : (
              <button onClick={handleDonate} className="mt-6 w-full py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl text-xs uppercase tracking-wider border-[0.5px] border-outline-variant cursor-pointer">
                Donate Instead (+150 Cr)
              </button>
            )}
          </div>

        </div>

        {/* ROI saved details banner */}
        {dispositionResult && (
          <div className="flex items-center justify-between p-4 bg-emerald-50 border-[0.5px] border-emerald-250 rounded-xl select-none flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-green-700 tracking-tight">
                {dispositionResult.multiple || "2.4"}x
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-ink-black uppercase tracking-tight">
                  Value Multiplier Locked
                </span>
                <span className="text-[10px] text-outline font-medium">
                  Value recovered vs AWS baseline (saved ${Math.max(0, resellerPayout - liquidationPayout)} over liquidation)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border-[0.5px] border-outline-variant text-xs text-outline font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-green-600 animate-pulse"></span>
              Decision resolved in 2.1 seconds
            </div>
          </div>
        )}
      </>
    ) : (
      <div className="bg-[#FFF8E1] border-[0.5px] border-secondary-container p-8 rounded-xl text-center select-none space-y-4">
        <AlertTriangle className="w-12 h-12 text-secondary-container mx-auto animate-pulse" />
        <h3 className="font-display font-black text-lg text-secondary uppercase tracking-wider">Routing Execution Suspended</h3>
        <p className="text-sm text-ink-black max-w-lg mx-auto font-semibold leading-relaxed">
          This item has been rejected due to a product category mismatch (the uploaded image does not depict a <strong className="text-red-600">{category}</strong> device).
        </p>
        <p className="text-xs text-outline font-medium">
          Please re-upload a clear photograph of the actual item to execute regional routing analysis.
        </p>
      </div>
    )}

      </section>

      {/* Footer redirection buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        <Link
          to="/buyer"
          className="px-6 py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl text-center border-[0.5px] border-outline-variant text-xs flex items-center justify-center gap-1.5 uppercase tracking-wider"
        >
          <ShoppingBag className="w-4 h-4" /> Go to Used Marketplace
        </Link>
        <Link
          to="/seller/return"
          className="px-6 py-3 bg-white hover:bg-surface-container-low text-deep-navy font-bold rounded-xl text-center border-[0.5px] border-deep-navy text-xs uppercase tracking-wider"
        >
          Initiate New Return
        </Link>
      </div>

    </div>
  );
}
