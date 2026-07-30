import { NextResponse } from "next/server";
import { exchangeGoogleCode, isGoogleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL("/?google=missing", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  if (error || !code) {
    return NextResponse.redirect(new URL("/?google=error", request.url));
  }

  try {
    await exchangeGoogleCode(code);
    return NextResponse.redirect(new URL("/?google=connected", request.url));
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(new URL("/?google=error", request.url));
  }
}
