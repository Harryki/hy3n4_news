#!/usr/bin/env node
/**
 * Hot Topics Milestone & Clustering Quality Report (Terminal Output)
 *
 * Audits the health of "뜨거운 감자" (Hot Topics) in production D1:
 *   1. Top 10 Hot Topics: Milestone timelines, title evolution history, APPEND vs SKIP ratios, and press diversity
 *   2. Vector Similarity Distribution across recent topic mappings
 *   3. Split-Topic (Twin Cluster) Detector: Identifies topics from the last 48h that share keywords/tokens
 *   4. Optional `--backfill`: Generates milestone timelines for current Top 10 Hot Topics that don't have milestones yet
 *
 * Usage:
 *   npm run report:topics
 *   node scripts/topics-report.mjs [--backfill]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DATABASE_ID = "15bbb429-a4bf-4c66-81fb-73ad4ea7e3ff";
const WRANGLER_CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7";
const LLM_MODEL = "@cf/google/gemma-4-26b-a4b-it";

async function getCloudflareToken(forceRefresh = false) {
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
        forceRefresh ||
        (expMatch && new Date(expMatch[1]).getTime() <= Date.now() + 60_000);

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
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return process.env.CLOUDFLARE_API_TOKEN;
  }
  throw new Error("Cloudflare auth token not found. Run `npx wrangler login`.");
}

async function resolveAuth() {
  let token = await getCloudflareToken(false);
  let res = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=5", {
    headers: { Authorization: `Bearer ${token}` },
  });
  let json = await res.json();
  if (!json.success && json.errors?.some((e) => e.code === 9109)) {
    token = await getCloudflareToken(true);
    res = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=5", {
      headers: { Authorization: `Bearer ${token}` },
    });
    json = await res.json();
  }
  if (!json.success || !json.result?.length) {
    throw new Error(`Failed to fetch Cloudflare account ID: ${JSON.stringify(json.errors)}`);
  }
  return { token, accountId: process.env.CLOUDFLARE_ACCOUNT_ID || json.result[0].id };
}

async function queryD1(token, accountId, sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${DATABASE_ID}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 Query Error: ${JSON.stringify(json.errors)}`);
  }
  return json.result?.[0]?.results || [];
}

async function runAI(token, accountId, model, payload) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Workers AI Error (${model}): ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

function formatKstTime(utcStr) {
  if (!utcStr) return "";
  const d = new Date(utcStr.endsWith("Z") ? utcStr : utcStr.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return String(utcStr).slice(0, 16);
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

function cleanMilestoneText(raw) {
  return String(raw || "")
    .replace(/^\s*(?:[\[\(]\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}[\]\)]\s*)+/, "")
    .replace(/^\s*\d+\.\s*/, "")
    .trim();
}

function parseMilestones(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { items: parsed, meta: { check_count: 1, append_count: 1, skip_count: 0, title_history: [] } };
    }
    if (parsed && Array.isArray(parsed.items)) return parsed;
  } catch {}
  return null;
}

async function backfillTopicMilestones(token, accountId, topic) {
  const articles = await queryD1(
    token,
    accountId,
    `SELECT n.id, n.title, n.description, n.published_at, n.created_at, s.name as source_name
     FROM news n
     JOIN news_topics nt ON n.id = nt.news_id
     JOIN sources s ON n.source_id = s.id
     WHERE nt.topic_id = ?
     ORDER BY COALESCE(n.published_at, n.created_at) ASC, n.id ASC`,
    [topic.id]
  );

  if (articles.length < 2) return;

  const recentSlice = articles.slice(-14);
  const articleLines = recentSlice
    .map(
      (a, idx) =>
        `[${idx + 1}] (${formatKstTime(a.published_at || a.created_at)} | ${a.source_name}) ${a.title}${
          a.description ? ` - ${String(a.description).slice(0, 100)}` : ""
        }`
    )
    .join("\n");

  const aiResponse = await runAI(token, accountId, LLM_MODEL, {
    messages: [
      {
        role: "system",
        content:
          "You are a professional Korean news timeline editor. Respond ONLY with a valid JSON object.",
      },
      {
        role: "user",
        content: `다음 시간순 뉴스 기사들을 읽고 토픽의 대표 제목(30자 이내 한국어, 사건 전개가 있다면 '초기 핵심 → 최신 상황' 형태), 핵심 키워드 3개, 그리고 시간순 핵심 마일스톤(2~4개, 단순 중복 보도 제외, 각 45자 이내, 시간 표기 제외)을 작성하세요.

기사 목록:
${articleLines}

출력 JSON 형식:
{
  "title": "...",
  "keywords": "키워드1, 키워드2, 키워드3",
  "milestones": [
    {"article_index": 1, "text": "첫 번째 주요 발생/발표 사실 (45자 이내)"},
    {"article_index": 3, "text": "후속 전개/대응/추가 사실 (45자 이내)"}
  ]
}`,
      },
    ],
    max_tokens: 768,
    chat_template_kwargs: { enable_thinking: false },
  });

  const rawText =
    aiResponse?.response ||
    aiResponse?.choices?.[0]?.message?.content ||
    aiResponse?.choices?.[0]?.message?.reasoning_content ||
    "";
  const match = rawText.trim().match(/\{[\s\S]*\}/);
  if (!match) return;

  const parsed = JSON.parse(match[0]);
  const updatedTitle = parsed.title || topic.title;
  const updatedKeywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.join(", ")
    : parsed.keywords || topic.keywords || "";

  const rawMilestones = Array.isArray(parsed.milestones) ? parsed.milestones : [];
  const items = rawMilestones
    .map((m, idx) => {
      if (typeof m === "string") {
        const refArt =
          idx === 0 ? recentSlice[0] : recentSlice[Math.min(idx * 2, recentSlice.length - 1)];
        return {
          time: formatKstTime(refArt.published_at || refArt.created_at),
          text: cleanMilestoneText(m),
          article_count: articles.length,
          news_id: refArt.id,
        };
      }
      const artIdx = Math.max(
        0,
        Math.min((Number(m.article_index) || idx + 1) - 1, recentSlice.length - 1)
      );
      const refArt = recentSlice[artIdx];
      return {
        time: formatKstTime(refArt.published_at || refArt.created_at),
        text: cleanMilestoneText(m.text || ""),
        article_count: articles.length,
        news_id: refArt.id,
      };
    })
    .filter((m) => m.text.length > 0);

  if (items.length === 0) return;

  const titleHistory =
    topic.title && topic.title !== updatedTitle ? [topic.title, updatedTitle] : [updatedTitle];

  const payload = JSON.stringify({
    items,
    meta: {
      last_news_id: articles[articles.length - 1].id,
      check_count: 1,
      append_count: 1,
      skip_count: 0,
      title_history: titleHistory,
    },
  });

  await queryD1(
    token,
    accountId,
    `UPDATE topics SET title = ?, keywords = ?, milestones = ?, last_summarized_count = ? WHERE id = ?`,
    [updatedTitle, updatedKeywords, payload, articles.length, topic.id]
  );
}

async function fetchTop10HotTopics(token, accountId) {
  const rows = await queryD1(
    token,
    accountId,
    `SELECT
       t.id,
       t.title,
       t.keywords,
       t.milestones,
       t.last_summarized_count,
       t.created_at,
       t.updated_at,
       COUNT(nt.news_id) as article_count,
       COUNT(DISTINCT n.source_id) as source_count,
       ROUND(AVG(nt.similarity_score), 3) as avg_sim,
       ROUND(MIN(nt.similarity_score), 3) as min_sim,
       ((julianday('now') - julianday(t.updated_at)) * 24.0) as hours_since_update
     FROM topics t
     CROSS JOIN news_topics nt ON t.id = nt.topic_id
     CROSS JOIN news n ON nt.news_id = n.id
     WHERE t.updated_at >= datetime('now', '-24 hours')
       AND t.created_at >= datetime('now', '-10 days')
     GROUP BY t.updated_at, t.id
     HAVING article_count > 1`
  );

  for (const r of rows) {
    const h = Math.max(0, Number(r.hours_since_update) || 0);
    r.trending_score = Number((r.article_count / Math.pow(h + 2.0, 1.8)).toFixed(4));
  }
  rows.sort((a, b) => b.trending_score - a.trending_score);
  return rows.slice(0, 10);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldBackfill = args.includes("--backfill");

  const { token, accountId } = await resolveAuth();

  // Fetch current Top 10 Hot Topics using the exact ranking formula
  let hotTopics = await fetchTop10HotTopics(token, accountId);

  if (shouldBackfill) {
    const missing = hotTopics.filter((t) => !t.milestones);
    if (missing.length > 0) {
      console.log(`🔄 현재 '뜨거운 감자' Top 10 중 마일스톤 미생성 ${missing.length}건 백필 중...`);
      for (const t of missing) {
        await backfillTopicMilestones(token, accountId, t);
        console.log(`   ✅ Topic #${t.id} 타임라인 생성 완료`);
      }
      // Re-fetch updated hot topics
      hotTopics = await fetchTop10HotTopics(token, accountId);
    }
  }

  console.log("\n================================================================================");
  console.log("🔥 [하이에나뉴스] '뜨거운 감자' 마일스톤 & 클러스터링 품질 감사 리포트");
  console.log("================================================================================\n");

  console.log("1️⃣  현재 홈 화면 '뜨거운 감자' Top 10 타임라인 상태");
  console.log("--------------------------------------------------------------------------------");

  for (let i = 0; i < hotTopics.length; i++) {
    const t = hotTopics[i];
    const mData = parseMilestones(t.milestones);
    const items = mData?.items || [];
    const meta = mData?.meta || { check_count: 0, append_count: 0, skip_count: 0, title_history: [] };

    console.log(
      `\n#${i + 1} [Topic #${t.id}] "${t.title}"`
    );
    console.log(
      `   • 기사 수: ${t.article_count}건 (언론사 ${t.source_count}곳) | 점수: ${t.trending_score} | 평균 유사도: ${t.avg_sim} (최저 ${t.min_sim})`
    );
    console.log(`   • 키워드 : ${t.keywords || "(없음)"}`);

    if (meta.title_history && meta.title_history.length > 1) {
      console.log(`   • 제목 변천사: ${meta.title_history.map((h) => `"${h}"`).join(" ➔ ")}`);
    }

    if (items.length > 0) {
      console.log(
        `   • 마일스톤 (${items.length}단계 | LLM 체크 ${meta.check_count}회: 추가 ${meta.append_count} / 스킵 ${meta.skip_count}):`
      );
      for (const m of items) {
        console.log(`      🧭 [${m.time}] ${m.text}`);
      }
    } else {
      console.log(`   • 마일스톤: (아직 생성 전 — 다음 기사 유입 또는 --backfill 시 생성)`);
    }
  }

  // 2. Split-Topic (Twin Cluster) Detector in last 48 hours
  const recentTopics = await queryD1(
    token,
    accountId,
    `SELECT
       t.id,
       t.title,
       t.keywords,
       COUNT(nt.news_id) as article_count
     FROM topics t
     CROSS JOIN news_topics nt ON t.id = nt.topic_id
     WHERE t.updated_at >= datetime('now', '-48 hours')
     GROUP BY t.updated_at, t.id
     HAVING article_count >= 2
     ORDER BY article_count DESC
     LIMIT 60`
  );

  const splitPairs = [];
  for (let i = 0; i < recentTopics.length; i++) {
    for (let j = i + 1; j < recentTopics.length; j++) {
      const a = recentTopics[i];
      const b = recentTopics[j];
      const kwA = new Set(
        (a.keywords || "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length >= 2)
      );
      const kwB = new Set(
        (b.keywords || "")
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length >= 2)
      );
      const sharedKw = [...kwA].filter((k) => kwB.has(k));
      if (sharedKw.length >= 2) {
        splitPairs.push({ a, b, sharedKw });
      }
    }
  }

  console.log("\n================================================================================");
  console.log("2️⃣  최근 48시간 쪼개진 쌍둥이 토픽(Split Topic) 감지 (공통 키워드 2개 이상)");
  console.log("--------------------------------------------------------------------------------");
  if (splitPairs.length === 0) {
    console.log("   ✅ 최근 48시간 내 중복 쪼개짐 의심 토픽 없음 (0건)\n");
  } else {
    for (const pair of splitPairs.slice(0, 10)) {
      console.log(
        `   ⚠️  [공통 키워드: ${pair.sharedKw.join(", ")}]`
      );
      console.log(`      - Topic #${pair.a.id} (${pair.a.article_count}건): "${pair.a.title}"`);
      console.log(`      - Topic #${pair.b.id} (${pair.b.article_count}건): "${pair.b.title}"`);
    }
    console.log("");
  }
}

main().catch((err) => {
  console.error("❌ 리포트 오류:", err.message);
  process.exit(1);
});
