import { createWorker, PSM, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng", 1, {
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js",
      langPath: "https://tessdata.projectnaptha.com/4.0.0",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@6/tesseract-core-simd-lstm.wasm.js",
    }).then(async (worker) => {
      await worker.setParameters({
        // Only allow valid plate characters
        tessedit_char_whitelist: "ABCDEFGHJKLMNPRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      return worker;
    });
  }
  return workerPromise;
}

/**
 * Crops to the plate region based on the viewfinder position.
 * The viewfinder overlay sits at ~35% from top, taking ~20% of frame height.
 * We crop a slightly larger region to account for imprecise framing.
 */
function cropPlateRegion(source: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = source;

  // Viewfinder center is at 37% from top (matches CSS overlay with paddingBottom:30%)
  // Crop a band that is 24% of height centered there
  const cropH = height * 0.24;
  const cropW = width * 0.85;
  const cropX = (width - cropW) / 2;
  const cropY = height * 0.37 - cropH / 2;

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return out;
}

/**
 * Preprocesses the cropped plate image for better OCR accuracy:
 * 1. Scale up 3x (Tesseract prefers ~300dpi equivalent)
 * 2. Convert to grayscale
 * 3. Increase contrast with a levels adjustment
 * 4. Apply adaptive threshold to get a clean black/white image
 */
function preprocessForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  const SCALE = 3;
  const w = source.width * SCALE;
  const h = source.height * SCALE;

  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  // Scale up with crisp interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Step 1: Convert to grayscale + boost contrast
  for (let i = 0; i < data.length; i += 4) {
    // Weighted grayscale (human perception weights)
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

    // S-curve contrast boost: pulls darks darker and lights lighter
    const contrast = 1.8;
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    let enhanced = factor * (gray - 128) + 128;
    enhanced = Math.max(0, Math.min(255, enhanced));

    data[i] = enhanced;
    data[i + 1] = enhanced;
    data[i + 2] = enhanced;
  }

  ctx.putImageData(imgData, 0, 0);

  // Step 2: Sharpen with a convolution kernel
  const sharpened = applySharpening(out);
  return sharpened;
}

function applySharpening(source: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = source;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;

  // Unsharp mask: draw blurred copy then blend
  ctx.drawImage(source, 0, 0);

  const blur = document.createElement("canvas");
  blur.width = w;
  blur.height = h;
  const bctx = blur.getContext("2d")!;
  bctx.filter = "blur(1px)";
  bctx.drawImage(source, 0, 0);

  const orig = ctx.getImageData(0, 0, w, h);
  const blurData = bctx.getImageData(0, 0, w, h);
  const sharp = ctx.createImageData(w, h);

  for (let i = 0; i < orig.data.length; i += 4) {
    // Unsharp mask: original + amount * (original - blurred)
    const amount = 1.5;
    for (let c = 0; c < 3; c++) {
      const v = orig.data[i + c] + amount * (orig.data[i + c] - blurData.data[i + c]);
      sharp.data[i + c] = Math.max(0, Math.min(255, v));
    }
    sharp.data[i + 3] = 255;
  }

  ctx.putImageData(sharp, 0, 0);
  return out;
}

function extractPlateCandidate(rawText: string): string | null {
  // Remove all non-plate characters, collapse whitespace
  const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Modern Italian format: AA 000 AA
  const modernMatch = cleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  if (modernMatch) return modernMatch[0];

  // Old provincial format: AA 00000
  const oldMatch = cleaned.match(/[A-Z]{2}\d{4,6}/);
  if (oldMatch) return oldMatch[0];

  return null;
}

/**
 * Runs OCR with multiple PSM modes and returns the best match.
 * PSM.SINGLE_LINE works well for clean crops, PSM.SINGLE_WORD as fallback.
 */
export async function recognizePlateFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  try {
    const cropped = cropPlateRegion(canvas);
    const processed = preprocessForOcr(cropped);

    const worker = await getWorker();

    // Try SINGLE_LINE first (best for a clean plate strip)
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
    const { data: d1 } = await worker.recognize(processed.toDataURL("image/png"));
    const r1 = extractPlateCandidate(d1.text);
    if (r1) {
      console.log(`[OCR] Match (SINGLE_LINE, conf ${Math.round(d1.confidence)}): ${r1}`);
      return r1;
    }

    // Fallback: SINGLE_WORD
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_WORD });
    const { data: d2 } = await worker.recognize(processed.toDataURL("image/png"));
    const r2 = extractPlateCandidate(d2.text);
    if (r2) {
      console.log(`[OCR] Match (SINGLE_WORD, conf ${Math.round(d2.confidence)}): ${r2}`);
      return r2;
    }

    // Fallback: RAW_LINE on original (no preprocessing)
    await worker.setParameters({ tessedit_pageseg_mode: PSM.RAW_LINE });
    const { data: d3 } = await worker.recognize(cropped.toDataURL("image/png"));
    const r3 = extractPlateCandidate(d3.text);
    if (r3) {
      console.log(`[OCR] Match (RAW_LINE fallback, conf ${Math.round(d3.confidence)}): ${r3}`);
      return r3;
    }

    console.log("[OCR] No plate found in any pass.");
    return null;
  } catch (err) {
    console.error("[OCR] Failed:", err);
    return null;
  }
}
