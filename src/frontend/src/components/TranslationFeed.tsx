import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeedEntry, TargetLang } from "@/types";
import { LANG_LABELS } from "@/types";
import {
  Copy,
  ExternalLink,
  Languages,
  Loader2,
  MessageSquare,
  PauseCircle,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface Props {
  entries: FeedEntry[];
  isPaused: boolean;
  onPauseToggle: () => void;
  onClear: () => void;
  targetLanguage: TargetLang;
  onTargetLanguageChange: (lang: TargetLang) => void;
  onOpenDisplayWindow: () => void;
}

export function TranslationFeed({
  entries,
  isPaused,
  onPauseToggle,
  onClear,
  targetLanguage,
  onTargetLanguageChange,
  onOpenDisplayWindow,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (entries.length !== prevLengthRef.current) {
      prevLengthRef.current = entries.length;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  });

  const handleCopyAll = () => {
    if (entries.length === 0) {
      toast.info("No entries to copy");
      return;
    }
    const text = [...entries]
      .reverse()
      .map(
        (e) =>
          `[${formatTime(e.timestamp)}] ${e.original}\n\u2192 ${e.translated}`,
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${entries.length} entries`);
  };

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold text-sm text-foreground/90">
            Translation Feed
          </h2>
          {entries.length > 0 && (
            <Badge
              variant="secondary"
              className="text-xs bg-muted/40 text-muted-foreground"
            >
              {entries.length}
            </Badge>
          )}
          {isPaused && (
            <Badge className="text-xs bg-amber-900/40 text-amber-400 border-amber-800/40">
              PAUSED
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Select
            value={targetLanguage}
            onValueChange={(v) => onTargetLanguageChange(v as TargetLang)}
          >
            <SelectTrigger
              className="w-28 h-7 text-xs bg-input/40 border-border/50"
              data-ocid="feed.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border/60">
              {Object.entries(LANG_LABELS).map(([code, label]) => (
                <SelectItem key={code} value={code} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={onPauseToggle}
            title={isPaused ? "Resume feed" : "Pause feed"}
            data-ocid="feed.toggle"
          >
            {isPaused ? (
              <PlayCircle className="h-4 w-4" />
            ) : (
              <PauseCircle className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-primary"
            onClick={handleCopyAll}
            title="Copy all entries"
            data-ocid="feed.secondary_button"
          >
            <Copy className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onClear}
            title="Clear feed"
            data-ocid="feed.delete_button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-accent"
            onClick={onOpenDisplayWindow}
            title="Open on Monitor 2"
            data-ocid="feed.open_modal_button"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat-style feed */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 font-mono text-sm">
        {entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full py-16 text-center"
            data-ocid="feed.empty_state"
          >
            <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground/60 text-sm">
              No translations yet
            </p>
            <p className="text-muted-foreground/40 text-xs mt-1">
              Start capture and click Snap or Start Live
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {[...entries].reverse().map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="group leading-snug py-0.5 hover:bg-white/5 rounded px-1 -mx-1"
                data-ocid={`feed.item.${i + 1}`}
              >
                {/* Original line */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-muted-foreground/50 text-xs shrink-0 tabular-nums">
                    [{formatTime(entry.timestamp)}]
                  </span>
                  {entry.detectedLanguage && (
                    <span className="text-primary/50 text-xs shrink-0">
                      {entry.detectedLanguage}
                    </span>
                  )}
                  <span className="text-yellow-300/90 break-words">
                    {entry.original}
                  </span>
                  <button
                    type="button"
                    className="ml-auto opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-muted-foreground shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${entry.original}\n\u2192 ${entry.translated}`,
                      );
                      toast.success("Copied");
                    }}
                    title="Copy"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>

                {/* Translation line */}
                <div className="flex items-baseline gap-1.5 pl-4">
                  <span className="text-muted-foreground/40 text-xs shrink-0">
                    →
                  </span>
                  {entry.isLoading ? (
                    <span
                      className="flex items-center gap-1 text-muted-foreground/50 text-xs"
                      data-ocid="feed.loading_state"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      translating…
                    </span>
                  ) : (
                    <span className="text-foreground/85 break-words">
                      {entry.translated}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
