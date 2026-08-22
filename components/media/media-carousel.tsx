"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MediaCard } from "./media-card";
import { MediaItem } from "@/lib/domain/typings";

export function MediaCarousel({
  title,
  items,
  actionLink,
  actionText = "Explore All",
}: {
  title: string;
  items: MediaItem[];
  actionLink?: string;
  actionText?: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: "auto",
    dragFree: true,
  });

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!items || items.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between px-4 md:px-8">
        <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h3>

        <div className="flex items-center gap-2">
          {actionLink && (
            <a
              href={actionLink}
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors mr-3"
            >
              {actionText} &rarr;
            </a>
          )}
          <button
            onClick={scrollPrev}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollNext}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden px-4 md:px-8" ref={emblaRef}>
        <div className="flex gap-4">
          {items.map((item) => (
            <div
              key={`${item.mediaType}_${item.id}`}
              className="flex-[0_0_160px] sm:flex-[0_0_190px] md:flex-[0_0_220px] min-w-0"
            >
              <MediaCard media={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
