// منع التقييم الثابت - يجب التنفيذ وقت التشغيل دائماً
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { checkAdmin } from "@/lib/admin";
import { startGameDownload } from "@/lib/downloader";
import { getProgress } from "@/lib/downloads";

export async function GET() {
  try {
    const games = await db.game.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        ext: true,
        size: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ games });
  } catch {
    return NextResponse.json(
      { error: "فشل جلب قائمة الألعاب" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: {
    url?: string;
    name?: string;
    imageUrl?: string;
    password?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const admin = checkAdmin(req, body.password);
  if (!admin.ok) {
    return NextResponse.json({ error: admin.reason }, { status: 401 });
  }

  const url = (body.url || "").trim();
  if (!url) {
    return NextResponse.json(
      { error: "الرجاء إدخال رابط التحميل المباشر" },
      { status: 400 }
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "الرابط غير صالح" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json(
      { error: "الرابط يجب أن يبدأ بـ http أو https" },
      { status: 400 }
    );
  }

  const gameId = uuidv4();
  const downloadId = uuidv4();

  startGameDownload({
    downloadId,
    gameId,
    url,
    name: body.name?.trim() || null,
    imageUrl: body.imageUrl?.trim() || null,
  });

  return NextResponse.json({
    downloadId,
    gameId,
    status: getProgress(downloadId)?.status ?? "downloading",
  });
}
