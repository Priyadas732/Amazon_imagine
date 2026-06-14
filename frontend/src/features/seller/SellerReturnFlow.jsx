// frontend/src/features/seller/SellerReturnFlow.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Camera, ClipboardCheck, Sparkles, UploadCloud, AlertCircle, AlertTriangle } from "lucide-react";
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
    { id: "electronics", label: "Electronics", desc: "Phones, Laptops, Tablets" },
    { id: "footwear", label: "Footwear", desc: "Sneakers, Boots, Shoes" },
    { id: "clothing", label: "Clothing", desc: "Shirts, Pants, Jackets" },
    { id: "appliance", label: "Appliance", desc: "Blenders, Microwaves" },
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

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans relative">
      <Stepper steps={["Category Selection", "Product Verification", "AI Assessment"]} currentStep={1} />

      {/* Main Form card */}
      <div className="bg-white border border-[#D5D9D9] rounded-md shadow-xs p-6 mb-6 mt-4">
        <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-3 mb-5 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-amazon-teal" /> Verify Return Item Condition
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Category Picker */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Select product category group
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {categoriesList.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 border rounded-lg text-left transition-all cursor-pointer flex flex-col items-start ${
                    category === cat.id
                      ? "border-amazon-teal bg-cyan-50/50 ring-2 ring-cyan-100"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xs font-bold text-gray-800 leading-tight">
                    {cat.label}
                  </span>
                  <span className="text-[9px] text-gray-500 mt-1 leading-none">
                    {cat.desc}
                  </span>
                </button>
              ))}
            </div>

            {category === "custom" && (
              <div className="mt-4 animate-fade-in p-4 border border-[#e7e9ec] bg-gray-50/50 rounded-md">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1" htmlFor="custom-category-input">
                  Type Custom Product Category
                </label>
                <input
                  type="text"
                  id="custom-category-input"
                  placeholder="e.g. smartwatch, sunglasses, luggage, telescope..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full sm:w-1/2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amazon-teal focus:ring-1 focus:ring-amazon-teal bg-white"
                  required
                />
                <span className="text-[10px] text-gray-500 block mt-1">
                  This triggers our dynamic AI pipeline. Gemini will generate custom photo guides and inspection checks for this item type on the fly!
                </span>
              </div>
            )}
          </div>

          {/* Product Input Title */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1" htmlFor="product-name">
              Product Model Name / Description
            </label>
            <input
              type="text"
              id="product-name"
              placeholder="e.g. iPhone 13 Pro Max (Graphite, 256GB)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amazon-teal focus:ring-1 focus:ring-amazon-teal"
              required
            />
          </div>

          {loadingReqs ? (
            <div className="py-6 text-center text-gray-500 text-sm">
              <RefreshIcon className="animate-spin w-6 h-6 mx-auto text-amazon-teal mb-2" />
              Loading category photo guidelines...
            </div>
          ) : reqsError ? (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-md flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              Error fetching grading guides: {reqsError.message}
            </div>
          ) : (
            requirements && (
              <div className="border-t border-dashed border-gray-200 pt-6 space-y-6">
                
                {/* Visual Grading target alert */}
                <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-md p-3 flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-amazon-teal fill-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amazon-teal block">
                      Gemini Vision Grading Active
                    </span>
                    <p className="text-xs text-gray-700 mt-0.5">
                      Grading will visually inspect for: <span className="font-semibold">{requirements.inspect}</span>
                    </p>
                  </div>
                </div>

                {/* Photo Guides upload grid */}
                <div>
                  <span className="block text-sm font-bold text-gray-900 mb-1">
                    Upload returned photos (Upload direct to AWS S3)
                  </span>
                  <span className="text-xs text-gray-500 block mb-3">
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
                          className={`relative border-2 border-dashed border-gray-300 rounded-lg p-3 h-36 hover:bg-gray-50/50 hover:border-amazon-teal cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                            preview ? "border-solid border-amazon-teal" : ""
                          }`}
                        >
                          {preview ? (
                            <>
                              <img
                                src={preview}
                                alt={guideName}
                                className="w-full h-full object-cover rounded-md"
                              />
                              <button
                                type="button"
                                onClick={(e) => removeImage(e, idx)}
                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md cursor-pointer z-10"
                              >
                                <span className="block leading-none text-[10px] font-bold px-1">Remove</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-gray-400 mb-1" />
                              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-tight">
                                {guideName}
                              </span>
                              <span className="text-[8px] text-emerald-600 font-semibold mt-1">
                                {idx === 0 ? "[Required]" : "[Optional]"}
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
                      <div key={field}>
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1" htmlFor={`field-${field}`}>
                          {field} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id={`field-${field}`}
                          className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:border-amazon-teal"
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
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Physical Inspection Checks
                    </label>
                    <div className="space-y-2">
                      {requirements.checks.map((check, idx) => (
                        <label key={idx} className="flex items-start gap-2.5 p-2.5 border border-gray-200 rounded-md bg-gray-50/50 hover:bg-gray-50 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded text-amazon-teal focus:ring-amazon-teal"
                            checked={!!checksInput[idx]}
                            onChange={(e) => setChecksInput({ ...checksInput, [idx]: e.target.checked })}
                          />
                          <span className="text-xs font-medium text-gray-800">{check}</span>
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
            <div className="border-t border-gray-200 pt-6">
              <button
                type="submit"
                disabled={gradeMutation.isPending || !!uploadProgress}
                className="w-full sm:w-auto px-6 py-2.5 bg-amazon-yellow hover:bg-amazon-yellowHover text-gray-900 font-bold rounded-full shadow-sm border border-yellow-400 hover:border-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm"
              >
                <Sparkles className="w-4 h-4 fill-current text-gray-900" />
                Submit to AWS & Grade Return
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Upload/Grading Scanning Loader Overlay */}
      {(gradeMutation.isPending || !!uploadProgress) && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-999 flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
          <div className="relative w-64 h-64 border border-emerald-500/20 bg-gray-900/50 rounded-2xl shadow-2xl p-4 overflow-hidden mb-6 flex flex-col items-center justify-center">
            
            {/* Pulsing AI scanner beam */}
            <div className="absolute left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee,0_0_30px_#22d3ee] animate-scan z-10"></div>
            
            {/* Show first image as scanning preview if available */}
            {previews[0] ? (
              <img
                src={previews[0]}
                alt="Scanning preview"
                className="w-full h-full object-cover rounded-xl opacity-40 mix-blend-lighten"
              />
            ) : (
              <UploadCloud className="w-16 h-16 text-emerald-500/30 animate-pulse" />
            )}
          </div>

          <h3 className="font-display font-extrabold text-2xl text-white tracking-tight flex items-center gap-2 mb-2">
            <RefreshIcon className="animate-spin text-amazon-yellow w-6 h-6" />
            AI Condition Assessment
          </h3>
          <p className="text-gray-400 text-sm max-w-md">
            {uploadProgress || "Running return condition vision analysis with Gemini 3.5 Flash..."}
          </p>
        </div>
      )}
    </div>
  );
}

function RefreshIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}
