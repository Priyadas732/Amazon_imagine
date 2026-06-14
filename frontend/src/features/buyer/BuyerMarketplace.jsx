// frontend/src/features/buyer/BuyerMarketplace.jsx
import React from "react";
import { useQueries } from "@tanstack/react-query";
import { ShoppingBag, RefreshCw, Filter, Sparkles, ShieldCheck } from "lucide-react";
import { getItem } from "../../services/api";
import ItemCard from "../../components/ItemCard";

// Pre-seeded item IDs from successful integration test runs
const PRESEEDED_IDS = [
  "862c1132-3318-422e-8016-2e1f1ef4ed5c",
  "9abb5d94-3f73-443c-bf49-e039744ed06a"
];

// Fallback mock items in case DynamoDB is empty or pre-seeded items are missing
const FALLBACK_ITEMS = [
  {
    itemId: "fallback-1",
    category: "electronics",
    photos: ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300"],
    provided: {
      model: "Samsung Galaxy S22 Ultra (128GB)",
      originalPrice: 1199,
      price: 649,
      distance: 3.2
    },
    grade: {
      grade: "Very Good",
      defects: ["Micro scratches on rear glass back panel", "Light wear on USB-C port edge"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.94,
      notes: "Device is fully functional and performs perfectly."
    }
  },
  {
    itemId: "fallback-2",
    category: "footwear",
    photos: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300"],
    provided: {
      model: "Nike Air Zoom Pegasus 39 (Size 10)",
      originalPrice: 130,
      price: 65,
      distance: 1.5
    },
    grade: {
      grade: "Good",
      defects: ["Creased midsoles", "Slight dirt on outsole treads"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.96,
      notes: "Original box missing, but shoes are in great running condition."
    }
  },
  {
    itemId: "fallback-3",
    category: "clothing",
    photos: ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300"],
    provided: {
      model: "Patagonia Torrentshell 3L Jacket (Size L)",
      originalPrice: 179,
      price: 99,
      distance: 6.8
    },
    grade: {
      grade: "Like New",
      defects: ["Original cardboard tag detached"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.98,
      notes: "Fabric shows zero signs of wear or wash fading. Zipper pulls intact."
    }
  },
  {
    itemId: "fallback-4",
    category: "appliance",
    photos: ["https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=300"],
    provided: {
      model: "Ninja Professional Blender 1000W",
      originalPrice: 99,
      price: 49,
      distance: 4.0
    },
    grade: {
      grade: "Acceptable",
      defects: ["Scratches on plastic pitcher exterior", "Lid fits tightly but shows scuffing"],
      completeness: "complete",
      authenticityConcern: false,
      confidence: 0.92,
      notes: "Motor base tested and runs fully at high speeds."
    }
  }
];

export default function BuyerMarketplace({ role }) {
  // Read session-graded items from localStorage
  const getSessionItemIds = () => {
    try {
      const items = localStorage.getItem("graded_return_ids");
      return items ? JSON.parse(items) : [];
    } catch {
      return [];
    }
  };

  const sessionIds = getSessionItemIds();
  // Combine preloaded and session graded IDs, removing duplicates
  const allItemIds = Array.from(new Set([...sessionIds, ...PRESEEDED_IDS]));

  // Perform parallel fetches for all listed DynamoDB IDs
  const itemQueries = useQueries({
    queries: allItemIds.map((itemId) => ({
      queryKey: ["item", itemId, role],
      queryFn: () => getItem(itemId, role),
      retry: false,
      staleTime: 60000,
    })),
  });

  // Collect successfully loaded items
  const dbItems = itemQueries
    .filter((q) => q.isSuccess && q.data)
    .map((q) => q.data);

  // Combine DB items and fallbacks
  const allListings = [...dbItems, ...FALLBACK_ITEMS];

  // Filter out any duplicates (by itemId) just in case
  const uniqueListings = allListings.filter(
    (item, index, self) => self.findIndex((i) => i.itemId === item.itemId) === index
  );

  const isAnyLoading = itemQueries.some((q) => q.isLoading);

  return (
    <div className="max-w-6xl mx-auto p-4 font-sans">
      
      {/* Search Result Banner header */}
      <div className="bg-white border-[0.5px] border-outline-variant p-5 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-ink-black flex items-center gap-1.5 leading-none">
            <ShoppingBag className="w-5 h-5 text-link-blue" /> Certified Used Storefront
          </h2>
          <p className="text-xs text-outline mt-1.5 font-medium">
            Real-time open-box return listings saved in Amazon DynamoDB. AI-Verified for accuracy.
          </p>
        </div>

        {/* Climate Pledge tag */}
        <div className="bg-emerald-50 border-[0.5px] border-emerald-255 text-emerald-850 px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600 fill-current" />
          <span>Used Purchase saves avg. 82% Carbon Emissions</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Filters column */}
        <div className="w-full lg:w-48 flex-shrink-0 bg-white border-[0.5px] border-outline-variant rounded-xl p-5 h-fit">
          <h3 className="text-xs font-bold text-ink-black border-b border-surface-container pb-2.5 mb-3.5 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-link-blue" /> Department
          </h3>
          <ul className="text-xs space-y-2 text-outline font-semibold">
            <li className="font-bold text-ink-black cursor-pointer hover:text-link-blue">Used Deals</li>
            <li className="pl-2 cursor-pointer hover:text-link-blue">Electronics</li>
            <li className="pl-2 cursor-pointer hover:text-link-blue">Footwear</li>
            <li className="pl-2 cursor-pointer hover:text-link-blue">Clothing</li>
            <li className="pl-2 cursor-pointer hover:text-link-blue">Home Appliance</li>
          </ul>

          <h3 className="text-xs font-bold text-ink-black border-b border-surface-container pb-2.5 mt-6 mb-3.5">
            AI Condition Grade
          </h3>
          <div className="space-y-2.5 text-xs text-outline font-semibold">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-outline-variant text-link-blue focus:ring-0 focus:ring-offset-0 w-4 h-4" />
              <span>New / Like New</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-outline-variant text-link-blue focus:ring-0 focus:ring-offset-0 w-4 h-4" />
              <span>Very Good / Good</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded border-outline-variant text-link-blue focus:ring-0 focus:ring-offset-0 w-4 h-4" />
              <span>Acceptable</span>
            </label>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="flex-grow">
          {isAnyLoading && uniqueListings.length === FALLBACK_ITEMS.length ? (
            <div className="py-12 text-center text-outline font-medium">
              <RefreshCw className="animate-spin w-8 h-8 mx-auto text-secondary-container mb-2" />
              Refreshing live DB records...
            </div>
          ) : (
            <div>
              <div className="text-xs text-outline font-bold mb-4 border-b border-surface-container pb-2.5 flex items-center justify-between">
                <span>Showing 1-{uniqueListings.length} of {uniqueListings.length} Used Deals</span>
                <span className="flex items-center gap-1 text-link-blue font-black uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 fill-cyan-400 text-secondary-container" /> AI-Verified Condition Guarantees
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {uniqueListings.map((item) => (
                  <ItemCard key={item.itemId} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
