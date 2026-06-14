import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, MapPin, ShoppingCart, ChevronDown } from "lucide-react";

export default function AmazonHeader() {
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

  const handleSignOut = () => {
    localStorage.removeItem("is_logged_in");
    localStorage.removeItem("logged_in_user");
    window.location.reload();
  };

  return (
    <header className="bg-[#131921] text-white sticky top-0 z-50 select-none font-sans">
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
              <div className="absolute right-0 top-11 bg-white text-black rounded-lg shadow-xl w-[560px] border border-gray-300 z-50 text-left font-sans animate-in fade-in duration-100">
                {/* Top section — sign in or profile */}
                <div className="p-6 pb-0">
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
                        className="mt-3 w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded border border-gray-300 cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Two-column grid */}
                <div className="grid grid-cols-2 gap-6 px-6 pb-6">
                  {/* Left column — Your Lists */}
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 mb-2">Your Lists</h4>
                    <ul className="space-y-1.5 text-xs text-gray-600 font-medium list-none p-0 m-0 whitespace-nowrap">
                      {!isLoggedIn ? (
                        <>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Create a Wish List</Link></li>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Wish from Any Website</Link></li>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Baby Wishlist</Link></li>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Discover Your Style</Link></li>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Explore Showroom</Link></li>
                        </>
                      ) : (
                        <>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Create a Wish List</Link></li>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Wish from Website</Link></li>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Explore Showroom</Link></li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* Right column — Your Account */}
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 mb-2">Your Account</h4>
                    <ul className="space-y-1.5 text-xs text-gray-600 font-medium list-none p-0 m-0 whitespace-nowrap">
                      {!isLoggedIn ? (
                        <>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Account</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Orders</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Wish List</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Keep shopping for</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Recommendations</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Prime Membership</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Prime Video</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Subscribe &amp; Save Items</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Memberships &amp; Subscriptions</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Seller Account</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Manage Your Content and Devices</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Your Music Library</Link></li>
                          <li><Link to="/signin" className="hover:text-[#FF9900]">Register for a free Business Account</Link></li>
                          <li><hr className="border-[#E3E6E6] my-2" /></li>
                          <li>
                            <Link
                              to="/warehouse"
                              style={{ color: "#FF9900", fontWeight: 600, fontSize: "13px" }}
                              className="hover:underline flex items-center gap-1.5"
                            >
                              <span>🏭</span> Warehouse Ops
                            </Link>
                          </li>
                        </>
                      ) : (
                        <>
                          <li><Link to="/dashboard" className="hover:text-[#FF9900]">Your Account</Link></li>
                          <li><Link to="/dashboard" className="hover:text-[#FF9900]">Your Orders</Link></li>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Your Wish List</Link></li>
                          <li><Link to="/buyer" className="hover:text-[#FF9900]">Your Recommendations</Link></li>
                          <li><Link to="/dashboard" className="hover:text-[#FF9900]">Your Prime Membership</Link></li>
                          <li><Link to="/dashboard" className="hover:text-[#FF9900]">Your Seller Account</Link></li>
                          <li><Link to="/dashboard" className="hover:text-[#FF9900]">Manage Your Content and Devices</Link></li>

                          {/* Divider — SecondLife features section */}
                          <li><hr className="border-[#E3E6E6] my-2" /></li>

                          <li><Link to="/donate" className="hover:text-[#FF9900]">Your Donation Account</Link></li>
                          <li><Link to="/credits" className="hover:text-[#FF9900]">Green Credits Hub</Link></li>
                          <li>
                            <Link
                              to="/dashboard"
                              style={{ color: "#FF9900", fontWeight: 600, fontSize: "13px" }}
                              className="hover:underline"
                            >
                              SecondLife Dashboard
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/warehouse"
                              style={{ color: "#FF9900", fontWeight: 600, fontSize: "13px" }}
                              className="hover:underline flex items-center gap-1.5"
                            >
                              <span>🏭</span> Warehouse Ops
                            </Link>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Returns & Orders */}
          <div 
            onClick={() => navigate("/seller/return")}
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
  );
}
