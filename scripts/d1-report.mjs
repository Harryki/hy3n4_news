#!/usr/bin/env node
/**
 * D1 Query Optimization Report Generator
 *
 * Fetches hourly D1 query metrics from Cloudflare GraphQL Analytics API
 * (`d1QueriesAdaptiveGroups`), groups them by git commit deployment windows
 * (up to 24h per commit), and prints 1-hour averages for each optimized query.
 *
 * Usage:
 *   npm run report:d1
 *   node scripts/d1-report.mjs [--hours=24] [--no-cache] [--md=d1-report.md]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";

const DATABASE_ID = "15bbb429-a4bf-4c66-81fb-73ad4ea7e3ff";
const D1_FREE_TIER_DAILY_READS = 5_000_000;
const CACHE_FILE = path.resolve(".wrangler/d1-report-cache.json");

// --- 1. Auth & Account Discovery ---

const WRANGLER_CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7";

async function getCloudflareToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN;
  }
  const candidates = [
    path.join(os.homedir(), "Library/Preferences/.wrangler/config/default.toml"),
    path.join(os.homedir(), ".config/.wrangler/config/default.toml"),
    path.join(os.homedir(), ".wrangler/config/default.toml"),
  ];
  for (const cfgPath of candidates) {
    if (fs.existsSync(cfgPath)) {
      const content = fs.readFileSync(cfgPath, "utf8");
      const tokenMatch = content.match(/oauth_token\s*=\s*"([^"]+)"/);
      const expMatch = content.match(/expiration_time\s*=\s*"([^"]+)"/);
      const refreshMatch = content.match(/refresh_token\s*=\s*"([^"]+)"/);

      const isExpired =
        expMatch && new Date(expMatch[1]).getTime() <= Date.now() + 60_000;

      if ((!tokenMatch || isExpired) && refreshMatch) {
        try {
          const params = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshMatch[1],
            client_id: WRANGLER_CLIENT_ID,
          });
          const res = await fetch("https://dash.cloudflare.com/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
          });
          const json = await res.json();
          if (json.access_token) {
            const newExp = new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString();
            let updated = content.replace(
              /oauth_token\s*=\s*"[^"]+"/,
              `oauth_token = "${json.access_token}"`
            );
            updated = updated.replace(
              /expiration_time\s*=\s*"[^"]+"/,
              `expiration_time = "${newExp}"`
            );
            if (json.refresh_token) {
              updated = updated.replace(
                /refresh_token\s*=\s*"[^"]+"/,
                `refresh_token = "${json.refresh_token}"`
              );
            }
            fs.writeFileSync(cfgPath, updated, "utf8");
            return json.access_token;
          }
        } catch {}
      }

      if (tokenMatch) return tokenMatch[1];
    }
  }
  throw new Error(
    "Cloudflare auth token not found. Set CLOUDFLARE_API_TOKEN or run `npx wrangler login`."
  );
}

async function getAccountId(token) {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) {
    return process.env.CLOUDFLARE_ACCOUNT_ID;
  }
  const res = await fetch("https://api.cloudflare.com/client/v4/accounts", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  const accountId = json?.result?.[0]?.id;
  if (!accountId) {
    throw new Error(`Failed to resolve Cloudflare Account ID: ${JSON.stringify(json?.errors || json)}`);
  }
  return accountId;
}

// --- 2. Commit Deployment Windows ---

function getCommitTimeline() {
  // Get recent commits on main (use -n 20 instead of --since so baseline commit is never dropped as days pass)
  const raw = execSync(
    'git log -n 20 --pretty=format:"%h|%H|%ct|%s"',
    { encoding: "utf8" }
  ).trim();

  const allCommits = raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [short, full, epochStr, ...subjectParts] = line.split("|");
      return {
        short,
        full,
        timestampMs: parseInt(epochStr, 10) * 1000,
        dateIso: new Date(parseInt(epochStr, 10) * 1000).toISOString(),
        subject: subjectParts.join("|"),
      };
    });

  // Identify D1 optimization commits (starting from dd72f60 on 2026-10-29 onwards)
  const perfCommitsRaw = execSync(
    'git log --since="2026-10-29T00:00:00Z" --grep="^perf" --pretty=format:"%h"',
    { encoding: "utf8" }
  )
    .trim()
    .split("\n")
    .filter(Boolean);

  const selected = [];
  for (let i = 0; i < allCommits.length; i++) {
    const c = allCommits[i];
    if (perfCommitsRaw.includes(c.short)) {
      selected.push(c);
      // Include the baseline commit immediately preceding the first optimization commit
      if (
        selected.length === perfCommitsRaw.length &&
        i + 1 < allCommits.length
      ) {
        selected.push({
          ...allCommits[i + 1],
          isBaseline: true,
        });
      }
      if (selected.length > perfCommitsRaw.length) break;
    }
  }

  // Sort chronologically (oldest -> newest)
  selected.sort((a, b) => a.timestampMs - b.timestampMs);

  const nowMs = Date.now();
  const MAX_WINDOW_MS = 24 * 3600 * 1000;

  const timeline = selected.map((c, idx) => {
    const nextCommit = selected[idx + 1];
    let startMs = c.timestampMs;
    let endMs = nextCommit
      ? Math.min(nextCommit.timestampMs, startMs + MAX_WINDOW_MS)
      : Math.min(nowMs, startMs + MAX_WINDOW_MS);

    // For baseline commit, measure the 24h window immediately preceding the first optimization commit
    if (c.isBaseline && nextCommit) {
      endMs = nextCommit.timestampMs;
      startMs = endMs - MAX_WINDOW_MS;
    }

    const durationHours = Math.max((endMs - startMs) / (3600 * 1000), 0.1);
    const isComplete = nextCommit != null || nowMs - startMs >= MAX_WINDOW_MS;

    return {
      ...c,
      stageLabel: idx === 0 ? "base" : `opt${idx}`,
      stageIndex: idx,
      startMs,
      endMs,
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(endMs).toISOString(),
      durationHours,
      isComplete,
    };
  });

  // If the latest commit was deployed more than 24h ago, also append a "recent 24h (현재)" window
  const latest = timeline[timeline.length - 1];
  if (latest && nowMs - latest.timestampMs > MAX_WINDOW_MS + 3600 * 1000) {
    timeline.push({
      ...latest,
      stageLabel: "최근24h",
      stageIndex: latest.stageIndex,
      subject: `${latest.subject} (최근 24시간 안정화 구간)`,
      startMs: nowMs - MAX_WINDOW_MS,
      endMs: nowMs,
      startIso: new Date(nowMs - MAX_WINDOW_MS).toISOString(),
      endIso: new Date(nowMs).toISOString(),
      durationHours: 24.0,
      isComplete: false,
      isRecentRolling: true,
    });
  }

  return timeline;
}

// --- 3. Query Classification ---

/**
 * Classifies a D1 SQL string into one of our tracked query categories and
 * identifies which commit version of the SQL it corresponds to (if specific).
 */
function classifyQuery(sql) {
  const s = (sql || "").trim();

  if (s.includes("-- TOPICS QUERY")) {
    let variant = "unknown";
    if (s.includes("CROSS JOIN news_topics") && s.includes("-10 days")) {
      variant = "v3_cross_join_10d"; // fc07821
    } else if (s.includes("WITH recent_topics AS MATERIALIZED")) {
      variant = "v2_materialized_cte"; // dd72f60
    } else if (s.includes("topic_counts")) {
      variant = "v1_baseline"; // f2a7b70
    }
    return { category: "TOPICS_QUERY", label: "1. TOPICS QUERY (핫토픽 집계)", variant };
  }

  if (s.includes("-- NEWS QUERY")) {
    let variant = "unknown";
    if (s.includes("PARTITION BY +source_id")) {
      variant = "v2_plus_source_id"; // dd72f60 & fc07821
    } else {
      variant = "v1_baseline"; // f2a7b70
    }
    return { category: "NEWS_QUERY", label: "2. NEWS QUERY (메인 뉴스 피드)", variant };
  }

  if (
    s.includes("WITH paged_news AS") ||
    (s.includes("FROM news n") &&
      s.includes("JOIN news_topics nt ON n.id = nt.news_id") &&
      s.includes("WHERE nt.topic_id = ?") &&
      s.includes("group_concat"))
  ) {
    const variant = s.includes("WITH paged_news AS") ? "v3_paged_cte" : "v1_baseline";
    return { category: "TOPIC_DETAIL", label: "3. TOPIC DETAIL (/topic/:id 기사 목록)", variant };
  }

  if (s.includes("UPDATE topics SET updated_at = datetime('now')")) {
    const variant = s.includes("-10 days") ? "v3_10d_guard" : "v1_unbounded";
    return { category: "TOPIC_UPDATE", label: "4. AI QUEUE TOPIC UPDATE (토픽 갱신)", variant };
  }

  return { category: "OTHER", label: "기타 쿼리", variant: "other" };
}

// --- 4. GraphQL Fetcher (with hourly rollup & local cache) ---

async function fetchD1WindowGroups(token, accountTag, startIso, endIso) {
  // Round startIso down to the hour and endIso up to the hour for datetimeHour filter
  const startHour = new Date(Math.floor(new Date(startIso).getTime() / 3600000) * 3600000).toISOString();
  const endHour = new Date(Math.ceil(new Date(endIso).getTime() / 3600000) * 3600000).toISOString();

  const query = `query getD1QueriesOverviewQuery($accountTag: string, $filter: AccountD1QueriesAdaptiveGroupsFilter_InputObject) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        d1QueriesAdaptiveGroups(limit: 50, filter: $filter, orderBy: [sum_rowsRead_DESC]) {
          sum {
            queryDurationMs
            rowsRead
            rowsWritten
            rowsReturned
          }
          avg {
            queryDurationMs
            rowsRead
            rowsWritten
            rowsReturned
          }
          count
          dimensions {
            query
          }
        }
      }
    }
  }`;

  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      operationName: "getD1QueriesOverviewQuery",
      variables: {
        accountTag,
        filter: {
          AND: [
            {
              datetimeHour_geq: startHour,
              datetimeHour_leq: endHour,
              databaseId: DATABASE_ID,
            },
          ],
        },
      },
    }),
  });

  const json = await res.json();
  if (json.errors && json.errors.length > 0) {
    const errMsg = json.errors.map((e) => e.message).join("; ");
    throw new Error(errMsg);
  }

  return json?.data?.viewer?.accounts?.[0]?.d1QueriesAdaptiveGroups ?? [];
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
  } catch {}
  return { windows: {}, lastSnapshot: null };
}

function saveCache(cache) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {}
}

// --- 5. Aggregation & Report Formatting ---

function fmtNum(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(digits)}k`;
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

function fmtDelta(curr, base) {
  if (!base || base <= 0 || curr === null || curr === undefined) return "baseline";
  const pct = ((curr - base) / base) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function pad(str, len, align = "left") {
  const s = String(str);
  if (s.length >= len) return s;
  const spaces = " ".repeat(len - s.length);
  return align === "right" ? spaces + s : s + spaces;
}

/**
 * Matches whether a query variant belongs to a given commit index:
 *   idx 0 = baseline (before dd72f60)
 *   idx 1 = dd72f60 (1st optimization)
 *   idx 2 = fc07821 (2nd optimization)
 */
function matchesCommitVariant(category, variant, commitIdx) {
  if (category === "TOPICS_QUERY") {
    if (commitIdx === 0) return variant === "v1_baseline";
    if (commitIdx === 1) return variant === "v2_materialized_cte";
    if (commitIdx >= 2) return variant === "v3_cross_join_10d";
  }
  if (category === "NEWS_QUERY") {
    if (commitIdx === 0) return variant === "v1_baseline";
    if (commitIdx >= 1) return variant === "v2_plus_source_id";
  }
  if (category === "TOPIC_DETAIL") {
    if (commitIdx <= 1) return variant === "v1_baseline";
    if (commitIdx >= 2) return variant === "v3_paged_cte";
  }
  if (category === "TOPIC_UPDATE") {
    if (commitIdx <= 1) return variant === "v1_unbounded";
    if (commitIdx >= 2) return variant === "v3_10d_guard";
  }
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const noCache = args.includes("--no-cache");

  const commits = getCommitTimeline();
  const cache = loadCache();

  let token = null;
  let accountTag = null;
  let apiWarning = null;

  try {
    token = await getCloudflareToken();
    accountTag = await getAccountId(token);
  } catch (e) {
    apiWarning = e.message;
  }

  // Also fetch a single combined 48h window if possible (1 single GraphQL request!)
  // because SQL text variants uniquely distinguish v1 vs v2 vs v3 for TOPICS_QUERY and TOPIC_DETAIL!
  let combinedGroups = null;
  if (token && accountTag) {
    try {
      const now = new Date();
      const start24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
      combinedGroups = await fetchD1WindowGroups(token, accountTag, start24h, now.toISOString());
      cache.lastSnapshot = {
        fetchedAt: now.toISOString(),
        startIso: start24h,
        endIso: now.toISOString(),
        groups: combinedGroups,
      };
      saveCache(cache);
    } catch (e) {
      apiWarning = e.message;
      if (cache.lastSnapshot) {
        combinedGroups = cache.lastSnapshot.groups;
      }
    }
  } else if (cache.lastSnapshot) {
    combinedGroups = cache.lastSnapshot.groups;
  }

  // Try per-window fetch for completed windows not yet in cache
  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    const cacheKey = `${c.short}_${c.stageLabel}_${c.startIso.slice(0, 13)}`;
    if (!noCache && !c.isRecentRolling && cache.windows[cacheKey]) {
      c.groups = cache.windows[cacheKey].groups;
      c.source = "cache";
      continue;
    }
    if (token && accountTag && !apiWarning) {
      try {
        const groups = await fetchD1WindowGroups(token, accountTag, c.startIso, c.endIso);
        c.groups = groups;
        c.source = "live";
        // Cache if window ended more than 1 hour ago
        if (!c.isRecentRolling && Date.now() - c.endMs > 3600 * 1000) {
          cache.windows[cacheKey] = {
            fetchedAt: new Date().toISOString(),
            groups,
          };
          saveCache(cache);
        }
      } catch (e) {
        apiWarning = e.message;
      }
    }
    if (!c.groups && combinedGroups) {
      c.groups = combinedGroups;
      c.source = "snapshot";
    }
  }

  const CATEGORIES = [
    { key: "TOPICS_QUERY", title: "1. TOPICS QUERY (`-- TOPICS QUERY` 핫토픽 집계)" },
    { key: "NEWS_QUERY", title: "2. NEWS QUERY (`-- NEWS QUERY` 메인 뉴스 피드)" },
    { key: "TOPIC_DETAIL", title: "3. TOPIC DETAIL (`/topic/:id` 토픽 상세 기사 목록)" },
    { key: "TOPIC_UPDATE", title: "4. AI QUEUE TOPIC UPDATE (`UPDATE topics SET updated_at`)" },
  ];

  // Build per-category, per-commit stats
  const reportData = {};
  for (const cat of CATEGORIES) {
    reportData[cat.key] = [];
    for (let idx = 0; idx < commits.length; idx++) {
      const c = commits[idx];
      const groups = c.groups || [];
      let totalCount = 0;
      let totalRowsRead = 0;
      let totalDurationMs = 0;
      let totalRowsReturned = 0;

      for (const g of groups) {
        const sql = g?.dimensions?.query || "";
        const info = classifyQuery(sql);
        if (info.category !== cat.key) continue;
        if (!matchesCommitVariant(cat.key, info.variant, c.stageIndex ?? idx)) continue;

        totalCount += g.count || 0;
        totalRowsRead += g.sum?.rowsRead || 0;
        totalDurationMs += g.sum?.queryDurationMs || 0;
        totalRowsReturned += g.sum?.rowsReturned || 0;
      }

      // Compute effective hours for this variant
      // Notice: if using snapshot for baseline (idx 0) which only overlapped the first ~3.5h of the 24h snapshot,
      // adjust effective hours to the overlap between [c.startMs, c.endMs] and the snapshot window.
      let effectiveHours = c.durationHours;
      if (c.source === "snapshot" && cache.lastSnapshot) {
        const snapStartMs = new Date(cache.lastSnapshot.startIso).getTime();
        const snapEndMs = new Date(cache.lastSnapshot.endIso).getTime();
        const overlapStart = Math.max(c.startMs, snapStartMs);
        const overlapEnd = Math.min(c.endMs, snapEndMs);
        if (overlapEnd > overlapStart) {
          effectiveHours = Math.max((overlapEnd - overlapStart) / 3600000, 0.1);
        }
      }

      // Special case: for NEWS_QUERY, dd72f60 and fc07821 share the exact same SQL string (`v2_plus_source_id`).
      // If fc07821 is using the 24h snapshot instead of its own isolated hour window, avoid attributing dd72f60's past 20h executions to fc07821.
      let sharedSqlNote = false;
      if (
        cat.key === "NEWS_QUERY" &&
        idx === 2 &&
        c.source === "snapshot" &&
        c.durationHours < 1.0
      ) {
        sharedSqlNote = true;
      }

      const execsPerHr = totalCount / effectiveHours;
      const rowsReadPerHr = totalRowsRead / effectiveHours;
      const rowsPerExec = totalCount > 0 ? totalRowsRead / totalCount : null;
      const avgMs = totalCount > 0 ? totalDurationMs / totalCount : null;

      reportData[cat.key].push({
        commit: c,
        effectiveHours,
        totalCount,
        totalRowsRead,
        totalRowsReturned,
        execsPerHr,
        rowsReadPerHr,
        rowsPerExec,
        avgMs,
        sharedSqlNote,
      });
    }
  }

  // --- Print Console Report ---
  console.log("\n==============================================================================================");
  console.log(" 📊 D1 Query Optimization Report — 커밋별 1시간 평균 추이 (Hourly Avg per Commit)");
  console.log("==============================================================================================");
  if (cache.lastSnapshot) {
    console.log(` • 데이터 기준 시각: ${cache.lastSnapshot.fetchedAt}`);
  }
  if (apiWarning) {
    console.log(` • 참고: GraphQL API 쿨다운 중이므로 최근 스냅샷 데이터를 사용했습니다 (${apiWarning.slice(0, 80)})`);
  }

  console.log("\n[커밋 타임라인]");
  commits.forEach((c, i) => {
    const tag = c.isRecentRolling
      ? "현재 최근 24h"
      : i === 0
      ? "Baseline (최적화 전)"
      : `${i}차 최적화`;
    console.log(
      `  ${i + 1}) ${c.short} [${tag}] — ${c.subject}\n     구간: ${c.startIso.slice(0, 16).replace("T", " ")}Z ~ ${c.endIso.slice(0, 16).replace("T", " ")}Z (${c.durationHours.toFixed(1)}h)`
    );
  });

  for (const cat of CATEGORIES) {
    const rows = reportData[cat.key];
    console.log(`\n------------------------------------------------------------------------------------------------------------`);
    console.log(` ${cat.title}`);
    console.log(`------------------------------------------------------------------------------------------------------------`);
    console.log(
      `${pad("Commit", 16)} | ${pad("Window", 7, "right")} | ${pad("Execs/hr", 9, "right")} | ${pad("Rows/hr", 11, "right")} | ${pad("Rows/Exec", 10, "right")} | ${pad("Latency", 9, "right")} | ${pad("Rows/Exec 증감", 14, "right")} | ${pad("Rows/hr 증감", 12, "right")}`
    );
    console.log("-".repeat(108));

    const baseRowsPerExec = rows[0]?.rowsPerExec;
    const baseRowsPerHr = rows[0]?.rowsReadPerHr;

    rows.forEach((r, idx) => {
      const stage = r.commit.stageLabel || (idx === 0 ? "base" : `opt${idx}`);
      const label = `${r.commit.short} (${stage})`;
      // Compare against the previous distinct commit stage (so recent 24h of opt2 also compares against opt1)
      const refIdx = r.commit.isRecentRolling ? Math.max(0, idx - 2) : Math.max(0, idx - 1);
      const prevRowsPerExec = idx > 0 ? rows[refIdx]?.rowsPerExec : null;
      const prevRowsPerHr = idx > 0 ? rows[refIdx]?.rowsReadPerHr : null;

      const deltaExecStr =
        idx === 0
          ? "baseline"
          : r.rowsPerExec !== null
          ? fmtDelta(r.rowsPerExec, prevRowsPerExec || baseRowsPerExec)
          : "집계 대기중";

      const deltaHrStr =
        idx === 0
          ? "baseline"
          : r.totalCount > 0
          ? fmtDelta(r.rowsReadPerHr, prevRowsPerHr || baseRowsPerHr)
          : "집계 대기중";

      const execHrStr = r.sharedSqlNote
        ? "(공유SQL)"
        : r.totalCount > 0
        ? `${r.execsPerHr.toFixed(1)} /hr`
        : "0.0 /hr";
      const rowsHrStr = r.sharedSqlNote
        ? "(공유SQL)"
        : r.totalCount > 0
        ? `${fmtNum(r.rowsReadPerHr)} /hr`
        : "0 /hr";
      const rowsExecStr = r.rowsPerExec !== null ? fmtNum(r.rowsPerExec, 1) : "-";
      const latencyStr = r.avgMs !== null ? `${r.avgMs.toFixed(2)} ms` : "-";

      console.log(
        `${pad(label, 16)} | ${pad(r.effectiveHours.toFixed(1) + "h", 7, "right")} | ${pad(execHrStr, 9, "right")} | ${pad(rowsHrStr, 11, "right")} | ${pad(rowsExecStr, 10, "right")} | ${pad(latencyStr, 9, "right")} | ${pad(deltaExecStr, 14, "right")} | ${pad(deltaHrStr, 12, "right")}`
      );
    });
  }

  // --- Summary of Daily Free Tier Projection ---
  const topicsV1 = reportData.TOPICS_QUERY[0]?.rowsPerExec || 8895;
  const topicsV2 = reportData.TOPICS_QUERY[1]?.rowsPerExec || 12729;
  const topicsV3 = reportData.TOPICS_QUERY[2]?.rowsPerExec || 1084;
  const newsV1 = reportData.NEWS_QUERY[0]?.rowsPerExec || 2696;
  const newsV2 = reportData.NEWS_QUERY[1]?.rowsPerExec || 2328;

  const projections = [
    {
      name: `${commits[0]?.short || "f2a7b70"} (base: 캐시없음)`,
      ttl: "없음",
      execsPerHr: 48.0,
      topicsRows: 48 * 24 * topicsV1,
      newsRows: 48 * 24 * newsV1,
    },
    {
      name: `${commits[1]?.short || "dd72f60"} (opt1: 10분캐시)`,
      ttl: "10m (600s)",
      execsPerHr: 16.6,
      topicsRows: 16.6 * 24 * topicsV2,
      newsRows: 16.3 * 24 * newsV2,
    },
    {
      name: `${commits[2]?.short || "fc07821"} (opt2: 30분캐시)`,
      ttl: "30m (1800s)",
      execsPerHr: 6.0,
      topicsRows: 6.0 * 24 * topicsV3,
      newsRows: 6.0 * 24 * newsV2,
    },
  ];

  console.log(`\n------------------------------------------------------------------------------------------------------------`);
  console.log(` 24시간 환산 D1 Free Tier (5,000,000 rows/day) 소진율 시뮬레이션 (3 Edge PoPs 기준)`);
  console.log(`------------------------------------------------------------------------------------------------------------`);
  console.log(
    `${pad("Commit Stage", 26)} | ${pad("Cache TTL", 11, "right")} | ${pad("Execs/hr", 9, "right")} | ${pad("TOPICS (24h)", 13, "right")} | ${pad("NEWS (24h)", 11, "right")} | ${pad("Total (24h)", 12, "right")} | ${pad("Free Tier %", 11, "right")}`
  );
  console.log("-".repeat(108));

  for (const p of projections) {
    const total24h = p.topicsRows + p.newsRows;
    const pctFreeTier = (total24h / D1_FREE_TIER_DAILY_READS) * 100;
    console.log(
      `${pad(p.name, 26)} | ${pad(p.ttl, 11, "right")} | ${pad(p.execsPerHr.toFixed(1) + "/hr", 9, "right")} | ${pad(fmtNum(p.topicsRows), 13, "right")} | ${pad(fmtNum(p.newsRows), 11, "right")} | ${pad(fmtNum(total24h), 12, "right")} | ${pad(pctFreeTier.toFixed(1) + "%", 11, "right")}`
    );
  }
  console.log(`==============================================================================================\n`);
}

main().catch((err) => {
  console.error("Report generation failed:", err);
  process.exit(1);
});
