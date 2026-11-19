import { Router } from "../../core/router";
import { Env } from "../../auth";
import {
  isAuthorizedCronRequest,
  sendQueueWithRetry,
} from "../../core/utils";

export const aiRouter = new Router();

export interface HybridSearchResult {
  topics: any[];
  newsByTopic: Record<number, any[]>;
  hasMore: boolean;
}

/**
 * Shared Hybrid Topic Search (Semantic Vectorize + Keyword LIKE + Latest fallback).
 * Used by both GET /search (full SSR page) and GET /api/search (JSON API).
 */
export async function searchTopicsHybrid(
  env: Env,
  query: string | null,
  page: number = 1,
  pageSize: number = 20,
  sortByArticleCount: boolean = false
): Promise<HybridSearchResult> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const offset = (safePage - 1) * pageSize;
  const q = query?.trim() || null;

  let rawTopics: any[] = [];

  if (q) {
    // 1. Embed query for semantic search
    const embedRes = await env.AI.run(env.EMBEDDING_MODEL, { text: [q] });
    const vector = embedRes.data[0];

    // 2. Vectorize semantic search
    const semanticRes = await env.VECTORIZE.query(vector, { topK: 20, returnMetadata: "none" });
    const semanticIds = semanticRes.matches
      .filter((m: any) => m.score > 0.5)
      .map((m: any) => parseInt(m.id, 10));

    // 3. Hybrid query: semantic IDs + keyword LIKE in one D1 query (with pagination)
    const semanticPlaceholders =
      semanticIds.length > 0 ? semanticIds.map(() => "?").join(",") : null;

    const whereClause = semanticPlaceholders
      ? `t.id IN (${semanticPlaceholders}) OR (t.updated_at >= datetime('now', '-14 days') AND (t.title LIKE ? OR t.keywords LIKE ?))`
      : `t.updated_at >= datetime('now', '-14 days') AND (t.title LIKE ? OR t.keywords LIKE ?)`;

    const bindParams = semanticPlaceholders
      ? [...semanticIds, `%${q}%`, `%${q}%`, pageSize + 1, offset]
      : [`%${q}%`, `%${q}%`, pageSize + 1, offset];

    const { results } = await env.DB.prepare(`
      SELECT t.id, t.title, t.keywords, t.updated_at,
             MAX(t.last_summarized_count, 1) as article_count
      FROM topics t
      WHERE ${whereClause}
      ORDER BY t.updated_at DESC
      LIMIT ? OFFSET ?
    `)
      .bind(...bindParams)
      .all();

    rawTopics = results || [];
  } else {
    // Latest summarized topics when no query is provided
    const { results } = await env.DB.prepare(`
      SELECT t.id, t.title, t.keywords, t.updated_at,
             MAX(t.last_summarized_count, 1) as article_count
      FROM topics t
      WHERE t.last_summarized_count >= 2
      ORDER BY t.updated_at DESC
      LIMIT ? OFFSET ?
    `)
      .bind(pageSize + 1, offset)
      .all();

    rawTopics = results || [];
  }

  const hasMore = rawTopics.length > pageSize;
  const topics = hasMore ? rawTopics.slice(0, pageSize) : rawTopics;

  const newsByTopic: Record<number, any[]> = {};
  if (topics.length > 0) {
    const topicIds = topics.map((t) => t.id);
    const newsPlaceholders = topicIds.map(() => "?").join(",");
    const { results: news } = await env.DB.prepare(`
      SELECT n.id, n.title, n.url, n.published_at, n.created_at, s.name as source_name, nt.topic_id
      FROM news n
      JOIN sources s ON n.source_id = s.id
      JOIN news_topics nt ON n.id = nt.news_id
      WHERE nt.topic_id IN (${newsPlaceholders})
      ORDER BY COALESCE(n.published_at, n.created_at) DESC
    `)
      .bind(...topicIds)
      .all();

    for (const item of news ?? []) {
      const tid = item.topic_id as number;
      if (!newsByTopic[tid]) newsByTopic[tid] = [];
      if (newsByTopic[tid].length < 5) {
        newsByTopic[tid].push(item);
      }
    }

    if (sortByArticleCount) {
      topics.sort((a, b) => ((b.article_count as number) || 0) - ((a.article_count as number) || 0));
    }
  }

  return { topics, newsByTopic, hasMore };
}

// --- GET /api/search : Hybrid Topic Search JSON API (Semantic + Keyword) ---
aiRouter.get("/api/search", async (request, env) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || null;
  const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const { topics, newsByTopic, hasMore } = await searchTopicsHybrid(env, q, page, 20, Boolean(q));

  const payload = {
    query: q,
    page,
    has_more: hasMore,
    topics: topics.map((t: any) => ({
      id: t.id,
      title: t.title,
      keywords: t.keywords
        ? String(t.keywords)
            .split(",")
            .map((k: string) => k.trim())
            .filter(Boolean)
        : [],
      article_count: t.article_count || 0,
      updated_at: t.updated_at,
      url: `https://hy3n4.news/topic/${t.id}`,
      articles: (newsByTopic[t.id] || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        source_name: n.source_name,
        published_at: n.published_at || n.created_at,
        url: n.url,
      })),
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

aiRouter.get("/___force-ai-update", async (request, env) => {
  if (!isAuthorizedCronRequest(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const { results: unclustered } = await env.DB.prepare(`
      SELECT n.id
      FROM news n
      LEFT JOIN news_topics nt ON n.id = nt.news_id
      WHERE nt.news_id IS NULL
      ORDER BY n.created_at DESC
      LIMIT 100
    `).all<{ id: number }>();

    if (unclustered && unclustered.length > 0 && env.NEWS_PROCESSING_QUEUE) {
      await sendQueueWithRetry(env.NEWS_PROCESSING_QUEUE, {
        news_ids: unclustered.map((item) => item.id),
      });
      return new Response(`Queued ${unclustered.length} articles for processing.`, { status: 200 });
    }

    return new Response("No unclustered articles found to process.", { status: 200 });
  } catch (error: any) {
    return new Response("Failed: " + error.message, { status: 500 });
  }
});

// --- GET /debug/vector : Protected Dev Debugging Route ---
aiRouter.get(/^\/debug\/vector/, async (request, env) => {
  if (!isAuthorizedCronRequest(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  if (!q) return new Response("Provide ?q=TEXT to query vectorize", { status: 400 });

  const embedRes = await env.AI.run(env.EMBEDDING_MODEL, { text: [q] });
  const vector = embedRes.data[0];

  const searchRes = await env.VECTORIZE.query(vector, { topK: 10 });
  const matches = searchRes.matches || [];
  const topicIds = matches.map((m: any) => parseInt(m.id, 10)).filter(Number.isFinite);

  const titleById = new Map<number, string>();
  if (topicIds.length > 0) {
    const placeholders = topicIds.map(() => "?").join(",");
    const { results: topicRows } = await env.DB.prepare(
      `SELECT id, title FROM topics WHERE id IN (${placeholders})`
    )
      .bind(...topicIds)
      .all<{ id: number; title: string }>();
    for (const row of topicRows ?? []) {
      titleById.set(row.id, row.title);
    }
  }

  const results = matches.map((match: any) => {
    const tid = parseInt(match.id, 10);
    return {
      score: match.score,
      topicId: match.id,
      title: titleById.get(tid) || "Unknown",
    };
  });

  return new Response(JSON.stringify({ query: q, results }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});
