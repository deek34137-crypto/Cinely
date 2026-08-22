"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { hasSeenProxyModeHint, rememberProxyModeHintSeen } from "@/lib/playback/proxy-mode-hint-storage";
import { Sparkles } from "lucide-react";

export function ProxyModeHintBubble() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasSeenProxyModeHint()) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        rememberProxyModeHintSeen();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="proxy-mode-hint"
          initial={{ opacity: 0, y: 6, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.94 }}
          transition={{
            type: "spring",
            stiffness: 420,
            damping: 28,
            opacity: { duration: 0.24, ease: "easeInOut" },
          }}
          className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 w-max max-w-48 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="relative rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-center text-[11px] font-bold leading-tight text-white shadow-xl shadow-purple-900/50 border border-purple-400/40 flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-purple-200 shrink-0" />
            <span>Use proxy for no ads</span>
            {/* Arrow */}
            <span
              aria-hidden
              className="absolute left-1/2 top-full -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-purple-600"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
