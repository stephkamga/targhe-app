import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Opt out of static rendering — this route needs a live DB connection
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Top 5 winners this month
    const winners = await prisma.dailyWin.groupBy({
      by: ["userId"],
      where: {
        date: { gte: monthStart },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    if (winners.length === 0) {
      return NextResponse.json({ leaderboard: [], month: now.toLocaleString("default", { month: "long", year: "numeric" }) });
    }

    const userIds = winners.map((w) => w.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const leaderboard = winners.map((w, i) => {
      const user = users.find((u) => u.id === w.userId);
      return {
        rank: i + 1,
        userId: w.userId,
        userName: user?.name || "—",
        wins: w._count.id,
      };
    });

    return NextResponse.json({
      leaderboard,
      month: now.toLocaleString("it-IT", { month: "long", year: "numeric" }),
    });
  } catch (error) {
    console.error("Public leaderboard error:", error);
    return NextResponse.json({ leaderboard: [], month: "" });
  }
}
