import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate";

function extractPlateCandidate(text: string): string | null {
  // Clean — remove spaces and non-plate chars
  const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Modern Italian: AA 000 AA
  const modern = cleaned.match(/[A-Z]{2}\d{3}[A-Z]{2}/);
  if (modern) return modern[0];

  // Old provincial: AA 00000
  const old = cleaned.match(/[A-Z]{2}\d{4,6}/);
  if (old) return old[0];

  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check — only logged-in users can use this
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey || apiKey === "your_google_vision_api_key_here") {
      return NextResponse.json({ error: "OCR non configurato" }, { status: 503 });
    }

    const { imageBase64 } = await request.json();
    if (!imageBase64) {
      return NextResponse.json({ error: "Immagine mancante" }, { status: 400 });
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const body = {
      requests: [
        {
          image: { content: base64Data },
          features: [
            { type: "TEXT_DETECTION", maxResults: 1 },
          ],
          imageContext: {
            // Hint that the image likely contains Italian/Latin text
            languageHints: ["it", "en"],
          },
        },
      ],
    };

    const res = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Google Vision error:", err);
      return NextResponse.json({ plate: null, error: "Vision API error" });
    }

    const data = await res.json();
    const fullText = data.responses?.[0]?.fullTextAnnotation?.text || "";
    const plate = extractPlateCandidate(fullText);

    return NextResponse.json({ plate, rawText: fullText });
  } catch (error) {
    console.error("OCR route error:", error);
    return NextResponse.json({ plate: null });
  }
}
