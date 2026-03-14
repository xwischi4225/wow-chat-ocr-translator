declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Tesseract: any;
  }
}

let scriptPromise: Promise<void> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let worker: any = null;
let workerLangs: string[] = [];

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.Tesseract) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Tesseract.js from CDN"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function initOcrWorker(
  languages: string[],
  onProgress?: (msg: string) => void,
): Promise<void> {
  await loadScript();

  const langKey = languages.join("+");
  const prevLangKey = workerLangs.join("+");

  if (worker && langKey !== prevLangKey) {
    await worker.terminate();
    worker = null;
    workerLangs = [];
  }

  if (!worker) {
    onProgress?.("Initializing OCR worker...");
    const Tesseract = window.Tesseract;
    worker = await Tesseract.createWorker(languages, 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status) {
          onProgress?.(
            `OCR: ${m.status} ${Math.round((m.progress || 0) * 100)}%`,
          );
        }
      },
    });
    workerLangs = languages;
    onProgress?.("OCR ready");
  }
}

export async function recognizeRegion(
  video: HTMLVideoElement,
  region: { x: number; y: number; w: number; h: number } | null,
  usePreprocessing: boolean,
): Promise<string> {
  if (!worker) throw new Error("OCR worker not initialized");

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  if (region && region.w > 0.01 && region.h > 0.01) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const x = Math.floor(region.x * vw);
    const y = Math.floor(region.y * vh);
    const w = Math.max(1, Math.floor(region.w * vw));
    const h = Math.max(1, Math.floor(region.h * vh));
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(video, x, y, w, h, 0, 0, w, h);
  } else {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    ctx.drawImage(video, 0, 0);
  }

  if (usePreprocessing && canvas.width > 0 && canvas.height > 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const lum = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
      );
      data[i] = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const {
    data: { text },
  } = await worker.recognize(canvas);
  return (text as string).trim();
}

export async function terminateOcrWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
    workerLangs = [];
  }
}

export function isWorkerReady(): boolean {
  return worker !== null;
}
