import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCopyAll = () => {
    if (entries.length === 0) {
      toast.info("No entries to copy");
      return;
    }
    const text = entries
      .map(
        (e) =>
          `[${formatTime(e.timestamp)}] ${e.original}\n\u2192 ${e.translated}`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${entries.length} entries`);
  };

  const handleCopyEntry = (entry: FeedEntry) => {
    navigator.clipboard.writeText(
      `${entry.original}\n\u2192 ${entry.translated}`,
    );
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex flex-col h-full">
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

      {/* Feed entries */}
      <ScrollArea className="flex-1" ref={scrollRef as never}>
        <div className="p-3 space-y-2.5">
          <AnimatePresence initial={false}>
            {entries.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="feed.empty_state"
              >
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground/60 text-sm">
                  No translations yet
                </p>
                <p className="text-muted-foreground/40 text-xs mt-1">
                  Start capture and click Snap or Start Live
                </p>
              </motion.div>
            ) : (
              entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="group relative bg-card/50 border border-border/40 rounded-lg p-3 hover:border-border/80 transition-colors"
                  data-ocid={`feed.item.${i + 1}`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground/60">
                        {formatTime(entry.timestamp)}
                      </span>
                      {entry.detectedLanguage && (
                        <Badge
                          variant="outline"
                          className="text-xs py-0 px-1.5 h-4 border-primary/30 text-primary/70"
                        >
                          {entry.detectedLanguage}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                      onClick={() => handleCopyEntry(entry)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Original Chinese */}
                  <p className="font-mono text-sm text-muted-foreground leading-relaxed mb-2 pl-2 border-l-2 border-primary/30">
                    {entry.original}
                  </p>

                  {/* Translation */}
                  {entry.isLoading ? (
                    <div
                      className="flex items-center gap-2 text-muted-foreground/60 text-sm"
                      data-ocid="feed.loading_state"
                    >
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span className="text-xs">Translating...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-foreground/90 leading-relaxed pl-2 border-l-2 border-accent/40">
                      {entry.translated}
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
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
