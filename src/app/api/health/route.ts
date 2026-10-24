import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DATA_DIR } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const gamesCount = await db.game.count();
    return NextResponse.json({
      status: "ok",
      storage: DATA_DIR,
      gamesCount,
      time: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", storage: DATA_DIR },
      { status: 500 }
    );
  }
}
