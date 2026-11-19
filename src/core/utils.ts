import { Env } from "../auth";

export function getRelativeTime(publishedAt: string | null | undefined, createdAt?: string | null): string {
  const raw = publishedAt || createdAt || "";
  const targetDate = new Date(raw).getTime();
  if (Number.isNaN(targetDate)) return "";
  const timeDiffMs = Date.now() - targetDate;
  const timeAgoMins = Math.floor(timeDiffMs / 60000);

  if (timeAgoMins < 5) return "방금 전";
  if (timeAgoMins < 60) return `${timeAgoMins}분 전`;

  const timeAgoHours = Math.floor(timeAgoMins / 60);
  if (timeAgoHours < 24) return `${timeAgoHours}시간 전`;

  return `${Math.floor(timeAgoHours / 24)}일 전`;
}

export function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeXml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Normalizes a SQLite UTC datetime string ("YYYY-MM-DD HH:MM:SS" or ISO) into a Date object.
 */
function parseUtcDate(utcStr: string | null | undefined): Date | null {
  if (!utcStr) return null;
  const trimmed = String(utcStr).trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes("T")
    ? trimmed.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(trimmed)
      ? trimmed
      : `${trimmed}Z`
    : `${trimmed.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoUtcString(sqlOrIso?: string | null, fallback?: string): string {
  const parsed = parseUtcDate(sqlOrIso);
  if (!parsed) return fallback || new Date().toISOString();
  return parsed.toISOString();
}

/**
 * Converts a SQLite UTC datetime string into KST ("YYYY-MM-DD HH:MM" or "YYYY-MM-DD").
 */
export function formatUtcToKst(utcStr: string | null | undefined, includeTime: boolean = true): string {
  if (!utcStr) return "";
  const parsed = parseUtcDate(utcStr);
  if (!parsed) {
    return includeTime ? String(utcStr).slice(0, 16) : String(utcStr).slice(0, 10);
  }
  const kst = new Date(parsed.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  if (!includeTime) {
    return `${y}-${m}-${d}`;
  }
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

/**
 * Converts a SQLite UTC datetime string into short KST ("MM/DD HH:MM") for milestones.
 */
export function formatKstShortTime(utcStr: string | null | undefined): string {
  if (!utcStr) return "";
  const parsed = parseUtcDate(utcStr);
  if (!parsed) return String(utcStr).slice(0, 16);
  const kst = new Date(parsed.getTime() + 9 * 3600 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

const BOT_UA_REGEX =
  /bot|crawl|spider|slurp|archiver|scrap|curl|wget|python|aiohttp|httpx|axios|node-fetch|undici|go-http-client|java|okhttp|libwww|perl|ruby|php|headless|phantom|puppeteer|playwright|selenium|facebookexternalhit|facebot|mediapartners|adsbot|apis-google|googleother|google-inspectiontool|google-extended|bingpreview|bytespider|gptbot|oai-searchbot|chatgpt|claudebot|anthropic|perplexity|ccbot|yandex|baiduspider|duckduckbot|sogou|exabot|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|applebot|yeti|daum|naverbot|kakaotalk-scrap|telegrambot|twitterbot|discordbot|slackbot|whatsapp|linkedinbot/i;

/**
 * Checks if a request is a genuine human top-level browser navigation
 * (filters out bots, crawlers, headless scrapers, and link prefetchers).
 */
export function isHumanBrowserNavigation(request: Request): boolean {
  if (request.method !== "GET") return false;

  const ua = request.headers.get("user-agent") || "";
  if (!ua.includes("Mozilla/5.0") || BOT_UA_REGEX.test(ua)) {
    return false;
  }

  const accept = request.headers.get("accept") || "";
  if (!accept.includes("text/html")) {
    return false;
  }

  const purpose = (
    request.headers.get("sec-purpose") ||
    request.headers.get("purpose") ||
    request.headers.get("x-purpose") ||
    request.headers.get("x-moz") ||
    ""
  ).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview") || purpose.includes("prerender")) {
    return false;
  }

  const secFetchMode = request.headers.get("sec-fetch-mode");
  if (secFetchMode && secFetchMode !== "navigate") {
    return false;
  }

  return true;
}

/**
 * Validates ?key=CRON_SECRET on protected admin/cron endpoints.
 */
export function isAuthorizedCronRequest(request: Request, env: Env): boolean {
  const key = new URL(request.url).searchParams.get("key");
  return Boolean(key && env.CRON_SECRET && key === env.CRON_SECRET);
}

/**
 * Sends a message to a Cloudflare Queue with exponential backoff retry on rate-limit errors.
 */
export async function sendQueueWithRetry<T>(
  queue: Queue<T>,
  payload: T,
  maxAttempts: number = 3
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await queue.send(payload);
      return;
    } catch (error: any) {
      if (error?.message?.includes("Too Many Requests") && attempt < maxAttempts) {
        console.warn(`[QUEUE] Rate limited. Retrying attempt ${attempt}...`);
        await new Promise((res) => setTimeout(res, 1000 * attempt));
        continue;
      }
      throw error;
    }
  }
}
