import { Router } from "../../core/router";
import { Env, getSessionUser } from "../../auth";
import { getRelativeTime } from "../../core/utils";
import { renderHTML, renderNewsList, renderTopics, renderWideNewsList, renderSearchResults } from "./templates";

export const uiRouter = new Router();

// Define shared interfaces used by the UI routes
interface NewsRow {
  id: number;
  title: string;
  url: string;
  description: string;
  upvotes: number;
  view_count: number;
  published_at: string;
  created_at: string;
  source_name: string;
  keywords?: string;
}

interface TopicRow {
  id: number;
  title: string;
  article_count: number;
  keywords?: string;
  updated_at?: string;
}

// Helper: 404 Page Template
export function renderNotFoundPage(user: { username: string } | null = null): string {
  const errorHtml = `
        <div style="text-align: center; margin-top: 40px;">
            <h2>404 - Page Not Found</h2>
            <p>길을 잃으셨나요? 홈으로 돌아가세요!</p>
            <pre style="margin-top: 20px; padding: 20px; font-family: monospace; color: var(--border); font-size: 8px; text-align: center; display: inline-block; background: rgba(87, 53, 43, 0.05); border-radius: 8px; line-height: 1.2;">
                                       ░░                                       
                                     ░▓▓▓▓▓      ▒▒                             
                                   ▒▓▓▓▓▓▒▒░    ▓▓▒                             
                                  ░▓▓▓▓▓▓▓▓▓  ░▓▓▓▒                             
                             ░▓░ ░▓▓▓▓▓▓▓▓▒▓▓░░░▒▓▒                             
                           ▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░▒▒                            
                        ▒▓▓▓▓▒  ▒▓▓▓▓▓▓▒▒▓▒░░░░░░░░░░▒                          
                     ░▓▓▓▓▓▓     ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░▓                        
                   ▓▓▓▓▓▓▓▓  ░░  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░▓                      
                ▒▓▓▓▓▓▓▓▓▒  ░░░    ▓▓▓░░░░░░░░░░░░░░░░░░░░▒░                    
              ▓▓▓▓▓▓▓▓▓▓   ░░░░░░░    ░░░░░░░░░░░▒▓▒  ▓▓▓▒▒▓                    
             ▒▓▓▓▓▓▓▓▓▓   ░░░░░░░░░░░░░░░░░░░░░░░░▓▒  ▓▓▓▓▓▓▓░                  
            ░▓▓▓▓▓▓▓▓▒  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒░░░░▓▓▓▓▓▓▒                
            ▒▓▓▓▓▓▓▓▓   ░░░░░░░░░░░░▒░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▒             
           ░▓▓▓▓▓▓▓▓▓▒  ░░░░░░░░░░░░▓░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▒           
           ▓▓▓▓▓▓▓▓▓▓▓▒  ░░░░░░░░░░░▒▓░░░░░░░░░░░░░▓▒░░░▓▓▓▓▓▓▓▓▓▓▓▓            
          ░▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░░░░░░░░░▒▓▓░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             
          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░░░░░░░░░░▓▓▓▓▓▒░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░              
          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ░░░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░                
         ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░░░░░░░▓▓▓▓▓▓▓▓▓░                                 
           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒  ░░░░░░░▓▓▓▓▓▓▓▓▓▓                                   
            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░░▓▓▓▓▓▓▓▓▓▓▓                                    
             ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░▓▓▓▓▓▓▓▓▓▓▓▓                                     
              ▓▓▓▓▓▓▓▓▓▓▓▓▓▒ ▓▓▓▓▓▓▓▓▓▓▓▓▓                                      
               ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░                                      
                 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                       
                  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                      
                   ▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                      
            </pre>
            <p><a href="/" style="color: var(--accent); font-weight: bold; text-decoration: none; margin-top: 20px; display: inline-block;">&larr; 홈으로 돌아가기</a></p>
        </div>
    `;
  return renderHTML(errorHtml, user?.username || null);
}

export function renderPage(
  news: any[],
  user: any,
  topicName: string = "",
  currentLimit: number = 25,
  currentTime: number = 24,
  hotTopics: any[] = [],
  page: number = 1,
  topicId: number | null = null,
  updatedAt: string | null = null
): string {
  let content = "";

  if (topicName) {
    const timeStr = updatedAt ? getRelativeTime(updatedAt, updatedAt) : '';
    const updateInfo = timeStr ? `<span style="font-size: 14px; color: var(--secondary); font-weight: normal; margin-left: 10px;">마지막 업데이트: ${timeStr}</span>` : '';

    content += `<h2 style="padding: 20px 0; max-width: 800px; margin: 0 auto; color: var(--border); border-bottom: 2px solid var(--accent); padding-bottom: 12px; font-size: 22px; margin-bottom: 24px;">${topicName}${updateInfo}</h2>`;
    content += renderWideNewsList(news);

    if (topicId && news.length === 50) {
      content += `<div style="text-align: center; padding: 20px; border-top: 1px solid var(--border);">
                <a href="/topic/${topicId}?page=${page + 1}" rel="nofollow" 
                   style="display: inline-block; padding: 10px 20px; background: var(--accent); color: var(--bg); text-decoration: none; border-radius: 20px; font-weight: bold;">
                   더 보기
                </a>
            </div>`;
    }

    return renderHTML(content, user?.username, currentLimit, currentTime);
  }

  if (hotTopics && hotTopics.length > 0) {
    content += renderTopics(hotTopics);
  }

  const filtersHtml = renderHTML('', null, currentLimit, currentTime);
  const limitsPart = filtersHtml.match(/<!--limits-->([\s\S]*?)<!--\/limits-->/)?.[1] || '';
  const timesPart = filtersHtml.match(/<!--times-->([\s\S]*?)<!--\/times-->/)?.[1] || '';

  content += `
    <div class="filters">
        <div class="filter-group">
            ${limitsPart}
        </div>
        <div class="filter-group">
            ${timesPart}
        </div>
    </div>`;

  const itemsBySource: Record<string, any[]> = {};

  news.forEach(item => {
    const sourceName = item.source_name || 'Unknown';
    if (!itemsBySource[sourceName]) {
      itemsBySource[sourceName] = [];
    }
    if (itemsBySource[sourceName].length < currentLimit) {
      itemsBySource[sourceName].push(item);
    }
  });

  const sources = Object.keys(itemsBySource).sort((a, b) => {
    const aTime = new Date(itemsBySource[a][0]?.published_at ?? 0).getTime();
    const bTime = new Date(itemsBySource[b][0]?.published_at ?? 0).getTime();
    return bTime - aTime;
  });

  let colsHtml = "";
  sources.forEach(sourceName => {
    colsHtml += renderNewsList(sourceName, itemsBySource[sourceName]);
  });
  content += `<div class="news-columns">${colsHtml}</div>`;

  if (Array.isArray(news) && news.length >= currentLimit) {
    content += `<div style="text-align: center; padding: 20px; border-top: 1px solid var(--border);">
            <a href="/?page=${page + 1}&limit=${currentLimit}&time=${currentTime}" rel="nofollow" 
               style="display: inline-block; padding: 10px 20px; background: var(--accent); color: var(--bg); text-decoration: none; border-radius: 20px; font-weight: bold;">
               더 보기
            </a>
        </div>`;
  }

  return renderHTML(content, user?.username, currentLimit, currentTime);
}

function getCookie(request: Request, name: string): string | null {
  const cookieStr = request.headers.get("Cookie") || "";
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

// --- Routes ---

uiRouter.get("/search", async (request, env) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || null;
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;
  const user = await getSessionUser(request, env);

  let topics: any[] = [];
  let hasMore = false;

  if (q) {
    // Hybrid Search Logic (similar to api/search)
    const embedRes = await env.AI.run(env.EMBEDDING_MODEL, { text: [q] });
    const vector = embedRes.data[0];
    const semanticRes = await env.VECTORIZE.query(vector, { topK: 15, returnMetadata: "none" });
    const semanticIds = semanticRes.matches
      .filter((m: any) => m.score > 0.5)
      .map((m: any) => parseInt(m.id, 10));

    const semanticPlaceholders = semanticIds.length > 0 ? semanticIds.map(() => '?').join(',') : null;
    const whereClause = semanticPlaceholders
      ? `t.id IN (${semanticPlaceholders}) OR t.title LIKE ? OR t.keywords LIKE ?`
      : `t.title LIKE ? OR t.keywords LIKE ?`;
    const bindParams = semanticPlaceholders
      ? [...semanticIds, `%${q}%`, `%${q}%`]
      : [`%${q}%`, `%${q}%`];

    const { results } = await env.DB.prepare(`
            SELECT t.id, t.title, t.keywords, t.updated_at,
                   (SELECT COUNT(*) FROM news_topics nt WHERE nt.topic_id = t.id) as article_count
            FROM topics t
            WHERE ${whereClause}
            ORDER BY t.updated_at DESC
            LIMIT ? OFFSET ?
        `).bind(...bindParams, limit + 1, offset).all();
    topics = results || [];
  } else {
    // Latest Topics
    const { results } = await env.DB.prepare(`
            SELECT t.id, t.title, t.keywords, t.updated_at,
                   (SELECT COUNT(*) FROM news_topics nt WHERE nt.topic_id = t.id) as article_count
            FROM topics t
            ORDER BY t.updated_at DESC
            LIMIT ? OFFSET ?
        `).bind(limit + 1, offset).all();
    topics = results || [];
  }

  if (topics.length > limit) {
    hasMore = true;
    topics.pop();
  }

  const newsByTopic: Record<number, any[]> = {};
  if (topics.length > 0) {
    const topicIds = topics.map(t => t.id);
    const placeholders = topicIds.map(() => '?').join(',');
    const { results: news } = await env.DB.prepare(`
            SELECT n.id, n.title, n.url, n.published_at, n.created_at, s.name as source_name, nt.topic_id
            FROM news n
            JOIN sources s ON n.source_id = s.id
            JOIN news_topics nt ON n.id = nt.news_id
            WHERE nt.topic_id IN (${placeholders})
            ORDER BY n.published_at DESC
        `).bind(...topicIds).all();

    if (news) {
      for (const item of news) {
        const tid = item.topic_id as number;
        if (!newsByTopic[tid]) newsByTopic[tid] = [];
        if (newsByTopic[tid].length < 5) {
          newsByTopic[tid].push(item);
        }
      }
    }
  }

  const content = renderSearchResults(q, topics, newsByTopic, page, hasMore);
  return new Response(renderHTML(content, user?.username || null), {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
});

uiRouter.get("/", async (request, env) => {
  const url = new URL(request.url);

  const user = await getSessionUser(request, env);

  const queryPage = url.searchParams.get("page");
  const queryLimit = url.searchParams.get("limit");
  const queryTime = url.searchParams.get("time");

  const page = parseInt(queryPage || "1", 10);
  const prefLimit = getCookie(request, "pref_limit");
  const limit = parseInt(queryLimit || prefLimit || "10", 10);
  const timeHours = parseInt(queryTime || "24", 10);

  // SQL News Query
  const now = new Date();
  const timeAgo = new Date(now.getTime() - timeHours * 60 * 60 * 1000).toISOString();

  // Fetch news from all sources within time window using diverse selection
  const { results: news } = await env.DB.prepare(`
        -- NEWS QUERY
        WITH ranked_news AS (
            SELECT id, source_id,
                   ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY published_at DESC) as rn
            FROM news
            WHERE published_at >= ?
        )
        SELECT 
            n.id, n.title, n.url, n.description, n.upvotes, n.view_count, n.published_at, n.created_at, 
            s.name as source_name,
            (SELECT group_concat(t.keywords, ', ') 
             FROM news_topics nt 
             JOIN topics t ON nt.topic_id = t.id 
             WHERE nt.news_id = n.id) as keywords
        FROM ranked_news
        JOIN news n ON n.id = ranked_news.id
        JOIN sources s ON n.source_id = s.id
        WHERE ranked_news.rn <= ?
        ORDER BY n.published_at DESC;
    `).bind(timeAgo, limit).all<NewsRow>();


  // Hot Topics
  const { results: topics } = await env.DB.prepare(`
        -- TOPICS QUERY
        SELECT 
            t.id, 
            t.title, 
            t.keywords, 
            topic_counts.article_count,
            (topic_counts.article_count * 1.0) / POW(((julianday('now') - julianday(t.updated_at)) * 24) + 2, 1.8) AS trending_score
        FROM (
            SELECT topic_id, COUNT(news_id) as article_count
            FROM news_topics
            WHERE topic_id IN (
                SELECT id FROM topics WHERE updated_at >= datetime('now', '-24 hours')
            )
            GROUP BY topic_id
            HAVING article_count > 1
        ) AS topic_counts
        JOIN topics t ON t.id = topic_counts.topic_id
        ORDER BY trending_score DESC
        LIMIT 10;
    `).all<TopicRow>();
  const hotTopics = topics ?? [];

  const ranked = (news ?? []).sort((a, b) => {
    const dateA = new Date(a.published_at || a.created_at).getTime();
    const dateB = new Date(b.published_at || b.created_at).getTime();
    return dateB - dateA;
  });

  const html = renderPage(ranked, user, "", limit, timeHours, hotTopics, page);

  const response = new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  if (queryLimit) {
    response.headers.append("Set-Cookie", `pref_limit=${limit}; Path=/; Max-Age=${60 * 60 * 24 * 365}`);
  }

  return response;
});
uiRouter.get(/^\/topic\/(\d+)$/, async (request, env, ctx, match) => {
  const topicId = parseInt(match![1], 10);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const user = await getSessionUser(request, env);

  const topicRow = await env.DB.prepare("SELECT title, updated_at, keywords FROM topics WHERE id = ?").bind(topicId).first<{ title: string; updated_at: string; keywords: string }>();
  if (!topicRow) return new Response(renderNotFoundPage(user), { status: 404, headers: { "Content-Type": "text/html" } });

  const { results: news } = await env.DB.prepare(`
        SELECT n.id, n.title, n.url, n.description, n.published_at, n.created_at, s.name as source_name,
               (SELECT group_concat(t2.keywords, ', ') FROM news_topics nt2 JOIN topics t2 ON nt2.topic_id = t2.id WHERE nt2.news_id = n.id) as keywords
        FROM news n
        JOIN news_topics nt ON n.id = nt.news_id
        JOIN sources s ON n.source_id = s.id
        WHERE nt.topic_id = ?
        ORDER BY n.published_at DESC
        LIMIT 50 OFFSET ?
    `).bind(topicId, (page - 1) * 50).all<NewsRow>();

  const html = renderPage(news, user, topicRow.title, 25, 24, [], page, topicId, topicRow.updated_at);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});

uiRouter.get("/user", async (request, env) => {
  const user = await getSessionUser(request, env);
  if (!user) return new Response(null, { status: 302, headers: { Location: "/login" } });

  const { results: news } = await env.DB.prepare(`
        SELECT n.id, n.title, n.url, n.published_at, n.created_at, s.name as source_name,
               (SELECT group_concat(t.keywords, ', ') FROM news_topics nt JOIN topics t ON nt.topic_id = t.id WHERE nt.news_id = n.id) as keywords
        FROM news n
        JOIN votes v ON n.id = v.news_id
        JOIN sources s ON n.source_id = s.id
        WHERE v.user_id = ?
        ORDER BY v.created_at DESC
        LIMIT 100
    `).bind(user.id).all<NewsRow>();

  const html = renderPage(news, user, "투표한 기사");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});

uiRouter.get("/guidelines", async (request, env) => {
  const user = await getSessionUser(request, env);
  const content = `
        <div style="padding: 20px; max-width: 800px; margin: 0 auto; line-height: 1.8;">
            <h2 style="border-bottom: 2px solid var(--accent); padding-bottom: 10px; margin-bottom: 20px;">가이드라인</h2>
            <p>하이에나뉴스는 공정한 뉴스 큐레이션을 지향합니다.</p>
            <ul style="margin-top: 15px; padding-left: 20px;">
                <li>중복된 내용은 시스템에 의해 자동으로 그룹화됩니다.</li>
                <li>자극적인 제목보다는 팩트 중심의 기사를 우선합니다.</li>
                <li>특정 정파에 치우치지 않는 다양한 시각을 제공하려 노력합니다.</li>
            </ul>
        </div>
    `;
  const html = renderHTML(content, user?.username);
  return new Response(html, { headers: { "Content-Type": "text/html" } });
});

uiRouter.get("/legal", async (request, env) => {
  const user = await getSessionUser(request, env);
  const content = `
        <div style="padding: 20px; max-width: 800px; margin: 0 auto; line-height: 1.8;">
            <h2 style="border-bottom: 2px solid var(--accent); padding-bottom: 10px; margin-bottom: 20px;">법적고지</h2>
            <p>본 서비스는 각 언론사가 제공하는 RSS 피드를 기반으로 링크를 제공하는 검색 서비스입니다.</p>
            <p style="margin-top: 10px;">모든 기사의 저작권은 해당 언론사에 있으며, 기사 내용에 대한 책임 또한 각 언론사에 있습니다.</p>
            <p style="margin-top: 10px;">본 서비스는 링크 제공 과정에서 어떠한 기사 내용도 변조하거나 직접 호스팅하지 않습니다.</p>
        </div>
    `;
  const html = renderHTML(content, user?.username);
  return new Response(html, { headers: { "Content-Type": "text/html" } });
});

uiRouter.get(/^\/go\/(\d+)$/, async (request, env, ctx, match) => {
  const newsId = parseInt(match![1], 10);
  const user = await getSessionUser(request, env);

  const news = await env.DB.prepare("SELECT url FROM news WHERE id = ?").bind(newsId).first<{ url: string }>();
  if (!news) return new Response("Not Found", { status: 404 });

  // Track click (async)
  ctx.waitUntil(env.DB.prepare("INSERT INTO clicks (user_id, news_id) VALUES (?, ?)").bind(user?.id || null, newsId).run());
  ctx.waitUntil(env.DB.prepare("UPDATE news SET view_count = view_count + 1 WHERE id = ?").bind(newsId).run());

  return new Response(null, { status: 302, headers: { Location: news.url } });
});
