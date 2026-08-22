"use client";

import * as React from "react";
import Image from "next/image";
import { CastMember } from "@/lib/domain/typings";
import { ChevronDown, ChevronUp } from "lucide-react";

export function ExpandableCastGrid({ cast = [] }: { cast: CastMember[] }) {
  const [expanded, setExpanded] = React.useState(false);

  if (!cast || cast.length === 0) return null;

  const visibleCast = expanded ? cast : cast.slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white tracking-wide">Top Cast</h3>
        {cast.length > 10 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            <span>{expanded ? "Show Less" : `View All (${cast.length})`}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3">
        {visibleCast.map((member) => (
          <div
            key={`${member.id}_${member.order}`}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 transition-all group backdrop-blur-sm"
          >
            <div className="relative w-11 h-11 rounded-full overflow-hidden bg-zinc-800 shrink-0 border border-white/10 group-hover:border-purple-500/50 transition-colors">
              <Image
                src={member.profileUrl}
                alt={member.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                {member.name}
              </span>
              <span className="text-[11px] text-zinc-400 truncate">
                {member.character || "Cast"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
