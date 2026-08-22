"use client";

import * as React from "react";
import { Server, ShieldCheck, Sparkles, ChevronDown, Check } from "lucide-react";
import { videoServers, VideoServer } from "@/lib/stores/video-servers";
import { scrapeServer, useServerStore } from "@/lib/stores/server-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ProxyModeHintBubble } from "./proxy-hint-bubble";

export function ServerSelector({
  onSelectServer,
}: {
  onSelectServer?: (server: VideoServer) => void;
}) {
  const { selectedServer, setSelectedServer, playbackMode } = useServerStore();

  const handleSelect = (server: VideoServer) => {
    setSelectedServer(server);
    if (onSelectServer) onSelectServer(server);
  };

  return (
    <div className="relative flex items-center gap-2">
      <ProxyModeHintBubble />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-xs font-medium text-zinc-200 transition-colors backdrop-blur-md cursor-pointer">
            {selectedServer.id === "scrape" ? (
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            ) : (
              <Server className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{selectedServer.name}</span>
            {selectedServer.id === "scrape" ? (
              <Badge variant="glow" className="text-[10px] py-0 px-1.5 h-4">
                Ad-Free
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                Embed
              </Badge>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 ml-1" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-64 max-h-80 overflow-y-auto p-1.5">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Primary Stream Engine
          </div>

          <DropdownMenuItem
            onClick={() => handleSelect(scrapeServer)}
            className="flex items-center justify-between p-2 rounded-lg cursor-pointer bg-purple-950/30 border border-purple-500/20 mb-1"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div className="flex flex-col">
                <span className="font-semibold text-white text-xs">Direct Proxy (Ad-Free)</span>
                <span className="text-[10px] text-purple-300">VidKing / VidSrc Decrypted</span>
              </div>
            </div>
            {selectedServer.id === "scrape" && <Check className="w-4 h-4 text-purple-400" />}
          </DropdownMenuItem>

          <div className="px-2 py-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mt-2 border-t border-white/5 pt-2">
            14 Sandboxed Embed Servers
          </div>

          {videoServers.map((server) => (
            <DropdownMenuItem
              key={server.id}
              onClick={() => handleSelect(server)}
              className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-zinc-800"
            >
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs text-zinc-200">{server.name}</span>
                {server.badge && (
                  <Badge variant="outline" className="text-[9px] py-0 px-1 h-3.5">
                    {server.badge}
                  </Badge>
                )}
              </div>
              {selectedServer.id === server.id && <Check className="w-4 h-4 text-indigo-400" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
