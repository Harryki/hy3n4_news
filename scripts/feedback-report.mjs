#!/usr/bin/env node
/**
 * User Feedback Survey Report Generator (Terminal Output)
 *
 * Queries the Cloudflare D1 `feedbacks` table and prints aggregated statistics
 * (Q1 visit purposes, Q2 desired features, page distribution, and Q3 comments)
 * directly to the terminal.
 *
 * Usage:
 *   npm run report:feedback
 *   node scripts/feedback-report.mjs [--limit=30]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DATABASE_ID = "15bbb429-a4bf-4c66-81fb-73ad4ea7e3ff";
const WRANGLER_CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7";

const PURPOSE_LABELS = {
  hot_issues: "📰 실시간 주요 뉴스·핫이슈('뜨거운 감자') 빠른 파악",
  compare_press: "⚖️ 같은 사건에 대한 언론사별 논조·헤드라인 비교",
  search_topic: "🔍 특정 키워드/이슈의 과거~현재 기사 흐름 검색",
  work_invest: "💼 경제·산업·트렌드 모니터링 (업무/투자 참고)",
  browsing: "👀 우연히 방문 / 둘러보는 중",
};

const FEATURE_LABELS = {
  ai_summary: "🤖 토픽별 AI 3줄 요약 및 언론사별 핵심 논점 비교",
  custom_filter: "🏛️ 언론사 추가 및 내 관심 언론사/카테고리 필터링",
  keyword_alert: "🔔 관심 키워드·핫토픽 알림 (이메일/텔레그램/웹푸시)",
  bias_chart: "📊 언론사별 성향 분석 및 보도량 추이 그래프",
  community: "💬 토픽별 유저 댓글·토론 또는 투표 기능 강화",
};

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
  const id = json?.result?.[0]?.id;
  if (!id) {
    throw new Error(`Failed to resolve Cloudflare account ID: ${JSON.stringify(json.errors)}`);
  }
  return id;
}

async function queryD1(token, accountId, sql, params = []) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    }
  );
  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(json.errors)}`);
  }
  return json.result?.[0]?.results ?? [];
}

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function makeBar(pct, width = 20) {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(Math.max(0, Math.min(width, filled))) + "░".repeat(Math.max(0, width - filled));
}

function padRight(str, len) {
  const s = String(str);
  return s.length >= len ? s : s + " ".repeat(len - s.length);
}

function padLeft(str, len) {
  const s = String(str);
  return s.length >= len ? s : " ".repeat(len - s.length) + s;
}

async function main() {
  const args = process.argv.slice(2);
  const isLocal = args.includes("--local");
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const commentLimit = limitArg ? parseInt(limitArg.split("=")[1], 10) || 20 : 20;

  const sql = `SELECT f.id, f.user_id, f.visitor_id, f.visit_purposes, f.desired_features,
            f.comment, f.page_path, f.created_at, f.updated_at,
            u.username, u.email
     FROM feedbacks f
     LEFT JOIN users u ON f.user_id = u.id
     ORDER BY f.updated_at DESC, f.id DESC`;

  let rows = [];
  if (isLocal) {
    const d1Dir = path.resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
    if (fs.existsSync(d1Dir)) {
      const files = fs
        .readdirSync(d1Dir)
        .filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite")
        .map((f) => path.join(d1Dir, f));
      for (const dbFile of files) {
        try {
          const out = execFileSync("sqlite3", ["-json", dbFile, sql], { encoding: "utf8" }).trim();
          if (out) {
            const parsed = JSON.parse(out);
            if (Array.isArray(parsed) && parsed.length > 0) {
              rows.push(...parsed);
            }
          }
        } catch {}
      }
    }
  } else {
    const token = await getCloudflareToken();
    const accountId = await getAccountId(token);
    rows = await queryD1(token, accountId, sql);
  }

  const total = rows.length;
  const memberCount = rows.filter((r) => r.user_id !== null && r.user_id !== undefined).length;
  const anonCount = total - memberCount;
  const commentRows = rows.filter((r) => r.comment && String(r.comment).trim().length > 0);
  const latestAt = rows[0]?.updated_at || rows[0]?.created_at || "-";

  console.log("\n==============================================================================================");
  console.log(" 💬 하이에나뉴스 유저 피드백 통계 리포트 (User Feedback Survey Report)");
  console.log("==============================================================================================");
  console.log(` • 조회 시각 (UTC) : ${new Date().toISOString()}`);
  console.log(` • 총 응답자 수    : ${total}명 (로그인 회원: ${memberCount}명 / 비회원 쿠키: ${anonCount}명)`);
  console.log(` • 코멘트 작성 수  : ${commentRows.length}건`);
  console.log(` • 최근 응답 시각  : ${latestAt}`);

  if (total === 0) {
    console.log("\n [안내] 아직 수집된 피드백 응답이 없습니다.");
    console.log("==============================================================================================\n");
    return;
  }

  // Aggregate Q1 & Q2 & Page Paths
  const purposeCounts = Object.fromEntries(Object.keys(PURPOSE_LABELS).map((k) => [k, 0]));
  const featureCounts = Object.fromEntries(Object.keys(FEATURE_LABELS).map((k) => [k, 0]));
  const pageCounts = {};

  for (const r of rows) {
    const purposes = parseJsonArray(r.visit_purposes);
    for (const p of purposes) {
      purposeCounts[p] = (purposeCounts[p] || 0) + 1;
    }
    const features = parseJsonArray(r.desired_features);
    for (const f of features) {
      featureCounts[f] = (featureCounts[f] || 0) + 1;
    }
    const pg = r.page_path || "/";
    pageCounts[pg] = (pageCounts[pg] || 0) + 1;
  }

  // Print Q1
  console.log("\n----------------------------------------------------------------------------------------------");
  console.log(" 1. 방문 목적 (Q1: 주된 방문 목적 — 복수 응답)");
  console.log("----------------------------------------------------------------------------------------------");
  const sortedPurposes = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedPurposes) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    const label = PURPOSE_LABELS[key] || key;
    console.log(
      ` ${makeBar(pct)}  ${padLeft(count + "명", 5)} (${padLeft(pct.toFixed(1) + "%", 6)})  ${label}`
    );
  }

  // Print Q2
  console.log("\n----------------------------------------------------------------------------------------------");
  console.log(" 2. 희망 기능 (Q2: 가장 추가되었으면 하는 기능 — 복수 응답)");
  console.log("----------------------------------------------------------------------------------------------");
  const sortedFeatures = Object.entries(featureCounts).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedFeatures) {
    const pct = total > 0 ? (count / total) * 100 : 0;
    const label = FEATURE_LABELS[key] || key;
    console.log(
      ` ${makeBar(pct)}  ${padLeft(count + "명", 5)} (${padLeft(pct.toFixed(1) + "%", 6)})  ${label}`
    );
  }

  // Print Page Path Distribution
  console.log("\n----------------------------------------------------------------------------------------------");
  console.log(" 3. 응답 페이지 분포 (Top 5 Paths)");
  console.log("----------------------------------------------------------------------------------------------");
  const sortedPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  for (const [pg, count] of sortedPages) {
    const pct = (count / total) * 100;
    console.log(` • ${padRight(pg, 24)} : ${count}건 (${pct.toFixed(1)}%)`);
  }

  // Print Q3 Comments
  console.log("\n----------------------------------------------------------------------------------------------");
  console.log(` 4. 자유 코멘트 내역 (최근 ${Math.min(commentRows.length, commentLimit)}건 / 총 ${commentRows.length}건)`);
  console.log("----------------------------------------------------------------------------------------------");
  if (commentRows.length === 0) {
    console.log(" 작성된 주관식 코멘트가 없습니다.");
  } else {
    commentRows.slice(0, commentLimit).forEach((r, idx) => {
      const who = r.username
        ? `회원(${r.username})`
        : `비회원(${String(r.visitor_id || "anon").slice(0, 8)})`;
      const time = r.updated_at || r.created_at;
      console.log(
        ` [${idx + 1}] ${time} | ${who} | 경로: ${r.page_path || "/"}\n     "${String(r.comment).replace(/\n/g, "\n      ")}"`
      );
    });
  }
  console.log("==============================================================================================\n");
}

main().catch((err) => {
  console.error("Feedback report failed:", err);
  process.exit(1);
});
