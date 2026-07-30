import { getOAuthToken, saveOAuthToken } from "@/lib/store";
import type { CalendarEvent } from "@/lib/types";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function isGoogleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
}

export function getGoogleAuthUrl(state = "dashboard") {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };
  await saveOAuthToken({
    provider: "google",
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiryDate: new Date(Date.now() + json.expires_in * 1000),
    scope: json.scope ?? CALENDAR_SCOPE,
  });
}

async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google refresh failed: ${text}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };
  await saveOAuthToken({
    provider: "google",
    accessToken: json.access_token,
    refreshToken,
    expiryDate: new Date(Date.now() + json.expires_in * 1000),
    scope: json.scope ?? CALENDAR_SCOPE,
  });
  return json.access_token;
}

export async function getValidGoogleAccessToken() {
  const token = await getOAuthToken("google");
  if (!token) return null;
  const expiresSoon =
    token.expiryDate && token.expiryDate.getTime() < Date.now() + 60_000;
  if (!expiresSoon) return token.accessToken;
  if (!token.refreshToken) return token.accessToken;
  return refreshAccessToken(token.refreshToken);
}

export async function fetchGoogleEvents(rangeStart: Date, rangeEnd: Date) {
  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) return [] as CalendarEvent[];

  const params = new URLSearchParams({
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar fetch failed: ${text}`);
  }

  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  return (json.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary || "Untitled event",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date,
    allDay: Boolean(item.start?.date && !item.start?.dateTime),
  })) satisfies CalendarEvent[];
}
