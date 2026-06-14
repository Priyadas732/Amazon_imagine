// frontend/src/features/seller/SellerReturnFlow.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camera, ClipboardCheck, Sparkles, UploadCloud, AlertCircle, AlertTriangle, Leaf, HelpCircle, Activity, RefreshCw } from "lucide-react";
import { getRequirements, requestUpload, uploadFileToS3, gradeItem } from "../../services/api";
import Stepper from "../../components/Stepper";

export default function SellerReturnFlow({ role }) {
  const navigate = useNavigate();
  
  // State
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("electronics");
  const [customCategory, setCustomCategory] = useState("");
  const [fieldsInput, setFieldsInput] = useState({});
  const [checksInput, setChecksInput] = useState({});
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadedKeys, setUploadedKeys] = useState({}); // index -> S3 key
  const [filesToUpload, setFilesToUpload] = useState({}); // index -> File object
  const [previews, setPreviews] = useState({}); // index -> dataUrl

  const activeCategoryKey = category === "custom" ? customCategory.trim() : category;

  // Fetch category requirements
  const { data: requirements, isLoading: loadingReqs, error: reqsError } = useQuery({
    queryKey: ["requirements", activeCategoryKey],
    queryFn: () => getRequirements(activeCategoryKey),
    enabled: !!activeCategoryKey && (category !== "custom" || activeCategoryKey.length > 2),
  });

  // Grading Mutation
  const gradeMutation = useMutation({
    mutationFn: (payload) => gradeItem(payload),
    onSuccess: (data) => {
      // Save item id in local storage list of graded returns so it renders in the buyer marketplace
      try {
        const existing = localStorage.getItem("graded_return_ids");
        const list = existing ? JSON.parse(existing) : [];
        if (!list.includes(data.itemId)) {
          list.unshift(data.itemId);
          localStorage.setItem("graded_return_ids", JSON.stringify(list));
        }
      } catch (e) {
        console.error("Failed to update localStorage:", e);
      }
      // Redirect to results detail page with itemId
      navigate(`/seller/result/${data.itemId}`);
    },
    onError: (err) => {
      alert(`Grading failed: ${err.message}`);
    }
  });

  const categoriesList = [
    { id: "electronics", label: "Electronics", desc: "Headphones, Speakers, Tablets" },
    { id: "footwear", label: "Footwear", desc: "Running Shoes, Sneakers" },
    { id: "clothing", label: "Clothing", desc: "Jeans, Jackets, Shirts" },
    { id: "appliance", label: "Appliance", desc: "Vacuums, Blenders" },
    { id: "drone", label: "Drone (AI-Dynamic)", desc: "Quadcoptors & Accessories" },
    { id: "custom", label: "Other / Custom", desc: "Type custom product type" }
  ];

  // Handle file picker
  const triggerFileInput = (index) => {
    document.getElementById(`file-input-${index}`).click();
  };

  const handleFileChange = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    // Save File object in local state for uploading later
    setFilesToUpload(prev => ({ ...prev, [index]: file }));

    // Generate local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviews(prev => ({ ...prev, [index]: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (e, index) => {
    e.stopPropagation();
    setPreviews(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    setFilesToUpload(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
    setUploadedKeys(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  // Submit return wizard
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert("Please enter a product model/title.");
      return;
    }

    const requiredPhotos = requirements?.photos || 4;
    const filesCount = Object.keys(filesToUpload).length;
    if (filesCount === 0) {
      alert("Please upload at least 1 photo for condition verification.");
      return;
    }

    try {
      setUploadProgress("Initiating direct secure uploads to S3...");
      const keys = {};

      // 1) Direct-to-S3 browser uploads using presigned URLs
      const fileIndices = Object.keys(filesToUpload).sort((a, b) => Number(a) - Number(b));
      for (let idx = 0; idx < fileIndices.length; idx++) {
        const i = fileIndices[idx];
        const file = filesToUpload[i];
        if (!file) continue;
        
        setUploadProgress(`Requesting presigned upload URL for photo ${idx + 1} of ${filesCount}...`);
        
        // request upload key and presigned URL
        const uploadResult = await requestUpload(file.name, file.type, role);
        
        setUploadProgress(`Uploading photo ${idx + 1} of ${filesCount} directly to Amazon S3...`);
        // Upload directly to S3
        await uploadFileToS3(uploadResult.uploadUrl, file, file.type);
        
        keys[i] = uploadResult.key;
      }

      setUploadProgress("AI is grading your return...");
      
      // Compile provided specifications metadata
      const provided = {
        model: productName,
        originalPrice: activeCategoryKey === "electronics" ? 999 : activeCategoryKey === "footwear" ? 120 : activeCategoryKey === "clothing" ? 60 : 250,
        ...fieldsInput,
        checklist: requirements?.checks?.map((check, idx) => ({
          question: check,
          checked: !!checksInput[idx]
        })) || []
      };

      // 2) Hit /grade route with JSON body S3 keys
      gradeMutation.mutate({
        category: activeCategoryKey,
        productType: activeCategoryKey,
        imageKeys: Object.values(keys),
        provided,
        role
      });

    } catch (err) {
      console.error(err);
      alert(`S3 upload failed: ${err.message}`);
      setUploadProgress("");
    }
  };

  const isScanning = gradeMutation.isPending || !!uploadProgress;

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans relative">
      <Stepper steps={["Category Selection", "Product Verification", "AI Assessment"]} currentStep={1} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mt-6">
        
        {/* Left Side: Listing Form */}
        <section className="lg:col-span-7 space-y-gutter">
          <div className="bg-white border-[0.5px] border-outline-variant rounded-xl p-8 shadow-none">
            <h1 className="font-display font-extrabold text-2xl text-ink-black border-b border-surface-container pb-4 mb-6">
              List Your Return Item
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-3">
                  Select Product Group
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categoriesList.map((cat) => (
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
                      <span className="text-xs font-bold text-ink-black leading-tight">
                        {cat.label}
                      </span>
                      <span className="text-[9px] text-outline mt-1 leading-none font-medium">
                        {cat.desc}
                      </span>
                    </button>
                  ))}
                </div>

                {category === "custom" && (
                  <div className="mt-4 p-4 border-[0.5px] border-outline-variant bg-surface-container-low rounded-xl">
                    <label className="block text-[10px] font-bold text-outline uppercase tracking-wider mb-2" htmlFor="custom-category-input">
                      Type Custom Product Category
                    </label>
                    <input
                      type="text"
                      id="custom-category-input"
                      placeholder="e.g. smartwatch, sunglasses, luggage, telescope..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full sm:w-1/2 bg-white rounded-lg px-4 py-2 text-sm border-[0.5px] border-outline-variant focus:outline-none focus:border-deep-navy font-medium"
                      required
                    />
                    <span className="text-[10px] text-outline block mt-2 font-medium">
                      This triggers our dynamic AI pipeline. VLM will generate custom photo guides and inspection checks for this item type on the fly!
                    </span>
                  </div>
                )}
              </div>

              {/* Product Input Title */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-outline uppercase tracking-wider" htmlFor="product-name">
                  Product Model Name / Description
                </label>
                <input
                  type="text"
                  id="product-name"
                  placeholder="e.g. iPhone 13 Pro Max (Graphite, 256GB)"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-white rounded-lg px-4 py-2.5 text-sm border-[0.5px] border-outline-variant focus:outline-none focus:border-deep-navy font-medium"
                  required
                />
              </div>

              {loadingReqs ? (
                <div className="py-8 text-center text-outline text-sm font-medium">
                  <RefreshCw className="animate-spin w-6 h-6 mx-auto text-secondary-container mb-2" />
                  Loading category photo guidelines...
                </div>
              ) : reqsError ? (
                <div className="p-4 bg-red-50 border-[0.5px] border-red-200 text-red-800 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  Error fetching grading guides: {reqsError.message}
                </div>
              ) : (
                requirements && (
                  <div className="border-t border-dashed border-outline-variant pt-6 space-y-6">
                    
                    {/* Visual Grading target alert */}
                    <div className="bg-surface-container-low border-[0.5px] border-outline-variant text-ink-black rounded-xl p-4 flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-secondary-container fill-current mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-container block">
                          VLM Vision Grading Active
                        </span>
                        <p className="text-xs text-outline mt-1 font-medium">
                          Grading will visually inspect for: <span className="font-bold text-ink-black">{requirements.inspect}</span>
                        </p>
                      </div>
                    </div>

                    {/* Photo Guides upload grid */}
                    <div>
                      <span className="block text-xs font-bold text-outline uppercase tracking-wider mb-1">
                        Upload returned photos (Direct to S3)
                      </span>
                      <span className="text-xs text-outline block mb-3 font-medium">
                        Amazon Certified grading allows up to {requirements.photos} photos. For testing, you can upload any number of photos (at least 1).
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Array.from({ length: requirements.photos }).map((_, idx) => {
                          const guideName = requirements.photoGuide[idx] || `Image ${idx + 1}`;
                          const preview = previews[idx];

                          return (
                            <div
                              key={idx}
                              onClick={() => triggerFileInput(idx)}
                              className={`relative border-2 border-dashed border-outline-variant rounded-xl p-3 h-36 hover:bg-surface-container hover:border-secondary-container cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                                preview ? "border-solid border-secondary-container bg-surface-container-low" : ""
                              }`}
                            >
                              {preview ? (
                                <>
                                  <img
                                    src={preview}
                                    alt={guideName}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => removeImage(e, idx)}
                                    className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md cursor-pointer z-10"
                                  >
                                    <span className="block leading-none text-[9px] font-bold px-1 uppercase tracking-wider">Remove</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Camera className="w-6 h-6 text-outline mb-1.5" />
                                  <span className="text-[10px] font-bold text-ink-black uppercase tracking-tight leading-tight">
                                    {guideName}
                                  </span>
                                  <span className="text-[8px] text-green-700 font-bold uppercase tracking-wider mt-1.5">
                                    {idx === 0 ? "Required" : "Optional"}
                                  </span>
                                </>
                              )}
                              <input
                                type="file"
                                id={`file-input-${idx}`}
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, idx)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Specification Fields */}
                    {requirements.fields && requirements.fields.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {requirements.fields.map((field) => (
                          <div key={field} className="space-y-1">
                            <label className="block text-[10px] font-bold text-outline uppercase tracking-wider" htmlFor={`field-${field}`}>
                              {field} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              id={`field-${field}`}
                              className="w-full bg-white rounded-lg px-4 py-2 text-xs border-[0.5px] border-outline-variant focus:outline-none focus:border-deep-navy font-medium"
                              placeholder={`Enter ${field}...`}
                              required
                              value={fieldsInput[field] || ""}
                              onChange={(e) => setFieldsInput({ ...fieldsInput, [field]: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Physical Checklist */}
                    {requirements.checks && requirements.checks.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-3">
                          Physical Inspection Checks
                        </label>
                        <div className="space-y-2">
                          {requirements.checks.map((check, idx) => (
                            <label key={idx} className="flex items-start gap-3 p-3 border-[0.5px] border-outline-variant rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer select-none">
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded text-secondary-container focus:ring-secondary-container focus:ring-0 border-outline-variant w-4 h-4"
                                checked={!!checksInput[idx]}
                                onChange={(e) => setChecksInput({ ...checksInput, [idx]: e.target.checked })}
                              />
                              <span className="text-xs font-bold text-ink-black">{check}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )
              )}

              {/* Form Submit Footer */}
              {!loadingReqs && (
                <div className="border-t border-surface-container-high pt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={isScanning}
                    className="w-full sm:w-auto px-8 py-3.5 bg-secondary-container hover:bg-[#e68a00] text-ink-black font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    Submit to AWS & Grade Return
                  </button>
                </div>
              )}
            </form>
          </div>
        </section>

        {/* Right Side: Real-time Panel */}
        <aside className="lg:col-span-5 space-y-gutter">
          
          {/* Why Donate / How it works info panel (Idle State) */}
          {!isScanning && (
            <div className="bg-white border-[0.5px] border-outline-variant rounded-xl p-8 border-l-4 border-l-secondary-container space-y-4">
              <h2 className="font-display font-extrabold text-lg text-ink-black flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-700 fill-current" />
                Circular Commerce Routing
              </h2>
              <p className="text-xs text-outline leading-relaxed font-medium">
                SecondLife Commerce uses an enterprise-grade AI Vision & Scoring Engine to inspect your returned items and route them to their highest utility path automatically.
              </p>
              <div className="space-y-3 pt-2 text-xs text-outline font-semibold">
                <div className="flex items-start gap-2.5">
                  <span className="bg-green-100 text-green-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                  <p className="leading-tight">Upload returned photos directly to secure S3 storage.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="bg-green-100 text-green-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                  <p className="leading-tight">Groq Llama-Vision parses cosmetics, completeness, and categorizes condition.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="bg-green-100 text-green-800 w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                  <p className="leading-tight">Max-Utility Scoring Engine evaluates regional supply, matching with local NGOs, peer buyers, or recyclers.</p>
                </div>
              </div>
            </div>
          )}

          {/* Scanning panel (Active State) */}
          {isScanning && (
            <div className="bg-[#131921] border-[0.5px] border-outline-variant text-white rounded-xl p-8 relative overflow-hidden space-y-6">
              
              {/* Vertical scanning laser line */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent-yellow/5 to-transparent h-full w-full scan-line opacity-30 pointer-events-none"></div>
              <div className="absolute left-0 w-full h-1 bg-accent-yellow shadow-[0_0_15px_#febd69,0_0_35px_#febd69] scan-line z-10"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent-yellow/20 flex items-center justify-center border border-accent-yellow/30 animate-pulse">
                    <Activity className="w-6 h-6 text-accent-yellow animate-spin" />
                  </div>
                  <div>
                    <h3 className="font-display font-extrabold text-base text-accent-yellow uppercase tracking-wider">AI Assessment Active</h3>
                    <p className="text-[10px] text-surface-variant font-bold uppercase tracking-tight mt-0.5">Llama-3.2 VLM Pixel Inspections</p>
                  </div>
                </div>

                <div className="space-y-3 bg-white/5 border border-white/10 p-4 rounded-xl font-mono text-[10px] text-surface-variant leading-relaxed select-none">
                  <p className="text-accent-yellow font-bold uppercase">[SYSTEM]: INITIALIZING NEURAL PIPELINE...</p>
                  <p>• S3 upload: Done.</p>
                  <p>• {uploadProgress || "Grading photos..."}</p>
                  <p className="text-green-400 font-bold">• VLM routing handshake active.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-[8px] uppercase text-surface-variant font-bold tracking-wider">Active Channels</p>
                    <p className="text-xs font-black text-white mt-1">4 Channels Live</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                    <p className="text-[8px] uppercase text-surface-variant font-bold tracking-wider">Regional Routing</p>
                    <p className="text-xs font-black text-white mt-1">Bangalore Eco-Hub</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </aside>

      </div>
    </div>
  );
}
