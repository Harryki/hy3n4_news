#!/usr/bin/env node
/**
 * Topic Milestone & Evolving Vector Simulator (Terminal Output)
 *
 * Replays a real multi-article topic from production D1 in chronological chunks
 * to verify:
 *   1. Initial topic summarization (2 articles)
 *   2. Incremental novelty detection (SKIP on duplicate coverage vs APPEND on new developments)
 *   3. Topic title evolution (Initial -> Latest progression)
 *   4. Cosine similarity comparison: Static Seed Vector vs Evolving Milestone Vector
 *
 * Usage:
 *   npm run sim:topic
 *   node scripts/sim-topic.mjs [--id=123] [--step=4] [--save]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DATABASE_ID = "15bbb429-a4bf-4c66-81fb-73ad4ea7e3ff";
const WRANGLER_CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7";
const LLM_MODEL = "@cf/google/gemma-4-26b-a4b-it";
const EMBEDDING_MODEL = "@cf/baai/bge-m3";

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
  throw new Error(
    "Cloudflare auth token not found. Run `npx wrangler login`."
  );
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

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function formatKstTime(utcStr) {
  if (!utcStr) return "시간미상";
  const d = new Date(utcStr.endsWith("Z") ? utcStr : utcStr.replace(" ", "T") + "Z");
  if (isNaN(d.getTime())) return utcStr.slice(0, 16);
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

async function ensureTopicsColumns(token, accountId) {
  const cols = await queryD1(token, accountId, "PRAGMA table_info(topics)");
  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has("milestones")) {
    console.log("🔧 D1 마이그레이션: topics.milestones 컬럼 추가 중...");
    await queryD1(token, accountId, "ALTER TABLE topics ADD COLUMN milestones TEXT");
  }
  if (!colNames.has("last_summarized_count")) {
    console.log("🔧 D1 마이그레이션: topics.last_summarized_count 컬럼 추가 중...");
    await queryD1(
      token,
      accountId,
      "ALTER TABLE topics ADD COLUMN last_summarized_count INTEGER NOT NULL DEFAULT 0"
    );
  }
}

function cleanMilestoneText(raw) {
  return String(raw || "")
    .replace(/^\s*(?:[\[\(]\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}[\]\)]\s*)+/, "")
    .replace(/^\s*\d+\.\s*/, "")
    .trim();
}

function extractJson(rawText) {
  if (!rawText) return null;
  const cleaned = rawText.trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function generateInitialSummary(token, accountId, articles) {
  const articleLines = articles
    .map(
      (a, idx) =>
        `[${idx + 1}] (${formatKstTime(a.published_at || a.created_at)}) ${a.title}${
          a.description ? ` - ${String(a.description).slice(0, 120)}` : ""
        }`
    )
    .join("\n");

  const aiResponse = await runAI(token, accountId, LLM_MODEL, {
    messages: [
      {
        role: "system",
        content:
          "You are a professional Korean news editor. Respond ONLY with a valid JSON object.",
      },
      {
        role: "user",
        content: `다음 초기 뉴스 기사들을 읽고 토픽의 대표 제목(25자 이내 한국어), 핵심 키워드 3개, 그리고 이 사건의 첫 번째 타임라인 마일스톤(45자 이내, 핵심 사실 중심)을 작성하세요.

기사 목록:
${articleLines}

출력 JSON 형식:
{
  "title": "사건 핵심 제목 (25자 이내)",
  "keywords": "키워드1, 키워드2, 키워드3",
  "first_milestone": "초기 발생 사건/발표 핵심 요약 (45자 이내)"
}`,
      },
    ],
    max_tokens: 512,
    chat_template_kwargs: { enable_thinking: false },
  });

  const rawText =
    aiResponse?.response ||
    aiResponse?.choices?.[0]?.message?.content ||
    aiResponse?.choices?.[0]?.message?.reasoning_content ||
    "";
  return extractJson(rawText);
}

async function evaluateIncrementalStep(
  token,
  accountId,
  currentTitle,
  currentKeywords,
  milestones,
  newArticles
) {
  const existingMilestoneText = milestones
    .map((m, idx) => `${idx + 1}. [${m.time}] ${m.text}`)
    .join("\n");

  const newArticleText = newArticles
    .map(
      (a, idx) =>
        `- (${formatKstTime(a.published_at || a.created_at)} | ${a.source_name}) ${a.title}${
          a.description ? ` : ${String(a.description).slice(0, 120)}` : ""
        }`
    )
    .join("\n");

  const aiResponse = await runAI(token, accountId, LLM_MODEL, {
    messages: [
      {
        role: "system",
        content:
          "You are a strict Korean news timeline editor. Respond ONLY with a valid JSON object.",
      },
      {
        role: "user",
        content: `현재 뉴스 토픽의 기존 타임라인 마일스톤과, 방금 새로 수집된 기사들을 비교하세요.

[현재 토픽 제목]: ${currentTitle}
[현재 키워드]: ${currentKeywords}
[기존 타임라인 마일스톤]:
${existingMilestoneText}

[새로 유입된 기사들]:
${newArticleText}

판단 규칙:
1. 새 기사들이 이미 [기존 타임라인 마일스톤]에 기록된 사실의 단순 반복 보도(다른 언론사의 동일 내용 보도)이거나 지엽적인 내용뿐이라면:
   - "has_progression": false
   - "new_milestones": []
   - "updated_title": "${currentTitle}"
2. 기존 마일스톤 이후에 **새로운 사실, 후속 조치, 공식 입장/반박, 구체적 수치/피해 규모 변화, 수사/정책 진전** 등 사건의 의미 있는 전개가 있다면:
   - "has_progression": true
   - "new_milestones": 새로 진전된 핵심 사실만 1~2개 문장(각 45자 이내)으로 배열에 작성 (기존 마일스톤 내용과 중복 금지)
   - "updated_title": 사건의 처음과 최신 진행 상황이 한눈에 보이도록 제목 업데이트 (32자 이내, 예: "초기 핵심 사건 → 최신 진행/조치 상황")
   - "keywords": 필요시 최신 흐름을 반영한 키워드 3개 (쉼표 구분)

출력 JSON 형식:
{
  "has_progression": true 또는 false,
  "reason": "판단 이유 1줄 요약",
  "updated_title": "...",
  "keywords": "...",
  "new_milestones": ["..."]
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
  return extractJson(rawText);
}

async function main() {
  const args = process.argv.slice(2);
  const topicIdArg = args.find((a) => a.startsWith("--id="))?.split("=")[1];
  const stepSize = Number(args.find((a) => a.startsWith("--step="))?.split("=")[1] || 4);
  const shouldSave = args.includes("--save");

  const { token, accountId } = await resolveAuth();

  await ensureTopicsColumns(token, accountId);

  let targetTopic;
  if (topicIdArg) {
    const rows = await queryD1(
      token,
      accountId,
      `SELECT t.id, t.title, t.keywords, COUNT(nt.news_id) as article_count
       FROM topics t
       JOIN news_topics nt ON t.id = nt.topic_id
       WHERE t.id = ?
       GROUP BY t.id`,
      [Number(topicIdArg)]
    );
    targetTopic = rows[0];
  } else {
    // Pick a recent active topic with 8~20 articles that spans across multiple hours/outlets
    const candidates = await queryD1(
      token,
      accountId,
      `SELECT
         t.id,
         t.title,
         t.keywords,
         COUNT(nt.news_id) as article_count,
         COUNT(DISTINCT n.source_id) as source_count,
         ROUND((julianday(MAX(COALESCE(n.published_at, n.created_at))) - julianday(MIN(COALESCE(n.published_at, n.created_at)))) * 24, 1) as span_hours
       FROM topics t
       CROSS JOIN news_topics nt ON t.id = nt.topic_id
       CROSS JOIN news n ON nt.news_id = n.id
       WHERE t.updated_at >= datetime('now', '-7 days')
         AND t.created_at >= datetime('now', '-7 days')
       GROUP BY t.updated_at, t.id
       HAVING article_count BETWEEN 8 AND 22 AND source_count >= 3
       ORDER BY span_hours DESC, article_count DESC
       LIMIT 5`
    );

    if (!candidates.length) {
      throw new Error("시뮬레이션할 다중 기사 토픽을 찾지 못했습니다.");
    }

    console.log("\n📋 [시뮬레이션 후보 토픽 Top 5 (최근 7일)]");
    for (const c of candidates) {
      console.log(
        `  - Topic #${c.id}: "${c.title}" (기사 ${c.article_count}건, 언론사 ${c.source_count}곳, 시간폭 ${c.span_hours}시간)`
      );
    }
    targetTopic = candidates[0];
  }

  if (!targetTopic) {
    throw new Error("대상 토픽을 찾을 수 없습니다.");
  }

  const articles = await queryD1(
    token,
    accountId,
    `SELECT
       n.id,
       n.title,
       n.description,
       n.published_at,
       n.created_at,
       s.name as source_name,
       nt.similarity_score
     FROM news n
     JOIN news_topics nt ON n.id = nt.news_id
     JOIN sources s ON n.source_id = s.id
     WHERE nt.topic_id = ?
     ORDER BY COALESCE(n.published_at, n.created_at) ASC, n.id ASC`,
    [targetTopic.id]
  );

  console.log("\n================================================================================");
  console.log(`🎬 [타임머신 시뮬레이션 시작] Topic #${targetTopic.id}`);
  console.log(`   현재 DB 저장 제목 : "${targetTopic.title}"`);
  console.log(`   현재 DB 키워드    : ${targetTopic.keywords || "(없음)"}`);
  console.log(`   총 묶인 기사 수   : ${articles.length}건 (재요약 간격: +${stepSize}건마다 체크)`);
  console.log("================================================================================\n");

  // Compute embeddings for all articles in this topic to test vector evolution
  const articleTexts = articles.map((a) =>
    `${a.title} ${a.description || ""}`.substring(0, 1000)
  );
  const articleVectors = [];
  for (let i = 0; i < articleTexts.length; i += 10) {
    const chunk = articleTexts.slice(i, i + 10);
    const embRes = await runAI(token, accountId, EMBEDDING_MODEL, { text: chunk });
    articleVectors.push(...(embRes.data || []));
  }

  const seedVector = articleVectors[0]; // Current system: 1st article's vector never changes
  let evolvingVector = seedVector;

  // Step 1: First 2 articles
  const initialBatch = articles.slice(0, 2);
  console.log(`⏱️  [Step 1 | 초기 클러스터 형성] 기사 #1 ~ #2 유입`);
  for (const a of initialBatch) {
    console.log(`   📰 (${formatKstTime(a.published_at || a.created_at)} | ${a.source_name}) ${a.title}`);
  }

  const initSummary = await generateInitialSummary(token, accountId, initialBatch);
  let currentTitle = initSummary?.title || articles[0].title;
  let currentKeywords = Array.isArray(initSummary?.keywords)
    ? initSummary.keywords.join(", ")
    : initSummary?.keywords || "";
  const firstMilestoneTime = formatKstTime(
    initialBatch[initialBatch.length - 1].published_at ||
      initialBatch[initialBatch.length - 1].created_at
  );
  const milestones = [
    {
      time: firstMilestoneTime,
      text: initSummary?.first_milestone || currentTitle,
      article_count: 2,
      news_id: initialBatch[initialBatch.length - 1].id,
    },
  ];
  const titleHistory = [currentTitle];

  // Update evolving vector with initial summary + milestone
  const initVectorText = `${currentTitle} ${currentKeywords} ${milestones[0].text}`;
  const initEmb = await runAI(token, accountId, EMBEDDING_MODEL, { text: [initVectorText] });
  if (initEmb?.data?.[0]) {
    evolvingVector = initEmb.data[0];
  }

  console.log(`   ✨ [초기 생성 결과]`);
  console.log(`      • 초기 제목   : "${currentTitle}"`);
  console.log(`      • 초기 키워드 : ${currentKeywords}`);
  console.log(`      • 마일스톤 #1 : [${milestones[0].time}] ${milestones[0].text}\n`);

  let checkCount = 1;
  let appendCount = 1;
  let skipCount = 0;

  // Incremental steps
  let stepNum = 2;
  for (let idx = 2; idx < articles.length; idx += stepSize) {
    const batch = articles.slice(idx, idx + stepSize);
    const endIdx = Math.min(idx + stepSize, articles.length);
    console.log(
      `⏱️  [Step ${stepNum} | 누적 기사 ${endIdx}건] 신규 기사 #${idx + 1} ~ #${endIdx} (${batch.length}건) 유입`
    );
    for (const a of batch) {
      console.log(`   📰 (${formatKstTime(a.published_at || a.created_at)} | ${a.source_name}) ${a.title}`);
    }

    checkCount++;
    const evalResult = await evaluateIncrementalStep(
      token,
      accountId,
      currentTitle,
      currentKeywords,
      milestones,
      batch
    );

    const hasProgression = Boolean(
      evalResult?.has_progression &&
        Array.isArray(evalResult?.new_milestones) &&
        evalResult.new_milestones.length > 0
    );

    if (!hasProgression) {
      skipCount++;
      console.log(`   ⏭️  [LLM 판정: SKIP (중복/반복 보도)]`);
      console.log(`      • 사유      : ${evalResult?.reason || "기존 마일스톤과 동일한 사안의 반복 보도"}`);
      console.log(`      • 제목 유지 : "${currentTitle}"\n`);
    } else {
      appendCount++;
      const prevTitle = currentTitle;
      currentTitle = evalResult.updated_title || currentTitle;
      if (evalResult.keywords) {
        currentKeywords = Array.isArray(evalResult.keywords)
          ? evalResult.keywords.join(", ")
          : evalResult.keywords;
      }
      if (currentTitle !== prevTitle) {
        titleHistory.push(currentTitle);
      }

      const milestoneTime = formatKstTime(
        batch[batch.length - 1].published_at || batch[batch.length - 1].created_at
      );
      for (const rawM of evalResult.new_milestones) {
        const mText = cleanMilestoneText(rawM);
        if (!mText) continue;
        milestones.push({
          time: milestoneTime,
          text: mText,
          article_count: endIdx,
          news_id: batch[batch.length - 1].id,
        });
      }

      // Evolve vector by embedding title + keywords + all milestones
      const evolvedText = `${currentTitle} ${currentKeywords} ${milestones
        .map((m) => m.text)
        .join(" ")}`.substring(0, 1000);
      const evolvedEmb = await runAI(token, accountId, EMBEDDING_MODEL, {
        text: [evolvedText],
      });
      if (evolvedEmb?.data?.[0]) {
        evolvingVector = evolvedEmb.data[0];
      }

      console.log(`   ✅ [LLM 판정: APPEND (새로운 전개 감지!)]`);
      console.log(`      • 판단 사유 : ${evalResult.reason || "후속 전개 발생"}`);
      console.log(`      • 제목 진화 : "${prevTitle}"\n                 ➔ "${currentTitle}"`);
      for (const mText of evalResult.new_milestones) {
        console.log(`      • 마일스톤 추가 : + [${milestoneTime}] ${mText}`);
      }

      // Compare vector similarity on remaining future articles (if any)
      const remainingVectors = articleVectors.slice(endIdx);
      if (remainingVectors.length > 0) {
        const seedSims = remainingVectors.map((v) => cosineSimilarity(seedVector, v));
        const evolvedSims = remainingVectors.map((v) => cosineSimilarity(evolvingVector, v));
        const avgSeed = seedSims.reduce((a, b) => a + b, 0) / seedSims.length;
        const avgEvolved = evolvedSims.reduce((a, b) => a + b, 0) / evolvedSims.length;
        const minSeed = Math.min(...seedSims);
        const minEvolved = Math.min(...evolvedSims);
        const diff = avgEvolved - avgSeed;
        console.log(
          `      • 📐 후속 기사(${remainingVectors.length}건) 벡터 유사도 비교:`
        );
        console.log(
          `           - 기존(1번 기사 고정 벡터): 평균 ${avgSeed.toFixed(3)} (최저 ${minSeed.toFixed(3)})`
        );
        console.log(
          `           - 신규(누적 마일스톤 벡터): 평균 ${avgEvolved.toFixed(3)} (최저 ${minEvolved.toFixed(3)}) [${
            diff >= 0 ? "+" : ""
          }${diff.toFixed(3)}]`
        );
      }
      console.log("");
    }

    stepNum++;
  }

  console.log("================================================================================");
  console.log(`🏁 [시뮬레이션 최종 결과 요약] Topic #${targetTopic.id}`);
  console.log("--------------------------------------------------------------------------------");
  console.log(`📌 기존 1회성 제목 : "${targetTopic.title}"`);
  console.log(`🚀 진화된 최종 제목: "${currentTitle}"`);
  console.log(`🏷️  최종 키워드    : ${currentKeywords}`);
  console.log(
    `📊 LLM 체크 통계  : 총 ${checkCount}회 검사 (초기 1회 + 추가 ${appendCount - 1}회 / 중복 SKIP ${skipCount}회)`
  );
  console.log("\n📜 [완성된 이슈 타임라인 (독자에게 보여질 화면)]");
  milestones.forEach((m, i) => {
    console.log(`   ${i + 1}. [${m.time}] ${m.text} (누적 기사 ${m.article_count}건 시점)`);
  });
  console.log("================================================================================\n");

  if (shouldSave) {
    const milestonePayload = JSON.stringify({
      items: milestones,
      meta: {
        last_news_id: articles[articles.length - 1].id,
        check_count: checkCount,
        append_count: appendCount,
        skip_count: skipCount,
        title_history: titleHistory,
      },
    });
    await queryD1(
      token,
      accountId,
      `UPDATE topics SET title = ?, keywords = ?, milestones = ?, last_summarized_count = ? WHERE id = ?`,
      [currentTitle, currentKeywords, milestonePayload, articles.length, targetTopic.id]
    );
    console.log(`💾 DB 저장 완료 (--save): Topic #${targetTopic.id} 업데이트됨.\n`);
  }
}

main().catch((err) => {
  console.error("❌ 시뮬레이션 오류:", err.message);
  process.exit(1);
});
