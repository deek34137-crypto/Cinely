"use client";

import * as React from "react";
import { Loader2, Radio, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { tmdbScrapers } from "@/lib/scrape/providers";

export function ScrapingOverlay({
  activeProvider,
  resolved = false,
  error = false,
}: {
  activeProvider?: string;
  resolved?: boolean;
  error?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-md p-6 text-center rounded-2xl border border-white/10">
      <div className="relative mb-6">
        {/* Animated radar rings */}
        <div className="absolute inset-0 -m-4 rounded-full border border-purple-500/20 animate-ping opacity-75" />
        <div className="absolute inset-0 -m-8 rounded-full border border-indigo-500/10 animate-pulse" />
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/40">
          {resolved ? (
            <CheckCircle2 className="w-8 h-8 text-white animate-in zoom-in-50 duration-300" />
          ) : (
            <Radio className="w-8 h-8 text-white animate-pulse" />
          )}
        </div>
      </div>

      <div className="max-w-md space-y-2">
        <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
          {resolved ? (
            <>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Stream Decrypted & Proxied
            </>
          ) : error ? (
            "Switching to Embed Fallback..."
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-purple-400" />
              Bypassing Anti-Bot & Decrypting Stream...
            </>
          )}
        </h3>

        <p className="text-xs text-zinc-400">
          {resolved
            ? `Connected to ${activeProvider || "VidKing"} High-Speed Proxy`
            : "Racing 7 direct scrapers & decrypting payload headers in parallel..."}
        </p>

        {/* Provider race badges */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-3">
          {tmdbScrapers.map((provider) => {
            const isActive = activeProvider === provider.id;
            return (
              <span
                key={provider.id}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                  isActive
                    ? "bg-purple-600 text-white border-purple-400 font-semibold shadow-sm"
                    : "bg-zinc-900/80 text-zinc-400 border-white/5"
                }`}
              >
                {provider.name}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
