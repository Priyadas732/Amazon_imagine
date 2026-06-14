// frontend/src/features/buyer/ItemDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Leaf, ArrowLeft, RefreshCw, AlertTriangle, CheckSquare, Square, Truck, CreditCard, Sparkles, TrendingDown, Check } from "lucide-react";
import { getItem } from "../../services/api";
import GradeBadge from "../../components/GradeBadge";
import ReturnPreventionGuard from "./ReturnPreventionGuard";
import { getVirtualTestDetails } from "./virtualTestRouter";

const FALLBACK_ITEMS = [
  {
    itemId: "fallback-1",
    category: "electronics",
    photos: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500"],
    provided: {
      model: "Samsung Galaxy S22 Ultra (128GB)",
      originalPrice: 1199,
      price: 649,
      distance: 3.2
    },
    grade: {
      grade: "Very Good",
      defects: ["Micro scratches on rear glass back panel", "Light wear on USB-C port edge"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.94,
      notes: "Device is fully functional and performs perfectly."
    }
  },
  {
    itemId: "fallback-2",
    category: "footwear",
    photos: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500"],
    provided: {
      model: "Nike Air Zoom Pegasus 39 (Size 10)",
      originalPrice: 130,
      price: 65,
      distance: 1.5
    },
    grade: {
      grade: "Good",
      defects: ["Creased midsoles", "Slight dirt on outsole treads"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.96,
      notes: "Original box missing, but shoes are in great running condition."
    }
  },
  {
    itemId: "fallback-3",
    category: "clothing",
    photos: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500"],
    provided: {
      model: "Patagonia Torrentshell 3L Jacket (Size L)",
      originalPrice: 179,
      price: 99,
      distance: 6.8
    },
    grade: {
      grade: "Like New",
      defects: ["Original cardboard tag detached"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.98,
      notes: "Fabric shows zero signs of wear or wash fading. Zipper pulls intact."
    }
  },
  {
    itemId: "fallback-4",
    category: "appliance",
    photos: ["https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=500"],
    provided: {
      model: "Ninja Professional Blender 1000W",
      originalPrice: 99,
      price: 49,
      distance: 4.0
    },
    grade: {
      grade: "Acceptable",
      defects: ["Scratches on plastic pitcher exterior", "Lid fits tightly but shows scuffing"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.92,
      notes: "Motor base tested and runs fully at high speeds."
    }
  }
];

export default function ItemDetail({ role }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isChecked, setIsChecked] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [sizeScanned, setSizeScanned] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [sizeSelected, setSizeSelected] = useState("7");
  const [carrierSelected, setCarrierSelected] = useState("T-Mobile");
  
  // Risk Engine directives
  const [riskDirective, setRiskDirective] = useState(null);
  
  // Active test configurations for 3D Camera Scan
  const [activeTestDetails, setActiveTestDetails] = useState(getVirtualTestDetails("A4_SPATIAL_SCAN"));
  const [scanningState, setScanningState] = useState(0); // 0: Idle, 1: Scanning, 2: Complete
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState("");

  // Background Checks Sequential Animation
  const [checkingStep, setCheckingStep] = useState(0);
  const [preventionChecking, setPreventionChecking] = useState(true);

  const isFallback = String(id).startsWith("fallback-");

  // Fetch real items from DynamoDB via React Query
  const { data: dbItem, isLoading, error } = useQuery({
    queryKey: ["item", id, role],
    queryFn: () => getItem(id, role),
    enabled: !!id && !isFallback,
    retry: false,
  });

  // Load fallback item data locally if needed
  const fallbackItem = isFallback ? FALLBACK_ITEMS.find((item) => item.itemId === id) : null;
  const item = isFallback ? fallbackItem : dbItem;
  const finalItem = item || FALLBACK_ITEMS[0];

  const category = finalItem.category || "general";
  const model = finalItem.provided?.model || finalItem.category || "Returned Item";
  const photo = finalItem.photos?.[0] || "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500";
  const gradeVal = finalItem.grade?.grade || "Good";
  const confidence = Math.round((finalItem.grade?.confidence || 0.95) * 100);
  const completeness = finalItem.grade?.completeness || "complete";
  const defects = finalItem.grade?.defects || [];
  const notes = finalItem.grade?.notes || "Fully verified condition.";
  
  const distance = finalItem.provided?.distance || 2.4;
  const originalPrice = Number(finalItem.provided?.originalPrice) || 599;
  const price = Number(finalItem.provided?.price) || Math.round(originalPrice * (gradeVal === "New" ? 0.9 : gradeVal === "Like New" ? 0.8 : gradeVal === "Very Good" ? 0.7 : 0.5));
  const savings = Math.round(((originalPrice - price) / originalPrice) * 100);

  // Trigger sequential checks animation and initialize default size when item changes
  useEffect(() => {
    setPreventionChecking(true);
    setCheckingStep(0);
    setSizeScanned(false);
    
    if (category === "clothing") {
      setSizeSelected("L"); // L sizing conflicts with user history L returns (too loose)
    } else if (category === "footwear") {
      setSizeSelected("7"); // 7 sizing conflicts with user history 7 returns (too small)
    } else if (category === "electronics") {
      setCarrierSelected("T-Mobile");
    } else {
      setSizeSelected("");
    }

    const timer1 = setTimeout(() => setCheckingStep(1), 400);
    const timer2 = setTimeout(() => setCheckingStep(2), 800);
    const timer3 = setTimeout(() => setCheckingStep(3), 1200);
    const timer4 = setTimeout(() => {
      setCheckingStep(4);
      setPreventionChecking(false);
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [id, category]);

  // Handle the scanning simulation process
  useEffect(() => {
    if (scanningState !== 1) return;

    setScanProgress(0);
    setScanLogs("Initializing camera viewport calibration...");
    
    const logs = [
      "Camera lens parameters calibrated successfully.",
      `Searching for reference object: ${activeTestDetails.referenceObject}...`,
      "Object boundary alignment lock acquired.",
      "Generating 3D spatial mesh simulation...",
      "Analyzing dimensional scaling profiles...",
      "Calibration complete! Sizing match ready."
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanningState(2);
          return 100;
        }
        
        const threshold = Math.floor(100 / logs.length);
        const logIndex = Math.min(logs.length - 1, Math.floor(prev / threshold));
        if (logIndex !== currentLogIndex && logs[logIndex]) {
          currentLogIndex = logIndex;
          setScanLogs(logs[logIndex]);
        }

        return prev + 10;
      });
    }, 250);

    return () => clearInterval(interval);
  }, [scanningState, activeTestDetails]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-gray-500 font-sans">
        <RefreshCw className="animate-spin w-8 h-8 mx-auto text-amazon-teal mb-3" />
        Retrieving evaluation details from Amazon DynamoDB...
      </div>
    );
  }

  const handleBuy = () => {
    if (!isChecked) return;
    setPurchaseSuccess(true);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 font-sans">
      
      {/* Back to Marketplace */}
      <div className="mb-4">
        <Link to="/buyer" className="text-xs font-bold text-amazon-teal hover:underline flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Used Storefront
        </Link>
      </div>

      {/* Main content grid */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* Left: Product Image */}
        <div className="w-full md:w-2/5 bg-white border border-[#D5D9D9] rounded-md p-6 flex items-center justify-center h-96 relative">
          <img
            src={photo}
            alt={model}
            className="max-h-full max-w-full object-contain mix-blend-multiply"
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500";
            }}
          />
          <span className="absolute top-3 left-3 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
            Eco shipping: {distance} km away
          </span>
        </div>

        {/* Center: Details */}
        <div className="flex-grow w-full md:w-2/5 space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h1 className="text-xl font-bold text-gray-900 leading-tight mb-1">{model}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-amazon-teal font-semibold">Store: Used Deals</span>
              <span className="text-gray-300 text-xs">|</span>
              <span className="text-xs text-gray-500 font-semibold uppercase">Category: {category}</span>
            </div>
          </div>

          {/* AI Return Prevention Engine Area */}
          {preventionChecking ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 text-white font-sans space-y-4 shadow-md animate-pulse">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest">
                <RefreshCw className="animate-spin w-4 h-4 text-cyan-400" />
                <span>AI Return Prevention Active</span>
              </div>
              <h4 className="text-xs font-bold text-slate-100">Scanning Background Databases...</h4>
              
              <div className="space-y-2.5 text-[11px] text-slate-350">
                <div className="flex items-center gap-2">
                  <span className={checkingStep >= 1 ? "text-emerald-400 font-bold" : "text-gray-500"}>
                    {checkingStep >= 1 ? "✓" : "⚡"}
                  </span>
                  <span className={checkingStep >= 0 ? "text-slate-100 font-medium" : "text-gray-500"}>
                    Check 1: Studying customer personal return logs (History)...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={checkingStep >= 2 ? "text-emerald-400 font-bold" : "text-gray-500"}>
                    {checkingStep >= 2 ? "✓" : "⚡"}
                  </span>
                  <span className={checkingStep >= 1 ? "text-slate-100 font-medium" : "text-gray-500"}>
                    Check 2: Analyzing product-specific return rate indicators (Patterns)...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={checkingStep >= 3 ? "text-emerald-400 font-bold" : "text-gray-500"}>
                    {checkingStep >= 3 ? "✓" : "⚡"}
                  </span>
                  <span className={checkingStep >= 2 ? "text-slate-100 font-medium" : "text-gray-500"}>
                    Check 3: Correlating size fit parameters with similar buyers (Cohorts)...
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={checkingStep >= 4 ? "text-emerald-400 font-bold" : "text-gray-500"}>
                    {checkingStep >= 4 ? "✓" : "⚡"}
                  </span>
                  <span className={checkingStep >= 3 ? "text-slate-100 font-medium" : "text-gray-500"}>
                    Combining signals & predicting purchase return probability...
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <ReturnPreventionGuard
              productId={id}
              currentSpecs={
                category === "footwear"
                  ? { size: sizeSelected, scanned: sizeScanned }
                  : category === "clothing"
                  ? { size: sizeSelected, scanned: sizeScanned }
                  : category === "electronics"
                  ? { carrier: carrierSelected }
                  : { cleared: sizeScanned ? "true" : "false", scanned: sizeScanned }
              }
              userId="user-priya-99"
              role={role}
              onLaunchCamera={(testType) => {
                setActiveTestDetails(getVirtualTestDetails(testType));
                setScanningState(0);
                setShowScannerModal(true);
              }}
              onSwapSpec={(newSpecs) => {
                if (newSpecs.size) {
                  setSizeSelected(newSpecs.size);
                }
                if (newSpecs.carrier) {
                  setCarrierSelected(newSpecs.carrier);
                }
                setSizeScanned(true);
              }}
              sizeScanned={sizeScanned}
              onEngineDirectiveLoaded={(directive) => {
                setRiskDirective(directive);
              }}
            />
          )}

          {/* AI Return Prevention ROI Saved Report */}
          {riskDirective && riskDirective.riskPercent < 10 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 font-sans text-emerald-950 space-y-4 animate-fade-in shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
                <TrendingDown className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                <span>AI Return Prevention ROI Saved Report</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 border-y border-dashed border-emerald-250 py-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-700 font-extrabold block uppercase">Logistics Loss Avoided</span>
                  <span className="text-base font-extrabold text-emerald-900">Rs. 1,000+ Saved</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-emerald-700 font-extrabold block uppercase">Shipping Footprint</span>
                  <span className="text-base font-extrabold text-emerald-900">-1.8 kg CO2 Emissions</span>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-[10px] font-black uppercase text-emerald-800">Avoided logistics cost breakdown:</h5>
                <ul className="text-xs space-y-1.5 pl-4 list-disc text-emerald-900/85 font-semibold">
                  <li>Refund administrative processing charge: <strong className="text-emerald-950">Rs. 500 saved</strong></li>
                  <li>Two-way shipping fuel & transport: <strong className="text-emerald-950">Rs. 300 saved</strong></li>
                  <li>Warehouse receiving, inspection & re-grading labor: <strong className="text-emerald-950">Rs. 200 saved</strong></li>
                  <li>Lost seller margin & product depreciation: <strong className="text-emerald-950">Avoided</strong></li>
                </ul>
              </div>

              <div className="bg-emerald-900 text-white rounded-lg p-3.5 space-y-2 border border-emerald-950">
                <h6 className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-300">Macro Impact (Amazon India Scale):</h6>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="font-extrabold text-white block text-sm">1.5B</span>
                    <span className="text-[8px] text-emerald-200 block uppercase">Returns/Yr</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-white block text-sm">150M</span>
                    <span className="text-[8px] text-emerald-200 block uppercase">Never Happen (10%)</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-white block text-sm">$4-6B</span>
                    <span className="text-[8px] text-emerald-200 block uppercase">Cost Saved/Yr</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Verified Section */}
          {finalItem.grade?.gradedBy === "fallback" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Certified Return · Local Fallback Inspection</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Gemini Vision was temporarily offline when this item was listed. Local rule-based checks were run:
                <br />
                <span className="font-mono text-[10px] text-rose-700 block mt-1 leading-snug">
                  {notes}
                </span>
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3">
              <div className="flex items-center gap-1 text-sm font-bold text-amazon-teal">
                <ShieldCheck className="w-5 h-5 fill-cyan-50 text-cyan-600" />
                <span>Amazon Certified · AI-Verified Returns</span>
              </div>
              
              <div className="flex items-center gap-2">
                <GradeBadge grade={gradeVal} size="md" />
                <span className="text-xs text-gray-500 font-medium">({confidence}% AI vision confidence)</span>
              </div>

              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                <span className="font-bold text-gray-900">Summary: </span>
                {notes}
              </p>
            </div>
          )}

          {/* Price Box */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-gray-500">Used Price:</span>
              <span className="text-2xl font-bold text-amazon-red">${price}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              List Price: <span className="line-through">${originalPrice}</span> <span className="font-bold text-amazon-green">Save ${originalPrice - price} ({savings}%)</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-amazon-green fill-current" />
              Purchase qualifies for <span className="font-bold text-amazon-green">Climate Pledge Friendly</span> credits.
            </div>
          </div>

          {/* Size Selector (Interactive for the Demo) */}
          {(category === "footwear" || category === "clothing") && (
            <div className="border border-gray-200 rounded-md p-4 bg-white space-y-2">
              <span className="text-xs font-bold text-gray-900 block uppercase tracking-wider">
                Select Size:
              </span>
              <div className="flex gap-2">
                {category === "footwear" ? (
                  ["6", "6.5", "7", "7.5", "8", "8.5"].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSizeSelected(size);
                        if (size === "7.5") {
                          setSizeScanned(true);
                        } else {
                          setSizeScanned(false);
                        }
                      }}
                      className={`px-3 py-1 text-xs border rounded-md font-bold transition-all cursor-pointer ${
                        sizeSelected === size
                          ? "border-amazon-teal bg-cyan-50/50 text-amazon-teal ring-1 ring-cyan-100"
                          : "border-gray-300 hover:bg-gray-50 text-gray-800"
                      }`}
                    >
                      {size}
                    </button>
                  ))
                ) : (
                  ["S", "M", "L", "XL"].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSizeSelected(size);
                        if (size === "M") {
                          setSizeScanned(true);
                        } else {
                          setSizeScanned(false);
                        }
                      }}
                      className={`px-3 py-1 text-xs border rounded-md font-bold transition-all cursor-pointer ${
                        sizeSelected === size
                          ? "border-amazon-teal bg-cyan-50/50 text-amazon-teal ring-1 ring-cyan-100"
                          : "border-gray-300 hover:bg-gray-50 text-gray-800"
                      }`}
                    >
                      {size}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Condition Details Panel (Honest Disclosures) */}
          <div className="border border-gray-200 rounded-md p-4 bg-white space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-1.5">
              Honest Visual Disclosures
            </h3>
            <div className="text-xs space-y-2 text-gray-700">
              <div className="flex items-center justify-between">
                <span>Completeness:</span>
                <span className="font-bold text-amazon-green uppercase text-[10px]">{completeness}</span>
              </div>
              
              <div>
                <span className="font-bold block mb-1">Identified Wear & Tear:</span>
                {defects.length > 0 ? (
                  <ul className="list-disc pl-4 space-y-1 text-gray-600">
                    {defects.map((def, idx) => (
                      <li key={idx}>{def}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-gray-500 italic">No cosmetic blemishes identified by AI inspection.</span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right: Buy checkout card */}
        <div className="w-full md:w-1/5 bg-white border border-[#D5D9D9] rounded-md p-4 space-y-4 shadow-sm flex-shrink-0">
          <div className="text-xl font-bold text-gray-900">${price}</div>
          <div className="text-xs text-gray-500 leading-tight">
            Delivery in 1-2 Days. <span className="font-bold text-amazon-green">Eco-optimized routing</span>.
          </div>
          
          <div className="text-xs text-amazon-green font-bold flex items-center gap-1">
            <Truck className="w-4 h-4" />
            <span>In Stock</span>
          </div>

          {/* Review Checkbox Requirement */}
          <div
            onClick={() => setIsChecked(!isChecked)}
            className="flex items-start gap-2 p-2 rounded-md bg-gray-50 hover:bg-gray-100/80 cursor-pointer select-none border border-gray-200"
          >
            <div className="mt-0.5 flex-shrink-0">
              {isChecked ? (
                <CheckSquare className="w-4.5 h-4.5 text-amazon-teal fill-cyan-50" />
              ) : (
                <Square className="w-4.5 h-4.5 text-gray-400" />
              )}
            </div>
            <span className="text-[10px] font-semibold text-gray-700 leading-tight">
              I have reviewed the condition notes and defects list.
            </span>
          </div>

          {/* Checkout Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleBuy}
              disabled={!isChecked}
              className="w-full bg-amazon-yellow hover:bg-amazon-yellowHover text-gray-900 font-bold py-2 px-3 text-xs rounded-full shadow-xs border border-yellow-400 hover:border-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" /> Buy Now
            </button>
            <button
              disabled={!isChecked}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-bold py-2 px-3 text-xs rounded-full shadow-xs border border-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Add to Cart
            </button>
          </div>
        </div>

      </div>

      {/* Purchase Success Modal Overlay */}
      {purchaseSuccess && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm z-999 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 max-w-md w-full rounded-lg shadow-2xl p-6 text-center select-none animate-fade-in font-sans">
            <div className="w-12 h-12 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 text-amazon-green">
              <ShieldCheck className="w-8 h-8 stroke-[2.5]" />
            </div>
            
            <h3 className="text-lg font-black text-gray-900">Purchase Confirmed!</h3>
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              Order successfully processed for <span className="font-bold text-gray-900">{model}</span>. 
              Your package is dispatched from our local eco-hub.
            </p>
            <div className="my-4 bg-emerald-50 border border-emerald-150 p-2.5 rounded-md text-[10px] font-bold text-amazon-green flex items-center justify-center gap-1">
              <Leaf className="w-4 h-4 fill-current" />
              Climate Pledge: +50 Green Credits Added to Account
            </div>

            <button
              onClick={() => {
                setPurchaseSuccess(false);
                setIsChecked(false);
                navigate("/buyer");
              }}
              className="w-full py-2 bg-amazon-yellow hover:bg-amazon-yellowHover text-gray-900 font-bold rounded-full shadow-sm border border-yellow-400 hover:border-yellow-500 text-xs cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* AI Generic 3D Spatial Scanner Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-999 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden text-center text-white p-6 relative font-sans animate-fade-in">
            <h3 className="text-base font-black text-white flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amazon-yellow animate-pulse" />
              {activeTestDetails.title}
            </h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto mb-4">
              Calibrating depth using <strong>{activeTestDetails.referenceObject}</strong> as scalar.
            </p>

            {/* Camera viewport frame overlay */}
            <div className="relative w-full h-72 border border-gray-700 bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center mb-6">
              
              {/* Scan laser line animation */}
              {scanningState === 1 && (
                <div className="absolute left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee,0_0_30px_#22d3ee] animate-scan z-10"></div>
              )}
              
              {/* Dynamic SVGs based on scanning type */}
              <div className="z-0 relative flex flex-col items-center">
                {activeTestDetails.type === "A4_SPATIAL_SCAN" && (
                  <svg className="w-40 h-56 mx-auto text-cyan-400 animate-pulse" fill="none" viewBox="0 0 100 150">
                    <rect x="10" y="10" width="80" height="130" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path
                      d="M 50,20 C 58,20 64,32 64,48 C 64,62 60,78 57,98 C 55,110 53,125 50,125 C 47,125 45,110 43,98 C 40,78 36,62 36,48 C 36,32 42,20 50,20 Z"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="rgba(34, 211, 238, 0.08)"
                    />
                    <circle cx="50" cy="48" r="2.5" fill="currentColor" />
                    <path d="M 25,20 L 25,125" stroke="#facc15" strokeWidth="1" strokeDasharray="2 2" />
                    <path d="M 22,23 L 25,20 L 28,23 M 22,122 L 25,125 L 28,122" stroke="#facc15" strokeWidth="1" />
                    <text x="14" y="75" fill="#facc15" fontSize="7" fontWeight="bold">29.7cm</text>
                  </svg>
                )}

                {activeTestDetails.type === "FACE_MESH_SCAN" && (
                  <svg className="w-40 h-56 mx-auto text-pink-400 animate-pulse" fill="none" viewBox="0 0 100 150">
                    <ellipse cx="50" cy="65" rx="30" ry="40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                    <path d="M 35,60 L 45,60 M 55,60 L 65,60 M 50,70 L 50,85 M 42,95 Q 50,103 58,95" stroke="currentColor" strokeWidth="2" />
                    <circle cx="35" cy="60" r="1.5" fill="currentColor" />
                    <circle cx="65" cy="60" r="1.5" fill="currentColor" />
                    <circle cx="50" cy="78" r="1.5" fill="currentColor" />
                    <rect x="68" y="90" width="22" height="14" rx="2" stroke="#facc15" strokeWidth="1.5" fill="rgba(250, 204, 21, 0.08)" />
                    <path d="M 68,107 L 90,107" stroke="#facc15" strokeWidth="1" strokeDasharray="2 2" />
                    <path d="M 71,110 L 68,107 L 71,104 M 87,110 L 90,107 L 87,104" stroke="#facc15" strokeWidth="1" />
                    <text x="70" y="119" fill="#facc15" fontSize="5" fontWeight="bold">8.56cm</text>
                  </svg>
                )}

                {activeTestDetails.type === "ROOM_CLEARANCE_SCAN" && (
                  <svg className="w-40 h-56 mx-auto text-amber-500 animate-pulse" fill="none" viewBox="0 0 100 150">
                    <line x1="5" y1="35" x2="95" y2="35" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                    <line x1="5" y1="120" x2="95" y2="120" stroke="currentColor" strokeWidth="2" />
                    <rect x="30" y="55" width="40" height="65" stroke="currentColor" strokeWidth="2.5" fill="rgba(245, 158, 11, 0.08)" />
                    <line x1="30" y1="55" x2="40" y2="45" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="70" y1="55" x2="80" y2="45" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="40" y="45" width="40" height="65" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 1" />
                    <rect x="5" y="45" width="18" height="75" stroke="#facc15" strokeWidth="1.5" />
                    <circle cx="8" cy="82" r="1" fill="#facc15" />
                    <text x="5" y="40" fill="#facc15" fontSize="5" fontWeight="bold">Door 90cm</text>
                  </svg>
                )}

                <span className="text-[10px] text-gray-500 block mt-2">
                  {scanningState === 1 ? scanLogs : activeTestDetails.helpText}
                </span>
              </div>

              {/* Progress bar overlay during active scan */}
              {scanningState === 1 && (
                <div className="absolute bottom-4 left-4 right-4 bg-gray-900/90 border border-gray-700 px-3 py-2 rounded-lg text-left space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-gray-400">
                    <span>AI CALIBRATING...</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-400 h-full transition-all duration-200" style={{ width: `${scanProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-xs text-gray-300 leading-relaxed px-4">
                {scanningState === 2 ? (
                  <div className="bg-emerald-950/50 border border-emerald-800 p-2.5 rounded-lg text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    {activeTestDetails.calibrationSuccessMessage}
                  </div>
                ) : (
                  activeTestDetails.instruction
                )}
              </div>
              
              {scanningState === 0 && (
                <button
                  onClick={() => setScanningState(1)}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full text-xs shadow-sm cursor-pointer"
                >
                  Start Camera Sizing Scan
                </button>
              )}

              {scanningState === 2 && (
                <button
                  onClick={() => {
                    setSizeScanned(true);
                    if (activeTestDetails.recommendedSpecs.size) {
                      setSizeSelected(activeTestDetails.recommendedSpecs.size);
                    }
                    setShowScannerModal(false);
                    setScanningState(0);
                  }}
                  className="w-full py-2.5 bg-amazon-yellow hover:bg-amazon-yellowHover text-gray-900 font-bold rounded-full text-xs shadow-sm border border-yellow-400 hover:border-yellow-500 cursor-pointer"
                >
                  Apply Calibration & Correct Fit
                </button>
              )}
              
              <button
                onClick={() => {
                  setShowScannerModal(false);
                  setScanningState(0);
                }}
                className="text-xs text-gray-400 hover:text-white font-bold block mx-auto underline cursor-pointer mt-1"
              >
                Cancel Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
