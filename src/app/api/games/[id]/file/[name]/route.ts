import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import fsp from "fs/promises";
import { Readable } from "stream";
import { db, withSchema } from "@/lib/db";
import { getGamePath } from "@/lib/storage";

/**
 * بث ملف اللعبة مع دعم Range requests (مهم للمقاطع الكبيرة).
 * الاسم في المسار مهم فقط لإظهار امتداد الملف للمحاكي.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id } = await params;

  try {
    const game = await withSchema(() => db.game.findUnique({ where: { id } }));
    if (!game) {
      return new NextResponse("Game not found", { status: 404 });
    }

    const filePath = getGamePath(game.fileName);
    let stat: Awaited<ReturnType<typeof fsp.stat>>;
    try {
      stat = await fsp.stat(filePath);
    } catch {
      return new NextResponse("Game file missing on disk", { status: 404 });
    }

    const fileSize = stat.size;
    const range = req.headers.get("range");
    const baseHeaders: Record<string, string> = {
      "Content-Type": "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${encodeURIComponent(game.fileName)}"`,
    };

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1;

        if (start >= fileSize || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${fileSize}` },
          });
        }

        const stream = fs.createReadStream(filePath, { start, end });
        return new NextResponse(
          Readable.toWeb(stream) as unknown as ReadableStream,
          {
            status: 206,
            headers: {
              ...baseHeaders,
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Content-Length": String(end - start + 1),
            },
          }
        );
      }
    }

    const stream = fs.createReadStream(filePath);
    return new NextResponse(
      Readable.toWeb(stream) as unknown as ReadableStream,
      {
        status: 200,
        headers: { ...baseHeaders, "Content-Length": String(fileSize) },
      }
    );
  } catch {
    return new NextResponse("Internal error", { status: 500 });
  }
}
