"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AdblockerIcons } from "@/components/content/adblocker-icons";
import { ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";

export type AdblockerAlertProps = {
  openSignal: boolean;
  onProceed?: () => void;
};

export function AdblockerAlert({ openSignal, onProceed }: AdblockerAlertProps) {
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    if (openSignal) {
      setShowOptions(false);
      setOpen(true);
    }
  }, [openSignal]);

  const handleProceed = () => {
    setOpen(false);
    onProceed?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md p-5 sm:p-6 border border-white/10 bg-zinc-950/95 backdrop-blur-2xl text-zinc-100 rounded-2xl shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <AlertDialogTitle className="text-lg sm:text-xl font-bold text-white leading-tight">
              Are you sure you don&apos;t want an ad-blocker?
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription asChild>
            <div className="space-y-3 text-xs sm:text-sm text-zinc-400 mt-2 leading-relaxed">
              <p>
                <strong className="font-bold text-white">Cinely</strong> itself is 100% ad-free.
                However, third-party embed providers often inject scripts that display popups and redirects.
              </p>
              <p className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 text-purple-200 text-xs">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-purple-400" />
                If you want zero popups <em>without</em> installing an extension, select the{" "}
                <strong className="font-bold text-white">Proxy (Ad-Free)</strong> server mode in the player.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="mt-4">
          <AnimatePresence mode="wait" initial={false}>
            {!showOptions ? (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="flex w-full flex-col items-stretch gap-2.5"
              >
                <Button
                  variant="default"
                  className="w-full py-2.5 font-bold shadow-lg shadow-purple-600/30"
                  onClick={() => setShowOptions(true)}
                >
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Show me ad blockers
                </Button>
                <Button
                  variant="outline"
                  className="w-full py-2.5 text-zinc-400 hover:text-white"
                  onClick={handleProceed}
                >
                  No thanks, I&apos;m fine with popups
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="options"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <AdblockerIcons />
                <Button
                  variant="default"
                  className="w-full py-2.5 font-bold"
                  onClick={handleProceed}
                >
                  Continue to stream &rarr;
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
