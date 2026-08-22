"use client";

import * as React from "react";

export function HeroOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top navbar dark gradient */}
      <div className="absolute top-0 inset-x-0 h-36 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />

      {/* Left side text shadow gradient */}
      <div className="absolute inset-y-0 left-0 w-full md:w-3/4 bg-gradient-to-r from-[#08080c] via-[#08080c]/80 to-transparent" />

      {/* Bottom transition gradient to page content */}
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#08080c] via-[#08080c]/80 to-transparent" />
    </div>
  );
}
