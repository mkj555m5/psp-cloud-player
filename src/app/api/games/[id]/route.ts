import { NextRequest, NextResponse } from "next/server";
import fsp from "fs/promises";
import { db } from "@/lib/db";
import { checkAdmin } from "@/lib/admin";
import { getGamePath, getCoverPath } from "@/lib/storage";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = checkAdmin(req, req.nextUrl.searchParams.get("password"));
  if (!admin.ok) {
    return NextResponse.json({ error: admin.reason }, { status: 401 });
  }

  const { id } = await params;
  try {
    const game = await db.game.findUnique({ where: { id } });
    if (!game) {
      return NextResponse.json({ error: "اللعبة غير موجودة" }, { status: 404 });
    }

    // حذف ملفات اللعبة والغلاف من التخزين
    await fsp.rm(getGamePath(game.fileName), { force: true });
    if (game.coverPath) {
      await fsp.rm(getCoverPath(game.coverPath), { force: true });
    }
    await db.game.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "فشل حذف اللعبة" },
      { status: 500 }
    );
  }
}
