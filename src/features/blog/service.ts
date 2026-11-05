import { Env } from "../../auth";
import { parseTopicMilestones, TopicMilestonesData } from "../ai/queue";

export interface SelectedTopicForBlog {
  id: number;
  title: string;
  keywords: string | null;
  milestones: string | null;
  article_count: number;
  source_count: number;
  articles: Array<{
    id: number;
    title: string;
    url: string;
    source_name: string;
    published_at: string | null;
    created_at: string;
  }>;
}

export interface BlogPostRecord {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  topics_data: string; // JSON string
  target_date: string; // YYYY-MM-DD
  published_at: string;
  created_at: string;
}

/**
 * Ensures blog_posts table and indexes exist in D1.
 */
export async function ensureBlogTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content TEXT NOT NULL,
      topics_data TEXT,
      target_date TEXT UNIQUE NOT NULL,
      published_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);
  `).run();
}

/**
 * Returns the target KST date (YYYY-MM-DD) for yesterday relative to execution time.
 * If running at 00:00 UTC (09:00 KST), 'yesterday' is the full day that just ended in KST.
 */
export function getYesterdayKstDate(baseDate: Date = new Date()): string {
  // Add 9 hours to get KST time, then subtract 24 hours to get yesterday in KST
  const kstTime = new Date(baseDate.getTime() + 9 * 3600 * 1000 - 24 * 3600 * 1000);
  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converts a KST date (YYYY-MM-DD) into its UTC start and end datetime bounds.
 * e.g. 2026-11-03 KST 00:00:00 = 2026-11-02 15:00:00 UTC
 *      2026-11-03 KST 23:59:59 = 2026-11-03 14:59:59 UTC
 */
export function getKstDayUtcBounds(targetDateKst: string): { startUtc: string; endUtc: string } {
  const [y, m, d] = targetDateKst.split("-").map(Number);
  // KST is UTC+9. 00:00:00 KST on YYYY-MM-DD corresponds to YYYY-MM-(DD-1) 15:00:00 UTC
  const startEpoch = Date.UTC(y, m - 1, d, 0, 0, 0) - 9 * 3600 * 1000;
  const endEpoch = Date.UTC(y, m - 1, d, 23, 59, 59, 999) - 9 * 3600 * 1000;

  const toSqliteStr = (epoch: number) => {
    return new Date(epoch).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  };

  return {
    startUtc: toSqliteStr(startEpoch),
    endUtc: toSqliteStr(endEpoch),
  };
}

/**
 * Fetches top 3 topics for the given KST date with index range search.
 */
export async function fetchTop3TopicsForDate(
  db: D1Database,
  targetDateKst: string
): Promise<SelectedTopicForBlog[]> {
  const { startUtc, endUtc } = getKstDayUtcBounds(targetDateKst);

  // Range-bounded topic query using idx_topics_recent_full (t.updated_at >= startUtc)
  // Topics must have articles published during the target date window.
  const { results: topicRows } = await db.prepare(`
    SELECT
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
    LIMIT 3;
  `).bind(startUtc, startUtc, endUtc, startUtc, endUtc).all<{
    id: number;
    title: string;
    keywords: string | null;
    milestones: string | null;
    article_count: number;
    source_count: number;
  }>();

  if (!topicRows || topicRows.length === 0) {
    return [];
  }

  // Fetch top articles for each topic
  const selected: SelectedTopicForBlog[] = [];
  for (const row of topicRows) {
    const { results: articles } = await db.prepare(`
      SELECT
        n.id,
        n.title,
        n.url,
        s.name as source_name,
        n.published_at,
        n.created_at
      FROM news_topics nt
      JOIN news n ON nt.news_id = n.id
      JOIN sources s ON n.source_id = s.id
      WHERE nt.topic_id = ?
      ORDER BY COALESCE(n.published_at, n.created_at) DESC
      LIMIT 8;
    `).bind(row.id).all<{
      id: number;
      title: string;
      url: string;
      source_name: string;
      published_at: string | null;
      created_at: string;
    }>();

    selected.push({
      ...row,
      articles: articles ?? [],
    });
  }

  return selected;
}

/**
 * Calls Workers AI to generate an SEO-optimized Korean blog post.
 */
export async function generateBlogPostWithAI(
  env: Env,
  targetDateKst: string,
  topics: SelectedTopicForBlog[]
): Promise<{ title: string; summary: string; content: string }> {
  const [year, month, day] = targetDateKst.split("-");
  const dateFormatted = `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;

  const topicPrompts = topics.map((t, idx) => {
    const mData = parseTopicMilestones(t.milestones);
    const milestonesStr = mData?.items && mData.items.length > 0
      ? mData.items.map((m) => `- [${m.time}] ${m.text}`).join("\n")
      : "(실시간 집계 중)";

    const articleLines = t.articles
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
        - **중요 링크 삽입**: 토픽 상세 페이지 ([하이에나뉴스 토픽 타임라인 보기](https://hy3n4.news/topic/${topics[0]?.id})) 및 주요 언론사 보도 인용 링크 포함.
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

  const blogModel = env.BLOG_LLM_MODEL || env.LLM_MODEL || "@cf/google/gemma-4-26b-a4b-it";
  console.log(`[BLOG] Calling Workers AI with model: ${blogModel}`);

  const aiRes = (await env.AI.run(blogModel, {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    chat_template_kwargs: { enable_thinking: false },
  })) as any;

  let rawText: string =
    aiRes?.response ||
    aiRes?.choices?.[0]?.message?.content ||
    aiRes?.choices?.[0]?.message?.reasoning_content ||
    "";

  // Strip <think> tags if present in reasoning/deepseek models
  rawText = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // 1. Try Tag-based parsing (most robust for long markdown)
  const titleMatch = rawText.match(/<<<TITLE>>>\s*([\s\S]*?)\s*(?:<<<SUMMARY>>>|<<<CONTENT>>>|$)/i);
  const summaryMatch = rawText.match(/<<<SUMMARY>>>\s*([\s\S]*?)\s*(?:<<<CONTENT>>>|$)/i);
  const contentMatch = rawText.match(/<<<CONTENT>>>\s*([\s\S]*?)\s*(?:<<<END>>>|$)/i);

  if (titleMatch && contentMatch && titleMatch[1].trim() && contentMatch[1].trim()) {
    return {
      title: titleMatch[1].trim().replace(/^["']|["']$/g, ""),
      summary: (summaryMatch ? summaryMatch[1].trim() : "").replace(/^["']|["']$/g, ""),
      content: contentMatch[1].trim(),
    };
  }

  // 2. Fallback to JSON parsing if model output JSON
  const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const textToParse = codeBlockMatch ? codeBlockMatch[1] : rawText;
  const jsonMatch = textToParse.match(/\{[\s\S]*\}/);

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title && parsed.content) {
        return {
          title: String(parsed.title).trim(),
          summary: String(parsed.summary || "").trim(),
          content: String(parsed.content).trim(),
        };
      }
    } catch {}
  }

  throw new Error("Failed to parse blog post from AI response (neither tag format nor valid JSON found):\n" + rawText.slice(0, 300));
}

/**
 * Publishes the daily blog post for the specified KST date (defaults to yesterday).
 * Guaranteed to be idempotent (skips if post for target_date already exists).
 */
export async function publishDailyBlogPost(
  env: Env,
  targetDateOverride?: string
): Promise<{ success: boolean; slug?: string; message: string }> {
  await ensureBlogTable(env.DB);

  const targetDate = targetDateOverride || getYesterdayKstDate();
  const slug = `${targetDate}-daily-briefing`;

  // Check if post already exists for this target date
  const existing = await env.DB.prepare(
    "SELECT id, slug FROM blog_posts WHERE target_date = ? OR slug = ?"
  ).bind(targetDate, slug).first<{ id: number; slug: string }>();

  if (existing) {
    return {
      success: true,
      slug: existing.slug,
      message: `Blog post for ${targetDate} already exists (#${existing.id}, slug: ${existing.slug}).`,
    };
  }

  // Fetch top 3 topics
  const topics = await fetchTop3TopicsForDate(env.DB, targetDate);
  if (topics.length === 0) {
    return {
      success: false,
      message: `No active topics found for ${targetDate}.`,
    };
  }

  console.log(`[BLOG] Generating daily post for ${targetDate} with ${topics.length} topics...`);

  // Generate post with AI
  const aiPost = await generateBlogPostWithAI(env, targetDate, topics);

  // Save to D1
  const topicsDataJson = JSON.stringify(
    topics.map((t) => ({
      id: t.id,
      title: t.title,
      keywords: t.keywords,
      article_count: t.article_count,
      source_count: t.source_count,
    }))
  );

  await env.DB.prepare(`
    INSERT INTO blog_posts (slug, title, summary, content, topics_data, target_date, published_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    slug,
    aiPost.title,
    aiPost.summary,
    aiPost.content,
    topicsDataJson,
    targetDate
  ).run();

  console.log(`[BLOG] Successfully published blog post: ${slug} ("${aiPost.title}")`);

  return {
    success: true,
    slug,
    message: `Successfully published blog post: ${slug}`,
  };
}
