import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Activity,
  Info,
  Loader2,
  Monitor,
  PauseCircle,
  Save,
  Scan,
  Square,
  Trash2,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { DisplayFeed } from "@/components/DisplayFeed";
import { ErrorLogModal } from "@/components/ErrorLogModal";
import type { ErrorLogEntry } from "@/components/ErrorLogModal";
import { RegionCanvas } from "@/components/RegionCanvas";
import { SettingsModal } from "@/components/SettingsModal";
import { TranslationFeed } from "@/components/TranslationFeed";

import { useTranslateMutation } from "@/hooks/useQueries";
import {
  initOcrWorker,
  recognizeRegion,
  terminateOcrWorker,
} from "@/services/ocrService";
import type {
  FeedEntry,
  OcrStatus,
  Region,
  RegionPreset,
  TargetLang,
} from "@/types";

const queryClient = new QueryClient();
const PRESETS_KEY = "wow-ocr-presets";
const CHANNEL_NAME = "wow-ocr-feed";

function MainApp() {
  // --- Screen capture ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // --- Region ---
  const [region, setRegion] = useState<Region | null>(null);
  const regionRef = useRef<Region | null>(null);
  const [presets, setPresets] = useState<RegionPreset[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [presetName, setPresetName] = useState("");

  // --- OCR ---
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrStatusMsg, setOcrStatusMsg] = useState("");
  const [includeEnglish, setIncludeEnglish] = useState(false);
  const [usePreprocessing, setUsePreprocessing] = useState(true);

  // --- Live mode ---
  const [isLive, setIsLive] = useState(false);
  const [isFeedPaused, setIsFeedPaused] = useState(false);
  const [fps, setFps] = useState(2);
  const isProcessingRef = useRef(false);
  const lastOcrTextRef = useRef("");
  const isFeedPausedRef = useRef(false);

  // --- Feed ---
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([]);
  const feedEntriesRef = useRef<FeedEntry[]>([]);
  const [targetLanguage, setTargetLanguage] = useState<TargetLang>("en");

  // --- Error log ---
  const [errorLog, setErrorLog] = useState<ErrorLogEntry[]>([]);

  const addError = useCallback(
    (stage: string, message: string, detail?: string) => {
      setErrorLog((prev) => [
        {
          id: `err-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: new Date(),
          stage,
          message,
          detail,
        },
        ...prev,
      ]);
    },
    [],
  );

  // --- BroadcastChannel ---
  const channelRef = useRef<BroadcastChannel | null>(null);

  const { mutateAsync: translateText } = useTranslateMutation();

  // Sync refs
  useEffect(() => {
    regionRef.current = region;
  }, [region]);
  useEffect(() => {
    isFeedPausedRef.current = isFeedPaused;
  }, [isFeedPaused]);
  useEffect(() => {
    feedEntriesRef.current = feedEntries;
  }, [feedEntries]);

  // BroadcastChannel setup
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (e: MessageEvent) => {
      if (e.data?.type === "request_state") {
        channel.postMessage({
          type: "state_response",
          entries: feedEntriesRef.current,
        });
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  // Broadcast feed updates
  useEffect(() => {
    channelRef.current?.postMessage({
      type: "feed_update",
      entries: feedEntries,
    });
  }, [feedEntries]);

  // Init OCR worker when settings change
  useEffect(() => {
    const languages = ["chi_sim", "chi_tra"];
    if (includeEnglish) languages.push("eng");

    setOcrStatus("initializing");
    initOcrWorker(languages, (msg) => {
      setOcrStatusMsg(msg);
      if (msg === "OCR ready") setOcrStatus("ready");
    }).catch((err) => {
      setOcrStatus("error");
      setOcrStatusMsg(err.message);
      addError("OCR", `Init failed: ${err.message}`, err.stack);
      toast.error(`OCR init failed: ${err.message}`);
    });

    return () => {
      terminateOcrWorker();
    };
  }, [includeEnglish, addError]);

  // Keyboard shortcut: Ctrl+Shift+Y
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "Y") {
        e.preventDefault();
        handleSnapTranslate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFrame = useCallback(
    async (targetLang: TargetLang) => {
      if (isProcessingRef.current) return;
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;

      isProcessingRef.current = true;
      setOcrStatus("processing");

      try {
        const text = await recognizeRegion(
          video,
          regionRef.current,
          usePreprocessing,
        );

        if (!text || text.length < 2) {
          setOcrStatus("ready");
          return;
        }

        // Dedupe check
        if (text === lastOcrTextRef.current) {
          setOcrStatus("ready");
          return;
        }
        lastOcrTextRef.current = text;

        const id = `entry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const placeholderEntry: FeedEntry = {
          id,
          timestamp: new Date(),
          original: text,
          translated: "",
          isLoading: true,
        };

        if (!isFeedPausedRef.current) {
          setFeedEntries((prev) => [placeholderEntry, ...prev].slice(0, 100));
        }

        try {
          const translated = await translateText({
            text,
            targetLanguage: targetLang,
          });
          setFeedEntries((prev) =>
            prev.map((e) =>
              e.id === id ? { ...e, translated, isLoading: false } : e,
            ),
          );
        } catch (translateErr) {
          const err = translateErr as Error;
          const detail = err.message || String(translateErr);
          addError(
            "Translation",
            "Failed to translate text",
            `Text: ${text.slice(0, 200)}\nError: ${detail}`,
          );
          setFeedEntries((prev) =>
            prev.map((e) =>
              e.id === id
                ? { ...e, translated: "[Translation failed]", isLoading: false }
                : e,
            ),
          );
        }
      } catch (err) {
        const msg = (err as Error).message;
        addError(
          "OCR",
          `Frame recognition error: ${msg}`,
          (err as Error).stack,
        );
        toast.error(`OCR error: ${msg}`);
      } finally {
        isProcessingRef.current = false;
        setOcrStatus("ready");
      }
    },
    [translateText, usePreprocessing, addError],
  );

  // Live mode interval
  useEffect(() => {
    if (!isLive || !isCapturing) return;
    const intervalMs = Math.floor(1000 / fps);
    const id = setInterval(() => {
      if (!isProcessingRef.current) {
        processFrame(targetLanguage);
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [isLive, isCapturing, fps, processFrame, targetLanguage]);

  const handleSnapTranslate = useCallback(() => {
    if (!isCapturing) {
      toast.warning("Start screen capture first");
      return;
    }
    if (ocrStatus !== "ready" && ocrStatus !== "processing") {
      toast.warning("OCR is not ready yet");
      return;
    }
    processFrame(targetLanguage);
  }, [isCapturing, ocrStatus, processFrame, targetLanguage]);

  const handleStartCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCapturing(true);

      stream.getVideoTracks()[0].onended = () => {
        handleStopCapture();
      };
      toast.success("Screen capture started");
    } catch (err) {
      if ((err as Error).name !== "NotAllowedError") {
        toast.error(`Capture failed: ${(err as Error).message}`);
      }
    }
  };

  const handleStopCapture = () => {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setIsLive(false);
    toast.info("Screen capture stopped");
  };

  const handleSavePreset = () => {
    if (!region) {
      toast.warning("No region selected");
      return;
    }
    const name = presetName.trim() || `Preset ${presets.length + 1}`;
    const newPresets = [
      ...presets.filter((p) => p.name !== name),
      { name, region },
    ];
    setPresets(newPresets);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
    setPresetName("");
    toast.success(`Saved preset "${name}"`);
  };

  const handleLoadPreset = (name: string) => {
    const preset = presets.find((p) => p.name === name);
    if (preset) {
      setRegion(preset.region);
      toast.success(`Loaded preset "${name}"`);
    }
  };

  const handleDeletePreset = (name: string) => {
    const newPresets = presets.filter((p) => p.name !== name);
    setPresets(newPresets);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
    toast.info(`Deleted preset "${name}"`);
  };

  const handleOpenDisplayWindow = () => {
    window.open(
      `${window.location.origin}${window.location.pathname}?mode=display`,
      "WoW OCR Display",
      "width=900,height=800,scrollbars=yes",
    );
  };

  const ocrStatusColor = {
    idle: "text-muted-foreground",
    initializing: "text-amber-400",
    ready: "text-green-400",
    processing: "text-accent",
    error: "text-destructive",
  }[ocrStatus];

  return (
    <TooltipProvider>
      {/* h-screen + overflow-hidden locks the layout to the viewport */}
      <div className="h-screen overflow-hidden bg-background flex flex-col">
        {/* Top bar */}
        <header className="h-12 border-b border-border/50 flex items-center justify-between px-4 bg-card/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Scan className="h-5 w-5 text-primary" />
              <span className="font-display font-bold text-base text-foreground tracking-tight">
                WoW OCR <span className="text-primary">Translator</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* OCR status */}
            <div
              className={`flex items-center gap-1.5 text-xs ${ocrStatusColor}`}
            >
              {ocrStatus === "initializing" || ocrStatus === "processing" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <div
                  className={`w-2 h-2 rounded-full ${
                    ocrStatus === "ready"
                      ? "bg-green-400"
                      : ocrStatus === "error"
                        ? "bg-red-400"
                        : "bg-muted-foreground/40"
                  }`}
                />
              )}
              <span className="hidden md:inline">
                {ocrStatusMsg || ocrStatus.toUpperCase()}
              </span>
            </div>

            {/* Error log button */}
            <ErrorLogModal entries={errorLog} onClear={() => setErrorLog([])} />

            <SettingsModal />
          </div>
        </header>

        {/* Main content — flex-1 fills remaining height; panels scroll independently */}
        <main className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT: Capture Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="w-[55%] border-r border-border/50 flex flex-col overflow-hidden"
          >
            {/* Capture controls */}
            <div className="px-4 py-3 border-b border-border/40 flex items-center gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={isCapturing ? handleStopCapture : handleStartCapture}
                  className={
                    isCapturing
                      ? "bg-destructive/20 text-destructive border border-destructive/40 hover:bg-destructive/30 h-8"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 h-8"
                  }
                  data-ocid="capture.primary_button"
                >
                  {isCapturing ? (
                    <>
                      <Square className="h-3 w-3 mr-1.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Monitor className="h-3 w-3 mr-1.5" />
                      Start Capture
                    </>
                  )}
                </Button>

                {isCapturing && (
                  <span className="text-xs text-green-400 font-mono animate-pulse-live">
                    ● LIVE
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSnapTranslate}
                      disabled={!isCapturing || ocrStatus !== "ready"}
                      className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10"
                      data-ocid="capture.secondary_button"
                    >
                      <Zap className="h-3 w-3 mr-1.5" />
                      Snap
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Ctrl+Shift+Y for quick snap</p>
                  </TooltipContent>
                </Tooltip>

                <Button
                  size="sm"
                  variant={isLive ? "default" : "outline"}
                  onClick={() => {
                    if (!isCapturing) {
                      toast.warning("Start capture first");
                      return;
                    }
                    if (ocrStatus !== "ready") {
                      toast.warning("OCR not ready");
                      return;
                    }
                    setIsLive(!isLive);
                  }}
                  className={`h-8 text-xs ${
                    isLive
                      ? "bg-accent text-accent-foreground glow-cyan"
                      : "border-border/60 hover:border-accent/50 hover:text-accent"
                  }`}
                  data-ocid="capture.toggle"
                >
                  {isLive ? (
                    <>
                      <PauseCircle className="h-3 w-3 mr-1.5" />
                      Stop Live
                    </>
                  ) : (
                    <>
                      <Activity className="h-3 w-3 mr-1.5" />
                      Start Live
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Video preview area — flex-1 + min-h-0 ensures it fills without blowing out */}
            <div className="flex-1 relative bg-black/40 overflow-hidden scanlines min-h-0">
              {!isCapturing ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6"
                  data-ocid="capture.empty_state"
                >
                  <Monitor className="h-12 w-12 text-muted-foreground/20" />
                  <div>
                    <p className="text-muted-foreground/60 text-sm font-medium">
                      No capture active
                    </p>
                    <p className="text-muted-foreground/40 text-xs mt-1 max-w-xs">
                      Click <strong>Start Capture</strong> and select your WoW
                      window in the browser dialog
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-amber-500/70 bg-amber-950/20 border border-amber-800/20 rounded-lg p-3 max-w-xs">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      Browser will ask for screen share permission. Select your
                      WoW window or monitor.
                    </span>
                  </div>
                </div>
              ) : null}

              <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-contain"
                style={{ display: isCapturing ? "block" : "none" }}
              />

              {isCapturing && (
                <RegionCanvas
                  videoRef={videoRef}
                  region={region}
                  onRegionChange={setRegion}
                />
              )}
            </div>

            {/* Region + presets */}
            {isCapturing && (
              <div className="px-4 py-3 border-t border-border/40 space-y-3 bg-card/20 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Region Selection
                  </span>
                  {region ? (
                    <span className="font-mono text-xs text-primary/70">
                      x:{(region.x * 100).toFixed(1)}% y:
                      {(region.y * 100).toFixed(1)}% &nbsp;
                      {(region.w * 100).toFixed(1)}×
                      {(region.h * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">
                      Drag on preview to select
                    </span>
                  )}
                </div>

                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Preset name (e.g. WoW Chat)"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    className="h-7 text-xs bg-input/40 border-border/50 flex-1"
                    data-ocid="capture.input"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                    onClick={handleSavePreset}
                    disabled={!region}
                    data-ocid="capture.save_button"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>

                {presets.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {presets.map((p) => (
                      <div key={p.name} className="flex items-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 rounded-r-none border border-border/30"
                          onClick={() => handleLoadPreset(p.name)}
                        >
                          {p.name}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-destructive bg-muted/20 hover:bg-muted/40 rounded-l-none border border-l-0 border-border/30"
                          onClick={() => handleDeletePreset(p.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* OCR/Mode settings */}
            <div className="px-4 py-3 border-t border-border/40 grid grid-cols-2 gap-3 bg-card/10 shrink-0">
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  OCR
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    id="includeEng"
                    checked={includeEnglish}
                    onCheckedChange={setIncludeEnglish}
                    className="scale-75"
                    data-ocid="capture.checkbox"
                  />
                  <Label
                    htmlFor="includeEng"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Include English
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="preprocessing"
                    checked={usePreprocessing}
                    onCheckedChange={setUsePreprocessing}
                    className="scale-75"
                    data-ocid="capture.radio"
                  />
                  <Label
                    htmlFor="preprocessing"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Grayscale preprocessing
                  </Label>
                </div>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Live FPS:{" "}
                  <span className="text-primary font-mono">{fps}</span>
                </p>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[fps]}
                  onValueChange={([v]) => setFps(v)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground/50">
                  <span>1 fps</span>
                  <span>5 fps</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Translation Feed — also overflow-hidden so it scrolls internally */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex-1 flex flex-col overflow-hidden min-h-0"
          >
            <TranslationFeed
              entries={feedEntries}
              isPaused={isFeedPaused}
              onPauseToggle={() => setIsFeedPaused((p) => !p)}
              onClear={() => {
                setFeedEntries([]);
                lastOcrTextRef.current = "";
              }}
              targetLanguage={targetLanguage}
              onTargetLanguageChange={(lang) => {
                setTargetLanguage(lang);
                lastOcrTextRef.current = "";
              }}
              onOpenDisplayWindow={handleOpenDisplayWindow}
            />
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="h-8 border-t border-border/30 flex items-center justify-center bg-card/10 shrink-0">
          <p className="text-xs text-muted-foreground/40">
            © {new Date().getFullYear()} ·{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground/70 transition-colors"
            >
              Built with love using caffeine.ai
            </a>
          </p>
        </footer>

        <Toaster theme="dark" position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}

function App() {
  const isDisplayMode =
    new URLSearchParams(window.location.search).get("mode") === "display";

  return (
    <QueryClientProvider client={queryClient}>
      {isDisplayMode ? <DisplayFeed /> : <MainApp />}
    </QueryClientProvider>
  );
}

export default App;
