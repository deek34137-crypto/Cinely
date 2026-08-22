"use client";

import { useEffect, useRef } from "react";

export function ScrapeShakaDashPlayer({
  playUrl,
  poster,
}: {
  playUrl: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let player: any = null;

    async function initPlayer() {
      if (typeof window === "undefined" || !videoRef.current) return;
      try {
        const shaka = (await import("shaka-player/dist/shaka-player.compiled.js")).default;
        shaka.polyfill.installAll();

        if (shaka.Player.isBrowserSupported()) {
          player = new shaka.Player(videoRef.current);
          player.configure({
            streaming: {
              bufferingGoal: 60,
              rebufferingGoal: 4,
              bufferBehind: 120,
            },
          });
          await player.load(playUrl);
        }
      } catch (err) {
        console.warn("Shaka player error:", err);
      }
    }

    initPlayer();

    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, [playUrl]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl border border-white/10">
      <video
        ref={videoRef}
        poster={poster}
        controls
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}
