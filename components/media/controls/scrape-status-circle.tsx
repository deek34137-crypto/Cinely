"use client";

import * as React from "react";

export function ScrapeStatusCircle({
  status,
}: {
  status: "direct" | "embed" | "scraping" | "error";
}) {
  const getStatusColor = () => {
    switch (status) {
      case "direct":
        return "bg-emerald-500 shadow-emerald-500/50";
      case "embed":
        return "bg-indigo-500 shadow-indigo-500/50";
      case "scraping":
        return "bg-amber-500 shadow-amber-500/50 animate-ping";
      case "error":
        return "bg-red-500 shadow-red-500/50";
    }
  };

  const getLabel = () => {
    switch (status) {
      case "direct":
        return "Ad-Free Proxy Active";
      case "embed":
        return "Embed Server Active";
      case "scraping":
        return "Resolving Stream...";
      case "error":
        return "Playback Error";
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-300">
      <span className={`w-2 h-2 rounded-full shadow-sm ${getStatusColor()}`} />
      <span className="text-[11px] font-medium">{getLabel()}</span>
    </div>
  );
}
