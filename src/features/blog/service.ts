import { Env } from "../../auth";
import { parseTopicMilestones, TopicMilestonesData } from "../ai/queue";

export type BlogSlot = "morning" | "afternoon" | "evening";

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
  target_date: string; // YYYY-MM-DD or YYYY-MM-DD-slot
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
 * Returns the current KST date (YYYY-MM-DD).
 */
export function getTodayKstDate(baseDate: Date = new Date()): string {
  const kstTime = new Date(baseDate.getTime() + 9 * 3600 * 1000);
  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the target KST date (YYYY-MM-DD) for yesterday relative to execution time.
 */
export function getYesterdayKstDate(baseDate: Date = new Date()): string {
  const kstTime = new Date(baseDate.getTime() + 9 * 3600 * 1000 - 24 * 3600 * 1000);
  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Resolves which slot (morning, afternoon, evening) is active based on current KST hour.
 * - morning: 06:00 ~ 11:59 KST
 * - afternoon: 12:00 ~ 16:59 KST
 * - evening: 17:00 ~ 05:59 KST
 */
export function getCurrentKstSlot(baseDate: Date = new Date()): BlogSlot {
  const kstHour = (baseDate.getUTCHours() + 9) % 24;
  if (kstHour >= 6 && kstHour < 12) return "morning";
  if (kstHour >= 12 && kstHour < 17) return "afternoon";
  return "evening";
}

/**
 * Converts a KST date (YYYY-MM-DD) and slot into its UTC search datetime bounds.
 * morning:   looks back ~20h up to KST 09:00 (UTC 00:00)
 * afternoon: looks back ~18h up to KST 14:00 (UTC 05:00)
 * evening:   looks back ~18h up to KST 20:00 (UTC 11:00)
 */
export function getSlotUtcBounds(
  targetDateKst: string,
  slot: BlogSlot = "morning"
): { startUtc: string; endUtc: string } {
  const [y, m, d] = targetDateKst.split("-").map(Number);

  let endHourKst = 9;
  let lookbackHours = 20;

  if (slot === "afternoon") {
    endHourKst = 14;
    lookbackHours = 18;
  } else if (slot === "evening") {
    endHourKst = 20;
    lookbackHours = 18;
  }

  const endEpoch = Date.UTC(y, m - 1, d, endHourKst, 0, 0) - 9 * 3600 * 1000;
  const startEpoch = endEpoch - lookbackHours * 3600 * 1000;

  const toSqliteStr = (epoch: number) => {
    return new Date(epoch).toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
  };

  return {
    startUtc: toSqliteStr(startEpoch),
    endUtc: toSqliteStr(endEpoch),
  };
}

/**
 * Legacy full-day bounds for backwards compatibility.
 */
export function getKstDayUtcBounds(targetDateKst: string): { startUtc: string; endUtc: string } {
  const [y, m, d] = targetDateKst.split("-").map(Number);
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
 * Retrieves topic IDs covered in recent blog posts within the given lookback window.
 * Ensures non-overlapping editions across morning, afternoon, and evening.
 */
export async function getRecentCoveredTopicIds(
  db: D1Database,
  lookbackHours: number = 36
): Promise<number[]> {
  const cutoff = new Date(Date.now() - lookbackHours * 3600 * 1000)
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d+Z$/, "");

  const { results } = await db.prepare(`
    SELECT topics_data
    FROM blog_posts
    WHERE created_at >= ? OR published_at >= ?
    ORDER BY id DESC
    LIMIT 10
  `).bind(cutoff, cutoff).all<{ topics_data: string }>();

  const topicIds = new Set<number>();
  if (results) {
    for (const row of results) {
      if (!row.topics_data) continue;
      try {
        const topics = JSON.parse(row.topics_data);
        if (Array.isArray(topics)) {
          for (const t of topics) {
            if (t?.id && typeof t.id === "number") {
              topicIds.add(t.id);
            }
          }
        }
      } catch {}
    }
  }

  return Array.from(topicIds);
}

/**
 * Fetches top 3 topics for the given KST date and slot, excluding recently covered topics.
 */
export async function fetchTop3TopicsForDate(
  db: D1Database,
  targetDateKst: string,
  slot: BlogSlot = "morning",
  excludeTopicIds: number[] = []
): Promise<SelectedTopicForBlog[]> {
  const { startUtc, endUtc } = getSlotUtcBounds(targetDateKst, slot);

  let excludeSql = "";
  let bindParams: any[] = [startUtc, startUtc, endUtc, startUtc, endUtc];

  if (excludeTopicIds.length > 0) {
    const placeholders = excludeTopicIds.map(() => "?").join(", ");
    excludeSql = ` AND t.id NOT IN (${placeholders})`;
    bindParams.push(...excludeTopicIds);
  }

  // Range-bounded topic query using idx_topics_recent_full (t.updated_at >= startUtc)
  let { results: topicRows } = await db.prepare(`
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
      ${excludeSql}
    GROUP BY t.updated_at, t.id
    HAVING article_count >= 2
    ORDER BY
      (CASE WHEN t.milestones IS NOT NULL AND length(t.milestones) > 20 THEN 1 ELSE 0 END) DESC,
      article_count DESC,
      source_count DESC
    LIMIT 3;
  `).bind(...bindParams).all<{
    id: number;
    title: string;
    keywords: string | null;
    milestones: string | null;
    article_count: number;
    source_count: number;
  }>();

  // If exclusions left fewer than 3 topics, backfill with remaining top topics so post is not empty
  if ((!topicRows || topicRows.length < 3) && excludeTopicIds.length > 0) {
    const existingIds = (topicRows || []).map((t) => t.id);
    const needed = 3 - (topicRows ? topicRows.length : 0);

    const backfillPlaceholders = existingIds.length > 0
      ? ` AND t.id NOT IN (${existingIds.map(() => "?").join(", ")})`
      : "";
    const backfillParams: any[] = [startUtc, startUtc, endUtc, startUtc, endUtc, ...existingIds, needed];

    const { results: backfillRows } = await db.prepare(`
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
        ${backfillPlaceholders}
      GROUP BY t.updated_at, t.id
      HAVING article_count >= 2
      ORDER BY
        (CASE WHEN t.milestones IS NOT NULL AND length(t.milestones) > 20 THEN 1 ELSE 0 END) DESC,
        article_count DESC,
        source_count DESC
      LIMIT ?;
    `).bind(...backfillParams).all<{
      id: number;
      title: string;
      keywords: string | null;
      milestones: string | null;
      article_count: number;
      source_count: number;
    }>();

    topicRows = [...(topicRows || []), ...(backfillRows || [])];
  }

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
 * Calls Workers AI to generate an SEO-optimized Korean blog post tailored to the slot.
 */
export async function generateBlogPostWithAI(
  env: Env,
  targetDateKst: string,
  topics: SelectedTopicForBlog[],
  slot: BlogSlot = "morning"
): Promise<{ title: string; summary: string; content: string }> {
  const [year, month, day] = targetDateKst.split("-");
  const dateFormatted = `${year}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;

  const slotMeta: Record<BlogSlot, { ko: string; timeDesc: string; editorialFocus: string }> = {
    morning: {
      ko: "아침",
      timeDesc: "밤사이 및 출근 시간대",
      editorialFocus: "밤사이 누적된 주요 이슈와 오늘 하루 주목해야 할 경제·사회 핵심 사안을 신속하고 정확하게 짚어주는 출근길 브리핑",
    },
    afternoon: {
      ko: "오후",
      timeDesc: "오전부터 정오 사이",
      editorialFocus: "오전 중 속보로 터져 나온 이슈와 정오까지 이어진 각 언론사의 집중 분석 및 오후 시장 관전 포인트를 전달하는 점심 브리핑",
    },
    evening: {
      ko: "저녁",
      timeDesc: "오늘 하루 전체 및 오후 주요 흐름",
      editorialFocus: "오늘 하루를 관통한 최대 이슈들을 총결산하고 사건의 전말과 향후 파급 효과를 깊이 있게 분석하는 퇴근길 브리핑",
    },
  };

  const slotInfo = slotMeta[slot] || slotMeta.morning;

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
Your task is to write a comprehensive, highly informative, and engaging ${slotInfo.ko} news recap blog post in Korean.
Write with journalistic integrity, clear paragraph transitions, and high SEO readability.
Respond ONLY with a valid JSON object matching the requested schema.`;

  const userPrompt = `다음은 ${dateFormatted} ${slotInfo.ko} 기준 (${slotInfo.timeDesc}) 대한민국 주요 언론사들에서 가장 뜨겁게 다뤄진 상위 3대 뉴스 토픽 데이터입니다.
편집 방향: ${slotInfo.editorialFocus}.
이 데이터를 바탕으로 검색엔진 최적화(SEO)와 독자의 정보 가치를 극대화하는 깊이 있는 ${slotInfo.ko} 뉴스 브리핑 블로그 포스트를 작성하세요.

[선정된 3대 토픽 데이터]
${topicPrompts}

[작성 가이드라인]
1. **포스트 제목 (title)**:
   - **절대 제목에 날짜("${dateFormatted}")나 "아침/오후/저녁 브리핑:" 같은 접두어를 넣지 마세요.**
   - 첫 글자부터 독자들이 실제로 구글에 검색할 만한 **3대 토픽의 핵심 고유명사(인물·기업·기관·정책)와 구체적 사건 키워드**가 바로 나오도록 작성하세요.
   - 예: "제네시스 GV90 가격 공개, 은마 재초환 부담금 논란과 엔비디아 사태 핵심 분석"
   - 42자 이내 한국어, 특수기호 화살표(→) 사용 금지.
2. **요약 (summary)**:
   - 검색엔진 메타 디스크립션(meta description) 및 본문 첫머리에 들어갈 2~3문장 요약 (120~160자 내외, 핵심 고유명사 키워드 포함).
3. **본문 (content)**:
   - GitHub Flavored Markdown 형식으로 작성 (섹션 구분선 \`---\`는 사용하지 마세요).
   - 구성:
     1) **서론**: ${dateFormatted} ${slotInfo.ko} 대한민국 이슈의 전반적인 맥락과 왜 이 3가지 이슈가 중요했는지 브리핑.
     2) **토픽별 심층 분석 (3개 각각 H2 제목 포함)**:
        - H2 제목도 검색 키워드가 명확히 드러나는 구체적 헤드라인으로 작성
        - 사건 개요 및 배경
        - 시간 순서에 따른 전개 흐름 (마일스톤 활용)
        - 각 언론사들의 주요 보도 각도와 시각 차이
        - **중요 링크 삽입**: 토픽 상세 페이지 ([하이에나뉴스 토픽 타임라인 보기](https://hy3n4.news/topic/${topics[0]?.id})) 및 주요 언론사 보도 인용 링크 포함.
     3) **마무리 및 관전 포인트**: 사회·경제적 시사점과 향후 지켜볼 포인트.
     4) **하이에나뉴스 서비스 안내**: "대한민국 주요 언론사의 헤드라인과 관점을 한눈에 비교하는 [하이에나뉴스 홈 바로가기](https://hy3n4.news)" 링크 포함.

[출력 형식 가이드]
반드시 다음 태그 구분자를 사용하여 답변하세요 (JSON 형식은 사용하지 마세요):

<<<TITLE>>>
날짜/브리핑 접두어 없이 핵심 고유명사와 사건 키워드로 시작하는 제목 (42자 이내 한국어)

<<<SUMMARY>>>
검색엔진 메타 디스크립션 및 요약 (120~160자 내외 한국어)

<<<CONTENT>>>
마크다운 형식의 본문 내용 전체 (서론, 3개 토픽별 H2 심층 분석, 마무리 및 관전 포인트)
<<<END>>>`;

  const blogModel = env.BLOG_LLM_MODEL || env.LLM_MODEL || "@cf/google/gemma-4-26b-a4b-it";
  console.log(`[BLOG] Calling Workers AI (${slot} slot) with model: ${blogModel}`);

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

  const cleanBlogTitle = (t: string): string =>
    t
      .trim()
      .replace(/^["']|["']$/g, "")
      .replace(/^\d{4}년\s*\d{1,2}월\s*\d{1,2}일(?:\s*(?:아침|오후|저녁))?\s*(?:뉴스\s*)?(?:브리핑)?\s*[:\-–—]\s*/i, "")
      .replace(/^(?:아침|오후|저녁)\s*(?:뉴스\s*)?브리핑\s*[:\-–—]\s*/i, "")
      .replace(/\s*(?:→|->)\s*/g, ", ")
      .trim();

  // 1. Try Tag-based parsing (most robust for long markdown)
  const titleMatch = rawText.match(/<<<TITLE>>>\s*([\s\S]*?)\s*(?:<<<SUMMARY>>>|<<<CONTENT>>>|$)/i);
  const summaryMatch = rawText.match(/<<<SUMMARY>>>\s*([\s\S]*?)\s*(?:<<<CONTENT>>>|$)/i);
  const contentMatch = rawText.match(/<<<CONTENT>>>\s*([\s\S]*?)\s*(?:<<<END>>>|$)/i);

  if (titleMatch && contentMatch && titleMatch[1].trim() && contentMatch[1].trim()) {
    return {
      title: cleanBlogTitle(titleMatch[1]),
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
          title: cleanBlogTitle(String(parsed.title)),
          summary: String(parsed.summary || "").trim(),
          content: String(parsed.content).trim(),
        };
      }
    } catch {}
  }

  throw new Error("Failed to parse blog post from AI response (neither tag format nor valid JSON found):\n" + rawText.slice(0, 300));
}

/**
 * Publishes the blog post for the specified KST date and slot (morning, afternoon, evening).
 * Guaranteed to be idempotent and non-overlapping with prior editions.
 */
export async function publishDailyBlogPost(
  env: Env,
  targetDateOverride?: string,
  slotOverride?: BlogSlot
): Promise<{ success: boolean; slug?: string; message: string }> {
  await ensureBlogTable(env.DB);

  // Parse slot and date overrides if present
  let targetDate = targetDateOverride?.trim() || "";
  let slot: BlogSlot = slotOverride || getCurrentKstSlot();

  if (targetDate.includes("-morning")) {
    targetDate = targetDate.replace("-morning", "");
    slot = "morning";
  } else if (targetDate.includes("-afternoon")) {
    targetDate = targetDate.replace("-afternoon", "");
    slot = "afternoon";
  } else if (targetDate.includes("-evening")) {
    targetDate = targetDate.replace("-evening", "");
    slot = "evening";
  }

  if (!targetDate) {
    targetDate = getTodayKstDate();
  }

  const targetDateKey = `${targetDate}-${slot}`;
  const slug = `${targetDate}-${slot}-briefing`;

  // Check if post already exists for this slot & date
  const existing = await env.DB.prepare(
    "SELECT id, slug FROM blog_posts WHERE target_date = ? OR slug = ?"
  ).bind(targetDateKey, slug).first<{ id: number; slug: string }>();

  if (existing) {
    return {
      success: true,
      slug: existing.slug,
      message: `Blog post for ${targetDateKey} already exists (#${existing.id}, slug: ${existing.slug}).`,
    };
  }

  // 1. Fetch recently covered topic IDs from the last 36 hours to avoid duplication
  const excludedTopicIds = await getRecentCoveredTopicIds(env.DB, 36);
  console.log(`[BLOG] Excluding ${excludedTopicIds.length} recently covered topics for ${targetDateKey}: [${excludedTopicIds.join(", ")}]`);

  // 2. Fetch top 3 non-overlapping topics
  const topics = await fetchTop3TopicsForDate(env.DB, targetDate, slot, excludedTopicIds);
  if (topics.length === 0) {
    return {
      success: false,
      message: `No active topics found for ${targetDateKey}.`,
    };
  }

  console.log(`[BLOG] Generating ${slot} post for ${targetDateKey} with ${topics.length} topics: ${topics.map(t => `#${t.id}(${t.title})`).join(", ")}`);

  // 3. Generate post with AI
  const aiPost = await generateBlogPostWithAI(env, targetDate, topics, slot);

  // 4. Save to D1
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
    targetDateKey
  ).run();

  console.log(`[BLOG] Successfully published blog post: ${slug} ("${aiPost.title}")`);

  return {
    success: true,
    slug,
    message: `Successfully published blog post: ${slug}`,
  };
}
