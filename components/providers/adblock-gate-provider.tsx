"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useDetectAdBlock } from "adblock-detect-react";
import { AdblockerAlert } from "@/components/content/adblocker-alert";

type GateAction = (action: () => void) => void;

const ADBLOCK_PROMPT_DISMISSED_KEY = "cinely:adblock-prompt-dismissed";

const hasDismissedAdblockPrompt = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ADBLOCK_PROMPT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
};

const rememberAdblockPromptDismissal = (): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ADBLOCK_PROMPT_DISMISSED_KEY, "true");
  } catch {
    void 0;
  }
};

const AdblockGateContext = createContext<GateAction | null>(null);

export function useAdblockGateAction(): GateAction {
  const gateAction = useContext(AdblockGateContext);
  if (!gateAction) {
    // If used outside provider, gracefully execute action
    return (action: () => void) => action();
  }
  return gateAction;
}

interface AdblockGateProviderProps {
  children: ReactNode;
}

export function AdblockGateProvider({ children }: AdblockGateProviderProps) {
  const adBlockDetected = useDetectAdBlock();
  const [alertSession, setAlertSession] = useState(0);
  const [openSignal, setOpenSignal] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const gateAction = useCallback<GateAction>(
    (action) => {
      // If user already has an adblocker active OR already dismissed the warning -> allow immediately
      if (adBlockDetected || hasDismissedAdblockPrompt()) {
        action();
        return;
      }

      // Intercept and open dialog
      pendingActionRef.current = action;
      setAlertSession((session) => session + 1);
      setOpenSignal(true);
    },
    [adBlockDetected]
  );

  const handleProceed = useCallback(() => {
    rememberAdblockPromptDismissal();
    setOpenSignal(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  return (
    <AdblockGateContext.Provider value={gateAction}>
      {children}
      <AdblockerAlert
        key={alertSession}
        openSignal={openSignal}
        onProceed={handleProceed}
      />
    </AdblockGateContext.Provider>
  );
}
