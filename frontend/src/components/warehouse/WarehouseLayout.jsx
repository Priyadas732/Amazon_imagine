// frontend/src/components/warehouse/WarehouseLayout.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Bell, Settings, HelpCircle, LogOut } from "lucide-react";

export default function WarehouseLayout({ children }) {
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState("");
  const token = localStorage.getItem("warehouse_token");

  useEffect(() => {
    if (!token) {
      navigate("/warehouse/login");
    } else {
      const name = localStorage.getItem("warehouse_name") || "Rohan S.";
      setStaffName(name);
    }
  }, [token, navigate]);

  const handleLogout = () => {
    localStorage.removeItem("warehouse_token");
    localStorage.removeItem("warehouse_name");
    navigate("/warehouse/login");
  };

  if (!token) {
    return null; // Don't render anything if not authenticated to prevent flash of content
  }

  return (
    <div className="min-h-screen bg-[#eaeded] flex flex-col font-sans text-gray-800">
      
      {/* 56px Dark Navy Header */}
      <header className="bg-[#232F3E] text-white h-[56px] flex items-center justify-between px-4 select-none shrink-0 border-b border-gray-950/20 shadow-md">
        
        {/* Left Section: Brand Logo & Divider */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center cursor-pointer" onClick={() => navigate("/")}>
            <span className="font-extrabold text-lg tracking-tight text-white">
              amazon<span className="text-[#FF9900] font-black">.in</span>
            </span>
            <span className="bg-[#FF9900] text-[#131921] text-[8px] font-black px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">
              Ops
            </span>
          </div>
          <div className="w-[1px] h-4 bg-gray-500"></div>
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Second Life Warehouse
          </span>
        </div>

        {/* Center Section: Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-6 h-full px-4">
          <Link 
            to="/warehouse" 
            className="text-xs font-bold text-white uppercase tracking-wider h-full flex items-center border-b-2 border-[#FF9900] px-1 hover:text-[#FF9900] transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider h-full flex items-center cursor-not-allowed px-1 hover:text-white transition-colors">
            Inventory
          </span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider h-full flex items-center cursor-not-allowed px-1 hover:text-white transition-colors">
            Routing
          </span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider h-full flex items-center cursor-not-allowed px-1 hover:text-white transition-colors">
            Recovery
          </span>
        </nav>

        {/* Right Section: Utilities & User Profile */}
        <div className="flex items-center gap-4">
          
          {/* Search bar inside header */}
          <div className="hidden md:flex items-center h-8 bg-white rounded overflow-hidden max-w-xs">
            <input 
              type="text" 
              placeholder="Search return_id, bin..." 
              className="px-3 text-xs text-black bg-white focus:outline-none w-48 font-medium h-full"
            />
            <button className="bg-[#FF9900] hover:bg-[#e68a00] text-black h-full px-3.5 flex items-center justify-center border-none cursor-pointer">
              <Search className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Icon Controls */}
          <div className="flex items-center gap-3 text-gray-300">
            {/* Notification Bell with Red Badge "3" */}
            <div className="relative cursor-pointer hover:text-white transition-colors p-1">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-0 right-0 bg-red-600 text-white rounded-full text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center scale-90 translate-x-1 -translate-y-1">
                3
              </span>
            </div>
            
            <div className="cursor-not-allowed hover:text-white transition-colors p-1 hidden sm:block">
              <Settings className="w-4.5 h-4.5" />
            </div>

            <div className="cursor-not-allowed hover:text-white transition-colors p-1 hidden sm:block">
              <HelpCircle className="w-4.5 h-4.5" />
            </div>
          </div>

          {/* User profile info block */}
          <div className="flex items-center gap-2 border-l border-gray-700 pl-4">
            <div className="text-right leading-none hidden sm:block">
              <p className="text-xs font-bold text-white">{staffName}</p>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5 block">
                Ops Lead (DXB1)
              </span>
            </div>
            {/* Logout control */}
            <button 
              onClick={handleLogout}
              className="bg-transparent text-gray-400 hover:text-[#FF9900] p-1.5 rounded transition-colors cursor-pointer"
              title="Logout from warehouse session"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>

      </header>

      {/* Main child components container */}
      <main className="flex-grow overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
