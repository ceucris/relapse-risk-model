import { NextResponse } from "next/server";
import { getGoogleAuthUrl, isGoogleConfigured } from "@/lib/google";
import { getOAuthToken } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isGoogleConfigured();
  const token = configured ? await getOAuthToken("google") : null;
  return NextResponse.json({
    configured,
    connected: Boolean(token),
    authUrl: configured ? getGoogleAuthUrl() : null,
  });
}
