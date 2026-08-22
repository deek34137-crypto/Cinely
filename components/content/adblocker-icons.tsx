"use client";

import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ShieldCheck, ExternalLink } from "lucide-react";

export function AdblockerIcons() {
  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col items-center gap-3 sm:gap-4 py-2 w-full">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
          {/* Firefox -> uBlock Origin */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform"
              >
                <span className="flex items-center gap-1.5 bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800 hover:border-purple-500/50 shadow-md">
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span className="text-xs font-semibold text-zinc-200">uBlock</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">Firefox</span>
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">Get uBlock Origin for Firefox (Recommended)</TooltipContent>
          </Tooltip>

          {/* Safari -> AdGuard */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="https://apps.apple.com/us/app/adguard-for-safari/id1440147259"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform"
              >
                <span className="flex items-center gap-1.5 bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800 hover:border-purple-500/50 shadow-md">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-zinc-200">AdGuard</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">Safari</span>
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">Get AdGuard for Apple Safari</TooltipContent>
          </Tooltip>

          {/* Chrome -> uBlock Origin Lite */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform"
              >
                <span className="flex items-center gap-1.5 bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800 hover:border-purple-500/50 shadow-md">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-200">uBlock Lite</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">Chrome</span>
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">Get uBlock Origin Lite for Chrome</TooltipContent>
          </Tooltip>
        </div>

        {/* Chrome Manifest v3 Guide */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="https://www.reddit.com/r/Adblock/comments/1j6f099/to_all_those_asking_how_to_enable_ublock_origin/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-400 hover:text-purple-400 transition-colors underline underline-offset-4 flex items-center gap-1"
            >
              <span>Can&apos;t download on Chrome? Read this</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="top">How to enable full uBlock Origin on Chrome</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
