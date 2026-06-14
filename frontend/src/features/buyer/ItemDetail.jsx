// frontend/src/features/buyer/ItemDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Leaf,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  CheckSquare,
  Square,
  Truck,
  CreditCard,
  Sparkles,
  TrendingDown,
  Check,
  Zap,
  Ruler,
  AlignLeft,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { getItem, getReturnRisk } from "../../services/api";
import GradeBadge from "../../components/GradeBadge";
import ReturnPreventionGuard from "./ReturnPreventionGuard";
import { getVirtualTestDetails } from "./virtualTestRouter";
import AmazonHeader from "../../components/AmazonHeader";

const FALLBACK_ITEMS = [
  {
    itemId: "fallback-1",
    category: "electronics",
    photos: [
      "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg",
    ],
    provided: {
      model: "Sony WH-1000XM5 Wireless Headphones",
      originalPrice: 399,
      price: 249,
      distance: 2.5,
    },
    grade: {
      grade: "Very Good",
      defects: [
        "Minor scuff on left ear cup",
        "Faint crease on headband padding",
      ],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.94,
      notes: "ANC fully functional. All accessories present including carry case.",
    },
  },
  {
    itemId: "fallback-2",
    category: "footwear",
    photos: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"],
    provided: {
      model: "Velocity Pro Runner",
      originalPrice: 285,
      price: 142.50,
      distance: 3.8,
    },
    grade: {
      grade: "Good",
      defects: ["Light outsole wear on heel", "Minor creasing on Primeknit upper"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.93,
      notes: "SKU: VPR-2024-RD-09",
    },
  },
  {
    itemId: "fallback-3",
    category: "clothing",
    photos: ["https://m.media-amazon.com/images/I/81JFxMv1VNL._AC_SL1500_.jpg"],
    provided: {
      model: "Levi's 501 Original Fit Jeans (32W)",
      originalPrice: 89,
      price: 59,
      distance: 1.2,
    },
    grade: {
      grade: "Like New",
      defects: ["Price tag removed"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.97,
      notes:
        "No fading, no wash wear. Rivets and stitching fully intact.",
    },
  },
  {
    itemId: "fallback-4",
    category: "appliance",
    photos: [
      "https://m.media-amazon.com/images/I/61UMjfMKXjL._AC_SL1500_.jpg",
    ],
    provided: {
      model: "Dyson V12 Detect Slim Cordless Vacuum",
      originalPrice: 649,
      price: 299,
      distance: 5.1,
    },
    grade: {
      grade: "Acceptable",
      defects: [
        "Scratches on main body tube",
        "Dust bin latch slightly loose",
        "One attachment nozzle missing",
      ],
      completeness: "missing parts or structural damage",
      authenticityConcern: false,
      confidence: 0.91,
      notes: "Motor and suction fully functional. Battery holds charge. Missing crevice tool.",
    },
  },
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

  // Return Risk prediction states
  const [returnRiskData, setReturnRiskData] = useState(null);
  const [loadingReturnRisk, setLoadingReturnRisk] = useState(false);

  // AR sizer mock sizer modal states
  const [showArModal, setShowArModal] = useState(false);
  const [arProgress, setArProgress] = useState(0);
  const [arComplete, setArComplete] = useState(false);

  // Risk Engine directives
  const [riskDirective, setRiskDirective] = useState(null);

  // Active test configurations for 3D Camera Scan
  const [activeTestDetails, setActiveTestDetails] = useState(
    getVirtualTestDetails("A4_SPATIAL_SCAN"),
  );
  const [scanningState, setScanningState] = useState(0); // 0: Idle, 1: Scanning, 2: Complete
  const [scanProgress, setScanProgress] = useState(0);
  const [scanLogs, setScanLogs] = useState("");

  // Background Checks Sequential Animation
  const [checkingStep, setCheckingStep] = useState(0);
  const [preventionChecking, setPreventionChecking] = useState(true);

  const isFallback = String(id).startsWith("fallback-");

  // Fetch real items from DynamoDB via React Query
  const {
    data: dbItem,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["item", id, role],
    queryFn: () => getItem(id, role),
    enabled: !!id && !isFallback,
    retry: false,
  });

  // Load fallback item data locally if needed
  const fallbackItem = isFallback
    ? FALLBACK_ITEMS.find((item) => item.itemId === id)
    : null;
  const item = isFallback ? fallbackItem : dbItem;
  const finalItem = item || FALLBACK_ITEMS[0];

  const category = finalItem.category || "general";
  const model =
    finalItem.provided?.model || finalItem.category || "Returned Item";
  const photo =
    finalItem.photos?.[0] ||
    "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg";
  const gradeVal = finalItem.grade?.grade || "Good";
  const confidence = Math.round((finalItem.grade?.confidence || 0.95) * 100);
  const completeness = finalItem.grade?.completeness || "complete";
  const defects = finalItem.grade?.defects || [];
  const notes = finalItem.grade?.notes || "Fully verified condition.";

  const distance = finalItem.provided?.distance || 2.4;
  const originalPrice = Number(finalItem.provided?.originalPrice) || 599;
  const price =
    Number(finalItem.provided?.price) ||
    Math.round(
      originalPrice *
        (gradeVal === "New"
          ? 0.9
          : gradeVal === "Like New"
            ? 0.8
            : gradeVal === "Very Good"
              ? 0.7
              : 0.5),
    );
  const savings = Math.round(((originalPrice - price) / originalPrice) * 100);

  // Query return risk dynamically when size selection changes
  useEffect(() => {
    if (sizeSelected && (category === "footwear" || category === "clothing")) {
      setLoadingReturnRisk(true);
      getReturnRisk({
        userId: "u1", // Priya for the demo
        productId: id,
        chosenSize: sizeSelected,
        role,
      })
        .then((data) => {
          setReturnRiskData(data);
          setLoadingReturnRisk(false);
        })
        .catch((err) => {
          console.error("Failed to predict return risk:", err);
          setLoadingReturnRisk(false);
        });
    }
  }, [id, sizeSelected, category, role]);

  // AR Try-on scan animation effect
  useEffect(() => {
    let timer;
    if (showArModal) {
      timer = setInterval(() => {
        setArProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            setArComplete(true);
            setTimeout(() => {
              const recommendation = category === "clothing" ? "M" : "7.5";
              setSizeSelected(recommendation);
              setSizeScanned(true);
              setShowArModal(false);
            }, 1200);
            return 100;
          }
          return prev + 10;
        });
      }, 150);
    }
    return () => clearInterval(timer);
  }, [showArModal, category]);

  // Trigger sequential checks animation and initialize default size when item changes
  useEffect(() => {
    setPreventionChecking(true);
    setCheckingStep(0);
    setSizeScanned(false);

    if (category === "clothing") {
      setSizeSelected("34W");
    } else if (category === "footwear") {
      setSizeSelected("10");
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
      "Calibration complete! Sizing match ready.",
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
        const logIndex = Math.min(
          logs.length - 1,
          Math.floor(prev / threshold),
        );
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
      <div className="max-w-5xl mx-auto p-12 text-center text-outline font-sans">
        <RefreshCw className="animate-spin w-8 h-8 mx-auto text-secondary-container mb-3" />
        Retrieving evaluation details...
      </div>
    );
  }

  const handleBuy = () => {
    if (!isChecked) return;
    setPurchaseSuccess(true);
    // Add +50 credits to logged_in_user profile
    const userStr = localStorage.getItem("logged_in_user");
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        userObj.credits = (userObj.credits || 450) + 50;
        localStorage.setItem("logged_in_user", JSON.stringify(userObj));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const riskPct = returnRiskData?.riskPct || (sizeScanned ? 8 : 42);
  const isScannedOrOptimized = riskPct < 10;

  // Category specific spec details for left column list
  const getSpecsList = () => {
    if (category === "footwear") {
      return [
        { icon: <Ruler className="w-3.5 h-3.5" />, value: "Standard Width (D)" },
        { icon: <AlignLeft className="w-3.5 h-3.5" />, value: "Adaptive Mesh Upper" },
        { icon: <Zap className="w-3.5 h-3.5" />, value: "Nitro-Injection Sole" }
      ];
    }
    return [];
  };

  const specsList = getSpecsList();

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <AmazonHeader />
      <div className="max-w-6xl mx-auto p-4 font-sans relative">
      
      {/* Back button */}
      <div className="mb-4">
        <Link
          to="/buyer"
          className="text-xs font-bold text-link-blue hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Used Storefront
        </Link>
      </div>

      {/* Screen 6: Top Section Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-12 items-start">
        
        {/* Left Column: Image & Specs */}
        <div className="lg:col-span-8 bg-white rounded-xl border-[0.5px] border-outline-variant overflow-hidden flex flex-col md:flex-row h-96 md:h-[420px]">
          <div className="md:w-1/2 relative h-64 md:h-full bg-gradient-to-tr from-gray-300 via-gray-100 to-white flex items-center justify-center p-6 shrink-0">
            <img
              src={photo}
              alt={model}
              className="max-h-full max-w-full object-contain drop-shadow-xl mix-blend-multiply"
              onError={(e) => {
                e.target.src = "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg";
              }}
            />
          </div>
          
          <div className="md:w-1/2 p-8 flex flex-col justify-center">
            <div className="mb-6">
              <span className="bg-[#e3ecfa] text-[#55698b] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                High Velocity Series
              </span>
              <h1 className="font-display font-black text-2xl text-ink-black mt-2 leading-snug">{model}</h1>
              <p className="text-outline font-semibold text-[10px] uppercase tracking-wider mt-1.5">{notes || "SKU: SL-PRX-FALLBACK"}</p>
            </div>

            {/* Dynamic specs list */}
            <div className="space-y-2.5">
              {specsList.map((spec, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-ink-black">
                  <div className="text-outline">{spec.icon}</div>
                  <span className="text-[11px] font-bold mt-0.5">{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Purchase Decision & Return prevention */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant space-y-4">
            <h3 className="font-display font-bold text-[15px] text-ink-black pb-1">
              Purchase Decision
            </h3>
            
            {/* Embedded Prevention Engine or Loader */}
            {preventionChecking ? (
              <div className="bg-deep-navy border-[0.5px] border-outline-variant rounded-xl p-5 text-white font-sans space-y-4 animate-pulse select-none">
                <div className="flex items-center gap-2 text-xs font-bold text-accent-yellow uppercase tracking-widest">
                  <RefreshCw className="animate-spin w-4 h-4 text-accent-yellow" />
                  <span>AI Return Prevention</span>
                </div>
                <h4 className="text-xs font-bold text-surface-variant">Scanning Sizing Databases...</h4>
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
                        : {
                            cleared: sizeScanned ? "true" : "false",
                            scanned: sizeScanned,
                          }
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

            {/* Checkout elements hidden for fallback-2 mockup matching */}
            {id !== "fallback-2" && (
              <>
                {/* Price Box */}
                <div className="border-t border-surface-container pt-4">
                  <div className="text-2xl font-black text-ink-black">${price}</div>
                  <div className="text-[10px] text-outline font-semibold mt-1">
                    List Price: <span className="line-through">${originalPrice}</span>{" "}
                    <span className="font-bold text-green-700">Save ${originalPrice - price} ({savings}%)</span>
                  </div>
                  <div className="text-[10px] text-green-700 font-bold flex items-center gap-1.5 mt-2 select-none">
                    <Truck className="w-4 h-4" />
                    <span>In Stock · Delivery in 1-2 Days</span>
                  </div>
                </div>

                {/* Interactive Size Selectors (if shoes or clothes) */}
                {(category === "footwear" || category === "clothing") && (
                  <div className="border border-surface-container rounded-lg p-3 bg-surface-container-low space-y-2">
                    <div className="flex items-center justify-between border-b border-surface-container pb-1 select-none">
                      <span className="text-[9px] font-bold text-outline uppercase tracking-wider block">
                        Choose Size:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowArModal(true);
                          setArProgress(0);
                          setArComplete(false);
                        }}
                        className="text-[8px] font-bold text-link-blue hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-none uppercase tracking-wider"
                      >
                        <Sparkles className="w-3 h-3 text-secondary-container" /> Measure Sizing (AR)
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {category === "footwear"
                        ? ["9", "9.5", "10", "10.5", "11", "11.5"].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setSizeSelected(size);
                                setSizeScanned(size === "10.5");
                              }}
                              className={`px-2 py-1 text-[10px] border rounded-md font-bold transition-all cursor-pointer ${
                                sizeSelected === size
                                  ? "border-link-blue bg-white text-link-blue font-extrabold"
                                  : "border-outline-variant hover:bg-white text-ink-black"
                              }`}
                            >
                              {size}
                            </button>
                          ))
                        : ["30W", "32W", "34W", "36W"].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => {
                                setSizeSelected(size);
                                setSizeScanned(size === "32W");
                              }}
                              className={`px-3 py-1 text-[10px] border rounded-md font-bold transition-all cursor-pointer ${
                                sizeSelected === size
                                  ? "border-link-blue bg-white text-link-blue font-extrabold"
                                  : "border-outline-variant hover:bg-white text-ink-black"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                    </div>
                  </div>
                )}

                {/* Checklist items */}
                <div className="border-t border-surface-container pt-4 space-y-3">
                  <div
                    onClick={() => setIsChecked(!isChecked)}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer select-none border-[0.5px] border-outline-variant"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isChecked ? (
                        <ShieldCheck className="w-4.5 h-4.5 text-link-blue" />
                      ) : (
                        <Square className="w-4.5 h-4.5 text-outline" />
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-outline leading-tight uppercase tracking-tight">
                      I have reviewed the condition notes and defects lists.
                    </span>
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={!isChecked}
                    className="w-full bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 uppercase text-xs tracking-wider border-[0.5px] border-outline-variant"
                  >
                    <CreditCard className="w-4 h-4" /> Buy Now
                  </button>
                </div>
              </>
            )}

          </div>
        </aside>
      </section>

      {/* Screen 6: Dashboard Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8 select-none">
        <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant shadow-none">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-medium text-outline tracking-wide">Return Rate</p>
            <span className="text-red-600 material-symbols-outlined">trending_up</span>
          </div>
          <p className="font-display font-black text-2xl text-red-700">24.8%</p>
          <p className="text-[10px] text-outline font-semibold mt-2">+12% vs Brand Average</p>
        </div>
        <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant shadow-none">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-medium text-outline tracking-wide">Personal Risk</p>
            <span className="text-secondary-container material-symbols-outlined">assessment</span>
          </div>
          <p className="font-display font-black text-2xl text-secondary">
            {riskPct >= 50 ? "Medium-High" : "Low / Optimized"}
          </p>
          <p className="text-[10px] text-outline font-semibold mt-2">Based on your return history</p>
        </div>
        <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant shadow-none">
          <div className="flex justify-between items-start mb-4">
            <p className="text-[11px] font-medium text-outline tracking-wide">Cost Saved</p>
            <span className="text-green-700 material-symbols-outlined">account_balance_wallet</span>
          </div>
          <p className="font-display font-black text-2xl text-green-700">
            $142.50
          </p>
          <p className="text-[10px] text-outline font-semibold mt-2">Prevention efficiency</p>
        </div>
      </section>

      {/* Screen 6: Analytics Bottom Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        
        {/* User Fit History Card */}
        <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant flex flex-col justify-between">
          <div>
            <h3 className="text-[10px] font-bold text-outline mb-4 uppercase tracking-wider border-b border-surface-container pb-2">User Fit History</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg text-xs font-semibold">
                <div>
                  <p className="text-ink-black font-bold">Nike Pegasus 40</p>
                  <p className="text-[10px] text-outline mt-0.5">Size 10 • Kept</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low border-l-2 border-l-red-600 rounded-lg text-xs font-semibold">
                <div>
                  <p className="text-ink-black font-bold">Adidas Ultraboost</p>
                  <p className="text-[10px] text-outline mt-0.5">Size 10 • Returned (Too Small)</p>
                </div>
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg text-xs font-semibold">
                <div>
                  <p className="text-ink-black font-bold">New Balance 1080</p>
                  <p className="text-[10px] text-outline mt-0.5">Size 10.5 • Kept</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
          </div>
          <button className="mt-4 text-link-blue font-bold text-xs hover:underline cursor-pointer bg-transparent border-none text-left uppercase tracking-wider">
            View All History
          </button>
        </div>

        {/* Center: Product Pattern Risk Meter Gauge */}
        <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant select-none">
          <h3 className="text-[10px] font-bold text-outline mb-6 uppercase tracking-wider border-b border-surface-container pb-2">Product Pattern Risk</h3>
          <div className="flex flex-col items-center justify-center py-4">
            
            {/* The Stitch circular gauge */}
            <div className="relative w-48 h-24 overflow-hidden mb-4">
              <div className="absolute inset-0 w-48 h-48 rounded-full border-[12px] border-surface-container-highest"></div>
              <div className="absolute inset-0 w-48 h-48 rounded-full border-[12px] risk-meter-gradient" style={{ clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)", transform: "rotate(45deg)" }}></div>
              
              {/* Needle rotating dynamically based on riskPct */}
              <div 
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-16 bg-ink-black rounded-full origin-bottom transition-transform duration-750" 
                style={{ transform: `rotate(${-90 + riskPct * 1.8}deg)` }}
              ></div>
            </div>
            
            <p className="text-sm font-black text-secondary uppercase tracking-tight">
              {riskPct >= 50 ? "Significant Deviation" : "Optimal Sizing Match"}
            </p>
            <p className="text-[10px] text-center text-outline px-4 mt-2 font-semibold leading-relaxed">
              {riskPct >= 50 ? "Model sizing deviates significantly from your pattern." : "Sizing parameters match your standard kept purchases."}
            </p>
          </div>
        </div>

        {/* Right: Buyers Like You Comparison */}
        <div className="bg-white p-6 rounded-xl border-[0.5px] border-outline-variant flex flex-col justify-between select-none">
          <div>
            <h3 className="text-[10px] font-bold text-outline mb-4 uppercase tracking-wider border-b border-surface-container pb-2">Buyers-Like-You Comparison</h3>
            <p className="text-[10px] text-outline font-semibold mb-6">Outcomes for customers with your profile (Size 10, Neutral Arch) buying this model:</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs font-bold">
                  <span className="text-outline">Returned (Size Issue)</span>
                  <span className="text-red-750">{riskPct >= 50 ? "65%" : "12%"}</span>
                </div>
                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-red-650 rounded-full transition-all duration-500" style={{ width: riskPct >= 50 ? "65%" : "12%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1 text-xs font-bold">
                  <span className="text-outline">Kept (Satisfied)</span>
                  <span className="text-green-750">{riskPct >= 50 ? "35%" : "88%"}</span>
                </div>
                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-green-600 rounded-full transition-all duration-500" style={{ width: riskPct >= 50 ? "35%" : "88%" }}></div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[9px] text-outline font-medium italic mt-4 border-t border-surface-container pt-3">
            "The heel cup is narrower than standard D-width. If you have a wide midfoot, consider the Wide variant." — Top Contributor
          </p>
        </div>

      </section>

      {/* AR Sizing Calibration Scanner Modal */}
      {showArModal && (
        <div className="fixed inset-0 bg-deep-navy/95 backdrop-blur-md z-999 flex items-center justify-center p-4">
          <div className="bg-ink-black border border-outline-variant max-w-md w-full rounded-2xl shadow-2xl overflow-hidden text-center text-white p-6 relative font-sans animate-fade-in">
            <h3 className="text-base font-black text-white flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-accent-yellow animate-pulse" />
              AR Fit Analyzer & Calibration
            </h3>
            <p className="text-xs text-surface-variant max-w-xs mx-auto mb-4 font-semibold uppercase">
              Calibrating foot geometry depth using mobile sensors.
            </p>

            <div className="relative w-full h-72 border border-outline-variant bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center mb-6">
              {!arComplete && (
                <div className="absolute left-0 w-full h-1 bg-accent-yellow shadow-[0_0_15px_#febd69,0_0_30px_#febd69] scan-line z-10"></div>
              )}

              <div className="z-0 relative flex flex-col items-center">
                {category === "footwear" ? (
                  <svg
                    className={`w-40 h-56 mx-auto ${arComplete ? "text-emerald-400" : "text-accent-yellow animate-pulse"}`}
                    fill="none"
                    viewBox="0 0 100 150"
                  >
                    <rect
                      x="10"
                      y="10"
                      width="80"
                      height="130"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="M 50,25 C 65,25 68,40 65,65 C 62,85 58,105 55,120 C 52,125 48,125 45,120 C 42,105 38,85 35,65 C 32,40 35,25 50,25 Z"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="rgba(254, 189, 105, 0.08)"
                    />
                    <circle cx="50" cy="40" r="3" fill="currentColor" />
                    <text
                      x="20"
                      y="78"
                      fill="#facc15"
                      fontSize="8"
                      fontWeight="bold"
                    >
                      Scanning...
                    </text>
                  </svg>
                ) : (
                  <svg
                    className={`w-40 h-56 mx-auto ${arComplete ? "text-emerald-400" : "text-accent-yellow animate-pulse"}`}
                    fill="none"
                    viewBox="0 0 100 150"
                  >
                    <rect
                      x="10"
                      y="10"
                      width="80"
                      height="130"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="M 30,30 L 40,25 L 45,35 L 55,35 L 60,25 L 70,30 L 68,50 L 62,50 L 62,120 L 38,120 L 38,50 L 32,50 Z"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="rgba(254, 189, 105, 0.08)"
                    />
                    <text
                      x="20"
                      y="78"
                      fill="#facc15"
                      fontSize="8"
                      fontWeight="bold"
                    >
                      Scanning...
                    </text>
                  </svg>
                )}

                <span className="text-[10px] text-surface-variant block mt-2 font-bold uppercase">
                  {arComplete
                    ? "Calibration Complete!"
                    : `Align inside frame. Progress: ${arProgress}%`}
                </span>
              </div>

              {!arComplete && (
                <div className="absolute bottom-4 left-4 right-4 bg-ink-black border border-outline-variant px-3 py-2 rounded-lg text-left space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-surface-variant">
                    <span>AR CALIBRATING...</span>
                    <span>{arProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-accent-yellow h-full transition-all duration-200"
                      style={{ width: `${arProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-xs text-surface-variant leading-relaxed px-4 font-semibold">
                {arComplete ? (
                  <div className="bg-emerald-950/50 border border-emerald-800 p-2.5 rounded-lg text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Optimal Size Calibrated: {category === "clothing" ? "M" : "7.5"}
                  </div>
                ) : (
                  "Please hold still while our AI maps the key alignment markers for your size calibration."
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowArModal(false);
                  setArProgress(0);
                  setArComplete(false);
                }}
                className="text-xs text-surface-variant hover:text-white font-bold block mx-auto underline cursor-pointer mt-1"
              >
                Cancel Calibration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Camera Scan Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-deep-navy/95 backdrop-blur-md z-999 flex items-center justify-center p-4">
          <div className="bg-ink-black border border-outline-variant max-w-md w-full rounded-2xl shadow-2xl overflow-hidden text-center text-white p-6 relative font-sans animate-fade-in">
            <h3 className="text-base font-black text-white flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-accent-yellow animate-pulse" />
              {activeTestDetails.title}
            </h3>
            <p className="text-xs text-surface-variant max-w-xs mx-auto mb-4 font-bold uppercase tracking-wider">
              Calibrating depth using <strong>{activeTestDetails.referenceObject}</strong>.
            </p>

            <div className="relative w-full h-72 border border-outline-variant bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center mb-6">
              {scanningState === 1 && (
                <div className="absolute left-0 w-full h-1 bg-accent-yellow shadow-[0_0_15px_#febd69,0_0_30px_#febd69] scan-line z-10"></div>
              )}

              <div className="z-0 relative flex flex-col items-center">
                {activeTestDetails.type === "A4_SPATIAL_SCAN" && (
                  <svg
                    className="w-40 h-56 mx-auto text-accent-yellow animate-pulse"
                    fill="none"
                    viewBox="0 0 100 150"
                  >
                    <rect
                      x="10"
                      y="10"
                      width="80"
                      height="130"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="M 50,20 C 58,20 64,32 64,48 C 64,62 60,78 57,98 C 55,110 53,125 50,125 C 47,125 45,110 43,98 C 40,78 36,62 36,48 C 36,32 42,20 50,20 Z"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="rgba(254, 189, 105, 0.08)"
                    />
                    <circle cx="50" cy="48" r="2.5" fill="currentColor" />
                    <path
                      d="M 25,20 L 25,125"
                      stroke="#facc15"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <path
                      d="M 22,23 L 25,20 L 28,23 M 22,122 L 25,125 L 28,122"
                      stroke="#facc15"
                      strokeWidth="1"
                    />
                    <text
                      x="14"
                      y="75"
                      fill="#facc15"
                      fontSize="7"
                      fontWeight="bold"
                    >
                      29.7cm
                    </text>
                  </svg>
                )}

                {activeTestDetails.type === "FACE_MESH_SCAN" && (
                  <svg
                    className="w-40 h-56 mx-auto text-pink-450 animate-pulse"
                    fill="none"
                    viewBox="0 0 100 150"
                  >
                    <ellipse
                      cx="50"
                      cy="65"
                      rx="30"
                      ry="40"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    <path
                      d="M 35,60 L 45,60 M 55,60 L 65,60 M 50,70 L 50,85 M 42,95 Q 50,103 58,95"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle cx="35" cy="60" r="1.5" fill="currentColor" />
                    <circle cx="65" cy="60" r="1.5" fill="currentColor" />
                    <circle cx="50" cy="78" r="1.5" fill="currentColor" />
                    <rect
                      x="68"
                      y="90"
                      width="22"
                      height="14"
                      rx="2"
                      stroke="#facc15"
                      strokeWidth="1.5"
                      fill="rgba(250, 204, 21, 0.08)"
                    />
                    <path
                      d="M 68,107 L 90,107"
                      stroke="#facc15"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <path
                      d="M 71,110 L 68,107 L 71,104 M 87,110 L 90,107 L 87,104"
                      stroke="#facc15"
                      strokeWidth="1"
                    />
                    <text
                      x="70"
                      y="119"
                      fill="#facc15"
                      fontSize="5"
                      fontWeight="bold"
                    >
                      8.56cm
                    </text>
                  </svg>
                )}

                {activeTestDetails.type === "ROOM_CLEARANCE_SCAN" && (
                  <svg
                    className="w-40 h-56 mx-auto text-amber-500 animate-pulse"
                    fill="none"
                    viewBox="0 0 100 150"
                  >
                    <line
                      x1="5"
                      y1="35"
                      x2="95"
                      y2="35"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="5"
                      y1="120"
                      x2="95"
                      y2="120"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <rect
                      x="30"
                      y="55"
                      width="40"
                      height="65"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="rgba(245, 158, 11, 0.08)"
                    />
                    <line
                      x1="30"
                      y1="55"
                      x2="40"
                      y2="45"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="70"
                      y1="55"
                      x2="80"
                      y2="45"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="40"
                      y="45"
                      width="40"
                      height="65"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="1 1"
                    />
                    <rect
                      x="5"
                      y="45"
                      width="18"
                      height="75"
                      stroke="#facc15"
                      strokeWidth="1.5"
                    />
                    <circle cx="8" cy="82" r="1" fill="#facc15" />
                    <text
                      x="5"
                      y="40"
                      fill="#facc15"
                      fontSize="5"
                      fontWeight="bold"
                    >
                      Door 90cm
                    </text>
                  </svg>
                )}

                <span className="text-[10px] text-surface-variant block mt-2 uppercase font-bold">
                  {scanningState === 1 ? scanLogs : activeTestDetails.helpText}
                </span>
              </div>

              {scanningState === 1 && (
                <div className="absolute bottom-4 left-4 right-4 bg-ink-black border border-outline-variant px-3 py-2 rounded-lg text-left space-y-1">
                  <div className="flex justify-between text-[9px] font-bold text-surface-variant">
                    <span>AI CALIBRATING...</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-accent-yellow h-full transition-all duration-200"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-xs text-surface-variant leading-relaxed px-4 font-semibold">
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
                  className="w-full py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl text-xs shadow-sm border-[0.5px] border-outline-variant cursor-pointer uppercase tracking-wider"
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
                  className="w-full py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl text-xs shadow-sm border-[0.5px] border-outline-variant cursor-pointer uppercase tracking-wider"
                >
                  Apply Calibration & Correct Fit
                </button>
              )}

              <button
                onClick={() => {
                  setShowScannerModal(false);
                  setScanningState(0);
                }}
                className="text-xs text-surface-variant hover:text-white font-bold block mx-auto underline cursor-pointer mt-1"
              >
                Cancel Scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Success Modal */}
      {purchaseSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white border-[0.5px] border-outline-variant rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200 text-black">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
              <Check className="w-8 h-8 text-green-700" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display font-black text-xl text-ink-black uppercase tracking-wide">
                Purchase Confirmed!
              </h2>
              <p className="text-xs text-outline font-semibold leading-relaxed">
                Thank you for choosing to purchase a certified used item, helping prevent waste and reduce carbon emissions.
              </p>
            </div>

            <div className="bg-emerald-50 border-[0.5px] border-emerald-200 p-4 rounded-xl text-xs font-bold text-green-800 flex items-center justify-center gap-2">
              <Leaf className="w-4 h-4 fill-current text-green-700" />
              Eco Reward: Earned +50 Green Credits!
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPurchaseSuccess(false)}
                className="flex-1 py-3 bg-white hover:bg-surface-container text-outline hover:text-ink-black font-extrabold rounded-xl text-xs uppercase tracking-wider border border-outline-variant cursor-pointer transition-colors"
              >
                Close
              </button>
              <Link
                to="/credits"
                className="flex-grow flex-1 py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-extrabold rounded-xl text-xs uppercase tracking-wider border border-[#ffd814] cursor-pointer transition-colors text-center flex items-center justify-center"
              >
                View Credits Hub
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
