// frontend/src/features/credits/GreenCredits.jsx
import React from "react";
import { Leaf, Gift, CheckCircle, Heart } from "lucide-react";

export default function GreenCredits() {
  const earningsList = [
    {
      action: "Grade a returned item",
      desc: "Prevent scrap waste by routing returns to resale or refurbish channels.",
      credits: "+100 - +150 Cr"
    },
    {
      action: "Donate an acceptable return",
      desc: "Donate low-resale return items to NGO social impact directories.",
      credits: "+300 Cr"
    },
    {
      action: "Buy certified used items",
      desc: "Purchase open-box return listings instead of brand new items.",
      credits: "+50 Cr"
    },
    {
      action: "Recycle damaged returns",
      desc: "Verify raw material scrap extraction for circular loop recovery.",
      credits: "+450 Cr"
    }
  ];

  const rewards = [
    {
      title: "$5 Amazon Gift Voucher",
      cost: "500 Credits",
      desc: "Applicable on any purchase in the Amazon store."
    },
    {
      title: "Carbon Offset Certificate",
      cost: "300 Credits",
      desc: "Offset 100kg of CO2 equivalent emissions."
    },
    {
      title: "Free Refurbish Package Upgrade",
      cost: "200 Credits",
      desc: "Premium box packaging on your next certified used purchase."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 font-sans">
      
      {/* Page Header */}
      <div className="bg-primary-container text-white p-6 rounded-xl border-[0.5px] border-outline-variant mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 select-none shadow-none">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-1.5 text-accent-yellow">
            <Leaf className="w-6 h-6 text-green-500 fill-current" /> Green Credits Hub
          </h1>
          <p className="text-xs text-surface-variant leading-relaxed max-w-md font-medium">
            Amazon's circular returns ledger. Earn credits for recycling, refurbishing, and buying certified used items.
          </p>
        </div>

        {/* Balance card */}
        <div className="bg-deep-navy border-[0.5px] border-outline-variant px-6 py-4 rounded-xl flex items-center gap-4 flex-shrink-0">
          <div className="bg-green-600 rounded-full p-2">
            <Leaf className="w-6 h-6 text-white fill-current" />
          </div>
          <div>
            <span className="text-[10px] text-surface-variant font-bold uppercase tracking-wider block">Your Balance</span>
            <span className="text-3xl font-black text-accent-yellow leading-none block">450 <span className="text-lg font-bold">Cr</span></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left column: How to earn */}
        <div className="bg-white border-[0.5px] border-outline-variant rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-ink-black border-b border-surface-container pb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <CheckCircle className="w-5 h-5 text-green-700" /> How to Earn Credits
          </h2>

          <div className="space-y-4">
            {earningsList.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start gap-4 p-3.5 hover:bg-surface-container-low rounded-xl transition-colors border-[0.5px] border-outline-variant bg-surface-container-lowest">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-ink-black">{item.action}</h4>
                  <p className="text-[11px] text-outline font-medium leading-tight">{item.desc}</p>
                </div>
                <span className="text-xs font-black text-green-700 whitespace-nowrap bg-emerald-50 px-2 py-0.5 border-[0.5px] border-emerald-200 rounded-lg">
                  {item.credits}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Rewards */}
        <div className="bg-white border-[0.5px] border-outline-variant rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-ink-black border-b border-surface-container pb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <Gift className="w-5 h-5 text-link-blue" /> Redeem Eco Rewards
          </h2>

          <div className="space-y-4">
            {rewards.map((reward, idx) => (
              <div key={idx} className="flex justify-between items-center gap-4 p-3.5 border-[0.5px] border-outline-variant rounded-xl hover:border-link-blue transition-colors bg-surface-container-lowest">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-ink-black">{reward.title}</h4>
                  <p className="text-[11px] text-outline font-medium leading-tight">{reward.desc}</p>
                  <span className="text-[10px] text-link-blue font-bold block mt-1">{reward.cost} required</span>
                </div>
                <button className="px-4 py-2 bg-secondary-container hover:bg-[#e68a00] text-ink-black rounded-lg text-[10px] font-bold border-[0.5px] border-outline-variant whitespace-nowrap cursor-pointer transition-colors uppercase tracking-wider">
                  Redeem
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Sustainability pledge footer card */}
      <div className="bg-white border-[0.5px] border-outline-variant rounded-xl p-6 mt-6 flex flex-col sm:flex-row items-center gap-4 select-none">
        <div className="w-12 h-12 rounded-full bg-emerald-50 border-[0.5px] border-emerald-200 flex items-center justify-center text-green-700 flex-shrink-0">
          <Heart className="w-6 h-6 fill-current" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-ink-black uppercase tracking-wider">circular return verification pledge</h3>
          <p className="text-xs text-outline mt-1.5 leading-relaxed font-medium">
            By verifying open-box returned item condition with Groq Llama Vision VLM, SecondLife bypasses standard liquidation shipping and routes items locally, lowering carbon footprints by over 80%.
          </p>
        </div>
      </div>
      
    </div>
  );
}
