import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * تفعيل العزل عبر المصادر (Cross-Origin Isolation) المطلوب لمحاكي PPSSPP:
 * - نواة PPSSPP في EmulatorJS تعتمد على SharedArrayBuffer (multithreading)
 * - وهو يتطلب ترويسات COOP + COEP على صفحات الموقع
 * - CDN الخاص بـ EmulatorJS يرسل CORP: cross-origin لكل موارده لذا require-corp آمن
 */
export default function proxy(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
