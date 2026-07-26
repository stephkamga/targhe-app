import { createWorker, PSM, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    console.log("[OCR] Initializing Tesseract worker...");
    workerPromise = createWorker("eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6/tesseract-core-simd-lstm.wasm.js",
      logger: (m) => {
        if (m.status === "loading tesseract core" || m.status === "initializing api") {
          console.log(`[OCR] ${m.status} ${Math.round((m.progress || 0) * 100)}%`);
        }
      },
    }).then(async (worker) => {
      console.log("[OCR] Worker ready, setting parameters...");
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      console.log("[OCR] Worker initialized.");
      return worker;
    });
  }
  return workerPromise;
}

function cropToPlateRegion(source: HTMLCanvasElement): string {
  const { width, height } = source;
  const cropWidth = width * 0.8;
  const cropHeight = height * 0.26;
  const cropX = (width - cropWidth) / 2;
  const cropY = height * 0.35 - cropHeight / 2;

  console.log(`[OCR] Cropping: source ${width}x${height}, crop ${Math.round(cropWidth)}x${Math.round(cropHeight)} at (${Math.round(cropX)},${Math.round(cropY)})`);

  const cropped = document.createElement("canvas");
  cropped.width = cropWidth;
  cropped.height = cropHeight;
  const ctx = cropped.getContext("2d");
  if (!ctx) return source.toDataURL("image/jpeg", 0.9);

  ctx.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return cropped.toDataURL("image/jpeg", 0.9);
}

function extractPlateCandidate(rawText: string): string | null {
  const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, "");
  console.log(`[OCR] Raw text: "${rawText.trim()}" → cleaned: "${cleaned}"`);

  const modernMatch = cleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  if (modernMatch) {
    console.log(`[OCR] Modern plate matched: ${modernMatch[0]}`);
    return modernMatch[0];
  }

  const oldMatch = cleaned.match(/[A-Z]{2}\d{4,6}/);
  if (oldMatch) {
    console.log(`[OCR] Old plate matched: ${oldMatch[0]}`);
    return oldMatch[0];
  }

  console.log("[OCR] No plate pattern found.");
  return null;
}

export async function recognizePlateFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    console.log("[OCR] Starting recognition...");
    const cropped = cropToPlateRegion(canvas);
    const worker = await getWorker();
    console.log("[OCR] Running recognize...");
    const { data } = await worker.recognize(cropped);
    console.log(`[OCR] Confidence: ${data.confidence}`);
    return extractPlateCandidate(data.text);
  } catch (err) {
    console.error("[OCR] Recognition failed:", err);
    return null;
  }
}
