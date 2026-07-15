"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchInternal } from "@/lib/repo";
import type { WebSearchResult } from "@/types/schema";

export function SearchBar({ tenantId }: { tenantId: string }) {
  const [query, setQuery] = useState("");
  const [webResults, setWebResults] = useState<WebSearchResult[]>([]);
  const [webConfigured, setWebConfigured] = useState(true);
  const [loadingWeb, setLoadingWeb] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = query.trim();
  const internalResults = useMemo(
    () => (trimmed ? searchInternal(tenantId, trimmed) : []),
    [trimmed, tenantId]
  );
  const showDropdown = trimmed.length > 0;

  useEffect(() => {
    if (!trimmed) return;

    const timer = setTimeout(() => {
      setLoadingWeb(true);
      fetch(`/api/search/web?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => {
          setWebConfigured(data.configured);
          setWebResults(data.results ?? []);
        })
        .catch(() => setWebResults([]))
        .finally(() => setLoadingWeb(false));
    }, 400);

    debounceRef.current = timer;
    return () => clearTimeout(timer);
  }, [trimmed]);

  const hasInternal = internalResults.length > 0;
  const hasWeb = webResults.length > 0;

  return (
    <div className="relative">
      <div className="glass flex items-center gap-2 rounded-full px-4 py-2.5">
        <Search className="h-4 w-4 text-foreground/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics, e.g. two pointers…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-foreground/30"
        />
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="glass absolute left-0 right-0 top-12 z-30 max-h-80 overflow-y-auto rounded-xl p-2"
          >
            {!hasInternal && !hasWeb && !loadingWeb && (
              <p className="px-3 py-4 text-center text-xs text-foreground/40">
                No results yet.
              </p>
            )}

            {hasInternal && (
              <div className="mb-1">
                <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground/40">
                  In Betonyou
                </p>
                {internalResults.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-charcoal"
                  >
                    <span>{r.title}</span>
                    <span className="text-[10px] text-foreground/30">{r.kind}</span>
                  </div>
                ))}
              </div>
            )}

            {hasWeb && (
              <div>
                <p className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-foreground/40">
                  From the web
                </p>
                {webResults.map((r) => (
                  <a
                    key={r.url}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition hover:bg-charcoal"
                  >
                    <span className="flex items-center gap-1.5 text-foreground/90">
                      {r.title}
                      <ExternalLink className="h-3 w-3 text-foreground/30" />
                    </span>
                    <span className="line-clamp-1 text-xs text-foreground/40">{r.snippet}</span>
                  </a>
                ))}
              </div>
            )}

            {!webConfigured && (
              <p className="border-t border-border-glass px-3 py-2 text-[10px] text-foreground/30">
                Add a Tavily API key to see results from the web.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
