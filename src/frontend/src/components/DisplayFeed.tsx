import type { FeedEntry } from "@/types";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const CHANNEL_NAME = "wow-ocr-feed";

export function DisplayFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      if (msg.type === "state_response" || msg.type === "feed_update") {
        setEntries(
          (msg.entries as FeedEntry[]).map((entry) => ({
            ...entry,
            timestamp: new Date(entry.timestamp),
          })),
        );
        setConnected(true);
      }
    };

    // Request current state
    channel.postMessage({ type: "request_state" });

    // Retry request after a short delay in case main window needs a moment
    const retry = setTimeout(() => {
      channel.postMessage({ type: "request_state" });
    }, 500);

    return () => {
      clearTimeout(retry);
      channel.close();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[oklch(0.06_0.005_40)] text-[oklch(0.95_0.008_80)] p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[oklch(0.2_0.01_40)]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[oklch(0.7_0.18_210)] animate-pulse" />
          <h1
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
            className="text-lg font-bold tracking-tight text-[oklch(0.73_0.16_72)]"
          >
            WoW OCR · Translation Feed
          </h1>
        </div>
        {!connected && (
          <span className="text-xs text-[oklch(0.5_0.01_40)]">
            Waiting for main window...
          </span>
        )}
      </div>

      {/* Entries */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        <AnimatePresence initial={false}>
          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-[oklch(0.4_0.008_40)]"
            >
              <p className="text-sm">No translations received yet</p>
              <p className="text-xs mt-1">
                Activate OCR in the main window to start
              </p>
            </motion.div>
          ) : (
            entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-xl p-4 border"
                style={{
                  background: "oklch(0.12 0.01 40)",
                  borderColor:
                    i === 0
                      ? "oklch(0.73 0.16 72 / 0.4)"
                      : "oklch(0.2 0.01 40)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs"
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "oklch(0.45 0.008 60)",
                    }}
                  >
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  {entry.detectedLanguage && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: "oklch(0.73 0.16 72 / 0.15)",
                        color: "oklch(0.73 0.16 72)",
                      }}
                    >
                      {entry.detectedLanguage}
                    </span>
                  )}
                </div>
                <p
                  className="text-sm mb-2 opacity-60"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {entry.original}
                </p>
                <p className="text-base font-medium leading-relaxed">
                  {entry.translated}
                </p>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <footer className="mt-4 pt-3 border-t border-[oklch(0.18_0.01_40)] text-center">
        <p className="text-xs" style={{ color: "oklch(0.35 0.008 60)" }}>
          © {new Date().getFullYear()} ·{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "oklch(0.5 0.01 60)" }}
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
