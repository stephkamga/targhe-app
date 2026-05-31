import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalPlates, totalWins, badges, todayPlates] = await Promise.all([
      prisma.plate.count({ where: { userId: session.user.id } }),
      prisma.dailyWin.count({ where: { userId: session.user.id } }),
      prisma.badge.findMany({
        where: { userId: session.user.id },
        orderBy: { earnedAt: "desc" },
      }),
      prisma.plate.count({
        where: {
          userId: session.user.id,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
    ]);

    return NextResponse.json({
      totalPlates,
      totalWins,
      badges,
      todayPlates,
      remainingToday: Math.max(0, 3 - todayPlates),
    });
  } catch (error) {
    console.error("User stats error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
