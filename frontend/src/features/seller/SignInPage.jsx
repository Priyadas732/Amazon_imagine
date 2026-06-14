// frontend/src/features/seller/SignInPage.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      alert("Please enter your email.");
      return;
    }
    
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      // Mock log in
      localStorage.setItem("is_logged_in", "true");
      localStorage.setItem(
        "logged_in_user",
        JSON.stringify({
          name: "Abhay Kumar",
          email: email,
          credits: 450,
          savedCo2: "12.4"
        })
      );
      setLoading(false);
      navigate("/dashboard");
    }, 600);
  };

  return (
    <div className="bg-white min-h-screen flex flex-col items-center pt-10 font-sans text-[#111] select-none">
      {/* Logo */}
      <div className="mb-6 cursor-pointer" onClick={() => navigate("/")}>
        <span className="font-extrabold text-2xl tracking-tight text-black flex items-center gap-1">
          amazon<span className="text-[#febd69] font-black">.in</span>
        </span>
        <span className="bg-[#febd69] text-[#131921] text-[9px] font-black px-1.5 py-0.5 rounded ml-1 tracking-wider uppercase">
          SecondLife
        </span>
      </div>

      {/* Login Card */}
      <div className="border border-gray-300 rounded-lg p-8 max-w-sm w-full space-y-6 shadow-sm">
        <h1 className="text-3xl font-normal text-left">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-gray-800" htmlFor="email-input">
              Email or mobile phone number
            </label>
            <input
              type="email"
              id="email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. abhay@gmail.com"
              className="w-full bg-white rounded border border-gray-400 px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_0_3px_#3b82f6]"
              required
            />
          </div>

          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold text-gray-800" htmlFor="password-input">
                Password
              </label>
              <a href="#" className="text-xs text-blue-600 hover:text-orange-600 hover:underline">Forgot Password?</a>
            </div>
            <input
              type="password"
              id="password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white rounded border border-gray-400 px-3 py-2 text-sm focus:outline-none focus:border-blue-600 focus:shadow-[0_0_3px_#3b82f6]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#ffd814] hover:bg-[#f7ca00] active:bg-[#f0b800] text-[#111] font-medium rounded-lg border border-[#fcd200] shadow-sm text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        <div className="text-xs text-gray-600 text-left leading-relaxed">
          By continuing, you agree to Amazon's{" "}
          <a href="#" className="text-blue-600 hover:text-orange-600 hover:underline">Conditions of Use</a> and{" "}
          <a href="#" className="text-blue-600 hover:text-orange-600 hover:underline">Privacy Notice</a>.
        </div>

        <div className="border-t border-gray-200 pt-4 text-left">
          <details className="text-xs font-medium text-gray-700 cursor-pointer">
            <summary className="hover:text-orange-600 hover:underline select-none">Need help?</summary>
            <div className="pl-4 pt-2 space-y-1 text-blue-600">
              <p className="hover:text-orange-600 hover:underline">Forgot your password?</p>
              <p className="hover:text-orange-600 hover:underline">Other issues with Sign-In</p>
            </div>
          </details>
        </div>
      </div>

      {/* Divider */}
      <div className="relative max-w-sm w-full text-center my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <span className="relative bg-white px-3 text-xs text-gray-500 font-medium">New to Amazon?</span>
      </div>

      {/* Register Redirect Button */}
      <button
        onClick={() => {
          setEmail("abhay@gmail.com");
          setPassword("password");
          alert("Auto-filled demo credentials! Click Continue to sign in.");
        }}
        className="max-w-sm w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-xs text-gray-800 font-bold rounded-lg border border-gray-300 shadow-sm transition-colors cursor-pointer"
      >
        Use Demo Credentials (abhay@gmail.com)
      </button>

      {/* Login Footer */}
      <footer className="mt-20 border-t border-gray-200 w-full max-w-xl py-6 text-[10px] text-gray-500 flex justify-center gap-6">
        <a href="#" className="hover:text-orange-600 hover:underline">Conditions of Use</a>
        <a href="#" className="hover:text-orange-600 hover:underline">Privacy Notice</a>
        <a href="#" className="hover:text-orange-600 hover:underline">Help</a>
      </footer>
      <p className="text-[10px] text-gray-400 mb-10">© 1996-2026, Amazon.com, Inc. or its affiliates</p>
    </div>
  );
}
