// frontend/src/pages/warehouse/login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, User, Lock, AlertCircle, RefreshCw } from "lucide-react";

export default function WarehouseLogin() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("warehouse_token");
    if (token) {
      navigate("/warehouse");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

    try {
      const res = await fetch(`${API_BASE}/api/warehouse/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employee_id: employeeId, password }),
      });

      if (!res.ok) {
        throw new Error("Invalid credentials.");
      }

      const data = await res.json();
      
      // Save credentials to localStorage
      localStorage.setItem("warehouse_token", data.token);
      localStorage.setItem("warehouse_name", data.name);
      
      // Redirect to warehouse dashboard
      navigate("/warehouse");
    } catch (err) {
      setErrorMsg(err.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131921] flex flex-col items-center justify-center px-4 font-sans select-none">
      <div className="w-full max-w-md space-y-8">
        
        {/* Amazon Logo Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1">
            <span className="font-extrabold text-3xl tracking-tight text-white">
              amazon<span className="text-[#FF9900] font-black">.in</span>
            </span>
            <span className="bg-[#FF9900] text-[#131921] text-[10px] font-black px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">
              Warehouse
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-200 mt-6 tracking-wide">
            Warehouse Staff Login
          </h2>
          <p className="text-xs text-gray-400 font-semibold">
            SecondLife Circular Logistics Portal (DXB1)
          </p>
        </div>

        {/* Card Form */}
        <div className="bg-[#1f2937]/40 backdrop-blur-md border border-gray-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Top orange ambient glow */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#FF9900] to-transparent"></div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-950/50 border border-red-800 text-red-200 text-xs rounded-xl p-3.5 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="font-bold">{errorMsg}</span>
              </div>
            )}

            {/* Employee ID */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider" htmlFor="employee-id">
                Employee ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  id="employee-id"
                  name="employeeId"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="WH001"
                  className="block w-full bg-[#111827]/70 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF9900] transition-colors font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-500" />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full bg-[#111827]/70 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF9900] transition-colors font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#FF9900] hover:bg-[#e68a00] text-black font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-[#FF9900]/10"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo Helper box */}
        <div className="bg-gray-950/20 border border-gray-900 rounded-xl p-4 text-center">
          <p className="text-[10px] text-gray-500 font-bold tracking-wider leading-relaxed">
            DEMO ACCESS: ID <span className="text-gray-300 font-mono font-bold uppercase">WH001</span> | PASSWORD <span className="text-gray-300 font-mono font-bold">amazon123</span>
          </p>
        </div>

      </div>
    </div>
  );
}
