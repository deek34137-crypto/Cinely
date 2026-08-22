"use client";

import * as React from "react";
import Image from "next/image";
import { ScrapePlayerShell } from "./scrape-player-shell";
import { Season, Episode } from "@/lib/domain/typings";
import { Play, Calendar, Clock, ChevronDown } from "lucide-react";
import { useEpisodeStore } from "@/lib/stores/episode-store";

export function TvEpisodePlayerSection({
  tmdbId,
  showTitle,
  poster,
  seasons = [],
  imdbId,
}: {
  tmdbId: number;
  showTitle: string;
  poster?: string;
  seasons: Season[];
  imdbId?: string | null;
}) {
  const {
    currentSeasonNumber,
    currentEpisodeNumber,
    setSeason,
    setEpisode,
    setSeasons,
    nextEpisode,
  } = useEpisodeStore();

  const [episodes, setEpisodes] = React.useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = React.useState(false);

  React.useEffect(() => {
    setSeasons(seasons);
  }, [seasons, setSeasons]);

  // Fetch episodes for current season
  React.useEffect(() => {
    setLoadingEpisodes(true);
    fetch(`/api/tv/${tmdbId}/season/${currentSeasonNumber}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.episodes) {
          setEpisodes(data.episodes);
        }
      })
      .catch((err) => console.error("Failed to load season episodes:", err))
      .finally(() => setLoadingEpisodes(false));
  }, [tmdbId, currentSeasonNumber]);

  const currentEpData = episodes.find((e) => e.episodeNumber === currentEpisodeNumber);
  const activeTitle = `${showTitle} — S${currentSeasonNumber}:E${currentEpisodeNumber} ${
    currentEpData?.title ? `(${currentEpData.title})` : ""
  }`;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Video Player Shell */}
      <ScrapePlayerShell
        tmdbId={tmdbId}
        mediaType="tv"
        title={activeTitle}
        poster={currentEpData?.stillUrl || poster}
        season={currentSeasonNumber}
        episode={currentEpisodeNumber}
        imdbId={imdbId}
        onEnded={() => nextEpisode()}
      />

      {/* Season & Episode Selector Bar */}
      <div className="flex flex-col gap-4 bg-zinc-950/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">Episodes</h3>
            <span className="text-xs text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              Season {currentSeasonNumber} ({episodes.length} Episodes)
            </span>
          </div>

          {/* Season Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="season-select" className="text-xs font-semibold text-zinc-400">
              Season:
            </label>
            <select
              id="season-select"
              value={currentSeasonNumber}
              onChange={(e) => {
                const sNum = parseInt(e.target.value, 10);
                setSeason(sNum);
                setEpisode(1);
              }}
              className="bg-zinc-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.seasonNumber}>
                  Season {s.seasonNumber} {s.name ? `— ${s.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Episode Cards Grid */}
        {loadingEpisodes ? (
          <div className="py-12 text-center text-sm text-zinc-400">
            Loading Season {currentSeasonNumber} episodes...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {episodes.map((ep) => {
              const isSelected = ep.episodeNumber === currentEpisodeNumber;
              return (
                <button
                  key={ep.id}
                  onClick={() => setEpisode(ep.episodeNumber)}
                  className={`flex gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-950/40 border-purple-500/50 shadow-md"
                      : "bg-zinc-900/40 hover:bg-zinc-800/60 border-white/5"
                  }`}
                >
                  <div className="relative w-28 aspect-video rounded-lg overflow-hidden bg-zinc-800 shrink-0 border border-white/10">
                    <Image
                      src={ep.stillUrl}
                      alt={ep.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 fill-white text-white" />
                    </div>
                  </div>

                  <div className="flex flex-col min-w-0 justify-center">
                    <span className="text-[11px] font-bold text-purple-400">
                      Episode {ep.episodeNumber}
                    </span>
                    <span className="text-xs font-semibold text-white truncate">
                      {ep.title}
                    </span>
                    {ep.runtime && (
                      <span className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {ep.runtime} min
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
