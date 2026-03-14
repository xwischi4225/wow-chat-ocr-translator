import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, ClipboardCopy, Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  stage: string; // e.g. "translation", "OCR"
  message: string;
  detail?: string;
}

interface Props {
  entries: ErrorLogEntry[];
  onClear: () => void;
}

export function ErrorLogModal({ entries, onClear }: Props) {
  const handleCopyAll = () => {
    const text = entries
      .map(
        (e) =>
          `[${formatTime(e.timestamp)}] [${e.stage.toUpperCase()}] ${e.message}${
            e.detail ? `\nDetail: ${e.detail}` : ""
          }`,
      )
      .join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Error log copied to clipboard");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={`h-7 gap-1.5 text-xs ${
            entries.length > 0
              ? "text-red-400 hover:text-red-300 hover:bg-red-950/30"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          }`}
          data-ocid="errorlog.open_modal_button"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Errors{entries.length > 0 ? ` (${entries.length})` : ""}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-2xl bg-card border-border/60"
        data-ocid="errorlog.dialog"
      >
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Error Log
          </DialogTitle>
          <div className="flex items-center gap-2 mt-0 mr-8">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-primary"
              onClick={handleCopyAll}
              disabled={entries.length === 0}
              data-ocid="errorlog.secondary_button"
            >
              <ClipboardCopy className="h-3.5 w-3.5 mr-1.5" />
              Copy All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-destructive"
              onClick={onClear}
              disabled={entries.length === 0}
              data-ocid="errorlog.delete_button"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
        </DialogHeader>

        {entries.length === 0 ? (
          <div
            className="py-12 flex flex-col items-center justify-center text-center"
            data-ocid="errorlog.empty_state"
          >
            <AlertTriangle className="h-8 w-8 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground/60">No errors logged</p>
          </div>
        ) : (
          <ScrollArea className="h-96 rounded-md border border-border/40 bg-black/30">
            <div className="p-3 space-y-2 font-mono text-xs">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-red-900/30 bg-red-950/10 rounded p-2.5 space-y-1"
                  data-ocid={`errorlog.item.${entries.indexOf(entry) + 1}`}
                >
                  <div className="flex items-center gap-2 text-muted-foreground/60">
                    <span className="text-red-400/70">
                      [{formatTime(entry.timestamp)}]
                    </span>
                    <span className="uppercase bg-red-900/30 text-red-300/80 px-1 rounded">
                      {entry.stage}
                    </span>
                  </div>
                  <p className="text-red-200/90">{entry.message}</p>
                  {entry.detail && (
                    <pre className="text-muted-foreground/50 whitespace-pre-wrap break-all text-xs leading-relaxed border-t border-border/20 pt-1 mt-1">
                      {entry.detail}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
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
