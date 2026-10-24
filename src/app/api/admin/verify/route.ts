import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin";

export async function POST(req: NextRequest) {
  let body: { password?: string } = {};
  try {
    body = await req.json();
  } catch {
    // لا بأس
  }
  const admin = checkAdmin(req, body.password);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.reason }, { status: 401 });
  }
  return NextResponse.json({ ok: true, required: Boolean(process.env.ADMIN_PASSWORD) });
}
