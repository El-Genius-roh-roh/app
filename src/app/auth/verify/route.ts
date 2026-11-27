import { NextRequest, NextResponse } from "next/server";
import { consumeMagicLink, setSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const id = await consumeMagicLink(token);
  const base = req.nextUrl.origin;
  if (!id) return NextResponse.redirect(new URL("/login?err=1", base));
  await setSession(id);
  return NextResponse.redirect(new URL("/", base));
}
