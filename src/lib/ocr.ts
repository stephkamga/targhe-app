/**
 * Client-side OCR helper.
 * Sends the captured canvas to our server-side /api/ocr endpoint,
 * which calls Google Cloud Vision API. The API key never leaves the server.
 */

/**
 * Crops the viewfinder region from the full canvas before sending to the API.
 * Smaller image = faster upload + cheaper (Vision API charges per image, not per pixel).
 */
function cropPlateRegion(source: HTMLCanvasElement): string {
  const { width, height } = source;

  // Viewfinder sits at ~37% from top, occupying ~20% of frame height
  const cropH = height * 0.24;
  const cropW = width * 0.85;
  const cropX = (width - cropW) / 2;
  const cropY = height * 0.37 - cropH / 2;

  const out = document.createElement("canvas");
  out.width = cropW;
  out.height = cropH;
  const ctx = out.getContext("2d");
  if (!ctx) return source.toDataURL("image/jpeg", 0.9);

  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  // JPEG at 0.9 quality is enough for OCR and keeps payload small
  return out.toDataURL("image/jpeg", 0.9);
}

/**
 * Sends the plate region to the server OCR endpoint and returns
 * the detected plate string, or null if nothing was found.
 */
export async function recognizePlateFromCanvas(
  canvas: HTMLCanvasElement
): Promise<string | null> {
  try {
    const imageBase64 = cropPlateRegion(canvas);

    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64 }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    console.log(`[OCR] Result: ${data.plate ?? "no match"} | raw: "${data.rawText?.trim()}"`);
    return data.plate ?? null;
  } catch (err) {
    console.error("[OCR] Request failed:", err);
    return null;
  }
}
