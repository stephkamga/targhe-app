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

    // Classifica per vittorie totali
    const winners = await prisma.dailyWin.groupBy({
      by: ["userId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    const userIds = winners.map((w) => w.userId);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        avatar: true,
        _count: { select: { plates: true } },
        dailyWins: {
          orderBy: { date: "desc" },
          take: 1,
          select: { date: true },
        },
      },
    });

    const leaderboard = winners.map((w) => {
      const user = users.find((u) => u.id === w.userId);
      return {
        userId: w.userId,
        userName: user?.name || "Utente",
        userAvatar: user?.avatar || null,
        totalWins: w._count.id,
        totalPlates: user?._count.plates || 0,
        latestWinDate: user?.dailyWins[0]?.date || null,
      };
    });

    // Vittoria di oggi (se esiste)
    const today = new Date();
    const todayDateOnly = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    const todayWin = await prisma.dailyWin.findFirst({
      where: {
        date: todayDateOnly,
      },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({
      leaderboard,
      todayWin,
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
