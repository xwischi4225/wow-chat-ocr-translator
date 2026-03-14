import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetConfigured, useSetConfig } from "@/hooks/useQueries";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const { data: isConfigured, isLoading: checkingConfig } = useGetConfigured();
  const { mutate: setConfig, isPending } = useSetConfig();

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("API Key is required");
      return;
    }
    setConfig(
      { apiKey: apiKey.trim() },
      {
        onSuccess: () => {
          toast.success("API key saved");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(`Failed to save: ${err.message}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-ocid="settings.open_modal_button"
          className="gap-2 border-border/60 hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
          {checkingConfig ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isConfigured ? (
            <CheckCircle2 className="h-3 w-3 text-green-400" />
          ) : (
            <AlertCircle className="h-3 w-3 text-amber-400" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md bg-card border-border/60"
        data-ocid="settings.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-primary">
            Google Translation API
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
              isConfigured
                ? "bg-green-950/30 text-green-400 border border-green-800/40"
                : "bg-amber-950/30 text-amber-400 border border-amber-800/40"
            }`}
            data-ocid="settings.success_state"
          >
            {isConfigured ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {isConfigured
              ? "API key configured — ready to translate"
              : "No API key — translation will fail"}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="apiKey"
              className="text-muted-foreground text-xs uppercase tracking-wider"
            >
              Google API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="bg-input/50 border-border/60 font-mono text-sm"
              data-ocid="settings.input"
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted/20 rounded-md p-3 space-y-1.5">
            <p className="font-medium text-foreground/70">Setup (2 steps):</p>
            <p>
              1. Enable <strong>Cloud Translation API</strong> (v2 Basic) in
              your{" "}
              <a
                href="https://console.cloud.google.com/apis/library/translate.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline inline-flex items-center gap-0.5"
              >
                GCP Console <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <p>
              2. Go to <strong>Credentials &rarr; Create API Key</strong> and
              optionally restrict it to <strong>Cloud Translation API</strong>.
            </p>
            <p className="text-muted-foreground/60 pt-1">
              Free tier: 500k chars/month. No OAuth or service account needed.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            data-ocid="settings.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-ocid="settings.save_button"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
