// frontend/src/features/seller/AmazonEntryPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, ShoppingCart, ChevronDown, Heart, Sparkles, Leaf } from "lucide-react";

export default function AmazonEntryPage() {
  const navigate = useNavigate();
  const [showPopover, setShowPopover] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const isLoggedIn = localStorage.getItem("is_logged_in") === "true";
  const userStr = localStorage.getItem("logged_in_user");
  const user = userStr ? JSON.parse(userStr) : null;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate("/buyer");
    }
  };

  const handleSecondLifeClick = () => {
    if (isLoggedIn) {
      navigate("/dashboard");
    } else {
      navigate("/signin");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("is_logged_in");
    localStorage.removeItem("logged_in_user");
    window.location.reload();
  };

  return (
    <div className="bg-[#eaeded] min-h-screen font-sans text-[#111]">
      {/* Custom Amazon Header */}
      <header className="bg-[#131921] text-white sticky top-0 z-50 select-none">
        {/* Main Header Row */}
        <div className="flex items-center justify-between px-4 py-2 gap-4 h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-1 border border-transparent hover:border-white p-1 rounded cursor-pointer" onClick={() => navigate("/")}>
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
              amazon<span className="text-[#febd69] font-black">.in</span>
            </span>
            <span className="bg-[#febd69] text-[#131921] text-[9px] font-black px-1 py-0.5 rounded ml-1 tracking-wider uppercase">
              SecondLife
            </span>
          </div>

          {/* Delivery Location */}
          <div className="hidden md:flex flex-col text-left border border-transparent hover:border-white p-1 rounded cursor-pointer">
            <span className="text-[11px] text-gray-300 ml-5 leading-none">Delivering to Bengaluru 562130</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-white shrink-0" />
              <span className="text-sm font-bold leading-none">Update location</span>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-grow max-w-2xl flex items-center h-10 rounded overflow-hidden bg-white">
            <select className="bg-[#f3f3f3] text-gray-700 text-xs px-3 h-full border-r border-gray-300 focus:outline-none cursor-pointer font-medium hover:bg-gray-200">
              <option>All</option>
              <option>Electronics</option>
              <option>Deals</option>
              <option>Circular Hub</option>
            </select>
            <input
              type="text"
              placeholder="Search Amazon.in"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow h-full px-3 text-sm text-black focus:outline-none bg-white font-medium"
            />
            <button type="submit" className="bg-[#febd69] hover:bg-[#f3a847] text-[#131921] h-full px-6 flex items-center justify-center transition-colors border-none cursor-pointer">
              <Search className="w-5 h-5 stroke-[2.5]" />
            </button>
          </form>

          {/* Right Section Links */}
          <div className="flex items-center gap-4 text-xs font-bold">
            
            {/* Language Flag Selector */}
            <div className="hidden lg:flex items-center gap-1 border border-transparent hover:border-white p-2 rounded cursor-pointer">
              <span className="text-lg">🇮🇳</span>
              <span className="uppercase text-white">EN</span>
              <ChevronDown className="w-3 h-3 text-gray-300" />
            </div>

            {/* Account & Lists (With Hover Popover) */}
            <div 
              className="relative border border-transparent hover:border-white p-2 rounded cursor-pointer h-12 flex flex-col justify-center"
              onMouseEnter={() => setShowPopover(true)}
              onMouseLeave={() => setShowPopover(false)}
              onClick={() => setShowPopover(!showPopover)}
            >
              <span className="text-[11px] text-gray-300 font-normal leading-none">
                {isLoggedIn ? `Hello, ${user?.name || "User"}` : "Hello, sign in"}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold leading-none">Account & Lists</span>
                <ChevronDown className="w-3 h-3 text-gray-300" />
              </div>

              {/* Popover Box */}
              {showPopover && (
                <div className="absolute right-0 top-11 bg-white text-black p-6 rounded-lg shadow-xl w-72 border border-gray-300 z-50 text-left font-sans animate-in fade-in duration-100">
                  {!isLoggedIn ? (
                    <div className="text-center mb-4 pb-4 border-b border-gray-200">
                      <Link 
                        to="/signin" 
                        className="inline-block w-full text-center py-2 bg-[#ffd814] hover:bg-[#f7ca00] text-[#111] font-bold rounded-lg border border-[#fcd200] shadow-sm text-sm"
                      >
                        Sign in
                      </Link>
                      <span className="text-xs text-gray-600 mt-2 block">
                        New customer? <Link to="/signin" className="text-blue-600 hover:text-orange-600 hover:underline">Start here.</Link>
                      </span>
                    </div>
                  ) : (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <p className="text-sm font-bold text-gray-800">Your Session Profile</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <button 
                        onClick={handleSignOut} 
                        className="mt-3 w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded border border-gray-300"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 mb-2">Your Lists</h4>
                      <ul className="space-y-1.5 text-xs text-gray-600 font-medium">
                        <li><Link to="/buyer" className="hover:text-orange-600 hover:underline">Create a Wish List</Link></li>
                        <li><Link to="/buyer" className="hover:text-orange-600 hover:underline">Wish from Website</Link></li>
                        <li><Link to="/buyer" className="hover:text-orange-600 hover:underline">Explore Showroom</Link></li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 mb-2">Your Account</h4>
                      <ul className="space-y-1.5 text-xs text-gray-600 font-medium">
                        <li><Link to={isLoggedIn ? "/dashboard" : "/signin"} className="hover:text-orange-600 hover:underline">Your Account</Link></li>
                        <li><Link to={isLoggedIn ? "/dashboard" : "/signin"} className="hover:text-orange-600 hover:underline">Your Orders</Link></li>
                        <li><Link to="/credits" className="hover:text-orange-600 hover:underline">Green Credits Hub</Link></li>
                        <li className="pt-1 border-t border-gray-100 mt-1 font-extrabold text-[#e67a00]">
                          <Link to={isLoggedIn ? "/dashboard" : "/signin"} className="hover:underline">SecondLife Dashboard</Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Returns & Orders */}
            <div 
              onClick={() => navigate(isLoggedIn ? "/dashboard" : "/signin")}
              className="border border-transparent hover:border-white p-2 rounded cursor-pointer h-12 flex flex-col justify-center text-left"
            >
              <span className="text-[11px] text-gray-300 font-normal leading-none">Returns</span>
              <span className="text-sm font-bold leading-none">& Orders</span>
            </div>

            {/* Cart */}
            <div className="flex items-end gap-1.5 border border-transparent hover:border-white p-2 rounded cursor-pointer h-12">
              <div className="relative">
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1 -right-1.5 bg-[#febd69] text-[#131921] rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center font-bold">
                  0
                </span>
              </div>
              <span className="font-bold hidden sm:inline">Cart</span>
            </div>

          </div>
        </div>

        {/* Sub Navbar */}
        <div className="bg-[#232f3e] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between border-t border-gray-700">
          <div className="flex items-center gap-4 overflow-x-auto whitespace-nowrap">
            <span className="cursor-pointer hover:text-[#febd69] flex items-center gap-1">
              <span className="material-symbols-outlined text-sm font-bold">menu</span> All
            </span>
            <span className="cursor-pointer hover:text-[#febd69]">Fresh</span>
            <span className="cursor-pointer hover:text-[#febd69]">MX Player</span>
            <span className="cursor-pointer hover:text-[#febd69]">Sell</span>
            <span className="cursor-pointer hover:text-[#febd69]">Bestsellers</span>
            <span className="cursor-pointer hover:text-[#febd69]">Today's Deals</span>
            <span className="cursor-pointer hover:text-[#febd69]">Mobiles</span>
            <span className="cursor-pointer hover:text-[#febd69]">Prime</span>
            <span className="cursor-pointer hover:text-[#febd69]">New Releases</span>
            <span className="cursor-pointer hover:text-[#febd69]">Customer Service</span>
            <span className="cursor-pointer hover:text-[#febd69]">Electronics</span>
            <span className="cursor-pointer hover:text-[#febd69]">Amazon Pay</span>
            <span className="cursor-pointer hover:text-[#febd69]">Fashion</span>
          </div>
          <div className="text-[11px] text-[#febd69] hidden md:block">
            MADE IN INDIA | A TITAN STORY
          </div>
        </div>
      </header>

      {/* Main Home Page Content */}
      <main className="max-w-7xl mx-auto p-4 space-y-6 select-none">
        
        {/* Cookware Carousel Banner */}
        <div className="relative w-full rounded-md overflow-hidden bg-gradient-to-r from-[#e3fafc] via-[#ffe3e3] to-[#fff3bf] border border-gray-200">
          <div className="p-8 md:p-12 max-w-xl text-left space-y-4">
            <div className="bg-red-600 text-white font-bold text-xs uppercase px-2.5 py-1 rounded inline-block">
              Home Shopping spree
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-[#131921] leading-tight">
              Starting ₹499
            </h1>
            <p className="text-sm md:text-base text-gray-700 font-semibold">
              Cookware, water bottles, mixers & more essential products for your kitchen and home.
            </p>
            <div className="flex items-center gap-2">
              <span className="bg-[#febd69] text-[#131921] px-3.5 py-1.5 rounded text-xs font-black uppercase">
                Free Delivery
              </span>
              <span className="text-xs text-gray-500 font-bold">Up to ₹750 cashback*</span>
            </div>
          </div>
          {/* Mock graphics right side */}
          <div className="absolute right-8 bottom-0 top-0 w-1/2 hidden md:flex items-center justify-center">
            <img 
              src="https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=500" 
              alt="Cookware Collection" 
              className="h-[80%] rounded-xl shadow-lg border border-white/40 object-cover"
            />
          </div>
        </div>

        {/* 4 Cards Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Appliances */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-extrabold text-lg text-black mb-3">Appliances for your home | Up to 55% off</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=200" alt="AC" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Air Conditioners</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1571175432246-e324c52be9a1?w=200" alt="Fridge" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Refrigerators</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=200" alt="Microwave" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Microwaves</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=200" alt="Washing" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Washing Machines</span>
                </div>
              </div>
            </div>
            <Link to="/buyer" className="text-xs text-blue-600 font-bold hover:text-orange-600 hover:underline mt-4 block">See more appliances</Link>
          </div>

          {/* Card 2: Revamp home */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-extrabold text-lg text-black mb-3">Revamp your home in style</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=200" alt="Cushions" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Cushion covers</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1617806118233-18e1db207f62?w=200" alt="Figurines" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Figurines & decor</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=200" alt="Storage" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Organizers</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=200" alt="Lighting" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Modern lighting</span>
                </div>
              </div>
            </div>
            <Link to="/buyer" className="text-xs text-blue-600 font-bold hover:text-orange-600 hover:underline mt-4 block">Explore all styles</Link>
          </div>

          {/* Card 3: Baby Care */}
          <div className="bg-white p-5 rounded-lg border border-gray-200 flex flex-col justify-between shadow-sm">
            <div>
              <h3 className="font-extrabold text-lg text-black mb-3">Up to 50% off | Baby care & toys</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1515488042361-404e9250afef?w=200" alt="Toys" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Activity toys</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=200" alt="Diapers" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Diapers & wipes</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=200" alt="Puzzles" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Puzzles & games</span>
                </div>
                <div className="space-y-1">
                  <div className="aspect-square bg-gray-100 rounded overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1544202901-241578c28f52?w=200" alt="Strollers" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 block">Ride ons</span>
                </div>
              </div>
            </div>
            <Link to="/buyer" className="text-xs text-blue-600 font-bold hover:text-orange-600 hover:underline mt-4 block">Shop baby collection</Link>
          </div>

          {/* Card 4: SecondLife Circular Hub (Direct Integration) */}
          <div className="bg-[#131921] text-white p-5 rounded-lg border border-gray-800 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
              <Leaf className="w-48 h-48 text-green-500 fill-current" />
            </div>
            
            <div className="relative z-10 space-y-4 text-left">
              <div className="flex items-center gap-2 text-green-400 font-black text-xs uppercase tracking-wider">
                <Leaf className="w-4 h-4 fill-current animate-pulse" />
                SecondLife Circular Hub
              </div>
              <h3 className="font-extrabold text-lg text-white leading-tight">
                Divert Unused Items & Support Local NGOs
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold">
                Submit items you want to donate or return. Our AI system matches them with active NGO drives. Save CO₂ emissions and earn Green Credits!
              </p>
              
              <div className="space-y-2 text-xs font-semibold text-gray-300">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                  <span>Gemini AI-vision grading</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />
                  <span>Direct match with NGO needs</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSecondLifeClick}
              className="relative z-10 w-full text-center py-2.5 bg-[#ffd814] hover:bg-[#f7ca00] text-[#111] font-bold rounded-lg border border-[#fcd200] shadow-sm text-xs uppercase tracking-wide transition-colors cursor-pointer mt-6"
            >
              {isLoggedIn ? "Go to Your Dashboard" : "Sign In & Get Started"}
            </button>
          </div>

        </div>

      </main>

      {/* Subtle footer */}
      <footer className="mt-16 bg-[#232f3e] text-white text-xs py-8 border-t border-gray-700">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-2 select-none">
          <p>© 1996-2026, Amazon.com, Inc. or its affiliates. All rights reserved.</p>
          <p className="text-gray-400 leading-relaxed">
            SecondLife Circular Commerce Returns grading platform verified by Google Gemini AI vision.
          </p>
        </div>
      </footer>
    </div>
  );
}
