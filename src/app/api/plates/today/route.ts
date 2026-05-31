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

    // Tutte le targhe di oggi di tutti gli utenti
    const todayPlates = await prisma.plate.findMany({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: [
        { carYear: "desc" }, // Prima le più recenti
        { createdAt: "asc" },
      ],
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Targhe dell'utente oggi
    const myTodayPlates = todayPlates.filter(
      (p) => p.userId === session.user.id
    );

    // Leader attuale (targa con anno più recente)
    const leader = todayPlates.length > 0 ? todayPlates[0] : null;

    return NextResponse.json({
      todayPlates,
      myTodayPlates,
      myCount: myTodayPlates.length,
      remaining: Math.max(0, 3 - myTodayPlates.length),
      leader,
      isLeading: leader?.userId === session.user.id,
    });
  } catch (error) {
    console.error("Today plates error:", error);
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    );
  }
}
