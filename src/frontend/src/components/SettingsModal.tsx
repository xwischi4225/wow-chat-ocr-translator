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
import { AlertCircle, CheckCircle2, Loader2, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [gcpProject, setGcpProject] = useState("");

  const { data: isConfigured, isLoading: checkingConfig } = useGetConfigured();
  const { mutate: setConfig, isPending } = useSetConfig();

  const handleSave = () => {
    if (!apiKey.trim() || !gcpProject.trim()) {
      toast.error("Both API Key and GCP Project are required");
      return;
    }
    setConfig(
      { apiKey: apiKey.trim(), gcpProject: gcpProject.trim() },
      {
        onSuccess: () => {
          toast.success("Configuration saved successfully");
          setOpen(false);
        },
        onError: (err) => {
          toast.error(`Failed to save config: ${err.message}`);
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
            Translation API Configuration
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
              ? "API configured and ready"
              : "Not configured — translation will fail"}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="apiKey"
              className="text-muted-foreground text-xs uppercase tracking-wider"
            >
              Google Cloud API Key
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

          <div className="space-y-2">
            <Label
              htmlFor="gcpProject"
              className="text-muted-foreground text-xs uppercase tracking-wider"
            >
              GCP Project ID
            </Label>
            <Input
              id="gcpProject"
              type="text"
              value={gcpProject}
              onChange={(e) => setGcpProject(e.target.value)}
              placeholder="my-project-123456"
              className="bg-input/50 border-border/60 font-mono text-sm"
              data-ocid="settings.secondary_button"
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted/20 rounded-md p-3 space-y-1">
            <p className="font-medium text-foreground/70">
              Setup instructions:
            </p>
            <p>
              1. Enable <strong>Cloud Translation API v3</strong> in GCP Console
            </p>
            <p>2. Create an API key with Translation API permissions</p>
            <p>3. Enter your project ID (not project name)</p>
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
            Save Configuration
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
