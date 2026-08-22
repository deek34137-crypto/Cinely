import Link from "next/link";
import { Film, ShieldCheck, Github, Radio, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-zinc-950/80 backdrop-blur-md mt-20 text-zinc-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center">
              <Film className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-black text-white tracking-wider">CINELY</span>
          </div>
          <p className="text-zinc-500 text-[11px] text-center md:text-left max-w-sm">
            Ad-Free high performance streaming engine with HLS proxy decryption and multi-provider fallback.
          </p>
        </div>

        <div className="flex items-center gap-6 text-zinc-400">
          <Link href="/movies/browse" className="hover:text-purple-400 transition-colors">
            Movies
          </Link>
          <Link href="/tvshows/browse" className="hover:text-purple-400 transition-colors">
            TV Shows
          </Link>
          <Link href="/anime/browse" className="hover:text-purple-400 transition-colors">
            Anime
          </Link>
          <Link href="/watchlist" className="hover:text-purple-400 transition-colors">
            Watchlist
          </Link>
        </div>

        <div className="flex items-center gap-2 text-zinc-500 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dual-Engine Streaming Architecture</span>
        </div>
      </div>
    </footer>
  );
}
