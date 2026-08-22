"use client";

import * as React from "react";
import { FastForward } from "lucide-react";
import { MediaSegment } from "@/lib/playback/introdb";

export function IntrodbSegmentControl({
  currentTime,
  segments = [],
  onSkip,
}: {
  currentTime: number;
  segments?: MediaSegment[];
  onSkip: (targetTime: number) => void;
}) {
  const currentSegment = segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  if (!currentSegment) return null;

  return (
    <div className="absolute bottom-20 right-8 z-30 animate-in fade-in zoom-in-95 duration-200">
      <button
        onClick={() => onSkip(currentSegment.end + 0.5)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-semibold text-sm shadow-xl shadow-purple-900/50 backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <FastForward className="w-4 h-4 fill-white" />
        <span>Skip {currentSegment.type === "intro" ? "Intro" : "Segment"}</span>
      </button>
    </div>
  );
}
