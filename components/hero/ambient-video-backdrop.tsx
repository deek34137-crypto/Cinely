"use client";

import * as React from "react";

export function AmbientVideoBackdrop({
  backdropUrl,
  accentColor = "rgba(147, 51, 234, 0.25)",
}: {
  backdropUrl?: string;
  accentColor?: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Top right ambient blob */}
      <div
        className="ambient-glow -top-32 right-10 w-[600px] h-[500px]"
        style={{ background: accentColor }}
      />

      {/* Center left ambient blob */}
      <div
        className="ambient-glow top-40 -left-20 w-[500px] h-[600px]"
        style={{ background: "rgba(99, 102, 241, 0.2)" }}
      />

      {/* Bottom ambient wash */}
      <div
        className="ambient-glow bottom-0 right-1/4 w-[700px] h-[400px]"
        style={{ background: "rgba(168, 85, 247, 0.15)" }}
      />
    </div>
  );
}
