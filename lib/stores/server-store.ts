import { create } from "zustand";
import { persist } from "zustand/middleware";
import { videoServers, VideoServer } from "./video-servers";

export const scrapeServer: VideoServer = {
  id: "scrape",
  name: "Proxy (Ad-Free)",
  baseUrl: "",
  badge: "Ad-Free",
  getMovieUrl: () => "",
  getTvUrl: () => "",
  getEpisodeUrl: () => "",
};

interface ServerState {
  selectedServer: VideoServer;
  playbackMode: "direct" | "embed";
  setSelectedServer: (server: VideoServer) => void;
  setPlaybackMode: (mode: "direct" | "embed") => void;
}

export const useServerStore = create<ServerState>()(
  persist(
    (set) => ({
      selectedServer: scrapeServer,
      playbackMode: "direct",
      setSelectedServer: (server) =>
        set({
          selectedServer: server,
          playbackMode: server.id === "scrape" ? "direct" : "embed",
        }),
      setPlaybackMode: (mode) =>
        set({
          playbackMode: mode,
          selectedServer: mode === "direct" ? scrapeServer : videoServers[0],
        }),
    }),
    { name: "cinely-server-storage" }
  )
);
