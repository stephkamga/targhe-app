import { createWorker, PSM, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng").then(async (worker) => {
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      return worker;
    });
  }
  return workerPromise;
}

/**
 * Crops the center band of a captured photo where the on-screen viewfinder
 * guides the user to place the plate, so OCR sees mostly plate and not
 * background. The crop is a proportion of the frame, not a pixel-exact
 * match of the CSS overlay (that overlay has a fixed CSS size that doesn't
 * map cleanly to varying capture resolutions).
 */
function cropToPlateRegion(source: HTMLCanvasElement): string {
  const { width, height } = source;
  const cropWidth = width * 0.8;
  const cropHeight = height * 0.26;
  const cropX = (width - cropWidth) / 2;
  const cropY = height * 0.35 - cropHeight / 2;

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

  const modernMatch = cleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  if (modernMatch) return modernMatch[0];

  const oldMatch = cleaned.match(/[A-Z]{2}\d{4,6}/);
  if (oldMatch) return oldMatch[0];

  return null;
}

/**
 * Runs OCR on the plate region of a captured photo and returns a best-guess
 * plate string, or null if nothing plate-shaped was found. Best-effort only
 * — callers should let the user review/edit the result, never submit it
 * unchecked.
 */
export async function recognizePlateFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const cropped = cropToPlateRegion(canvas);
  const worker = await getWorker();
  const { data } = await worker.recognize(cropped);
  return extractPlateCandidate(data.text);
}
