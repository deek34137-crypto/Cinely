"use client";

import React from "react";
import { cn } from "./button";

interface PulsatingButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pulseColor?: string;
  duration?: string;
}

export function PulsatingButton({
  className,
  children,
  pulseColor = "#9333ea",
  duration = "1.5s",
  ...props
}: PulsatingButtonProps) {
  return (
    <button
      className={cn(
        "relative flex cursor-pointer items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-98",
        className
      )}
      {...props}
    >
      <div className="relative z-10 flex items-center gap-2">{children}</div>
      <div
        className="absolute top-1/2 left-1/2 size-full -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-xl"
        style={{
          boxShadow: `0 0 16px ${pulseColor}`,
          animationDuration: duration,
        }}
      />
    </button>
  );
}
