"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { SearchDialog } from "./search-dialog";

export function SearchBar() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-400 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 rounded-full transition-all duration-200 w-44 md:w-64 backdrop-blur-md group"
      >
        <Search className="w-4 h-4 text-zinc-400 group-hover:text-purple-400 transition-colors" />
        <span className="truncate group-hover:text-zinc-200">Search media...</span>
        <kbd className="ml-auto hidden md:inline-flex items-center gap-1 rounded border border-white/15 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400">
          ⌘K
        </kbd>
      </button>

      <SearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
