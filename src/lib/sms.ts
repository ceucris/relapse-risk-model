import twilio from "twilio";
import { loadDashboardData, saveDashboardData } from "@/lib/store";
import { fetchGoogleEvents, isGoogleConfigured } from "@/lib/google";
import { getWeekKey, toDayKey } from "@/lib/dates";

export function isTwilioConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      (process.env.TWILIO_AUTH_TOKEN ||
        (process.env.TWILIO_API_KEY && process.env.TWILIO_API_SECRET)) &&
      process.env.TWILIO_PHONE_NUMBER &&
      process.env.MY_PHONE_NUMBER,
  );
}

function getTwilioClient() {
  if (process.env.TWILIO_API_KEY && process.env.TWILIO_API_SECRET) {
    return twilio(process.env.TWILIO_API_KEY, process.env.TWILIO_API_SECRET, {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
    });
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

export async function sendSms(body: string) {
  const client = getTwilioClient();
  return client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: process.env.MY_PHONE_NUMBER!,
  });
}

export async function buildAndSendMorningBriefing() {
  const { data } = await loadDashboardData();
  const today = toDayKey();
  const weekKey = getWeekKey();
  const openTasks = data.tasks
    .filter((t) => t.weekKey === weekKey && !t.completed)
    .slice(0, 8);

  let eventsLine = "";
  if (isGoogleConfigured()) {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const events = await fetchGoogleEvents(start, end);
      if (events.length) {
        eventsLine =
          "\n📅 Today:\n" +
          events
            .map((e) => {
              const time = e.allDay
                ? "All day"
                : new Date(e.start).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  });
              return `• ${time} - ${e.title}`;
            })
            .join("\n");
      }
    } catch (error) {
      console.error("briefing calendar fetch failed", error);
    }
  }

  const focus = data.weeklyFocus.find((f) => f.weekKey === weekKey);
  const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });

  let body = `Good morning ${data.profileName}! ✦\n${weekday}`;
  if (eventsLine) body += eventsLine;
  if (focus?.focus) body += `\n\n🎯 Weekly focus: ${focus.focus}`;
  if (openTasks.length) {
    body +=
      "\n\n✅ Tasks this week:\n" +
      openTasks.map((t, i) => `${i + 1}. ${t.text}`).join("\n") +
      `\n\nReply "done 1 2" to check off tasks`;
  } else {
    body += "\n\nNo open tasks this week — nice.";
  }
  if (data.affirmation) body += `\n\n"${data.affirmation}"`;

  const maps = { ...(data.smsTaskMaps ?? {}) };
  maps[today] = openTasks.map((t) => t.id);
  await saveDashboardData({ ...data, smsTaskMaps: maps });

  if (!isTwilioConfigured()) {
    return { sent: false as const, body, reason: "Twilio not configured" };
  }

  await sendSms(body);
  return { sent: true as const, body };
}

export async function handleInboundSms(from: string, message: string) {
  const allowed = process.env.MY_PHONE_NUMBER?.replace(/\D/g, "");
  const incoming = from.replace(/\D/g, "");
  if (allowed && !incoming.endsWith(allowed.slice(-10))) {
    return "Unauthorized number.";
  }

  const text = message.trim().toLowerCase();
  if (!text.startsWith("done")) {
    return 'Reply "done 1 2" to check off tasks by number, or "done all" for everything.';
  }

  const { data } = await loadDashboardData();
  const today = toDayKey();
  const map = data.smsTaskMaps?.[today] ?? [];
  if (!map.length) {
    return "No morning task list found for today. Open the dashboard to manage tasks.";
  }

  let ids: string[] = [];
  if (text.includes("all")) {
    ids = [...map];
  } else {
    const nums = (text.match(/\d+/g) ?? []).map((n) => Number(n));
    ids = nums
      .map((n) => map[n - 1])
      .filter((id): id is string => Boolean(id));
  }

  if (!ids.length) {
    return 'Could not match those numbers. Try "done 1 2" or "done all".';
  }

  const idSet = new Set(ids);
  const now = new Date().toISOString();
  const next = {
    ...data,
    tasks: data.tasks.map((t) =>
      idSet.has(t.id)
        ? { ...t, completed: true, completedAt: now }
        : t,
    ),
  };
  await saveDashboardData(next);
  return `Checked off ${ids.length} task${ids.length === 1 ? "" : "s"}. ✦`;
}
