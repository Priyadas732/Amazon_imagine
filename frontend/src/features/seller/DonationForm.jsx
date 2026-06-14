// frontend/src/features/seller/DonationForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Camera, Sparkles, UploadCloud, Heart, Leaf, HelpCircle, Activity, RefreshCw } from "lucide-react";
import { requestUpload, uploadFileToS3, gradeItem, updateItem } from "../../services/api";
import Stepper from "../../components/Stepper";

export default function DonationForm() {
  const navigate = useNavigate();

  // State
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("electronics");
  const [condition, setCondition] = useState("Good");
  const [checksInput, setChecksInput] = useState({
    0: true,
    1: true,
    2: false
  });
  
  const [uploadProgress, setUploadProgress] = useState("");
  const [fileToUpload, setFileToUpload] = useState(null);
  const [preview, setPreview] = useState("");
  
  // Matching Notification state
  const [matchedNgo, setMatchedNgo] = useState(null);
  const [createdItemId, setCreatedItemId] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileToUpload(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPreview("");
    setFileToUpload(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert("Please enter a product description.");
      return;
    }

    if (!fileToUpload) {
      alert("Please upload a picture of the item to match NGO quality standards.");
      return;
    }

    try {
      setUploadProgress("Initiating secure S3 upload...");
      
      // 1) S3 presigned URL upload
      const uploadResult = await requestUpload(fileToUpload.name, fileToUpload.type, "donor");
      setUploadProgress("Uploading photo directly to Amazon S3...");
      await uploadFileToS3(uploadResult.uploadUrl, fileToUpload, fileToUpload.type);
      
      setUploadProgress("AI Vision is matching item with NGO databases...");
      
      // 2) Hit /grade route
      const gradingResult = await gradeItem({
        category,
        productType: category,
        imageKeys: [uploadResult.key],
        provided: {
          model: productName,
          originalPrice: category === "electronics" ? 999 : category === "footwear" ? 120 : category === "clothing" ? 60 : 250,
          region: "Bangalore",
          creditsBonus: 300,
          checklist: [
            { question: "No critical cosmetic damage", checked: !!checksInput[0] },
            { question: "Cleaned and sanitized", checked: !!checksInput[1] },
            { question: "Functional working condition", checked: !!checksInput[2] }
          ]
        },
        role: "donor"
      });

      // Save item ID in local storage list
      try {
        const existing = localStorage.getItem("graded_return_ids");
        const list = existing ? JSON.parse(existing) : [];
        if (!list.includes(gradingResult.itemId)) {
          list.unshift(gradingResult.itemId);
          localStorage.setItem("graded_return_ids", JSON.stringify(list));
        }
      } catch (err) {
        console.error("Localstorage update failed", err);
      }

      setCreatedItemId(gradingResult.itemId);
      
      // Determine the matching NGO from wantlist
      let ngoName = "TechForGood";
      let drive = "Digital Literacy Lab";
      if (category === "clothing" || category === "apparel") {
        ngoName = "Goonj NGO";
        drive = "Winter apparel relief directory";
      } else if (category === "footwear") {
        ngoName = "ShareAtDoorStep";
        drive = "Back-to-School Shoes Drive";
      } else if (category === "books") {
        ngoName = "Pratham Books";
        drive = "Rural Library Project";
      } else if (category === "toys") {
        ngoName = "Smile Foundation";
        drive = "Children's Aid Drive";
      }

      setMatchedNgo({
        name: ngoName,
        drive: drive,
        gradeMatched: gradingResult.grade || "Good"
      });

      setUploadProgress("");
    } catch (err) {
      console.error(err);
      alert(`Upload or grading failed: ${err.message}`);
      setUploadProgress("");
    }
  };

  const handleCompleteHandshake = async () => {
    if (!createdItemId || !matchedNgo) return;

    try {
      setUploadProgress("Recording handshake on ledger...");
      await updateItem(createdItemId, {
        status: "donated",
        disposition: "Donate",
        extraCredits: 300,
        dispositionMatch: {
          partner: matchedNgo.name,
          target: `Direct transfer to ${matchedNgo.name} ledger`,
          action: `Dispatched to ${matchedNgo.name} center for immediate ${matchedNgo.drive} distribution.`,
          creditsBonus: 300
        }
      }, "donor");

      setUploadProgress("");
      alert(`Handshake completed! 300 Green Credits have been added to your climate balance.`);
      navigate("/dashboard");
    } catch (err) {
      alert(`Handshake failed: ${err.message}`);
      setUploadProgress("");
    }
  };

  const isScanning = !!uploadProgress;

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans relative select-none">
      <Stepper steps={["Contribution Details", "Database Search", "NGO Match Handshake"]} currentStep={matchedNgo ? 3 : isScanning ? 2 : 1} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        
        {/* Form Container */}
        <section className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-outline-variant rounded-xl p-8 shadow-sm">
            <h1 className="font-display font-extrabold text-2xl text-ink-black border-b border-surface-container pb-4 mb-6 text-left">
              Submit Donation Request
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              
              {/* Product Group Selection */}
              <div>
                <label className="block text-xs font-bold text-[#e68a00] uppercase tracking-wider mb-3">
                  Select Item Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: "electronics", label: "Electronics", icon: "📱" },
                    { id: "footwear", label: "Footwear", icon: "👟" },
                    { id: "clothing", label: "Clothing", icon: "👕" },
                    { id: "books", label: "Books", icon: "📚" },
                    { id: "toys", label: "Toys", icon: "🧸" },
                    { id: "appliance", label: "Appliance", icon: "🔌" }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 border-[0.5px] rounded-xl text-left transition-colors cursor-pointer flex flex-col items-start ${
                        category === cat.id
                          ? "border-secondary-container bg-surface-container-low"
                          : "border-outline-variant hover:bg-surface-container-low"
                      }`}
                    >
                      <span className="text-xl mb-1">{cat.icon}</span>
                      <span className="text-xs font-bold text-ink-black leading-tight">
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-wider" htmlFor="product-title">
                  Item Description / Model Name
                </label>
                <input
                  type="text"
                  id="product-title"
                  placeholder="e.g. Adidas Ultraboost Size 10 / Sony WH-1000XM5 Headphones"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-white rounded-lg px-4 py-2.5 text-sm border-[0.5px] border-outline-variant focus:outline-none focus:border-deep-navy font-medium"
                  required
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-wider">
                  Item Quality Verification Photo
                </label>
                <div 
                  onClick={() => !preview && document.getElementById("donation-file").click()}
                  className={`border-2 border-dashed border-outline-variant rounded-xl p-6 h-48 hover:bg-surface-container hover:border-secondary-container cursor-pointer transition-all flex flex-col items-center justify-center text-center relative ${
                    preview ? "border-solid border-secondary-container bg-surface-container-low" : ""
                  }`}
                >
                  {preview ? (
                    <>
                      <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage();
                        }}
                        className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full px-2.5 py-1.5 shadow-md cursor-pointer text-[9px] font-bold uppercase"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-outline mb-2 animate-bounce" />
                      <span className="text-xs font-bold text-ink-black uppercase">Click to Upload Photo</span>
                      <span className="text-[10px] text-outline mt-1 font-semibold">Verification check for NGO compatibility</span>
                    </>
                  )}
                  <input
                    type="file"
                    id="donation-file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-outline uppercase tracking-wider">
                  Physical Quality Checklist
                </label>
                <div className="space-y-2">
                  {[
                    "No critical structural or cosmetic damage",
                    "Item is washed, cleaned, and hygienic",
                    "Item is in working condition (e.g. power, zipper, soles)"
                  ].map((check, idx) => (
                    <label key={idx} className="flex items-start gap-3 p-3 border-[0.5px] border-outline-variant rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded text-secondary-container focus:ring-0 border-outline-variant w-4 h-4"
                        checked={!!checksInput[idx]}
                        onChange={(e) => setChecksInput({ ...checksInput, [idx]: e.target.checked })}
                      />
                      <span className="text-xs font-bold text-ink-black">{check}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="border-t border-surface-container-high pt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isScanning}
                  className="w-full sm:w-auto px-8 py-3.5 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-extrabold rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  Find NGO Match & Submit
                </button>
              </div>

            </form>
          </div>
        </section>

        {/* Sidebar Info Panel */}
        <aside className="lg:col-span-5 space-y-6">
          {!isScanning ? (
            <div className="bg-white border border-outline-variant rounded-xl p-8 border-l-4 border-l-[#e68a00] space-y-4 text-left">
              <h2 className="font-display font-extrabold text-lg text-ink-black flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-700 fill-current" />
                NGO Wantlists & Multipliers
              </h2>
              <p className="text-xs text-outline leading-relaxed font-semibold">
                NGOs list active donation drives with target categories. Providing high-priority items guarantees direct match placement and rewards bonus credits.
              </p>
              <div className="space-y-3 pt-2 text-xs text-outline font-semibold">
                <div className="flex justify-between border-b border-surface-container pb-2">
                  <span>Clothing Drive (Goonj)</span>
                  <span className="text-green-600 font-bold">1.45x Priority</span>
                </div>
                <div className="flex justify-between border-b border-surface-container pb-2">
                  <span>Footwear Drive (ShareAtDoorStep)</span>
                  <span className="text-green-600 font-bold">1.38x Priority</span>
                </div>
                <div className="flex justify-between border-b border-surface-container pb-2">
                  <span>Digital Literacy Drive (TechForGood)</span>
                  <span className="text-green-600 font-bold">1.10x Priority</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#131921] border border-outline-variant text-white rounded-xl p-8 relative overflow-hidden space-y-6 text-left">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#febd69]/5 to-transparent h-full w-full scan-line opacity-30 pointer-events-none"></div>
              <div className="absolute left-0 w-full h-1 bg-[#febd69] shadow-[0_0_15px_#febd69] scan-line z-10"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <Activity className="w-6 h-6 text-[#febd69] animate-pulse" />
                  <div>
                    <h3 className="font-display font-extrabold text-base text-[#febd69] uppercase tracking-wider">Matching Database...</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Checking NGO requirements list</p>
                  </div>
                </div>

                <div className="space-y-2 bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-[10px] text-gray-300 select-none">
                  <p className="text-[#febd69] font-bold uppercase">[SYSTEM]: MATCH PIPELINE ACTIVE...</p>
                  <p>• {uploadProgress}</p>
                </div>
              </div>
            </div>
          )}
        </aside>

      </div>

      {/* Real-time Match Modal Notification */}
      {matchedNgo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-white border-[0.5px] border-outline-variant rounded-2xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-100">
              <Heart className="w-8 h-8 fill-current text-red-500 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display font-black text-xl text-ink-black uppercase tracking-wide">
                🔔 NGO Match Found!
              </h2>
              <p className="text-xs text-outline font-semibold leading-relaxed">
                Great news! <strong className="text-link-blue">{matchedNgo.name}</strong> is currently running a <strong className="text-ink-black">"{matchedNgo.drive}"</strong> and accepts items in <strong className="text-green-700">{matchedNgo.gradeMatched}</strong> condition.
              </p>
            </div>

            <div className="bg-emerald-50 border-[0.5px] border-emerald-200 p-4 rounded-xl text-xs font-bold text-green-800 flex items-center justify-center gap-2">
              <Leaf className="w-4 h-4 fill-current text-green-700" />
              Completing this donation grants you +300 Climate Credits!
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMatchedNgo(null);
                  navigate("/dashboard");
                }}
                className="flex-1 py-3 bg-white hover:bg-surface-container text-outline hover:text-ink-black font-extrabold rounded-xl text-xs uppercase tracking-wider border border-outline-variant cursor-pointer transition-colors"
              >
                Decide Later
              </button>
              <button
                onClick={handleCompleteHandshake}
                className="flex-grow flex-1 py-3 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-extrabold rounded-xl text-xs uppercase tracking-wider border border-outline-variant cursor-pointer transition-colors"
              >
                Complete Handshake
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
