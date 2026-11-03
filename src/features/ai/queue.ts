import { Env } from "../../auth";

export interface TopicMilestoneItem {
  time: string;
  text: string;
  article_count: number;
  news_id?: number;
}

export interface TopicMilestonesData {
  items: TopicMilestoneItem[];
  meta: {
    last_news_id: number;
    check_count: number;
    append_count: number;
    skip_count: number;
    title_history: string[];
  };
}

function formatKstTime(utcStr: string | null | undefined): string {
  if (!utcStr) return "";
  const normalized = utcStr.endsWith("Z") ? utcStr : utcStr.replace(" ", "T") + "Z";
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return String(utcStr).slice(0, 16);
  const kst = new Date(d.getTime() + 9 * 3600 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const min = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

function cleanMilestoneText(raw: string): string {
  return String(raw || "")
    .replace(/^\s*(?:\[\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\]\s*)+/, "")
    .replace(/^\s*\d+\.\s*/, "")
    .trim();
}

export function parseTopicMilestones(raw: string | null | undefined): TopicMilestonesData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return {
        items: parsed,
        meta: {
          last_news_id: 0,
          check_count: 1,
          append_count: 1,
          skip_count: 0,
          title_history: [],
        },
      };
    }
    if (parsed && Array.isArray(parsed.items)) {
      return {
        items: parsed.items,
        meta: {
          last_news_id: parsed.meta?.last_news_id || 0,
          check_count: parsed.meta?.check_count || 1,
          append_count: parsed.meta?.append_count || 1,
          skip_count: parsed.meta?.skip_count || 0,
          title_history: Array.isArray(parsed.meta?.title_history) ? parsed.meta.title_history : [],
        },
      };
    }
  } catch {}
  return null;
}

function extractJsonObject(rawText: string): any | null {
  if (!rawText) return null;
  const match = rawText.trim().match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function processNewsQueue(messages: any[], env: Env): Promise<void> {
  console.log(`[QUEUE] Received batch of ${messages.length} messages`);

  const newsIds = messages
    .flatMap((m) => m.body?.news_ids ?? [])
    .filter((id): id is number => typeof id === "number");
  console.log(`[QUEUE] Total newsIds after flatten: ${newsIds.length}`);

  if (newsIds.length === 0) return;

  const BATCH_SIZE = 100;
  const unclustered: any[] = [];
  for (let i = 0; i < newsIds.length; i += BATCH_SIZE) {
    const batch = newsIds.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => "?").join(",");
    const { results } = await env.DB.prepare(`
        SELECT id, title, description
        FROM news
        WHERE id IN (${placeholders})
        `).bind(...batch).all();
    unclustered.push(...results);
  }
  if (!unclustered || unclustered.length === 0) return;

  console.log(`[QUEUE] Processing ${unclustered.length} articles for clustering...`);
  let clusteredCount = 0;
  let newTopicCount = 0;
  const topicsToCheck = new Set<number>();

  // 1. Generate Embeddings (in smaller chunks to avoid Network Connection Lost)
  const textsToEmbed = unclustered.map((item) =>
    `${item.title} ${item.description || ""}`.substring(0, 1000)
  );

  let vectors: any[] = [];
  const EMBED_CHUNK_SIZE = 10;
  for (let i = 0; i < textsToEmbed.length; i += EMBED_CHUNK_SIZE) {
    const chunk = textsToEmbed.slice(i, i + EMBED_CHUNK_SIZE);
    const embedRes = await env.AI.run(env.EMBEDDING_MODEL, { text: chunk });
    vectors = vectors.concat(embedRes.data);
  }

  // 2. Process each item (Clustering)
  for (let i = 0; i < unclustered.length; i++) {
    const item = unclustered[i];
    const vector = vectors[i];

    // Search Vectorize (fetch topK: 5 to allow filtering out topics older than 10 days)
    const searchRes = await env.VECTORIZE.query(vector, { topK: 5 });
    const matches = searchRes.matches.filter((m: any) => m.score > 0.65);

    let mappedToExisting = false;

    if (matches.length > 0) {
      // Map to existing topics created within the last 10 days (up to 3)
      let mappedForThisItem = 0;
      for (const match of matches) {
        if (mappedForThisItem >= 3) break;
        const topicId = parseInt(match.id, 10);
        try {
          const validTopic = await env.DB.prepare(
            "UPDATE topics SET updated_at = datetime('now') WHERE id = ? AND created_at >= datetime('now', '-10 days') RETURNING id"
          ).bind(topicId).first<{ id: number }>();

          if (!validTopic) {
            continue;
          }

          await env.DB.prepare(
            "INSERT INTO news_topics (news_id, topic_id, similarity_score) VALUES (?, ?, ?)"
          ).bind(item.id, topicId, match.score).run();

          clusteredCount++;
          mappedForThisItem++;
          mappedToExisting = true;
          topicsToCheck.add(topicId);
        } catch (e: any) {
          console.error(`[QUEUE] CLUSTER topics error (News: ${item.id}, Topic: ${topicId}):`, e.message);
        }
      }
    }

    if (!mappedToExisting) {
      // Create new topic
      const newTopic = await env.DB.prepare(
        "INSERT INTO topics (title) VALUES (?) RETURNING id"
      ).bind(item.title).first<{ id: number }>();

      if (newTopic) {
        try {
          await env.DB.prepare(
            "INSERT INTO news_topics (news_id, topic_id, similarity_score) VALUES (?, ?, ?)"
          ).bind(item.id, newTopic.id, 1.0).run();

          await env.VECTORIZE.insert([
            {
              id: newTopic.id.toString(),
              values: vector,
            },
          ]);
          newTopicCount++;
        } catch (e: any) {
          console.error(`[QUEUE] NEW topic error (News: ${item.id}, Topic: ${newTopic.id}):`, e.message);
          throw e;
        }
      }
    }
  }

  console.log(`[QUEUE] Clustering complete. Mapped: ${clusteredCount}, New topics: ${newTopicCount}`);

  // 3. Initial Summarization & Incremental Milestone Evolution
  if (topicsToCheck.size > 0) {
    const topicIdList = Array.from(topicsToCheck);
    const topicPlaceholders = topicIdList.map(() => "?").join(",");
    const { results: candidateTopics } = await env.DB.prepare(`
      SELECT
        t.id,
        t.title,
        t.keywords,
        t.milestones,
        COALESCE(t.last_summarized_count, 0) as last_summarized_count,
        COUNT(nt.news_id) as article_count
      FROM topics t
      JOIN news_topics nt ON t.id = nt.topic_id
      WHERE t.id IN (${topicPlaceholders})
      GROUP BY t.id
      HAVING
        (t.keywords IS NULL AND COUNT(nt.news_id) >= 2)
        OR
        (t.keywords IS NOT NULL AND (COUNT(nt.news_id) - COALESCE(t.last_summarized_count, 0)) >= 4)
    `).bind(...topicIdList).all<{
      id: number;
      title: string;
      keywords: string | null;
      milestones: string | null;
      last_summarized_count: number;
      article_count: number;
    }>();

    if (candidateTopics && candidateTopics.length > 0) {
      console.log(`[QUEUE] Found ${candidateTopics.length} topics for initial/incremental milestone check.`);

      for (const topic of candidateTopics) {
        try {
          const { results: articles } = await env.DB.prepare(`
            SELECT
              n.id,
              n.title,
              n.description,
              n.published_at,
              n.created_at,
              s.name as source_name
            FROM news n
            JOIN news_topics nt ON n.id = nt.news_id
            JOIN sources s ON n.source_id = s.id
            WHERE nt.topic_id = ?
            ORDER BY COALESCE(n.published_at, n.created_at) ASC, n.id ASC
          `).bind(topic.id).all<{
            id: number;
            title: string;
            description: string | null;
            published_at: string | null;
            created_at: string;
            source_name: string;
          }>();

          if (!articles || articles.length < 2) continue;

          const existingData = parseTopicMilestones(topic.milestones);

          if (!existingData || existingData.items.length === 0) {
            // --- CASE A: Initial Milestone Creation (or backfill for topic without milestones) ---
            const recentSlice = articles.slice(-12);
            const articleLines = recentSlice
              .map(
                (a, idx) =>
                  `[${idx + 1}] (${formatKstTime(a.published_at || a.created_at)} | ${a.source_name}) ${a.title}${
                    a.description ? ` - ${String(a.description).slice(0, 100)}` : ""
                  }`
              )
              .join("\n");

            const aiResponse = (await env.AI.run(env.LLM_MODEL, {
              messages: [
                {
                  role: "system",
                  content:
                    "You are a professional Korean news editor. Respond ONLY with a valid JSON object.",
                },
                {
                  role: "user",
                  content: `다음 시간순 뉴스 기사들을 읽고 토픽의 대표 제목(28자 이내 한국어), 핵심 키워드 3개, 그리고 사건의 시간순 핵심 마일스톤(1~3개, 각 45자 이내, 시간 표기 제외)을 작성하세요.

기사 목록:
${articleLines}

출력 JSON 형식:
{
  "title": "사건 핵심 제목 (진행 흐름이 있다면 '초기 사건 → 현재 상황' 형태, 28자 이내)",
  "keywords": "키워드1, 키워드2, 키워드3",
  "milestones": ["핵심 사실 요약 (시간 제외 45자 이내)"]
}`,
                },
              ],
              max_tokens: 768,
              chat_template_kwargs: { enable_thinking: false },
            })) as any;

            const rawText: string =
              aiResponse?.response ||
              aiResponse?.choices?.[0]?.message?.content ||
              aiResponse?.choices?.[0]?.message?.reasoning_content ||
              "";
            const parsed = extractJsonObject(rawText);

            if (parsed?.title && parsed?.keywords) {
              const keywordString = Array.isArray(parsed.keywords)
                ? parsed.keywords.join(", ")
                : String(parsed.keywords);
              const rawMilestones: string[] = Array.isArray(parsed.milestones)
                ? parsed.milestones
                : parsed.first_milestone
                ? [parsed.first_milestone]
                : [parsed.title];

              const latestTime = formatKstTime(
                articles[articles.length - 1].published_at || articles[articles.length - 1].created_at
              );
              const firstTime = formatKstTime(articles[0].published_at || articles[0].created_at);

              const items: TopicMilestoneItem[] = rawMilestones
                .map((m, idx) => ({
                  time: idx === 0 ? firstTime : latestTime,
                  text: cleanMilestoneText(m),
                  article_count: articles.length,
                  news_id: articles[articles.length - 1].id,
                }))
                .filter((m) => m.text.length > 0);

              const milestoneData: TopicMilestonesData = {
                items,
                meta: {
                  last_news_id: articles[articles.length - 1].id,
                  check_count: 1,
                  append_count: 1,
                  skip_count: 0,
                  title_history: [parsed.title],
                },
              };

              await env.DB.prepare(
                "UPDATE topics SET title = ?, keywords = ?, milestones = ?, last_summarized_count = ? WHERE id = ?"
              )
                .bind(
                  parsed.title,
                  keywordString,
                  JSON.stringify(milestoneData),
                  articles.length,
                  topic.id
                )
                .run();

              // Evolve topic vector in Vectorize
              const evolvedText = `${parsed.title} ${keywordString} ${items
                .map((m) => m.text)
                .join(" ")}`.substring(0, 1000);
              const embRes = await env.AI.run(env.EMBEDDING_MODEL, { text: [evolvedText] });
              if (embRes?.data?.[0]) {
                await env.VECTORIZE.upsert([
                  {
                    id: topic.id.toString(),
                    values: embRes.data[0],
                  },
                ]);
              }

              console.log(
                `[QUEUE] Topic ${topic.id} initialized (${articles.length} articles): ${parsed.title}`
              );
            }
          } else {
            // --- CASE B: Incremental Milestone Evaluation (Compare existing milestones vs new articles) ---
            const startIdx = Math.max(0, Math.min(topic.last_summarized_count, articles.length - 1));
            const newArticles = articles.slice(startIdx);
            if (newArticles.length === 0) continue;

            const existingMilestoneText = existingData.items
              .map((m, idx) => `${idx + 1}. (${m.time}) ${m.text}`)
              .join("\n");

            const newArticleText = newArticles
              .slice(-10)
              .map(
                (a) =>
                  `- (${formatKstTime(a.published_at || a.created_at)} | ${a.source_name}) ${a.title}${
                    a.description ? ` : ${String(a.description).slice(0, 100)}` : ""
                  }`
              )
              .join("\n");

            const aiResponse = (await env.AI.run(env.LLM_MODEL, {
              messages: [
                {
                  role: "system",
                  content:
                    "You are a strict Korean news timeline editor. Respond ONLY with a valid JSON object.",
                },
                {
                  role: "user",
                  content: `현재 뉴스 토픽의 기존 타임라인 마일스톤과, 방금 새로 유입된 기사들을 비교하세요.

[현재 토픽 제목]: ${topic.title}
[현재 키워드]: ${topic.keywords || ""}
[기존 타임라인 마일스톤]:
${existingMilestoneText}

[새로 유입된 기사들]:
${newArticleText}

판단 규칙:
1. 새 기사들이 이미 [기존 타임라인 마일스톤]에 기록된 사실의 단순 반복 보도(타 언론사의 동일 내용 보도)이거나 지엽적인 내용뿐이라면:
   - "has_progression": false
   - "new_milestones": []
   - "updated_title": "${topic.title}"
2. 기존 마일스톤 이후에 **새로운 사실, 후속 조치, 공식 입장/반박, 구체적 수치/피해 규모 변화, 수사/정책 진전** 등 사건의 의미 있는 전개가 있다면:
   - "has_progression": true
   - "new_milestones": 새로 진전된 핵심 사실만 1~2개 문장(각 45자 이내, 날짜/시간 표기 제외)으로 배열에 작성
   - "updated_title": 사건의 처음과 최신 진행 상황이 한눈에 보이도록 제목 업데이트 (32자 이내, 예: "초기 핵심 사건 → 최신 진행/조치 상황")
   - "keywords": 최신 흐름을 반영한 키워드 3개 (쉼표 구분)

출력 JSON 형식:
{
  "has_progression": true,
  "updated_title": "...",
  "keywords": "...",
  "new_milestones": ["..."]
}`,
                },
              ],
              max_tokens: 768,
              chat_template_kwargs: { enable_thinking: false },
            })) as any;

            const rawText: string =
              aiResponse?.response ||
              aiResponse?.choices?.[0]?.message?.content ||
              aiResponse?.choices?.[0]?.message?.reasoning_content ||
              "";
            const parsed = extractJsonObject(rawText);

            const cleanedNewMilestones: string[] = Array.isArray(parsed?.new_milestones)
              ? parsed.new_milestones.map(cleanMilestoneText).filter((t: string) => t.length > 0)
              : [];

            const hasProgression = Boolean(
              parsed?.has_progression && cleanedNewMilestones.length > 0
            );

            existingData.meta.check_count = (existingData.meta.check_count || 1) + 1;
            existingData.meta.last_news_id = articles[articles.length - 1].id;

            if (!hasProgression) {
              existingData.meta.skip_count = (existingData.meta.skip_count || 0) + 1;
              await env.DB.prepare(
                "UPDATE topics SET milestones = ?, last_summarized_count = ? WHERE id = ?"
              )
                .bind(JSON.stringify(existingData), articles.length, topic.id)
                .run();

              console.log(
                `[QUEUE] Topic ${topic.id} incremental check -> SKIP (no new progression, ${articles.length} articles)`
              );
            } else {
              existingData.meta.append_count = (existingData.meta.append_count || 1) + 1;
              const updatedTitle = parsed.updated_title || topic.title;
              const updatedKeywords = parsed.keywords
                ? Array.isArray(parsed.keywords)
                  ? parsed.keywords.join(", ")
                  : String(parsed.keywords)
                : topic.keywords || "";

              if (
                updatedTitle &&
                existingData.meta.title_history[existingData.meta.title_history.length - 1] !==
                  updatedTitle
              ) {
                existingData.meta.title_history.push(updatedTitle);
              }

              const milestoneTime = formatKstTime(
                newArticles[newArticles.length - 1].published_at ||
                  newArticles[newArticles.length - 1].created_at
              );

              for (const mText of cleanedNewMilestones) {
                existingData.items.push({
                  time: milestoneTime,
                  text: mText,
                  article_count: articles.length,
                  news_id: newArticles[newArticles.length - 1].id,
                });
              }

              await env.DB.prepare(
                "UPDATE topics SET title = ?, keywords = ?, milestones = ?, last_summarized_count = ? WHERE id = ?"
              )
                .bind(
                  updatedTitle,
                  updatedKeywords,
                  JSON.stringify(existingData),
                  articles.length,
                  topic.id
                )
                .run();

              // Upsert evolved vector in Vectorize so follow-up articles keep matching
              const evolvedText = `${updatedTitle} ${updatedKeywords} ${existingData.items
                .map((m) => m.text)
                .join(" ")}`.substring(0, 1000);
              const embRes = await env.AI.run(env.EMBEDDING_MODEL, { text: [evolvedText] });
              if (embRes?.data?.[0]) {
                await env.VECTORIZE.upsert([
                  {
                    id: topic.id.toString(),
                    values: embRes.data[0],
                  },
                ]);
              }

              console.log(
                `[QUEUE] Topic ${topic.id} incremental check -> APPEND (+${cleanedNewMilestones.length} milestones): ${updatedTitle}`
              );
            }
          }
        } catch (e: any) {
          console.error(`[QUEUE] AI Error for topic ${topic.id}:`, e.message);
        }
      }
    }
  }
}
