import type { NextRequest } from "next/server";

/**
 * حماية اختيارية لواجهة الإدارة:
 * - إذا لم يتم تعيين ADMIN_PASSWORD فالواجهة مفتوحة (مناسب للاستخدام الشخصي).
 * - إذا تم تعيينه، يجب إرسال كلمة المرور في الترويسة x-admin-password أو في body.
 */
export function checkAdmin(
  req: NextRequest,
  bodyPassword?: string | null
): { ok: true } | { ok: false; reason: string } {
  const required = process.env.ADMIN_PASSWORD;
  if (!required) return { ok: true };

  const provided =
    req.headers.get("x-admin-password") ||
    req.nextUrl.searchParams.get("password") ||
    bodyPassword ||
    "";

  if (provided && provided === required) return { ok: true };
  return { ok: false, reason: "كلمة مرور الإدارة غير صحيحة" };
}
