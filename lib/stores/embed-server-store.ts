import { create } from "zustand";

export interface ServerHealth {
  serverId: string;
  status: "online" | "degraded" | "offline" | "checking";
  latencyMs?: number;
  lastChecked?: number;
}

interface EmbedServerState {
  healthMap: Record<string, ServerHealth>;
  setHealth: (serverId: string, health: Partial<ServerHealth>) => void;
  bulkSetHealth: (list: ServerHealth[]) => void;
}

export const useEmbedServerStore = create<EmbedServerState>((set) => ({
  healthMap: {},
  setHealth: (serverId, health) =>
    set((state) => {
      const existing = state.healthMap[serverId] || { serverId, status: "online" };
      return {
        healthMap: {
          ...state.healthMap,
          [serverId]: {
            ...existing,
            ...health,
            serverId,
            lastChecked: Date.now(),
          },
        },
      };
    }),
  bulkSetHealth: (list) =>
    set((state) => {
      const nextMap = { ...state.healthMap };
      list.forEach((item) => {
        nextMap[item.serverId] = { ...item, lastChecked: Date.now() };
      });
      return { healthMap: nextMap };
    }),
}));
