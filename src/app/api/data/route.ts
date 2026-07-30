import { NextResponse } from "next/server";
import { loadDashboardData, saveDashboardData } from "@/lib/store";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadDashboardData();
  return NextResponse.json(result);
}

async function save(request: Request) {
  const body = (await request.json()) as { data?: DashboardData };
  if (!body?.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const result = await saveDashboardData(body.data);
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  return save(request);
}

export async function POST(request: Request) {
  return save(request);
}
