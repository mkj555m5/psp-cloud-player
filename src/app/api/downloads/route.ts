import { NextResponse } from "next/server";
import { listProgress } from "@/lib/downloads";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ downloads: listProgress() });
}
