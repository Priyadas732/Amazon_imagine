// frontend/src/features/seller/Partners.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import { getItem, updateItem } from "../../services/api";
import { 
  MapPin, 
  ArrowRight, 
  FileText, 
  HelpCircle, 
  Globe, 
  SlidersHorizontal,
  ChevronDown,
  Clock,
  Heart,
  Leaf,
  X
} from "lucide-react";

const REFURBISHERS = [
  {
    id: "refurb-1",
    name: "GreenCircuit Tech",
    location: "Bangalore, KA",
    logo: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120",
    status: "VERIFIED",
    capacity: "1,250 Units",
    capacityPct: 75,
    wishlist: ["Sony WH-1000XM5", "Dyson V12", "+3 more"],
    matchScore: 92,
    buybackRate: "₹14,500"
  },
  {
    id: "refurb-2",
    name: "Renew Hub Solutions",
    location: "Gurugram, HR",
    logo: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=120",
    status: "VERIFIED",
    capacity: "2,800 Units",
    capacityPct: 40,
    wishlist: ["Sony Headphones", "Dyson Vacuum"],
    matchScore: 85,
    buybackRate: "₹22,800"
  },
  {
    id: "refurb-3",
    name: "EcoSwap Logistics",
    location: "Mumbai, MH",
    logo: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=120",
    status: "PENDING",
    capacity: "900 Units",
    capacityPct: 90,
    wishlist: ["Sony WH-1000XM5", "Bose QC45"],
    matchScore: 78,
    buybackRate: "₹9,200"
  }
];

const NGOS = [
  {
    id: "ngo-1",
    name: "GreenEarth Foundation",
    location: "Mumbai",
    logo: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=120",
    valueBadge: "High Value",
    tags: ["Environment", "CSR Approved", "Eco-Aware"],
    description: "Dedicated to restoring ecosystems through community action, recycling initiatives, and native tree plantation. We focus on transforming post-consumer waste into secondary raw materials.",
    focusArea: "Environmental restoration, plastic recycling, waste auditing, and community engagement.",
    acceptedItems: "Paper, Cardboard, Non-hazardous plastics, and recyclable packaging."
  },
  {
    id: "ngo-2",
    name: "TechForGood",
    location: "Bengaluru",
    logo: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=120",
    valueBadge: "Medium Value",
    tags: ["Education", "Digital Literacy", "STEM"],
    description: "Bridging the digital divide by refurbishing discarded electronics and distributing them to rural schools and digital literacy centers. We build future-ready learning spaces.",
    focusArea: "Bridging the digital divide, refurbishing electronic devices, and STEM education support.",
    acceptedItems: "Laptops, Tablets, Smartphones, and desktop components."
  },
  {
    id: "ngo-3",
    name: "Circular Kids",
    location: "Pune",
    logo: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=120",
    valueBadge: "High Value",
    tags: ["Child Welfare", "Circular Economy", "CSR Approved"],
    description: "Creating positive impacts for underprivileged children by upcycling textiles, toys, and educational books. Our circular models foster child development and reduce textile landfill waste.",
    focusArea: "Upcycling clothes, safe toy distribution, and promoting circular economy in early education.",
    acceptedItems: "Toys, Children's clothing, footwear, books, and educational kits."
  }
];

const FALLBACK_DONATIONS = [
  {
    itemId: "donated-fallback-1",
    model: "Levi's 501 Original Fit Jeans (32W)",
    category: "clothing",
    grade: "Like New",
    ngoName: "Goonj NGO (Winter Drive)",
    date: "2 hours ago",
    impactText: "Assigned to regional clothing distribution camps.",
    co2Saved: "1.2 kg",
    photo: "https://m.media-amazon.com/images/I/81JFxMv1VNL._AC_SL1500_.jpg"
  },
  {
    itemId: "donated-fallback-2",
    model: "Adidas Ultraboost 22 (Size 10)",
    category: "footwear",
    grade: "Good",
    ngoName: "ShareAtDoorStep (Back-to-School)",
    date: "Yesterday",
    impactText: "Routed for regional footwear distribution camps.",
    co2Saved: "0.9 kg",
    photo: "https://m.media-amazon.com/images/I/71rRgqRxqOL._AC_SL1500_.jpg"
  },
  {
    itemId: "donated-fallback-3",
    model: "Sony WH-1000XM5 Wireless Headphones",
    category: "electronics",
    grade: "Very Good",
    ngoName: "TechForGood (Digital Literacy)",
    date: "3 days ago",
    impactText: "Assigned to digital literacy lab for underserved students.",
    co2Saved: "1.4 kg",
    photo: "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg"
  }
];

export default function Partners({ role }) {
  const [activeTab, setActiveTab] = useState("refurbishers"); // "refurbishers" | "ngos" | "donations"

  const queryParams = new URLSearchParams(window.location.search);
  const targetItemId = queryParams.get("itemId");
  const mode = queryParams.get("mode");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedNgo, setCompletedNgo] = useState("");
  const [selectedNgoInfo, setSelectedNgoInfo] = useState(null);

  // Automatically switch tab to "ngos" when routing a donation
  React.useEffect(() => {
    if (targetItemId && mode === "donate") {
      setActiveTab("ngos");
    }
  }, [targetItemId, mode]);

  // Query details of the specific item being routed for donation
  const { data: donateItem } = useQuery({
    queryKey: ["item", targetItemId, role],
    queryFn: () => getItem(targetItemId, role),
    enabled: !!targetItemId,
  });

  const handleCompleteDonation = async (ngo) => {
    try {
      await updateItem(targetItemId, {
        status: "donated",
        disposition: "Donate",
        extraCredits: 150,
        dispositionMatch: {
          partner: ngo.name,
          target: `Direct transfer to ${ngo.name} charity ledger`,
          action: `Dispatched to ${ngo.name} center for immediate community redistribution.`,
          creditsBonus: 150
        }
      }, role);
      setCompletedNgo(ngo.name);
      setShowSuccessModal(true);
    } catch (err) {
      alert(`Failed to complete donation: ${err.message}`);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Clear URL params without forcing reload
    window.history.pushState({}, document.title, window.location.pathname);
    setActiveTab("donations");
  };

  // Read session-graded items from localStorage to display real-time donations
  const getSessionItemIds = () => {
    try {
      const items = localStorage.getItem("graded_return_ids");
      return items ? JSON.parse(items) : [];
    } catch {
      return [];
    }
  };

  const sessionIds = getSessionItemIds();

  // Perform parallel fetches for all listed DynamoDB IDs
  const itemQueries = useQueries({
    queries: sessionIds.map((itemId) => ({
      queryKey: ["item", itemId, role],
      queryFn: () => getItem(itemId, role),
      retry: false,
      staleTime: 60000,
    })),
  });

  // Filter successfully loaded items that have status === "donated"
  const donatedDbItems = itemQueries
    .filter((q) => q.isSuccess && q.data)
    .map((q) => q.data)
    .filter((item) => item.status === "donated" || item.grade?.disposition === "Donate")
    .map((item) => ({
      itemId: item.itemId,
      model: item.provided?.model || item.category || "Donated Product",
      category: item.category,
      grade: item.grade?.grade || "Good",
      ngoName: item.dispositionMatch?.partner || "Goonj NGO",
      date: "Just now",
      impactText: item.dispositionMatch?.action || "Routed directly to partner NGO catalog.",
      co2Saved: item.co2Saved ? `${item.co2Saved} kg` : "1.1 kg",
      photo: item.photos?.[0] || "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg"
    }));

  const allDonatedListings = [...donatedDbItems, ...FALLBACK_DONATIONS];

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans relative">
      
      {/* Header Section & Toggle */}
      <div className="flex flex-col items-center mb-10 text-center">
        <h1 className="font-display font-extrabold text-3xl text-ink-black mb-4">
          Circular Ecosystem Partners
        </h1>
        <p className="text-outline text-sm font-semibold max-w-2xl mb-6">
          Connect with verified recyclers, refurbishers, and non-profits to divert items from landfills and maximize circular recovery payouts.
        </p>
        
        {/* Toggle Switch */}
        <div className="inline-flex bg-surface-container p-1 rounded-xl border border-outline-variant select-none">
          <button 
            type="button"
            onClick={() => setActiveTab("refurbishers")}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "refurbishers"
                ? "bg-white text-ink-black shadow-sm border border-outline-variant/30"
                : "text-outline hover:text-ink-black"
            }`}
          >
            Refurbishers
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("ngos")}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "ngos"
                ? "bg-white text-ink-black shadow-sm border border-outline-variant/30"
                : "text-outline hover:text-ink-black"
            }`}
          >
            NGO Partners
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("donations")}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "donations"
                ? "bg-white text-ink-black shadow-sm border border-outline-variant/30"
                : "text-outline hover:text-ink-black"
            }`}
          >
            Donation Registry
          </button>
        </div>
      </div>

      {/* Active Donation Item Banner */}
      {activeTab === "ngos" && donateItem && (
        <div className="mb-8 p-6 bg-amber-50/20 border-[0.5px] border-secondary-container rounded-xl flex items-center justify-between flex-wrap gap-4 shadow-none select-none">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white border border-outline-variant rounded-xl overflow-hidden shrink-0">
              <img src={donateItem.photos?.[0] || "https://m.media-amazon.com/images/I/51aXvjzcukL._AC_SL1500_.jpg"} alt={donateItem.provided?.model} className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-secondary-container uppercase tracking-wider block">
                Active Donation Item
              </span>
              <h2 className="font-display font-extrabold text-base text-ink-black">{donateItem.provided?.model || donateItem.category}</h2>
              <p className="text-xs text-outline font-semibold mt-0.5">Grade: <span className="text-secondary font-black">{donateItem.grade?.grade || "Good"}</span> • Ready for Direct NGO Handshake</p>
            </div>
          </div>
          <div className="bg-white px-3.5 py-1.5 rounded-lg border border-outline-variant text-[10px] font-bold text-outline uppercase tracking-wider">
            Select matching NGO recipient below to finalize transfer.
          </div>
        </div>
      )}

      {/* Community Impact Dashboard (Only shown for NGOs) */}
      {activeTab === "ngos" && (
        <section className="mb-10 select-none">
          <h2 className="font-display font-extrabold text-lg text-ink-black mb-4 uppercase tracking-wider">
            Community Impact Ledger
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border-[0.5px] border-outline-variant rounded-xl p-6 flex items-center gap-5">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center shrink-0 border border-green-100">
                <span className="text-green-700 font-bold font-display text-xl">CO₂</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-0.5">Carbon Offset Metric</p>
                <h3 className="font-display font-black text-xl text-ink-black">12.4 Tons CO₂ Saved</h3>
              </div>
            </div>
            
            <div className="bg-white border-[0.5px] border-outline-variant rounded-xl p-6 flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center shrink-0 border border-blue-100">
                <span className="text-link-blue font-bold font-display text-xl">📦</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-0.5">Total Assets Diverted</p>
                <h3 className="font-display font-black text-xl text-ink-black">4,500 Items Rehomed</h3>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between mb-6 gap-4 select-none">
        <div className="flex gap-3">
          <div className="bg-white border border-outline-variant rounded-xl px-4 py-2 flex items-center gap-1.5 cursor-pointer hover:bg-surface-bright text-xs font-bold text-ink-black">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Capacity: 500+</span>
            <ChevronDown className="w-3 h-3 text-outline" />
          </div>
          <div className="bg-white border border-outline-variant rounded-xl px-4 py-2 flex items-center gap-1.5 cursor-pointer hover:bg-surface-bright text-xs font-bold text-ink-black">
            <span>Location: Tier 1</span>
            <ChevronDown className="w-3 h-3 text-outline" />
          </div>
        </div>
        <p className="text-[10px] text-outline font-bold uppercase tracking-wider">
          {activeTab === "donations" 
            ? `Showing ${allDonatedListings.length} Donation Records` 
            : `Showing ${activeTab === "refurbishers" ? REFURBISHERS.length : NGOS.length} Verified Partners`
          }
        </p>
      </div>

      {/* Grid of Partners or Donations */}
      {activeTab !== "donations" ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Refurbishers list */}
            {activeTab === "refurbishers" && REFURBISHERS.map((refurb) => (
              <div 
                key={refurb.id} 
                className="bg-white border border-outline-variant rounded-xl p-6 transition-all duration-200 hover:border-secondary-container flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant shrink-0 bg-surface-container-low flex items-center justify-center">
                        <img 
                          src={refurb.logo} 
                          alt={refurb.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=120";
                          }}
                        />
                      </div>
                      <div>
                        <h3 className="font-display font-extrabold text-sm text-ink-black">{refurb.name}</h3>
                        <div className="flex items-center text-outline gap-0.5 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">{refurb.location}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      refurb.status === "VERIFIED"
                        ? "bg-green-150 text-green-800 border border-green-200"
                        : "bg-surface-variant text-on-surface-variant border border-outline-variant"
                    }`}>
                      {refurb.status}
                    </span>
                  </div>

                  {/* Capacity Progress */}
                  <div className="mb-4 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold">
                      <span className="text-outline">Monthly Capacity</span>
                      <span className="text-ink-black">{refurb.capacity}</span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-1.5">
                      <div 
                        className="bg-secondary-container h-1.5 rounded-full" 
                        style={{ width: `${refurb.capacityPct}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Wishlist Matches */}
                  <div className="mb-6">
                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">Target Refurb Wishlist</p>
                    <div className="flex flex-wrap gap-1.5">
                      {refurb.wishlist.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="bg-link-blue/10 text-link-blue border border-link-blue/20 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom details */}
                <div className="pt-4 border-t border-surface-container">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-bold text-outline uppercase tracking-wider mb-1">Match Score</p>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-surface-container rounded-full h-1.5 overflow-hidden">
                          <div className="bg-green-600 h-full rounded-full" style={{ width: `${refurb.matchScore}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-green-600">{refurb.matchScore}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-outline uppercase tracking-wider mb-0.5">Est Buyback Rate</p>
                      <p className="font-display font-black text-sm text-ink-black">{refurb.buybackRate} <span className="text-[9px] font-semibold text-outline">/ avg</span></p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* NGOs list */}
            {activeTab === "ngos" && NGOS.map((ngo) => {
              const isMatch = donateItem && (ngo.categories ? ngo.categories.includes(donateItem.category) : true);
              return (
                <div 
                  key={ngo.id} 
                  className={`border rounded-xl p-6 transition-all duration-200 hover:border-secondary-container flex flex-col justify-between relative ${
                    isMatch ? "border-green-600 bg-emerald-50/10 best-route-glow shadow-sm" : "border-outline-variant bg-white"
                  }`}
                >
                  {isMatch && (
                    <span className="absolute -top-3 left-6 bg-green-700 text-white px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 select-none">
                      <Heart className="w-2.5 h-2.5 fill-current text-red-400" /> RECOMMENDED MATCH
                    </span>
                  )}
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant shrink-0 bg-surface-container-low flex items-center justify-center">
                          <img 
                            src={ngo.logo} 
                            alt={ngo.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=120";
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="font-display font-extrabold text-sm text-ink-black">{ngo.name}</h3>
                          <div className="flex items-center text-outline gap-0.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{ngo.location}</span>
                          </div>
                        </div>
                      </div>
                      <span className="bg-green-50 text-green-800 border border-green-200 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {ngo.valueBadge}
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-6 h-12 content-start">
                      {ngo.tags.map((tag, idx) => (
                        <span 
                          key={idx} 
                          className="bg-surface-container border border-outline-variant text-outline px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {donateItem ? (
                    <button 
                      type="button"
                      onClick={() => handleCompleteDonation(ngo)}
                      className="w-full bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-1 uppercase text-xs tracking-wider border-[0.5px] border-outline-variant cursor-pointer"
                    >
                      Complete Donation Transfer <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setSelectedNgoInfo(ngo)}
                      className="w-full bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-1 uppercase text-xs tracking-wider border-[0.5px] border-outline-variant cursor-pointer"
                    >
                      Know More <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination or view all */}
          <div className="mt-10 flex justify-center select-none">
            <button 
              type="button"
              className="bg-white border border-primary-container text-primary-container px-10 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-surface-container transition-colors cursor-pointer"
            >
              View All {activeTab === "refurbishers" ? "Refurbishers" : "NGO Partners"}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border-[0.5px] border-outline-variant p-6 rounded-xl select-none">
            <h2 className="font-display font-extrabold text-lg text-ink-black mb-1">Donated Items Registry</h2>
            <p className="text-xs text-outline font-semibold">Real-time ledger of items audited by VLM and dispatched directly to NGO partners.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allDonatedListings.map((donation) => (
              <div 
                key={donation.itemId}
                className="bg-white border border-outline-variant rounded-xl p-6 transition-all duration-200 hover:border-secondary-container flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-4 mb-4">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low shrink-0 flex items-center justify-center">
                      <img 
                        src={donation.photo} 
                        alt={donation.model} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                          Donated
                        </span>
                        <span className="bg-surface-container border border-outline-variant text-outline text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                          {donation.grade}
                        </span>
                      </div>
                      <h3 className="font-display font-extrabold text-xs text-ink-black leading-tight">{donation.model}</h3>
                    </div>
                  </div>
                  
                  <div className="bg-surface-container-low p-3.5 rounded-lg border-[0.5px] border-outline-variant text-[11px] font-semibold text-outline space-y-1 leading-relaxed">
                    <div className="flex items-center gap-1 text-link-blue font-bold uppercase text-[9px] tracking-wider mb-1">
                      <Heart className="w-3.5 h-3.5 fill-current text-red-500" />
                      NGO Recipient: {donation.ngoName}
                    </div>
                    <p className="font-medium text-ink-black">{donation.impactText}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-container mt-6 flex justify-between items-center text-[10px] font-bold text-outline select-none">
                  <span className="flex items-center gap-1 text-green-700">
                    <Leaf className="w-3.5 h-3.5 fill-current" />
                    Saved {donation.co2Saved} CO₂
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {donation.date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NGO Registration Call to Action */}
      {activeTab === "ngos" && (
        <section className="mt-16 bg-primary-container border-[0.5px] border-outline-variant rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute right-0 bottom-0 opacity-10 select-none">
            <span className="material-symbols-outlined text-[180px] font-light">handshake</span>
          </div>
          
          <div className="space-y-3 relative z-10 max-w-xl">
            <h2 className="font-display font-black text-2xl text-accent-yellow">
              Want to become a Partner NGO?
            </h2>
            <p className="text-surface-variant text-sm font-semibold leading-relaxed">
              Join our network of verified organizations to receive tech donations, furniture lists, or clothing supplies directly from logistics returns databases.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button 
                type="button"
                className="bg-accent-yellow hover:bg-[#fecb8d] text-ink-black font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
              >
                Register Organization
              </button>
              <button 
                type="button"
                className="border border-white hover:bg-white/10 text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer bg-transparent"
              >
                View Eligibility
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-white border-[0.5px] border-outline-variant rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto border border-green-200">
              <Heart className="w-8 h-8 fill-current text-red-500 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="font-display font-black text-xl text-ink-black uppercase tracking-wide">
                Donation Dispatched!
              </h2>
              <p className="text-xs text-outline font-semibold">
                Your <strong className="text-ink-black">{donateItem?.provided?.model || donateItem?.category}</strong> has been successfully matched and transferred to the custody of <strong className="text-link-blue">{completedNgo}</strong>.
              </p>
            </div>
            
            <div className="bg-emerald-50 border-[0.5px] border-emerald-250 p-4 rounded-xl text-xs font-bold text-green-800 flex items-center justify-center gap-2">
              <Leaf className="w-4 h-4 fill-current text-green-700" />
              Earned +150 Extra Climate Credits!
            </div>

            <button 
              onClick={handleCloseSuccessModal}
              className="w-full py-3.5 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-extrabold rounded-xl text-xs uppercase tracking-widest border border-outline-variant cursor-pointer"
            >
              Go to Donation Registry
            </button>
          </div>
        </div>
      )}

      {/* NGO Details Modal */}
      {selectedNgoInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white border-[0.5px] border-outline-variant rounded-2xl max-w-lg w-full p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button 
              type="button"
              onClick={() => setSelectedNgoInfo(null)}
              className="absolute top-4 right-4 text-outline hover:text-ink-black transition-colors p-1.5 rounded-full hover:bg-surface-container"
            >
              <X className="w-5 h-5" />
            </button>

            {/* NGO Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-outline-variant shrink-0 bg-surface-container-low flex items-center justify-center">
                <img 
                  src={selectedNgoInfo.logo} 
                  alt={selectedNgoInfo.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=120";
                  }}
                />
              </div>
              <div className="text-left">
                <span className="bg-green-50 text-green-800 border border-green-200 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block">
                  {selectedNgoInfo.valueBadge}
                </span>
                <h2 className="font-display font-black text-xl text-ink-black">{selectedNgoInfo.name}</h2>
                <div className="flex items-center text-outline gap-0.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{selectedNgoInfo.location}</span>
                </div>
              </div>
            </div>

            {/* Details Content */}
            <div className="space-y-4 text-left mb-8">
              <div>
                <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Our Mission</h4>
                <p className="text-xs text-ink-black leading-relaxed font-medium">
                  {selectedNgoInfo.description}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Primary Focus</h4>
                <p className="text-xs text-ink-black leading-relaxed font-medium">
                  {selectedNgoInfo.focusArea}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Accepting Contributions</h4>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {selectedNgoInfo.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="bg-surface-container border border-outline-variant text-outline px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-outline font-semibold mt-2">
                  <strong className="text-ink-black">Specifically needed:</strong> {selectedNgoInfo.acceptedItems}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedNgoInfo(null)}
                className="flex-1 py-3 bg-white hover:bg-surface-container text-outline hover:text-ink-black font-extrabold rounded-xl text-xs uppercase tracking-wider border border-outline-variant cursor-pointer transition-colors"
              >
                Close Info
              </button>
              <Link 
                to="/seller/return"
                className="flex-1 py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-extrabold rounded-xl text-xs uppercase tracking-wider border border-outline-variant cursor-pointer text-center flex items-center justify-center gap-1 transition-colors"
              >
                Initiate Return / Donation <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
