import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import fsp from "fs/promises";
import { Readable } from "stream";
import { db } from "@/lib/db";
import { getCoverPath, contentTypeFromExt } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** صورة الغلاف: من الملف المُحمّل أو صورة افتراضية مولّدة تلقائياً */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const game = await db.game.findUnique({ where: { id } });
    if (!game) return new NextResponse("Not found", { status: 404 });

    if (game.coverPath) {
      const filePath = getCoverPath(game.coverPath);
      try {
        const stat = await fsp.stat(filePath);
        const ext = game.coverPath.split(".").pop()?.toLowerCase() || "jpg";
        const stream = fs.createReadStream(filePath);
        return new NextResponse(
          Readable.toWeb(stream) as unknown as ReadableStream,
          {
            status: 200,
            headers: {
              "Content-Type": contentTypeFromExt(ext),
              "Content-Length": String(stat.size),
              "Cache-Control": "public, max-age=86400",
            },
          }
        );
      } catch {
        // الملف مفقود - نكمل للصورة الافتراضية
      }
    }

    // صورة غلاف افتراضية SVG بناءً على حرف الاسم الأول
    const letter = (game.name?.trim()?.[0] || "؟").toUpperCase();
    const hue = ((id.charCodeAt(0) || 65) * 37) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue}, 60%, 22%)"/>
      <stop offset="100%" stop-color="hsl(${(hue + 40) % 360}, 70%, 12%)"/>
    </linearGradient>
  </defs>
  <rect width="300" height="400" rx="16" fill="url(#g)"/>
  <rect x="12" y="12" width="276" height="376" rx="10" fill="none" stroke="hsl(${hue}, 70%, 45%)" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="150" cy="150" r="52" fill="none" stroke="hsl(${hue}, 70%, 55%)" stroke-opacity="0.5" stroke-width="3" stroke-dasharray="10 8"/>
  <text x="150" y="172" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="hsl(${hue}, 80%, 78%)">${letter}</text>
  <text x="150" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="hsl(${hue}, 40%, 70%)" fill-opacity="0.9">PSP CLOUD PLAYER</text>
  <text x="150" y="330" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="hsl(${hue}, 30%, 60%)" fill-opacity="0.7">${game.ext.toUpperCase()}</text>
</svg>`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Internal error", { status: 500 });
  }
}
