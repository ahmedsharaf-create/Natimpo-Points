"use client";

import { useState } from "react";
import PointsFlow from "@/components/PointsFlow";
import StockFlow from "@/components/StockFlow";

export default function DashboardPage() {
  const [mode, setMode] = useState("points"); // "points" | "stock"

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-gold font-mono mb-3">
        Payout run
      </p>
      <div className="inline-flex rounded-full border border-line bg-card p-1 mb-8">
        <button
          onClick={() => setMode("points")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            mode === "points" ? "bg-brand text-white" : "text-inkfaint hover:text-ink"
          }`}
        >
          Points
        </button>
        <button
          onClick={() => setMode("stock")}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            mode === "stock" ? "bg-brand text-white" : "text-inkfaint hover:text-ink"
          }`}
        >
          Stock
        </button>
      </div>

      {mode === "points" ? <PointsFlow /> : <StockFlow />}
    </div>
  );
}
