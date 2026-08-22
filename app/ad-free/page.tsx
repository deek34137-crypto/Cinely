import Link from "next/link";
import { ShieldCheck, Sparkles, Film, ArrowRight, Shield } from "lucide-react";
import { AdblockerIcons } from "@/components/content/adblocker-icons";

export const metadata = {
  title: "Ad-Free, On Purpose — Cinely",
  description: "Learn how Cinely provides ad-free streaming through direct HLS proxy decryption and zero popups.",
};

export default function AdFreePage() {
  return (
    <div className="min-h-screen bg-[#08080c] text-zinc-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Anti-Popup & Clean Playback Policy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Ad-Free, On Purpose
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Most free streaming platforms clutter your screen with popups, malware redirects, and autoplaying adware.
            <strong className="text-white font-bold"> Cinely itself runs zero advertisements.</strong>
          </p>
        </div>

        {/* Feature Explainer Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl shadow-2xl space-y-4">
          <div className="flex items-center gap-3 text-purple-400">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">How Does Direct Proxy Streaming Work?</h2>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed">
            When you select <strong className="text-white font-semibold">Proxy (Ad-Free)</strong> mode in the playback server selector, Cinely reverse-engineers the upstream backend video stream, decrypts the payload with SplitMix64 ciphers, and proxies clean HLS (<code className="text-purple-300 font-mono bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/20">.m3u8</code>) media chunks directly to Vidstack.
          </p>

          <p className="text-sm text-zinc-300 leading-relaxed">
            This bypasses CORS, anti-hotlinking referer blocks, and third-party advertising scripts altogether.
          </p>
        </div>

        {/* Third-Party Embed Protection & Extensions */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-white">Third-Party Embed Fallback Protection</h3>
          </div>

          <p className="text-sm text-zinc-400 leading-relaxed">
            If you switch to any of our 14 third-party embed fallback servers, we enforce strict <code className="text-zinc-300 font-mono bg-zinc-900 px-1 py-0.5 rounded">sandbox</code> attributes. For 100% defense against external scripts, we recommend installing a verified ad-blocker:
          </p>

          <div className="pt-2">
            <AdblockerIcons />
          </div>
        </div>

        {/* CTA Button */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:from-purple-500 hover:to-indigo-500 transition-all shadow-xl shadow-purple-900/40"
          >
            <span>Start Watching Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link href="/movies/browse" className="text-xs font-semibold text-zinc-400 hover:text-purple-400 transition-colors">
            Browse All Movies &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
