// frontend/src/features/seller/CustomerDashboard.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Leaf, Clock, ArrowRight, ShieldCheck, Award, TrendingUp, Trash2 } from "lucide-react";
import { getItem } from "../../services/api";

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [donations, setDonations] = useState([]);

  // Mock static donations — curated for demo
  const defaultDonations = [
    {
      itemId: "donated-fallback-1",
      model: "Levi's 501 Original Fit Jeans (32W)",
      category: "clothing",
      grade: "Like New",
      ngoName: "Goonj",
      date: "2 hours ago",
      status: "Dispatched",
      credits: 300,
      co2: "1.2"
    },
    {
      itemId: "donated-fallback-2",
      model: "Adidas Ultraboost 22 (Size 10)",
      category: "footwear",
      grade: "Good",
      ngoName: "ShareAtDoorStep",
      date: "Yesterday",
      status: "Match Found",
      credits: 300,
      co2: "0.9"
    }
  ];

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("is_logged_in") === "true";
    if (!isLoggedIn) {
      navigate("/signin");
      return;
    }

    const userStr = localStorage.getItem("logged_in_user");
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    // Load any donations created in local storage
    try {
      const storedIds = localStorage.getItem("graded_return_ids");
      const list = storedIds ? JSON.parse(storedIds) : [];
      
      // Let's load the actual item records from API for full integration
      const fetchStoredItems = async () => {
        const items = [];
        for (const id of list) {
          try {
            const item = await getItem(id, "seller");
            if (item) {
              items.push({
                itemId: item.itemId,
                model: item.provided?.model || item.category || "Donation Item",
                category: item.category,
                grade: item.grade?.grade || "Good",
                ngoName: item.dispositionMatch?.partner || "Goonj NGO",
                date: "Just now",
                status: item.status === "donated" ? "Dispatched" : "Match Found",
                credits: 300,
                co2: item.co2Saved || "1.1"
              });
            }
          } catch (e) {
            console.error("Failed to load item", id, e);
          }
        }
        setDonations([...items, ...defaultDonations]);
      };
      
      fetchStoredItems();
    } catch (e) {
      setDonations(defaultDonations);
    }
  }, [navigate]);

  if (!user) {
    return (
      <div className="py-20 text-center text-gray-500 font-semibold">
        Loading customer session...
      </div>
    );
  }

  // Calculate totals
  const totalCredits = donations.reduce((sum, item) => sum + (item.status === "Dispatched" ? item.credits : 0), 450);
  const totalCo2 = donations.reduce((sum, item) => sum + (item.status === "Dispatched" ? parseFloat(item.co2) : 0), 12.4).toFixed(1);

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans space-y-8 select-none">
      
      {/* Welcome Banner */}
      <div className="bg-[#131921] text-white rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md border-[0.5px] border-outline-variant">
        <div className="space-y-2 text-left">
          <span className="bg-[#febd69] text-[#131921] px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
            Prime Member
          </span>
          <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white">
            Welcome Back, {user.name}!
          </h1>
          <p className="text-xs text-gray-300 font-semibold leading-relaxed">
            Manage your Amazon circular commerce activity, view climate badges, and matches for NGO drives.
          </p>
        </div>
        
        <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-xl text-left shrink-0">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Logged in as</span>
          <span className="text-sm font-bold text-white block">{user.email}</span>
          <Link to="/" className="text-xs text-[#febd69] hover:underline mt-2 inline-block">Go to Amazon Shopping</Link>
        </div>
      </div>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Credits */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center shrink-0 border border-green-100">
            <Leaf className="w-7 h-7 text-green-700 fill-current" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Climate Balance</span>
            <h3 className="font-display font-black text-2xl text-ink-black">{totalCredits} Credits</h3>
            <span className="text-[10px] text-green-600 font-bold">Ready to redeem at checkout</span>
          </div>
        </div>

        {/* CO2 offset */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center shrink-0 border border-blue-100">
            <Award className="w-7 h-7 text-link-blue" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Carbon Diverted</span>
            <h3 className="font-display font-black text-2xl text-ink-black">{totalCo2} kg CO₂</h3>
            <span className="text-[10px] text-blue-600 font-bold">100% landfill diversion rate</span>
          </div>
        </div>

        {/* Level badge */}
        <div className="bg-white border border-outline-variant rounded-xl p-6 flex items-center gap-5 shadow-sm">
          <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center shrink-0 border border-amber-100">
            <TrendingUp className="w-7 h-7 text-[#e68a00]" />
          </div>
          <div className="text-left">
            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">Eco Standing</span>
            <h3 className="font-display font-black text-2xl text-ink-black">Eco Champion</h3>
            <span className="text-[10px] text-[#e68a00] font-bold">Top 5% of regional donors</span>
          </div>
        </div>

      </section>

      {/* Main Donation Hub Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Call to Donate */}
        <div className="lg:col-span-4 bg-white border border-outline-variant rounded-xl p-6 flex flex-col justify-between shadow-sm">
          <div className="space-y-4 text-left">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center border border-red-100">
              <Heart className="w-6 h-6 fill-current" />
            </div>
            <h2 className="font-display font-extrabold text-lg text-ink-black">NGO Donation Center</h2>
            <p className="text-xs text-outline leading-relaxed font-semibold">
              Have clothing, old tech, shoes, or books lying around? Give them a second life. Submit an inspection request and match with current NGO drives.
            </p>
            <div className="bg-surface-container p-3 rounded-lg border border-outline-variant text-[11px] font-medium text-outline space-y-1.5">
              <div className="flex items-center gap-1.5 text-green-700 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Handshake Ledger</span>
              </div>
              <p>All donations are directly logged onto the secure verification registry, ensuring items reach communities in need.</p>
            </div>
          </div>
          
          <button
            onClick={() => navigate("/donate")}
            className="w-full text-center py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-extrabold rounded-xl text-xs uppercase tracking-wider border border-outline-variant cursor-pointer transition-colors mt-6 flex items-center justify-center gap-1.5"
          >
            Initiate NGO Donation <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Circular Commerce Portal Links */}
        <div className="lg:col-span-8 bg-white border border-outline-variant rounded-xl p-8 shadow-sm flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-surface-container pb-4 text-left">
              <h2 className="font-display font-extrabold text-base text-ink-black uppercase tracking-wider">
                Manage Circular Returns & Actions
              </h2>
              <p className="text-xs text-outline font-medium mt-1">
                Select a portal section below to manage your graded items, view partner registries, or redeem earned credits.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Option 1: Matches & Handshakes */}
              <Link 
                to="/partners" 
                className="p-5 border border-outline-variant rounded-xl hover:border-secondary-container transition-colors bg-surface-container-low text-left space-y-2 block"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xl">🤝</span>
                  <span className="bg-amber-100 text-amber-800 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {donations.filter(d => d.status === "Match Found").length} Matches Found
                  </span>
                </div>
                <h3 className="font-display font-bold text-sm text-ink-black">Complete NGO Handshakes</h3>
                <p className="text-[11px] text-outline leading-normal font-medium">
                  Complete transfer procedures for items matched with active NGO community programs.
                </p>
              </Link>

              {/* Option 2: Donation Registry */}
              <Link 
                to="/partners"
                className="p-5 border border-outline-variant rounded-xl hover:border-secondary-container transition-colors bg-surface-container-low text-left space-y-2 block"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xl">📋</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                    {donations.filter(d => d.status === "Dispatched").length} Dispatched
                  </span>
                </div>
                <h3 className="font-display font-bold text-sm text-ink-black">Donation Registry Ledger</h3>
                <p className="text-[11px] text-outline leading-normal font-medium">
                  View the real-time circular tracking registry of donated items, CO₂ offsets, and NGO audits.
                </p>
              </Link>

              {/* Option 3: Return & Grade Form */}
              <Link 
                to="/seller/return"
                className="p-5 border border-outline-variant rounded-xl hover:border-secondary-container transition-colors bg-surface-container-low text-left space-y-2 block"
              >
                <span className="text-xl block">⚡</span>
                <h3 className="font-display font-bold text-sm text-ink-black">Initiate Returns & AI Grading</h3>
                <p className="text-[11px] text-outline leading-normal font-medium">
                  Access the vision grading pipeline. Submit product photos to evaluate condition and optimal routing.
                </p>
              </Link>

              {/* Option 4: Credits Hub */}
              <Link 
                to="/credits"
                className="p-5 border border-outline-variant rounded-xl hover:border-secondary-container transition-colors bg-surface-container-low text-left space-y-2 block"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xl">🌱</span>
                  <span className="text-green-700 text-[10px] font-bold">
                    {totalCredits} Cr Balance
                  </span>
                </div>
                <h3 className="font-display font-bold text-sm text-ink-black">Green Credits & Eco Rewards</h3>
                <p className="text-[11px] text-outline leading-normal font-medium">
                  View your eco balance, check criteria checklists, and redeem vouchers or carbon offsets.
                </p>
              </Link>

            </div>
          </div>

          <div className="pt-6 border-t border-surface-container mt-6 flex justify-end">
            <span className="text-xs text-outline font-bold uppercase tracking-wider">
              Amazon SecondLife Certified Ecosystem
            </span>
          </div>
        </div>

      </section>

    </div>
  );
}
