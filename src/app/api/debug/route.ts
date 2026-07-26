import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL || "NOT SET";
  const maskedUrl = url.replace(/:([^:@]+)@/, ":****@");

  try {
    const result = await prisma.$queryRaw<[{ now: Date }]>`SELECT now()`;
    return NextResponse.json({
      status: "ok",
      time: result[0].now,
      url: maskedUrl,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      code: error.errorCode,
      url: maskedUrl,
    }, { status: 500 });
  }
}
