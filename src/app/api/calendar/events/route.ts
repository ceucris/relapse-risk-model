import { NextResponse } from "next/server";
import { fetchGoogleEvents, getValidGoogleAccessToken, isGoogleConfigured } from "@/lib/google";
import { parseDayKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isGoogleConfigured()) {
    return NextResponse.json({ configured: false, events: [] });
  }

  const connected = Boolean(await getValidGoogleAccessToken());
  if (!connected) {
    return NextResponse.json({ configured: true, connected: false, events: [] });
  }

  const { searchParams } = new URL(request.url);
  const weekKey = searchParams.get("weekKey");
  if (!weekKey) {
    return NextResponse.json({ error: "weekKey required" }, { status: 400 });
  }

  const start = parseDayKey(weekKey);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  try {
    const events = await fetchGoogleEvents(start, end);
    return NextResponse.json({ configured: true, connected: true, events });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        configured: true,
        connected: true,
        events: [],
        error: error instanceof Error ? error.message : "Failed to load events",
      },
      { status: 500 },
    );
  }
}
