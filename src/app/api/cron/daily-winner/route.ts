import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Questo endpoint viene chiamato da un cron job a mezzanotte
// Può essere configurato su Vercel Cron o simili
export async function POST(request: NextRequest) {
  try {
    // Verifica il secret del cron
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // Use UTC midnight for the @db.Date column comparison
    const yesterdayDateOnly = new Date(
      Date.UTC(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    );

    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Trova la targa con l'anno più recente inserita ieri
    const winningPlate = await prisma.plate.findFirst({
      where: {
        createdAt: {
          gte: yesterdayStart,
          lte: yesterdayEnd,
        },
        carYear: { not: null },
      },
      orderBy: [
        { carYear: "desc" },
        { createdAt: "asc" }, // In caso di parità, vince chi ha inserito prima
      ],
      include: {
        user: true,
      },
    });

    if (!winningPlate || !winningPlate.carYear) {
      return NextResponse.json({
        message: "Nessuna targa inserita ieri",
      });
    }

    // Controlla se il vincitore di ieri è già stato registrato
    const existingWin = await prisma.dailyWin.findFirst({
      where: {
        date: yesterdayDateOnly,
      },
    });

    if (existingWin) {
      return NextResponse.json({
        message: "Vincitore già registrato per ieri",
      });
    }

    // Registra il vincitore
    const dailyWin = await prisma.dailyWin.create({
      data: {
        date: yesterdayDateOnly,
        plateNumber: winningPlate.plateNumber,
        carYear: winningPlate.carYear,
        photoUrl: winningPlate.photoUrl,
        userId: winningPlate.userId,
      },
    });

    // Assegna badge DAILY_WINNER
    await prisma.badge.create({
      data: {
        type: "DAILY_WINNER",
        userId: winningPlate.userId,
        description: `Vincitore del ${yesterday.toLocaleDateString("it-IT")} con ${winningPlate.plateNumber} (anno ${winningPlate.carYear})`,
      },
    });

    // Controlla streak
    await checkAndAwardStreakBadges(winningPlate.userId);

    return NextResponse.json({
      success: true,
      winner: {
        userId: winningPlate.userId,
        userName: winningPlate.user.name,
        plateNumber: winningPlate.plateNumber,
        carYear: winningPlate.carYear,
      },
    });
  } catch (error) {
    console.error("Daily winner cron error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}

async function checkAndAwardStreakBadges(userId: string) {
  // Conta le vittorie consecutive
  const recentWins = await prisma.dailyWin.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 7,
  });

  if (recentWins.length < 3) return;

  // Controlla se sono consecutive
  let streak = 1;
  for (let i = 1; i < recentWins.length; i++) {
    const diff =
      (recentWins[i - 1].date.getTime() - recentWins[i].date.getTime()) /
      (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }

  if (streak >= 7) {
    const hasStreak7 = await prisma.badge.findFirst({
      where: { userId, type: "STREAK_7" },
    });
    if (!hasStreak7) {
      await prisma.badge.create({
        data: {
          type: "STREAK_7",
          userId,
          description: "7 vittorie consecutive!",
        },
      });
    }
  } else if (streak >= 3) {
    const hasStreak3 = await prisma.badge.findFirst({
      where: { userId, type: "STREAK_3" },
    });
    if (!hasStreak3) {
      await prisma.badge.create({
        data: {
          type: "STREAK_3",
          userId,
          description: "3 vittorie consecutive!",
        },
      });
    }
  }
}
