import { Router } from "../../core/router";
import { Env, getSessionUser } from "../../auth";
import { getRelativeTime } from "../../core/utils";
import { renderHTML, renderNewsList, renderTopics, renderWideNewsList, renderSearchResults, renderPagination, renderTopicTimeline, renderFilters, SeoOptions } from "./templates";

export const uiRouter = new Router();

// Define shared interfaces used by the UI routes
export interface NewsRow {
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

export interface TopicRow {
  id: number;
  title: string;
  article_count: number;
  keywords?: string;
  milestones?: string | null;
  updated_at?: string;
  trending_score?: number;
}

export interface RelatedTopicNode {
  id: number;
  title: string;
  keywords: string | null;
  milestones: string | null;
  created_at: string;
  updated_at: string;
  article_count: number;
  shared_news_count: number;
  pivot_news_id: number | null;
  shared_keywords?: string[];
  relation_type: "prior" | "next" | "related";
  is_from?: boolean;
}

// Helper: 404 Page Template
export function renderNotFoundPage(user: { username: string; has_feedback?: number } | null = null): string {
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
  return renderHTML(errorHtml, user?.username || null, 25, 24, {
    title: "404 - 페이지를 찾을 수 없습니다 | 하이에나뉴스",
    noindex: true,
    hasFeedback: Boolean(user?.has_feedback),
  });
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
  updatedAt: string | null = null,
  topicKeywords: string | null = null,
  topicMilestones: string | null = null,
  relatedTopics: RelatedTopicNode[] = []
): string {
  page = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  let content = "";

  if (topicName) {
    const timeStr = updatedAt ? getRelativeTime(updatedAt, updatedAt) : '';
    const updateInfo = timeStr ? `<span style="font-size: 14px; color: var(--secondary); font-weight: normal; margin-left: 10px;">마지막 업데이트: ${timeStr}</span>` : '';

    content += `<h2 style="padding: 20px 0; max-width: 800px; margin: 0 auto; color: var(--border); border-bottom: 2px solid var(--accent); padding-bottom: 12px; font-size: 22px; margin-bottom: 24px;">${topicName}${updateInfo}</h2>`;
    if (page === 1 && (topicMilestones || (relatedTopics && relatedTopics.length > 0))) {
      content += renderTopicTimeline(topicMilestones, relatedTopics, topicId);
    }
    content += renderWideNewsList(news);

    let seo: SeoOptions = {
      title: `${topicName} | 하이에나뉴스`,
      noindex: !topicId,
      hasFeedback: Boolean(user?.has_feedback),
    };

    if (topicId) {
      const topicHasMore = news.length === 50;
      const topicPrevUrl = page > 1 ? `/topic/${topicId}?page=${page - 1}` : null;
      const topicNextUrl = topicHasMore ? `/topic/${topicId}?page=${page + 1}` : null;
      const topicFirstUrl = page > 1 ? `/topic/${topicId}?page=1` : null;
      content += renderPagination({ page, hasMore: topicHasMore, prevUrl: topicPrevUrl, nextUrl: topicNextUrl, firstUrl: topicFirstUrl });

      const uniqueSources = Array.from(new Set((news || []).map((n: any) => n.source_name).filter(Boolean)));
      const sourcesSummary = uniqueSources.length > 0 ? `${uniqueSources.slice(0, 5).join(", ")} 등 ` : "";
      const kwSummary = topicKeywords ? ` (주요 키워드: ${topicKeywords})` : "";
      const seoDescription = `${topicName} 이슈에 대한 ${sourcesSummary}언론사별 기사 ${news.length}건을 한눈에 비교해보세요.${kwSummary}`;
      const canonicalPath = page > 1 ? `/topic/${topicId}?page=${page}` : `/topic/${topicId}`;

      seo = {
        title: `${topicName} - 언론사별 뉴스 비교 (${news.length}건) | 하이에나뉴스`,
        description: seoDescription,
        canonicalPath,
        ogType: "article",
        hasFeedback: Boolean(user?.has_feedback),
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": topicName,
          "headline": topicName,
          "url": `https://hy3n4.news${canonicalPath}`,
          "inLanguage": "ko-KR",
          "description": seoDescription,
          ...(updatedAt ? { "dateModified": updatedAt } : {}),
          ...(topicKeywords ? { "keywords": topicKeywords } : {}),
          "isPartOf": {
            "@type": "WebSite",
            "name": "하이에나뉴스",
            "url": "https://hy3n4.news/"
          },
          "mainEntity": {
            "@type": "ItemList",
            "name": `${topicName} 관련 언론사별 기사 목록`,
            "numberOfItems": news.length,
            "itemListElement": (news || []).slice(0, 30).map((item: any, idx: number) => ({
              "@type": "ListItem",
              "position": idx + 1,
              "item": {
                "@type": "NewsArticle",
                "headline": item.title,
                "url": item.url || `https://hy3n4.news/go/${item.id}`,
                "datePublished": item.published_at || item.created_at,
                ...(item.description ? { "description": String(item.description).slice(0, 200) } : {}),
                "publisher": {
                  "@type": "Organization",
                  "name": item.source_name || "언론사"
                }
              }
            }))
          }
        }
      };
    }

    return renderHTML(content, user?.username, currentLimit, currentTime, seo);
  }

  if (hotTopics && hotTopics.length > 0) {
    content += renderTopics(hotTopics);
  }

  content += renderFilters(currentLimit, currentTime);

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

  {
    const hasMore = Array.isArray(news) && news.length >= currentLimit;
    const prevUrl = page > 1 ? `/?page=${page - 1}&limit=${currentLimit}&time=${currentTime}` : null;
    const nextUrl = hasMore ? `/?page=${page + 1}&limit=${currentLimit}&time=${currentTime}` : null;
    const firstUrl = page > 1 ? `/?page=1&limit=${currentLimit}&time=${currentTime}` : null;
    content += renderPagination({ page, hasMore, prevUrl, nextUrl, firstUrl });
  }

  const topTopicTitles = (hotTopics || []).slice(0, 4).map((t: any) => t.title).filter(Boolean);
  const homeDescription = topTopicTitles.length > 0
    ? `실시간 한국 뉴스 핫토픽(뜨거운 감자): ${topTopicTitles.join(" · ")} 등. 조선일보, 경향신문, 연합뉴스, JTBC, 동아일보 주요 언론사 헤드라인을 한눈에 비교하세요.`
    : "조선일보, 경향신문, 연합뉴스, JTBC, 동아일보 등 대한민국 주요 언론사의 실시간 뉴스 헤드라인과 AI 클러스터링 핫토픽(뜨거운 감자)을 한눈에 비교하세요.";

  const homeCanonicalPath = page > 1 ? `/?page=${page}` : "/";
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://hy3n4.news/#website",
        "name": "하이에나뉴스",
        "alternateName": ["hy3n4 news", "Hyena News"],
        "url": "https://hy3n4.news/",
        "inLanguage": "ko-KR",
        "description": "대한민국 주요 언론사의 실시간 뉴스와 AI 클러스터링 핫이슈(뜨거운 감자)를 한눈에 비교하는 뉴스 큐레이션 서비스입니다.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://hy3n4.news/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      ...(hotTopics && hotTopics.length > 0
        ? [
            {
              "@type": "ItemList",
              "name": "실시간 뜨거운 감자 (한국 뉴스 핫토픽 Top 10)",
              "description": "최근 24시간 내 다수 언론사가 집중 보도한 대한민국 주요 뉴스 토픽 클러스터",
              "numberOfItems": hotTopics.length,
              "itemListElement": hotTopics.map((t: any, idx: number) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "name": t.title,
                "url": `https://hy3n4.news/topic/${t.id}`,
                ...(t.keywords ? { "description": `키워드: ${t.keywords} (관련 기사 ${t.article_count}건)` } : {})
              }))
            }
          ]
        : []),
      ...(news && news.length > 0
        ? [
            {
              "@type": "ItemList",
              "name": "대한민국 주요 언론사 최신 헤드라인",
              "numberOfItems": Math.min(news.length, 20),
              "itemListElement": news.slice(0, 20).map((item: any, idx: number) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "item": {
                  "@type": "NewsArticle",
                  "headline": item.title,
                  "url": item.url || `https://hy3n4.news/go/${item.id}`,
                  "datePublished": item.published_at || item.created_at,
                  "publisher": {
                    "@type": "Organization",
                    "name": item.source_name || "언론사"
                  }
                }
              }))
            }
          ]
        : [])
    ]
  };

  return renderHTML(content, user?.username, currentLimit, currentTime, {
    title: "하이에나뉴스 | 주요 언론사 실시간 헤드라인 & 핫토픽 모아보기",
    description: homeDescription,
    canonicalPath: homeCanonicalPath,
    jsonLd: homeJsonLd,
    hasFeedback: Boolean(user?.has_feedback),
  });
}

function getCookie(request: Request, name: string): string | null {
  const cookieStr = request.headers.get("Cookie") || "";
  const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

export const EDGE_CACHE_TTL_SECONDS = 1800; // 30 minutes (matches RSS cron interval */30 * * * *)
export const PUBLIC_HTML_CACHE_CONTROL = "public, max-age=300, s-maxage=1800, stale-while-revalidate=1800";

export async function withEdgeCache<T>(
  cacheKeyUrl: string,
  ttlSeconds: number,
  ctx: ExecutionContext | undefined,
  fetcher: () => Promise<T>
): Promise<T> {
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheReq = new Request(cacheKeyUrl, { method: "GET" });

  if (cache) {
    try {
      const cachedRes = await cache.match(cacheReq);
      if (cachedRes) {
        return (await cachedRes.json()) as T;
      }
    } catch (e) {
      console.warn("[CACHE] Edge cache read failed:", e);
    }
  }

  const data = await fetcher();

  if (cache && data !== null && data !== undefined) {
    const resToCache = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds}`,
      },
    });
    const putPromise = cache.put(cacheReq, resToCache).catch((e) => {
      console.warn("[CACHE] Edge cache write failed:", e);
    });
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(putPromise);
    }
  }

  return data;
}

export async function fetchNewsCached(
  env: Env,
  ctx: ExecutionContext | undefined,
  timeHours: number = 24,
  limit: number = 10,
  page: number = 1
): Promise<NewsRow[]> {
  const offset = (page - 1) * limit;
  const upperLimit = page * limit;
  const newsCacheKey = `https://cache.hy3n4.news/d1/news?time=${timeHours}&limit=${limit}&page=${page}`;

  return withEdgeCache<NewsRow[]>(newsCacheKey, EDGE_CACHE_TTL_SECONDS, ctx, async () => {
    const now = new Date();
    const timeAgo = new Date(now.getTime() - timeHours * 60 * 60 * 1000).toISOString();

    const { results } = await env.DB.prepare(`
        -- NEWS QUERY
        WITH ranked_news AS (
            SELECT id, source_id, title, url, description, upvotes, view_count, published_at, created_at,
                   ROW_NUMBER() OVER (PARTITION BY +source_id ORDER BY published_at DESC) as rn
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
        FROM ranked_news n
        JOIN sources s ON n.source_id = s.id
        WHERE n.rn > ? AND n.rn <= ?
        ORDER BY n.published_at DESC;
      `).bind(timeAgo, offset, upperLimit).all<NewsRow>();

    return results ?? [];
  });
}

export async function fetchHotTopicsCached(
  env: Env,
  ctx?: ExecutionContext
): Promise<TopicRow[]> {
  const topicsCacheKey = `https://cache.hy3n4.news/d1/hot-topics/v4`;

  return withEdgeCache<TopicRow[]>(topicsCacheKey, EDGE_CACHE_TTL_SECONDS, ctx, async () => {
    const { results } = await env.DB.prepare(`
        -- TOPICS QUERY
        SELECT 
            t.id, 
            t.title, 
            t.keywords, 
            t.milestones,
            COUNT(nt.news_id) as article_count,
            (COUNT(nt.news_id) * 1.0) / POW(((julianday('now') - julianday(t.updated_at)) * 24) + 2, 1.8) AS trending_score
        FROM topics t
        CROSS JOIN news_topics nt ON nt.topic_id = t.id
        WHERE t.updated_at >= datetime('now', '-24 hours')
          AND t.created_at >= datetime('now', '-10 days')
        GROUP BY t.updated_at, t.id
        HAVING article_count > 1
        ORDER BY trending_score DESC
        LIMIT 25;
      `).all<TopicRow>();

    const candidates = results ?? [];
    const selected: TopicRow[] = [];
    const selectedKeywordSets: Set<string>[] = [];

    for (const c of candidates) {
      if (selected.length >= 10) break;
      const kwSet = new Set(
        (c.keywords || "")
          .split(",")
          .map((k) => k.trim().replace(/\s+/g, ""))
          .filter((k) => k.length >= 2)
      );

      let isOverlappingTwin = false;
      if (kwSet.size >= 2) {
        for (const existingSet of selectedKeywordSets) {
          let shared = 0;
          for (const k of kwSet) {
            if (existingSet.has(k)) shared++;
          }
          if (shared >= 2) {
            isOverlappingTwin = true;
            break;
          }
        }
      }

      if (!isOverlappingTwin) {
        selected.push(c);
        selectedKeywordSets.push(kwSet);
      }
    }

    return selected;
  });
}

export async function fetchSitemapTopicsCached(
  env: Env,
  ctx?: ExecutionContext
): Promise<{ id: number; updated_at: string }[]> {
  const sitemapCacheKey = `https://cache.hy3n4.news/d1/sitemap-topics`;

  return withEdgeCache<{ id: number; updated_at: string }[]>(
    sitemapCacheKey,
    EDGE_CACHE_TTL_SECONDS,
    ctx,
    async () => {
      const { results } = await env.DB.prepare(`
        SELECT id, updated_at
        FROM topics
        WHERE updated_at >= datetime('now', '-10 days')
          AND created_at >= datetime('now', '-10 days')
        ORDER BY updated_at DESC
        LIMIT 100;
      `).all<{ id: number; updated_at: string }>();

      return results ?? [];
    }
  );
}

// --- Routes ---

uiRouter.get("/api/trends", async (_request, env, ctx) => {
  const [hotTopics, news] = await Promise.all([
    fetchHotTopicsCached(env, ctx),
    fetchNewsCached(env, ctx, 24, 10, 1),
  ]);

  const latestBySource: Record<string, any[]> = {};
  for (const item of news ?? []) {
    const src = item.source_name || "Unknown";
    if (!latestBySource[src]) {
      latestBySource[src] = [];
    }
    if (latestBySource[src].length < 10) {
      const kwList = item.keywords
        ? Array.from(new Set(item.keywords.split(",").map((k) => k.trim()).filter(Boolean)))
        : [];
      latestBySource[src].push({
        id: item.id,
        title: item.title,
        url: item.url,
        redirect_url: `https://hy3n4.news/go/${item.id}`,
        published_at: item.published_at || item.created_at,
        keywords: kwList,
      });
    }
  }

  const payload = {
    site: "하이에나뉴스 (hy3n4.news)",
    description: "대한민국 주요 언론사(조선일보, 경향신문, 연합뉴스, JTBC, 동아일보 등) 실시간 헤드라인 및 AI 클러스터링 핫토픽 트렌드",
    url: "https://hy3n4.news",
    language: "ko-KR",
    generated_at: new Date().toISOString(),
    hot_topics: (hotTopics ?? []).map((t, index) => ({
      rank: index + 1,
      id: t.id,
      title: t.title,
      keywords: t.keywords
        ? Array.from(new Set(t.keywords.split(",").map((k) => k.trim()).filter(Boolean)))
        : [],
      article_count: t.article_count,
      trending_score: typeof t.trending_score === "number" ? Number(t.trending_score.toFixed(4)) : undefined,
      url: `https://hy3n4.news/topic/${t.id}`,
    })),
    latest_headlines_by_source: latestBySource,
    endpoints: {
      llms_txt: "https://hy3n4.news/llms.txt",
      llms_full_txt: "https://hy3n4.news/llms-full.txt",
      topic_detail: "https://hy3n4.news/topic/{id}",
      search_html: "https://hy3n4.news/search?q={query}",
      search_api: "https://hy3n4.news/api/search?q={query}",
    },
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": PUBLIC_HTML_CACHE_CONTROL,
      "Access-Control-Allow-Origin": "*",
    },
  });
});

uiRouter.get("/search", async (request, env) => {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() || null;
  const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
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
  const searchTitle = q ? `"${q}" 뉴스 토픽 검색 결과 | 하이에나뉴스` : "최신 뉴스 토픽 목록 | 하이에나뉴스";
  const searchDescription = q
    ? `"${q}" 관련 대한민국 주요 언론사 뉴스 토픽 클러스터 및 기사 비교 검색 결과입니다.`
    : "대한민국 주요 언론사 기사를 AI로 클러스터링한 최신 뉴스 토픽 목록입니다.";
  const searchCanonical = q
    ? `/search?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ""}`
    : `/search${page > 1 ? `?page=${page}` : ""}`;

  return new Response(
    renderHTML(content, user?.username || null, 25, 24, {
      title: searchTitle,
      description: searchDescription,
      canonicalPath: searchCanonical,
      hasFeedback: Boolean(user?.has_feedback),
    }),
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
});

uiRouter.get("/", async (request, env, ctx) => {
  const url = new URL(request.url);

  const user = await getSessionUser(request, env);

  const queryPage = url.searchParams.get("page");
  const queryLimit = url.searchParams.get("limit");
  const queryTime = url.searchParams.get("time");

  const rawPage = parseInt(queryPage || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const prefLimit = getCookie(request, "pref_limit");
  const rawLimit = parseInt(queryLimit || prefLimit || "10", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 50) : 10;
  const rawTime = parseInt(queryTime || "24", 10);
  const timeHours = Number.isFinite(rawTime) && rawTime > 0 ? Math.min(Math.floor(rawTime), 168) : 24;

  const [news, hotTopics] = await Promise.all([
    fetchNewsCached(env, ctx, timeHours, limit, page),
    fetchHotTopicsCached(env, ctx),
  ]);

  const ranked = [...(news ?? [])].sort((a, b) => {
    const dateA = new Date(a.published_at || a.created_at).getTime();
    const dateB = new Date(b.published_at || b.created_at).getTime();
    return dateB - dateA;
  });

  const html = renderPage(ranked, user, "", limit, timeHours, hotTopics ?? [], page);

  const response = new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (queryLimit) {
    response.headers.append("Set-Cookie", `pref_limit=${limit}; Path=/; Max-Age=${60 * 60 * 24 * 365}`);
    response.headers.set("Cache-Control", "private, no-cache");
  } else if (user || isLocalhost) {
    response.headers.set("Cache-Control", "private, no-cache");
  } else {
    response.headers.set("Cache-Control", PUBLIC_HTML_CACHE_CONTROL);
    response.headers.set("Vary", "Cookie");
  }

  return response;
});
uiRouter.get(/^\/topic\/(\d+)$/, async (request, env, ctx, match) => {
  const topicId = parseInt(match![1], 10);
  const url = new URL(request.url);
  const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const rawFrom = parseInt(url.searchParams.get("from") || "0", 10);
  const fromTopicId = Number.isFinite(rawFrom) && rawFrom > 0 && rawFrom !== topicId ? rawFrom : null;
  const user = await getSessionUser(request, env);

  const topicCacheKey = `https://cache.hy3n4.news/d1/topic/v6/${topicId}?page=${page}&from=${fromTopicId || 0}`;
  const topicData = await withEdgeCache<{
    topicRow: { id: number; title: string; created_at: string; updated_at: string; keywords: string; milestones: string | null } | null;
    news: NewsRow[];
    relatedTopics: RelatedTopicNode[];
  }>(topicCacheKey, EDGE_CACHE_TTL_SECONDS, ctx, async () => {
    const topicRow = await env.DB.prepare(
      "SELECT id, title, created_at, updated_at, keywords, milestones FROM topics WHERE id = ?"
    ).bind(topicId).first<{ id: number; title: string; created_at: string; updated_at: string; keywords: string; milestones: string | null }>();

    if (!topicRow) {
      return { topicRow: null, news: [], relatedTopics: [] };
    }

    const { results: news } = await env.DB.prepare(`
        WITH paged_news AS (
            SELECT n.id, n.source_id, n.title, n.url, n.description, n.published_at, n.created_at
            FROM news_topics nt
            JOIN news n ON n.id = nt.news_id
            WHERE nt.topic_id = ?
            ORDER BY n.published_at DESC
            LIMIT 50 OFFSET ?
        )
        SELECT n.id, n.title, n.url, n.description, n.published_at, n.created_at, s.name as source_name,
               (SELECT group_concat(t2.keywords, ', ') FROM news_topics nt2 JOIN topics t2 ON nt2.topic_id = t2.id WHERE nt2.news_id = n.id) as keywords
        FROM paged_news n
        CROSS JOIN sources s ON n.source_id = s.id
    `).bind(topicId, (page - 1) * 50).all<NewsRow>();

    const relatedMap = new Map<number, RelatedTopicNode>();

    if (page === 1) {
      const curCreatedMs = new Date(topicRow.created_at.replace(" ", "T") + "Z").getTime();
      const classifyRelation = (otherCreatedAt: string): "prior" | "next" | "related" => {
        const edgeCreatedMs = new Date(otherCreatedAt.replace(" ", "T") + "Z").getTime();
        const diffMinutes = (edgeCreatedMs - curCreatedMs) / (1000 * 60);
        if (diffMinutes < -30) return "prior";
        if (diffMinutes > 30) return "next";
        return "related";
      };

      // 1. Direct Graph Edges via Shared Articles (news_topics intersection)
      // Aggregate shared-article pairs first (index-only on news_topics), so the per-topic
      // article_count subquery runs once per candidate instead of in SELECT + HAVING + ORDER BY.
      // COUNT(*) == COUNT(DISTINCT news_id) here because (news_id, topic_id) is the PK.
      const { results: sharedEdges } = await env.DB.prepare(`
        WITH shared_ranked AS MATERIALIZED (
          SELECT
            nt_shared.topic_id,
            COUNT(*) as shared_news_count,
            MAX(nt_shared.news_id) as pivot_news_id,
            (SELECT COUNT(*) FROM news_topics nt_all WHERE nt_all.topic_id = nt_shared.topic_id) as article_count
          FROM news_topics nt1
          CROSS JOIN news_topics nt_shared
            ON nt1.news_id = nt_shared.news_id AND nt_shared.topic_id != nt1.topic_id
          WHERE nt1.topic_id = ?
          GROUP BY nt_shared.topic_id
        )
        SELECT
          t2.id,
          t2.title,
          t2.keywords,
          t2.milestones,
          t2.created_at,
          t2.updated_at,
          sr.shared_news_count,
          sr.pivot_news_id,
          sr.article_count
        FROM shared_ranked sr
        CROSS JOIN topics t2 ON t2.id = sr.topic_id
        WHERE sr.article_count >= 2
        ORDER BY sr.shared_news_count DESC, sr.article_count DESC, t2.updated_at DESC
        LIMIT 12
      `).bind(topicId).all<{
        id: number;
        title: string;
        keywords: string | null;
        milestones: string | null;
        created_at: string;
        updated_at: string;
        shared_news_count: number;
        pivot_news_id: number | null;
        article_count: number;
      }>();

      for (const edge of sharedEdges ?? []) {
        if (edge.article_count <= 2 && edge.shared_news_count >= edge.article_count && (news?.length ?? 0) <= 2) {
          continue;
        }
        relatedMap.set(edge.id, {
          ...edge,
          relation_type: classifyRelation(edge.created_at),
          is_from: edge.id === fromTopicId,
        });
      }

      // 2. Thematic / Keyword Graph Edges (recent topics sharing keywords)
      const kwTokens = (topicRow.keywords || "")
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length >= 2)
        .slice(0, 4);

      if (kwTokens.length > 0) {
        const likeClauses = kwTokens.map(() => "t2.keywords LIKE ?").join(" OR ");
        const likeParams = kwTokens.map((k) => `%${k}%`);
        const { results: kwEdges } = await env.DB.prepare(`
          SELECT
            t2.id,
            t2.title,
            t2.keywords,
            t2.milestones,
            t2.created_at,
            t2.updated_at,
            (SELECT COUNT(*) FROM news_topics nt_all WHERE nt_all.topic_id = t2.id) as article_count
          FROM topics t2
          -- The updated_at bound drives a range search on idx_topics_recent_full (the whole
          -- topics table was scanned before, ~35k rows/call). It is capped at 3 days (not the
          -- 10-day created_at window) because when <16 topics match, SQLite reads the entire
          -- range: 10d cost ~3.4k rows/call. Only topics active in the last 3 days are linked.
          -- No created_at filter: topics stop receiving updates 10 days after creation
          -- (queue.ts guard), so this only lets recently-closed topics appear as background.
          WHERE t2.updated_at >= datetime('now', '-3 days')
            AND t2.id != ?
            AND (${likeClauses})
          ORDER BY t2.updated_at DESC
          LIMIT 16
        `).bind(topicId, ...likeParams).all<{
          id: number;
          title: string;
          keywords: string | null;
          milestones: string | null;
          created_at: string;
          updated_at: string;
          article_count: number;
        }>();

        for (const ke of kwEdges ?? []) {
          if (ke.article_count < 2 || relatedMap.has(ke.id)) continue;
          const matchedKws = kwTokens.filter((k) => (ke.keywords || "").includes(k));
          relatedMap.set(ke.id, {
            ...ke,
            shared_news_count: 0,
            pivot_news_id: null,
            shared_keywords: matchedKws,
            relation_type: classifyRelation(ke.created_at),
            is_from: ke.id === fromTopicId,
          });
        }
      }

      // 3. Ensure bidirectional return to `fromTopicId` if user navigated here via a topic link
      if (fromTopicId && !relatedMap.has(fromTopicId)) {
        const fromRow = await env.DB.prepare(`
          SELECT
            t2.id,
            t2.title,
            t2.keywords,
            t2.milestones,
            t2.created_at,
            t2.updated_at,
            (SELECT COUNT(*) FROM news_topics nt_all WHERE nt_all.topic_id = t2.id) as article_count
          FROM topics t2
          WHERE t2.id = ?
        `).bind(fromTopicId).first<{
          id: number;
          title: string;
          keywords: string | null;
          milestones: string | null;
          created_at: string;
          updated_at: string;
          article_count: number;
        }>();

        if (fromRow) {
          relatedMap.set(fromRow.id, {
            ...fromRow,
            shared_news_count: 0,
            pivot_news_id: null,
            relation_type: classifyRelation(fromRow.created_at),
            is_from: true,
          });
        }
      }
    }

    return { topicRow, news: news ?? [], relatedTopics: Array.from(relatedMap.values()) };
  });

  if (!topicData.topicRow) {
    return new Response(renderNotFoundPage(user), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const html = renderPage(
    topicData.news,
    user,
    topicData.topicRow.title,
    25,
    24,
    [],
    page,
    topicId,
    topicData.topicRow.updated_at,
    topicData.topicRow.keywords,
    topicData.topicRow.milestones,
    topicData.relatedTopics
  );
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": user ? "private, no-cache" : PUBLIC_HTML_CACHE_CONTROL,
      "Vary": "Cookie",
    },
  });
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
  const html = renderHTML(content, user?.username, 25, 24, {
    title: "가이드라인 | 하이에나뉴스",
    description: "하이에나뉴스의 공정한 뉴스 큐레이션 및 AI 토픽 클러스터링 가이드라인입니다.",
    canonicalPath: "/guidelines",
    hasFeedback: Boolean(user?.has_feedback),
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
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
  const html = renderHTML(content, user?.username, 25, 24, {
    title: "법적고지 | 하이에나뉴스",
    description: "하이에나뉴스 RSS 피드 기반 뉴스 링크 서비스 법적고지 및 저작권 안내입니다.",
    canonicalPath: "/legal",
    hasFeedback: Boolean(user?.has_feedback),
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
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
