"use client";

import * as React from "react";
import Image from "next/image";
import { HeroOverlay } from "./hero-overlay";
import { AmbientVideoBackdrop } from "./ambient-video-backdrop";

export function HeroBackground({
  backdropUrl,
  title,
}: {
  backdropUrl?: string;
  title?: string;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden -z-10">
      <AmbientVideoBackdrop backdropUrl={backdropUrl} />

      {backdropUrl && (
        <div className="relative w-full h-full">
          <Image
            src={backdropUrl}
            alt={title || "Backdrop"}
            fill
            priority
            className="object-cover object-top opacity-65 scale-105 transition-transform duration-1000 ease-out"
            unoptimized
          />
        </div>
      )}

      <HeroOverlay />
    </div>
  );
}
