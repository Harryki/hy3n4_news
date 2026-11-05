#!/usr/bin/env node
/**
 * Daily SEO Blog Post Generator & Manual Publisher
 *
 * Usage:
 *   npm run blog:generate
 *   node scripts/generate-blog.mjs [--date=YYYY-MM-DD] [--force]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DATABASE_ID = "15bbb429-a4bf-4c66-81fb-73ad4ea7e3ff";
const WRANGLER_CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7";
const BLOG_MODEL = "@cf/deepseek-ai/deepseek-v4.1-flash-1017";

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

function getYesterdayKstDate() {
  const kstTime = new Date(Date.now() + 9 * 3600 * 1000 - 24 * 3600 * 1000);
  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getKstDayUtcBounds(targetDateKst) {
  const [y, m, d] = targetDateKst.split("-").map(Number);
  const startEpoch = Date.UTC(y, m - 1, d, 0, 0, 0) - 9 * 3600 * 1000;
  const endEpoch = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 9 * 3600 * 1000;
  const toSqliteStr = (epoch) => new Date(epoch).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  return { startUtc: toSqliteStr(startEpoch), endUtc: toSqliteStr(endEpoch) };
}

async function ensureTable(token, accountId) {
  await queryD1(
    token,
    accountId,
    `CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      topics_data TEXT,
      target_date TEXT UNIQUE NOT NULL,
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`
  );
  await queryD1(
    token,
    accountId,
    `CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);`
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find((a) => a.startsWith("--date="))?.split("=")[1];
  const force = args.includes("--force");

  const targetDate = dateArg || getYesterdayKstDate();
  const slug = `${targetDate}-daily-briefing`;

  console.log(`\n================================================================================`);
  console.log(`✍️  [하이에나뉴스] 일일 뉴스 블로그 포스트 생성기 (${BLOG_MODEL})`);
  console.log(`   - 대상 일자 (KST): ${targetDate}`);
  console.log(`   - 슬러그 (Slug) : ${slug}`);
  console.log(`================================================================================\n`);

  const { token, accountId } = await resolveAuth();
  await ensureTable(token, accountId);

  // Check if exists
  const existing = await queryD1(
    token,
    accountId,
    `SELECT id, title, published_at FROM blog_posts WHERE target_date = ? OR slug = ?`,
    [targetDate, slug]
  );

  if (existing.length > 0 && !force) {
    console.log(`ℹ️  해당 일자(${targetDate})의 블로그 글이 이미 존재합니다 (#${existing[0].id}: "${existing[0].title}").`);
    console.log(`   덮어쓰려면 --force 옵션을 붙여 다시 실행하세요:`);
    console.log(`   node scripts/generate-blog.mjs --date=${targetDate} --force\n`);
    return;
  }

  const { startUtc, endUtc } = getKstDayUtcBounds(targetDate);
  console.log(`🔍 [1/3] ${targetDate} KST 기사 기준 상위 3대 토픽 조회 중... (UTC ${startUtc} ~ ${endUtc})`);

  const topicRows = await queryD1(
    token,
    accountId,
    `SELECT
      t.id,
      t.title,
      t.keywords,
      t.milestones,
      COUNT(nt.news_id) as article_count,
      COUNT(DISTINCT n.source_id) as source_count
    FROM topics t
    CROSS JOIN news_topics nt ON t.id = nt.topic_id
    CROSS JOIN news n ON nt.news_id = n.id
    WHERE t.updated_at >= ?
      AND (n.published_at BETWEEN ? AND ? OR n.created_at BETWEEN ? AND ?)
    GROUP BY t.updated_at, t.id
    HAVING article_count >= 2
    ORDER BY
      (CASE WHEN t.milestones IS NOT NULL AND length(t.milestones) > 20 THEN 1 ELSE 0 END) DESC,
      article_count DESC,
      source_count DESC
    LIMIT 3;`,
    [startUtc, startUtc, endUtc, startUtc, endUtc]
  );

  if (!topicRows || topicRows.length === 0) {
    console.log(`⚠️  ${targetDate}에 활동한 뉴스 토픽을 찾지 못했습니다.`);
    return;
  }

  console.log(`   ✅ 3대 토픽 선정 완료:`);
  for (let i = 0; i < topicRows.length; i++) {
    const t = topicRows[i];
    console.log(`      #${i + 1} [Topic #${t.id}] "${t.title}" (기사 ${t.article_count}건, 언론사 ${t.source_count}곳)`);
  }

  // Fetch articles for each topic
  for (const t of topicRows) {
    t.articles = await queryD1(
      token,
      accountId,
      `SELECT n.id, n.title, n.url, s.name as source_name, n.published_at, n.created_at
       FROM news_topics nt
       JOIN news n ON nt.news_id = n.id
       JOIN sources s ON n.source_id = s.id
       WHERE nt.topic_id = ?
       ORDER BY COALESCE(n.published_at, n.created_at) DESC
       LIMIT 8;`,
      [t.id]
    );
  }

  console.log(`\n🤖 [2/3] Workers AI (${BLOG_MODEL})로 SEO 블로그 칼럼 작성 요청 중...`);

  const [y, m, d] = targetDate.split("-");
  const dateFormatted = `${y}년 ${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;

  const topicPrompts = topicRows.map((t, idx) => {
    let milestonesStr = "(실시간 집계 중)";
    try {
      const parsed = JSON.parse(t.milestones);
      const items = Array.isArray(parsed) ? parsed : parsed?.items;
      if (items && items.length > 0) {
        milestonesStr = items.map((item) => `- [${item.time}] ${item.text}`).join("\n");
      }
    } catch {}

    const articleLines = (t.articles || [])
      .slice(0, 5)
      .map((a) => `- [${a.source_name}] "${a.title}" (${a.url})`)
      .join("\n");

    return `### 토픽 ${idx + 1}: ${t.title}
- 토픽 ID: ${t.id}
- 핵심 키워드: ${t.keywords || "관련 키워드 없음"}
- 총 보도 건수: ${t.article_count}건 (주요 언론사 ${t.source_count}곳 참여)
- 사건 마일스톤 타임라인:
${milestonesStr}
- 주요 기사 출처:
${articleLines}`;
  }).join("\n\n");

  const systemPrompt = `You are a professional Korean news journalist, chief editor, and SEO specialist for '하이에나뉴스' (hy3n4.news).
Your task is to write a comprehensive, highly informative, and engaging daily news recap blog post in Korean.
Write with journalistic integrity, clear paragraph transitions, and high SEO readability.
Respond ONLY with a valid JSON object matching the requested schema.`;

  const userPrompt = `다음은 ${dateFormatted} 하루 동안 대한민국 주요 언론사들에서 가장 뜨겁게 다뤄진 상위 3대 뉴스 토픽 데이터입니다.
이 데이터를 바탕으로 검색엔진 최적화(SEO)와 독자의 정보 가치를 극대화하는 깊이 있는 일일 브리핑 블로그 포스트를 작성하세요.

[선정된 3대 토픽 데이터]
${topicPrompts}

[작성 가이드라인]
1. **포스트 제목 (title)**:
   - 검색 유입에 최적화되고 클릭하고 싶은 형태 (예: "${dateFormatted} 주요 뉴스 브리핑: [토픽1 핵심]부터 [토픽2·3 요약]까지")
   - 45자 이내 한국어.
2. **요약 (summary)**:
   - 검색엔진 메타 디스크립션(meta description) 및 본문 첫머리에 들어갈 2~3문장 요약 (120~160자 내외).
3. **본문 (content)**:
   - GitHub Flavored Markdown 형식으로 작성.
   - 구성:
     1) **서론**: ${dateFormatted} 하루 대한민국 이슈의 전반적인 맥락과 왜 이 3가지 이슈가 중요했는지 브리핑.
     2) **토픽별 심층 분석 (3개 각각 H2 제목 포함)**:
        - 사건 개요 및 배경
        - 시간 순서에 따른 전개 흐름 (마일스톤 활용)
        - 각 언론사들의 주요 보도 각도와 시각 차이
        - **중요 링크 삽입**: 토픽 상세 페이지 ([하이에나뉴스 토픽 타임라인 보기](https://hy3n4.news/topic/${topicRows[0]?.id})) 및 주요 언론사 보도 인용 링크 포함.
     3) **마무리 및 내일의 관전 포인트**: 사회·경제적 시사점과 앞으로 지켜볼 포인트.
     4) **하이에나뉴스 서비스 안내**: "대한민국 주요 언론사의 헤드라인과 관점을 한눈에 비교하는 [하이에나뉴스 홈 바로가기](https://hy3n4.news)" 링크 포함.

[출력 형식 가이드]
반드시 다음 태그 구분자를 사용하여 답변하세요 (JSON 형식은 사용하지 마세요):

<<<TITLE>>>
블로그 포스트 제목 (45자 이내 한국어)

<<<SUMMARY>>>
검색엔진 메타 디스크립션 및 요약 (120~160자 내외 한국어)

<<<CONTENT>>>
마크다운 형식의 본문 내용 전체 (서론, 3개 토픽별 H2 심층 분석, 마무리 및 관전 포인트)
<<<END>>>`;

  const aiRes = await runAI(token, accountId, BLOG_MODEL, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    chat_template_kwargs: { enable_thinking: false },
  });

  let rawText =
    aiRes?.response ||
    aiRes?.choices?.[0]?.message?.content ||
    aiRes?.choices?.[0]?.message?.reasoning_content ||
    "";

  rawText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 1. Try Tag-based parsing (most robust for long markdown)
  const titleMatch = rawText.match(/<<<TITLE>>>\s*([\s\S]*?)\s*(?:<<<SUMMARY>>>|<<<CONTENT>>>|$)/i);
  const summaryMatch = rawText.match(/<<<SUMMARY>>>\s*([\s\S]*?)\s*(?:<<<CONTENT>>>|$)/i);
  const contentMatch = rawText.match(/<<<CONTENT>>>\s*([\s\S]*?)\s*(?:<<<END>>>|$)/i);

  let parsed = null;
  if (titleMatch && contentMatch && titleMatch[1].trim() && contentMatch[1].trim()) {
    parsed = {
      title: titleMatch[1].trim().replace(/^["']|["']$/g, ""),
      summary: (summaryMatch ? summaryMatch[1].trim() : "").replace(/^["']|["']$/g, ""),
      content: contentMatch[1].trim(),
    };
  } else {
    // 2. Fallback to JSON parsing if model output JSON
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const textToParse = codeBlockMatch ? codeBlockMatch[1] : rawText;
    const jsonMatch = textToParse.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        const jsonParsed = JSON.parse(jsonMatch[0]);
        if (jsonParsed.title && jsonParsed.content) {
          parsed = {
            title: String(jsonParsed.title).trim(),
            summary: String(jsonParsed.summary || "").trim(),
            content: String(jsonParsed.content).trim(),
          };
        }
      } catch {}
    }
  }

  if (!parsed || !parsed.title || !parsed.content) {
    throw new Error("AI 응답 파싱 실패 (태그 형식 및 JSON 모두 미일치):\n" + rawText.slice(0, 300));
  }
  console.log(`   ✅ 생성 완료: "${parsed.title}"`);
  console.log(`   📝 요약: ${parsed.summary}`);

  console.log(`\n💾 [3/3] D1 데이터베이스 저장 중...`);
  const topicsDataJson = JSON.stringify(
    topicRows.map((t) => ({
      id: t.id,
      title: t.title,
      keywords: t.keywords,
      article_count: t.article_count,
      source_count: t.source_count,
    }))
  );

  if (existing.length > 0 && force) {
    await queryD1(
      token,
      accountId,
      `UPDATE blog_posts SET title = ?, summary = ?, content = ?, topics_data = ?, published_at = datetime('now') WHERE slug = ?`,
      [parsed.title, parsed.summary, parsed.content, topicsDataJson, slug]
    );
    console.log(`   🔄 기존 포스트 업데이트 완료 (#${existing[0].id}, slug: ${slug})`);
  } else {
    await queryD1(
      token,
      accountId,
      `INSERT INTO blog_posts (slug, title, summary, content, topics_data, target_date, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [slug, parsed.title, parsed.summary, parsed.content, topicsDataJson, targetDate]
    );
    console.log(`   ✨ 새 블로그 포스트 등록 완료 (slug: ${slug})`);
  }

  console.log(`\n🌐 웹에서 확인:`);
  console.log(`   - 블로그 목록: https://hy3n4.news/blog`);
  console.log(`   - 해당 포스트: https://hy3n4.news/blog/${slug}`);
  console.log(`   - 사이트맵   : https://hy3n4.news/sitemap.xml\n`);
}

main().catch((err) => {
  console.error("❌ 오류 발생:", err.message);
  process.exit(1);
});
