// frontend/src/components/TopBar.jsx
import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Leaf, RefreshCw } from "lucide-react";

export default function TopBar({ currentRole, onRoleChange }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Just take the buyer to the marketplace for demo search
      navigate("/buyer");
    }
  };

  return (
    <div className="flex flex-col font-sans w-full sticky top-0 z-50 border-b border-outline-variant select-none">
      {/* Primary Top Bar */}
      <div className="bg-primary-container text-white px-margin-desktop py-3 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 hover:text-accent-yellow transition-colors">
          <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center border-[0.5px] border-outline-variant">
            <RefreshCw className="w-5 h-5 text-ink-black stroke-[3]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-extrabold text-lg tracking-tight text-accent-yellow">
              Second Life
            </span>
            <span className="text-[10px] text-surface-variant font-bold tracking-wider uppercase">
              Commerce Portal
            </span>
          </div>
        </Link>

        {/* Central Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-grow max-w-xl hidden md:flex items-center h-10 rounded-xl overflow-hidden bg-white flat-border">
          <select className="bg-surface-container-low text-ink-black text-xs px-3 h-full border-r border-outline-variant focus:outline-none cursor-pointer font-medium">
            <option>Used Deals</option>
            <option>All Departments</option>
            <option>Climate Pledge</option>
          </select>
          <input
            type="text"
            placeholder="Search returned, open-box, or certified used items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow h-full px-3 text-sm text-ink-black focus:outline-none bg-white font-medium"
          />
          <button type="submit" className="bg-secondary-container hover:bg-[#e68a00] text-ink-black h-full px-5 flex items-center justify-center transition-colors border-none cursor-pointer">
            <Search className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Right Side Links */}
        <div className="flex items-center gap-5 text-xs font-bold">
          
          {/* Role Switcher Pill inside header */}
          <div className="bg-deep-navy border-[0.5px] border-outline-variant rounded-full p-0.5 flex items-center">
            {["buyer", "seller", "donor", "ngo"].map((role) => (
              <button
                key={role}
                onClick={() => onRoleChange(role)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentRole === role
                    ? "bg-secondary-container text-ink-black"
                    : "text-surface-variant hover:text-white"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Green Credits indicator */}
          <Link to="/credits" className="flex items-center gap-1.5 py-1 px-2 text-accent-yellow hover:text-white transition-colors">
            <Leaf className="w-4 h-4 fill-current text-green-500" />
            <div className="flex flex-col">
              <span className="text-[9px] text-surface-variant font-normal leading-tight">Eco Balance</span>
              <span className="font-bold text-sm leading-tight text-white">450 Cr</span>
            </div>
          </Link>

          {/* Returns link */}
          <Link to="/seller/return" className="py-1 px-2 text-white hover:text-accent-yellow transition-colors hidden sm:block">
            <div className="flex flex-col">
              <span className="text-[9px] text-surface-variant font-normal leading-tight">Returns &</span>
              <span className="font-bold leading-tight">AI Grading</span>
            </div>
          </Link>

          {/* Cart Icon */}
          <Link to="/buyer" className="flex items-end gap-1.5 py-1 px-2 text-white hover:text-accent-yellow transition-colors">
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-1 -right-1.5 bg-secondary-container text-ink-black rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center font-bold border-[0.5px] border-outline-variant">
                1
              </span>
            </div>
            <span className="font-bold hidden sm:inline">Cart</span>
          </Link>

        </div>

      </div>

      {/* Secondary Bar */}
      <div className="bg-deep-navy text-white px-margin-desktop py-2 text-xs font-semibold flex items-center justify-between border-t border-outline-variant">
        <div className="flex items-center gap-6">
          <span className="cursor-pointer hover:text-accent-yellow transition-colors">All</span>
          {localStorage.getItem("is_logged_in") === "true" && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `hover:text-accent-yellow transition-colors ${isActive ? "text-accent-yellow font-bold" : "text-surface-variant"}`
              }
            >
              Dashboard
            </NavLink>
          )}

          <NavLink
            to="/buyer"
            className={({ isActive }) =>
              `hover:text-accent-yellow transition-colors ${isActive ? "text-accent-yellow font-bold" : "text-surface-variant"}`
            }
          >
            Certified Used Store
          </NavLink>
          <NavLink
            to="/credits"
            className={({ isActive }) =>
              `hover:text-accent-yellow transition-colors ${isActive ? "text-accent-yellow font-bold" : "text-surface-variant"}`
            }
          >
            Green Credits Hub
          </NavLink>
          <NavLink
            to="/partners"
            className={({ isActive }) =>
              `hover:text-accent-yellow transition-colors ${isActive ? "text-accent-yellow font-bold" : "text-surface-variant"}`
            }
          >
            Ecosystem Partners
          </NavLink>

          <span className="text-green-400 flex items-center gap-1 cursor-pointer hover:text-green-300 transition-colors">
            <Leaf className="w-3.5 h-3.5 fill-current" /> Climate Pledge Friendly
          </span>
        </div>
        <div className="text-[11px] text-surface-variant hidden md:block">
          Active Session Role: <span className="font-bold text-accent-yellow uppercase">{currentRole}</span>
        </div>
      </div>
    </div>
  );
}
