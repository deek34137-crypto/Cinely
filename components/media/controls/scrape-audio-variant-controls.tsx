"use client";

import * as React from "react";
import { Mic, Subtitles } from "lucide-react";
import { usePlaybackModeStore } from "@/lib/stores/playback-mode-store";

export function ScrapeAudioVariantControls({
  onChange,
}: {
  onChange?: (dub: boolean) => void;
}) {
  const { audioDubPreference, setAudioDubPreference } = usePlaybackModeStore();

  const handleToggle = (val: "sub" | "dub") => {
    setAudioDubPreference(val);
    if (onChange) onChange(val === "dub");
  };

  return (
    <div className="inline-flex p-1 rounded-xl bg-zinc-900/90 border border-white/10 text-xs font-medium backdrop-blur-md">
      <button
        onClick={() => handleToggle("sub")}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
          audioDubPreference === "sub"
            ? "bg-purple-600 text-white font-semibold shadow-sm"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        <Subtitles className="w-3.5 h-3.5" />
        <span>Sub</span>
      </button>

      <button
        onClick={() => handleToggle("dub")}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
          audioDubPreference === "dub"
            ? "bg-purple-600 text-white font-semibold shadow-sm"
            : "text-zinc-400 hover:text-white"
        }`}
      >
        <Mic className="w-3.5 h-3.5" />
        <span>Dub</span>
      </button>
    </div>
  );
}
