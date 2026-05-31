import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadPlatePhoto } from "@/lib/supabase";
import { estimateCarYearFromPlate, isValidItalianPlate, formatPlate } from "@/lib/utils";

const MAX_PLATES_PER_DAY = 3;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const body = await request.json();
    const { plateNumber, photoBase64, notes, latitude, longitude } = body;

    // Validazione targa
    if (!plateNumber || !isValidItalianPlate(plateNumber)) {
      return NextResponse.json(
        { error: "Targa non valida. Usa il formato italiano (es. AB 123 CD)" },
        { status: 400 }
      );
    }

    if (!photoBase64) {
      return NextResponse.json(
        { error: "La foto è obbligatoria" },
        { status: 400 }
      );
    }

    // Controlla limite giornaliero
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await prisma.plate.count({
      where: {
        userId: session.user.id,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    if (todayCount >= MAX_PLATES_PER_DAY) {
      return NextResponse.json(
        { error: `Hai già inserito ${MAX_PLATES_PER_DAY} targhe oggi. Torna domani!` },
        { status: 429 }
      );
    }

    // Stima anno auto
    const formattedPlate = formatPlate(plateNumber);
    const carYear = estimateCarYearFromPlate(plateNumber);

    // Crea il record della targa (prima senza foto per avere l'ID)
    const plate = await prisma.plate.create({
      data: {
        plateNumber: formattedPlate,
        photoUrl: "", // temporaneo
        carYear,
        notes: notes?.trim() || null,
        latitude: latitude || null,
        longitude: longitude || null,
        userId: session.user.id,
      },
    });

    // Carica la foto su Supabase Storage
    let photoUrl = "";
    try {
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const blob = new Blob([buffer], { type: "image/jpeg" });
      
      photoUrl = await uploadPlatePhoto(blob, session.user.id, plate.id);
    } catch (uploadError) {
      // Se l'upload fallisce, elimina il record e restituisci errore
      await prisma.plate.delete({ where: { id: plate.id } });
      console.error("Photo upload error:", uploadError);
      return NextResponse.json(
        { error: "Errore nel caricamento della foto" },
        { status: 500 }
      );
    }

    // Aggiorna il record con l'URL della foto
    const updatedPlate = await prisma.plate.update({
      where: { id: plate.id },
      data: { photoUrl },
    });

    // Controlla se questa è la prima targa dell'utente (badge)
    const totalPlates = await prisma.plate.count({
      where: { userId: session.user.id },
    });

    if (totalPlates === 1) {
      await prisma.badge.create({
        data: {
          type: "FIRST_PLATE",
          userId: session.user.id,
          description: "Prima targa inserita!",
        },
      });
    }

    // Badge COLLECTOR (50 targhe)
    if (totalPlates === 50) {
      await prisma.badge.create({
        data: {
          type: "COLLECTOR",
          userId: session.user.id,
          description: "50 targhe inserite!",
        },
      });
    }

    // Badge VINTAGE_HUNTER (auto ante 1980)
    if (carYear && carYear < 1980) {
      const hasVintageBadge = await prisma.badge.findFirst({
        where: { userId: session.user.id, type: "VINTAGE_HUNTER" },
      });
      if (!hasVintageBadge) {
        await prisma.badge.create({
          data: {
            type: "VINTAGE_HUNTER",
            userId: session.user.id,
            description: `Auto d'epoca trovata! Anno stimato: ${carYear}`,
          },
        });
      }
    }

    // Badge CENTURY_HUNTER (auto ante 2000)
    if (carYear && carYear < 2000) {
      const hasCenturyBadge = await prisma.badge.findFirst({
        where: { userId: session.user.id, type: "CENTURY_HUNTER" },
      });
      if (!hasCenturyBadge) {
        await prisma.badge.create({
          data: {
            type: "CENTURY_HUNTER",
            userId: session.user.id,
            description: `Auto del secolo scorso trovata! Anno stimato: ${carYear}`,
          },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        plate: updatedPlate,
        remainingToday: MAX_PLATES_PER_DAY - (todayCount + 1),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Plate submission error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const userId = searchParams.get("userId") || session.user.id;

    const skip = (page - 1) * limit;

    const [plates, total] = await Promise.all([
      prisma.plate.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      prisma.plate.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      plates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get plates error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
