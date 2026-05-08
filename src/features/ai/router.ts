import { Router } from "../../core/router";
import { Env } from "../../auth";
import { getRelativeTime } from "../../core/utils";

export const aiRouter = new Router();

// --- Search Results HTML Rendering ---

function renderSearchEmpty(query: string): string {
  return `
        <div class="search-results-container">
            <div class="search-results-header">
                <span>"<strong>${escapeHtml(query)}</strong>" 검색 결과가 없습니다</span>
                <button onclick="document.getElementById('search-results').innerHTML=''" class="search-close-btn">✕</button>
            </div>
            <p style="padding: 20px; color: #828282; text-align: center;">다른 키워드로 검색해보세요.</p>
        </div>`;
}

function renderTopicGroups(topics: any[], newsByTopic: Record<number, any[]>): string {
  let html = '';
  for (const topic of topics) {
    const topicNews = newsByTopic[topic.id as number] || [];
    const updateTimeStr = topic.updated_at ? getRelativeTime(topic.updated_at, topic.updated_at) : '';
    const articleCount = topic.article_count || 0;
    const countStr = articleCount > 0 ? `(기사 ${articleCount}개) · ` : '';
    const updateInfo = (countStr || updateTimeStr) ? `<span class="search-news-meta" style="margin-left: 8px;">${countStr}마지막 업데이트: ${updateTimeStr}</span>` : '';

    html += `
            <div class="search-topic-group">
                <a href="/topic/${topic.id}" class="search-topic-title">${escapeHtml(topic.title as string)}</a>
                ${updateInfo}
                ${topic.keywords ? `<span class="search-topic-keywords">#${(topic.keywords as string).split(',').map((k: string) => k.trim()).join(' #')}</span>` : ''}
                ${topicNews.length > 0 ? `<ul class="search-news-list">
                    ${topicNews.map(n => {
      const timeStr = getRelativeTime(n.published_at, n.created_at);
      return `<li><a href="/go/${n.id}" target="_blank" class="search-news-link">${escapeHtml(n.title as string)}</a> <span class="search-news-meta">${n.source_name} · ${timeStr}</span></li>`;
    }).join('')}
                </ul>` : ''}
            </div>`;
  }
  return html;
}

function renderLoadMoreButton(query: string, nextPage: number): string {
  return `<div id="search-load-more" style="text-align: center; padding: 20px; border-top: 1px solid var(--border);">
        <a hx-get="/api/search?q=${encodeURIComponent(query)}&page=${nextPage}" hx-target="#search-load-more" hx-swap="outerHTML" rel="nofollow"
           style="display: inline-block; padding: 10px 20px; background: var(--accent); color: var(--bg); text-decoration: none; border-radius: 20px; font-weight: bold; cursor: pointer;">
           더 보기
        </a>
    </div>`;
}

function renderSearchResults(query: string, topics: any[], news: any[], hasMore: boolean, page: number): string {
  const newsByTopic: Record<number, any[]> = {};
  for (const item of news) {
    const tid = item.topic_id as number;
    if (!newsByTopic[tid]) newsByTopic[tid] = [];
    if (newsByTopic[tid].length < 5) {
      newsByTopic[tid].push(item);
    }
  }

  // Page > 1: return only the topic groups + optional load-more button (for HTMX append)
  if (page > 1) {
    let html = renderTopicGroups(topics, newsByTopic);
    if (hasMore) html += renderLoadMoreButton(query, page + 1);
    return html;
  }

  // Page 1: full container with header
  let html = `
        <div class="search-results-container">
            <div class="search-results-header">
                <span>"<strong>${escapeHtml(query)}</strong>" 관련 토픽 검색 결과</span>
                <button onclick="document.getElementById('search-results').innerHTML=''" class="search-close-btn">✕</button>
            </div>`;

  html += renderTopicGroups(topics, newsByTopic);
  if (hasMore) html += renderLoadMoreButton(query, page + 1);
  html += `</div>`;
  return html;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- GET /api/search : Hybrid Topic Search (Semantic + Keyword) ---
aiRouter.get("/api/search", async (request, env) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) return new Response("", { status: 200 });

  const PAGE_SIZE = 20;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const offset = (page - 1) * PAGE_SIZE;

  // 1. Embed query for semantic search
  const embedRes = await env.AI.run(env.EMBEDDING_MODEL, { text: [q] });
  const vector = embedRes.data[0];

  // 2. Vectorize semantic search
  const semanticRes = await env.VECTORIZE.query(vector, { topK: 20, returnMetadata: "none" });
  const semanticIds = semanticRes.matches
    .filter((m: any) => m.score > 0.5)
    .map((m: any) => parseInt(m.id, 10));

  // 3. Hybrid query: semantic IDs + keyword LIKE in one D1 query (with pagination)
  const semanticPlaceholders = semanticIds.length > 0
    ? semanticIds.map(() => '?').join(',')
    : null;

  const whereClause = semanticPlaceholders
    ? `id IN (${semanticPlaceholders}) OR title LIKE ? OR keywords LIKE ?`
    : `title LIKE ? OR keywords LIKE ?`;

  const bindParams = semanticPlaceholders
    ? [...semanticIds, `%${q}%`, `%${q}%`, PAGE_SIZE + 1, offset]
    : [`%${q}%`, `%${q}%`, PAGE_SIZE + 1, offset];

  const { results: rawTopics } = await env.DB.prepare(`
        SELECT t.id, t.title, t.keywords, t.updated_at,
               (SELECT COUNT(*) FROM news_topics nt WHERE nt.topic_id = t.id) as article_count
        FROM topics t
        WHERE ${whereClause.replace(/title/g, 't.title').replace(/keywords/g, 't.keywords').replace(/id/g, 't.id')}
        ORDER BY t.updated_at DESC
        LIMIT ? OFFSET ?
    `).bind(...bindParams).all();

  if (!rawTopics || rawTopics.length === 0) {
    if (page === 1) {
      return new Response(renderSearchEmpty(q), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    return new Response("", { status: 200 });
  }

  // Check if there are more results beyond this page
  const hasMore = rawTopics.length > PAGE_SIZE;
  const topics = hasMore ? rawTopics.slice(0, PAGE_SIZE) : rawTopics;

  // 4. Fetch related news for matched topics
  const topicIds = topics.map(t => t.id);
  const newsPlaceholders = topicIds.map(() => '?').join(',');
  const { results: news } = await env.DB.prepare(`
        SELECT n.id, n.title, n.url, n.published_at, n.created_at, s.name as source_name, nt.topic_id
        FROM news n
        JOIN sources s ON n.source_id = s.id
        JOIN news_topics nt ON n.id = nt.news_id
        WHERE nt.topic_id IN (${newsPlaceholders})
        ORDER BY COALESCE(n.published_at, n.created_at) DESC
    `).bind(...topicIds).all();

  const newsResults = news ?? [];

  // Sort topics by associated news count (descending)
  topics.sort((a, b) => {
    const countA = (a.article_count as number) || 0;
    const countB = (b.article_count as number) || 0;
    return countB - countA;
  });

  // 5. Return HTML partial
  return new Response(renderSearchResults(q, topics, newsResults, hasMore, page), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
});

aiRouter.get("/___force-ai-update", async (request, env) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key || key !== (env as any).CRON_SECRET) {
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
      const sendWithRetry = async (attempt: number = 1): Promise<void> => {
        try {
          await env.NEWS_PROCESSING_QUEUE.send({
            news_ids: unclustered.map(item => item.id)
          });
        } catch (error: any) {
          if (error.message.includes("Too Many Requests") && attempt <= 3) {
            console.warn(`[QUEUE] Rate limited. Retrying attempt ${attempt}...`);
            await new Promise(res => setTimeout(res, 1000 * attempt));
            return sendWithRetry(attempt + 1);
          }
          throw error;
        }
      };

      await sendWithRetry();
      return new Response(`Queued ${unclustered.length} articles for processing.`, { status: 200 });
    }

    return new Response("No unclustered articles found to process.", { status: 200 });
  } catch (error: any) {
    return new Response("Failed: " + error.message, { status: 500 });
  }
});

// --- GET /debug/vector : Dev Debugging Route ---
aiRouter.get(/^\/debug\/vector/, async (request, env) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  if (!q) return new Response("Provide ?q=TEXT to query vectorize", { status: 400 });

  const embedRes = await env.AI.run(env.EMBEDDING_MODEL, { text: [q] });
  const vector = embedRes.data[0];

  const searchRes = await env.VECTORIZE.query(vector, { topK: 10 });

  // Fetch titles for the matched topics
  const results = [];
  for (const match of searchRes.matches) {
    const topic = await env.DB.prepare("SELECT title FROM topics WHERE id = ?").bind(parseInt(match.id, 10)).first<{ title: string }>();
    results.push({
      score: match.score,
      topicId: match.id,
      title: topic?.title || "Unknown"
    });
  }

  return new Response(JSON.stringify({ query: q, results }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
});
