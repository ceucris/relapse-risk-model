import { NextResponse } from "next/server";
import { handleInboundSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let from = "";
  let body = "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    from = String(form.get("From") ?? "");
    body = String(form.get("Body") ?? "");
  } else {
    const json = (await request.json().catch(() => ({}))) as {
      From?: string;
      Body?: string;
    };
    from = json.From ?? "";
    body = json.Body ?? "";
  }

  const reply = await handleInboundSms(from, body);
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(reply)}</Message></Response>`;
  return new NextResponse(twiml, {
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
