import { NextResponse } from "next/server";
import { buildAndSendMorningBriefing } from "@/lib/sms";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await buildAndSendMorningBriefing();
  return NextResponse.json(result);
}
