import { Router } from "../../core/router";
import { Env, getSessionUser } from "../../auth";
import { getRelativeTime, isHumanBrowserNavigation } from "../../core/utils";
import {
  EDGE_CACHE_TTL_SECONDS,
  PUBLIC_HTML_CACHE_CONTROL,
  HOME_BRIEFINGS_CACHE_KEY,
  invalidateEdgeCache,
  withEdgeCache,
} from "../../core/cache";
import { stripBlogDatePrefix } from "../blog/service";
import { searchTopicsHybrid } from "../ai/router";
import {
  renderHTML,
  renderNewsBoard,
  renderTopics,
  renderHyenaBriefing,
  renderWideNewsList,
  renderSearchResults,
  renderPagination,
  renderTopicTimeline,
  SeoOptions,
} from "./templates";

export const uiRouter = new Router();

// Define shared interfaces used by the UI routes
export interface NewsRow {
  id: number;
  title: string;
  url: string;
  description: string;
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
  return renderHTML(errorHtml, user?.username || null, {
    title: "404 - 페이지를 찾을 수 없습니다 | 하이에나뉴스",
    noindex: true,
    hasFeedback: Boolean(user?.has_feedback),
  });
}

export const HOME_PAGE_SIZE = 20;
export type NewsSort = "latest" | "views";

export function renderHomePage(opts: {
  news: NewsRow[];
  hasMore: boolean;
  hotTopics: TopicRow[];
  latestBriefings: Array<{ slug: string; title: string; summary?: string; target_date: string; view_count?: number; published_at?: string }>;
  user: any;
  page?: number;
  sort?: NewsSort;
}): string {
  const { news, hasMore, hotTopics, latestBriefings, user } = opts;
  const page = Number.isFinite(opts.page) && opts.page! > 0 ? Math.floor(opts.page!) : 1;
  const sort: NewsSort = opts.sort === "latest" ? "latest" : "views";
  let content = "";

  if (hotTopics && hotTopics.length > 0) {
    content += renderTopics(hotTopics);
  }

  if (latestBriefings && latestBriefings.length > 0) {
    content += renderHyenaBriefing(latestBriefings);
  }

  content += renderNewsBoard(news, sort);

  const buildPageUrl = (targetPage: number) => {
    if (sort === "latest") {
      return targetPage > 1 ? `/?sort=latest&page=${targetPage}` : `/?sort=latest`;
    }
    return targetPage > 1 ? `/?page=${targetPage}` : `/`;
  };

  const prevUrl = page > 1 ? buildPageUrl(page - 1) : null;
  const nextUrl = hasMore ? buildPageUrl(page + 1) : null;
  const firstUrl = page > 1 ? buildPageUrl(1) : null;
  content += renderPagination({ page, prevUrl, nextUrl, firstUrl });

  const topTopicTitles = (hotTopics || []).slice(0, 4).map((t) => t.title).filter(Boolean);
  const homeDescription =
    topTopicTitles.length > 0
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
            "urlTemplate": "https://hy3n4.news/search?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
      ...(hotTopics && hotTopics.length > 0
        ? [
            {
              "@type": "ItemList",
              "name": "실시간 뜨거운 감자 (한국 뉴스 핫토픽 Top 10)",
              "description": "최근 24시간 내 다수 언론사가 집중 보도한 대한민국 주요 뉴스 토픽 클러스터",
              "numberOfItems": hotTopics.length,
              "itemListElement": hotTopics.map((t, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "name": t.title,
                "url": `https://hy3n4.news/topic/${t.id}`,
                ...(t.keywords ? { "description": `키워드: ${t.keywords} (관련 기사 ${t.article_count}건)` } : {}),
              })),
            },
          ]
        : []),
      ...(news && news.length > 0
        ? [
            {
              "@type": "ItemList",
              "name": "대한민국 주요 언론사 최신 헤드라인",
              "numberOfItems": Math.min(news.length, 20),
              "itemListElement": news.slice(0, 20).map((item, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "item": {
                  "@type": "NewsArticle",
                  "headline": item.title,
                  "url": item.url || `https://hy3n4.news/go/${item.id}`,
                  "datePublished": item.published_at || item.created_at,
                  "publisher": {
                    "@type": "Organization",
                    "name": item.source_name || "언론사",
                  },
                },
              })),
            },
          ]
        : []),
    ],
  };

  return renderHTML(content, user?.username || null, {
    title: "하이에나뉴스 | 주요 언론사 실시간 헤드라인 & 핫토픽 모아보기",
    description: homeDescription,
    canonicalPath: homeCanonicalPath,
    jsonLd: homeJsonLd,
    hasFeedback: Boolean(user?.has_feedback),
  });
}

export function renderTopicDetailPage(opts: {
  topic: { id: number; title: string; updated_at: string; keywords: string | null; milestones: string | null };
  news: NewsRow[];
  relatedTopics: RelatedTopicNode[];
  user: any;
  page?: number;
}): string {
  const { topic, news, relatedTopics, user } = opts;
  const page = Number.isFinite(opts.page) && opts.page! > 0 ? Math.floor(opts.page!) : 1;
  const timeStr = topic.updated_at ? getRelativeTime(topic.updated_at, topic.updated_at) : "";
  const updateInfo = timeStr
    ? `<span style="font-size: 14px; color: var(--secondary); font-weight: normal; margin-left: 10px;">마지막 업데이트: ${timeStr}</span>`
    : "";

  let content = `<h2 style="padding: 20px 0; max-width: 800px; margin: 0 auto; color: var(--border); border-bottom: 2px solid var(--accent); padding-bottom: 12px; font-size: 22px; margin-bottom: 24px;">${topic.title}${updateInfo}</h2>`;
  if (page === 1 && (topic.milestones || (relatedTopics && relatedTopics.length > 0))) {
    content += renderTopicTimeline(topic.milestones, relatedTopics, topic.id);
  }
  content += renderWideNewsList(news);

  const topicHasMore = news.length === 30;
  const topicPrevUrl = page > 1 ? `/topic/${topic.id}?page=${page - 1}` : null;
  const topicNextUrl = topicHasMore ? `/topic/${topic.id}?page=${page + 1}` : null;
  const topicFirstUrl = page > 1 ? `/topic/${topic.id}?page=1` : null;
  content += renderPagination({
    page,
    prevUrl: topicPrevUrl,
    nextUrl: topicNextUrl,
    firstUrl: topicFirstUrl,
  });

  const uniqueSources = Array.from(new Set((news || []).map((n) => n.source_name).filter(Boolean)));
  const sourcesSummary = uniqueSources.length > 0 ? `${uniqueSources.slice(0, 5).join(", ")} 등 ` : "";
  const kwSummary = topic.keywords ? ` (주요 키워드: ${topic.keywords})` : "";
  const seoDescription = `${topic.title} 이슈에 대한 ${sourcesSummary}언론사별 기사 ${news.length}건을 한눈에 비교해보세요.${kwSummary}`;
  const canonicalPath = page > 1 ? `/topic/${topic.id}?page=${page}` : `/topic/${topic.id}`;

  const seo: SeoOptions = {
    title: `${topic.title} - 언론사별 뉴스 비교 (${news.length}건) | 하이에나뉴스`,
    description: seoDescription,
    canonicalPath,
    ogType: "article",
    hasFeedback: Boolean(user?.has_feedback),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": topic.title,
      "headline": topic.title,
      "url": `https://hy3n4.news${canonicalPath}`,
      "inLanguage": "ko-KR",
      "description": seoDescription,
      ...(topic.updated_at ? { "dateModified": topic.updated_at } : {}),
      ...(topic.keywords ? { "keywords": topic.keywords } : {}),
      "isPartOf": {
        "@type": "WebSite",
        "name": "하이에나뉴스",
        "url": "https://hy3n4.news/",
      },
      "mainEntity": {
        "@type": "ItemList",
        "name": `${topic.title} 관련 언론사별 기사 목록`,
        "numberOfItems": news.length,
        "itemListElement": (news || []).slice(0, 30).map((item, idx) => ({
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
              "name": item.source_name || "언론사",
            },
          },
        })),
      },
    },
  };

  return renderHTML(content, user?.username || null, seo);
}

export function getNewsBoardCacheKey(
  sort: NewsSort = "views",
  page: number = 1,
  limit: number = HOME_PAGE_SIZE
): string {
  return `https://hy3n4.news/__cache/d1/news-board/v5?sort=${sort}&page=${page}&limit=${limit}`;
}

export async function fetchNewsCached(
  env: Env,
  ctx: ExecutionContext | undefined,
  page: number = 1,
  sort: NewsSort = "views",
  limit: number = HOME_PAGE_SIZE
): Promise<{ news: NewsRow[]; hasMore: boolean; rowsRead?: number; durationMs?: number }> {
  const safePage = Math.min(Math.max(1, Math.floor(page)), 100);
  const offset = (safePage - 1) * limit;
  const fetchLimit = limit + 1;
  const newsCacheKey = getNewsBoardCacheKey(sort, safePage, limit);

  return withEdgeCache<{ news: NewsRow[]; hasMore: boolean; rowsRead?: number; durationMs?: number }>(
    newsCacheKey,
    EDGE_CACHE_TTL_SECONDS,
    ctx,
    async () => {
      if (sort === "views") {
        // Hacker News style time-decay ranking over the last 24h:
        // 1) viewed_recent scans ONLY clicked articles in 24h via covering partial index idx_news_hot_covering (zero table lookups during scoring)
        // 2) unviewed_recent reads at most (offset + fetchLimit) rows in index order via idx_news_feed_composite
        const timeAgo24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { results, meta } = await env.DB.prepare(`
          -- NEWS QUERY
          WITH viewed_recent AS (
              SELECT id, published_at, created_at,
                     1 as tier,
                     ((view_count * 10.0 + 1.0) / POW(MAX((julianday('now') - julianday(published_at)) * 24.0, 0.0) + 2.0, 1.5)) as sort_score
              FROM news INDEXED BY idx_news_hot_covering
              WHERE view_count > 0
                AND published_at >= ?
          ),
          unviewed_recent AS (
              SELECT id, published_at, created_at,
                     0 as tier,
                     0.0 as sort_score
              FROM news INDEXED BY idx_news_feed_composite
              WHERE published_at >= ?
                AND view_count = 0
              ORDER BY published_at DESC, created_at DESC
              LIMIT ?
          ),
          combined AS (
              SELECT * FROM viewed_recent
              UNION ALL
              SELECT * FROM unviewed_recent
          ),
          page_ids AS (
              SELECT id
              FROM combined
              ORDER BY tier DESC, sort_score DESC, published_at DESC, created_at DESC
              LIMIT ? OFFSET ?
          )
          SELECT 
              n.id, n.title, n.url, '' as description, n.view_count, n.published_at, n.created_at, 
              s.name as source_name,
              (SELECT group_concat(t.keywords, ', ') 
               FROM news_topics nt 
               JOIN topics t ON nt.topic_id = t.id 
               WHERE nt.news_id = n.id) as keywords
          FROM page_ids p
          CROSS JOIN news n ON n.id = p.id
          CROSS JOIN sources s ON n.source_id = s.id;
        `).bind(timeAgo24h, timeAgo24h, offset + fetchLimit, fetchLimit, offset).all<NewsRow>();

        const rows = results ?? [];
        const hasMore = rows.length > limit;
        return {
          news: hasMore ? rows.slice(0, limit) : rows,
          hasMore,
          rowsRead: meta?.rows_read,
          durationMs: meta?.duration,
        };
      }

      const { results, meta } = await env.DB.prepare(`
        -- NEWS QUERY
        WITH page_news AS (
            SELECT id, source_id, title, url, view_count, published_at, created_at
            FROM news
            ORDER BY published_at DESC, created_at DESC
            LIMIT ? OFFSET ?
        )
        SELECT 
            n.id, n.title, n.url, '' as description, n.view_count, n.published_at, n.created_at, 
            s.name as source_name,
            (SELECT group_concat(t.keywords, ', ') 
             FROM news_topics nt 
             JOIN topics t ON nt.topic_id = t.id 
             WHERE nt.news_id = n.id) as keywords
        FROM page_news n
        CROSS JOIN sources s ON n.source_id = s.id;
      `).bind(fetchLimit, offset).all<NewsRow>();

      const rows = results ?? [];
      const hasMore = rows.length > limit;
      return {
        news: hasMore ? rows.slice(0, limit) : rows,
        hasMore,
        rowsRead: meta?.rows_read,
        durationMs: meta?.duration,
      };
    }
  );
}

export async function fetchHotTopicsCached(
  env: Env,
  ctx?: ExecutionContext
): Promise<TopicRow[]> {
  const topicsCacheKey = `https://hy3n4.news/__cache/d1/hot-topics/v7`;

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
          AND t.last_summarized_count >= 2
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
      c.title = (c.title || "").replace(/\s*(?:→|->)\s*/g, " · ");
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
  const sitemapCacheKey = `https://hy3n4.news/__cache/d1/sitemap-topics`;

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

export async function fetchLatestBriefingsCached(
  env: Env,
  ctx?: ExecutionContext
): Promise<Array<{ slug: string; title: string; summary: string; target_date: string; view_count: number; published_at: string }>> {
  return withEdgeCache(HOME_BRIEFINGS_CACHE_KEY, EDGE_CACHE_TTL_SECONDS, ctx, async () => {
    try {
      const { results } = await env.DB.prepare(`
        SELECT slug, title, summary, target_date, COALESCE(view_count, 0) as view_count, published_at
        FROM blog_posts
        ORDER BY published_at DESC, id DESC
        LIMIT 3;
      `).all<{ slug: string; title: string; summary: string; target_date: string; view_count: number; published_at: string }>();
      return (results ?? []).map((r) => ({
        ...r,
        title: stripBlogDatePrefix(r.title),
      }));
    } catch {
      return [];
    }
  });
}

// --- Routes ---

uiRouter.get("/api/trends", async (_request, env, ctx) => {
  const [hotTopics, { news }] = await Promise.all([
    fetchHotTopicsCached(env, ctx),
    fetchNewsCached(env, ctx, 1, "latest"),
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
  const user = await getSessionUser(request, env);

  const { topics, newsByTopic, hasMore } = await searchTopicsHybrid(env, q, page, 20);

  const content = renderSearchResults(q, topics, newsByTopic, page, hasMore);
  const searchTitle = q ? `"${q}" 뉴스 토픽 검색 결과 | 하이에나뉴스` : "최신 뉴스 토픽 목록 | 하이에나뉴스";
  const searchDescription = q
    ? `"${q}" 관련 대한민국 주요 언론사 뉴스 토픽 클러스터 및 기사 비교 검색 결과입니다.`
    : "대한민국 주요 언론사 기사를 AI로 클러스터링한 최신 뉴스 토픽 목록입니다.";
  const searchCanonical = q
    ? `/search?q=${encodeURIComponent(q)}${page > 1 ? `&page=${page}` : ""}`
    : `/search${page > 1 ? `?page=${page}` : ""}`;

  return new Response(
    renderHTML(content, user?.username || null, {
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

  const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(Math.floor(rawPage), 100) : 1;
  const sort: NewsSort = url.searchParams.get("sort") === "latest" ? "latest" : "views";

  const [{ news, hasMore, rowsRead, durationMs }, hotTopics, latestBriefings] = await Promise.all([
    fetchNewsCached(env, ctx, page, sort, HOME_PAGE_SIZE),
    fetchHotTopicsCached(env, ctx),
    fetchLatestBriefingsCached(env, ctx),
  ]);

  const html = renderHomePage({
    news: news ?? [],
    hasMore,
    hotTopics: hotTopics ?? [],
    latestBriefings: latestBriefings ?? [],
    user,
    page,
    sort,
  });

  const response = new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  if (typeof rowsRead === "number") {
    response.headers.set(
      "Server-Timing",
      `d1-news;desc="rows_read=${rowsRead}";dur=${Number(durationMs || 0).toFixed(2)}`
    );
  }

  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (user || isLocalhost) {
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

  const topicCacheKey = `https://hy3n4.news/__cache/d1/topic/v9/${topicId}?page=${page}`;
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

    const { results: rawNews } = await env.DB.prepare(`
        SELECT n.id, n.title, n.url, n.description, n.view_count, n.published_at, n.created_at, s.name as source_name
        FROM news_topics nt
        JOIN news n ON n.id = nt.news_id
        CROSS JOIN sources s ON n.source_id = s.id
        WHERE nt.topic_id = ?
        ORDER BY n.published_at DESC
        LIMIT 30 OFFSET ?
    `).bind(topicId, (page - 1) * 30).all<NewsRow>();

    const news: NewsRow[] = (rawNews ?? []).map((item) => ({
      ...item,
      keywords: topicRow.keywords || "",
    }));

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

      // Direct Graph Edges via Shared Articles (news_topics intersection)
      // Uses covering index on news_topics with early LIMIT 8 before joining topics,
      // and reads t2.last_summarized_count instead of running N correlated COUNT(*) subqueries.
      const { results: sharedEdges } = await env.DB.prepare(`
        WITH shared_ranked AS (
          SELECT
            nt_shared.topic_id,
            COUNT(*) as shared_news_count,
            MAX(nt_shared.news_id) as pivot_news_id
          FROM (
            SELECT news_id FROM news_topics WHERE topic_id = ? ORDER BY news_id DESC LIMIT 25
          ) nt1
          CROSS JOIN news_topics nt_shared
            ON nt1.news_id = nt_shared.news_id AND nt_shared.topic_id != ?
          GROUP BY nt_shared.topic_id
          ORDER BY shared_news_count DESC, pivot_news_id DESC
          LIMIT 8
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
          MAX(t2.last_summarized_count, sr.shared_news_count) as article_count
        FROM shared_ranked sr
        CROSS JOIN topics t2 ON t2.id = sr.topic_id
        WHERE t2.last_summarized_count >= 2 OR sr.shared_news_count >= 2
        ORDER BY sr.shared_news_count DESC, t2.updated_at DESC
        LIMIT 8
      `).bind(topicId, topicId).all<{
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
        if (edge.article_count <= 2 && edge.shared_news_count >= edge.article_count && news.length <= 2) {
          continue;
        }
        relatedMap.set(edge.id, {
          ...edge,
          relation_type: classifyRelation(edge.created_at),
        });
      }
    }

    return { topicRow, news, relatedTopics: Array.from(relatedMap.values()) };
  });

  if (!topicData.topicRow) {
    return new Response(renderNotFoundPage(user), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // Personalize is_from flag and add fromTopic if missing (without busting global edge cache)
  let relatedTopics: RelatedTopicNode[] = (topicData.relatedTopics || []).map((r) => ({
    ...r,
    is_from: fromTopicId ? r.id === fromTopicId : false,
  }));

  if (fromTopicId && !relatedTopics.some((r) => r.id === fromTopicId)) {
    const curCreatedMs = topicData.topicRow?.created_at
      ? new Date(topicData.topicRow.created_at.replace(" ", "T") + "Z").getTime()
      : Date.now();

    const fromRow = await env.DB.prepare(`
      SELECT
        t2.id,
        t2.title,
        t2.keywords,
        t2.milestones,
        t2.created_at,
        t2.updated_at,
        MAX(t2.last_summarized_count, 2) as article_count
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
      const edgeCreatedMs = new Date(fromRow.created_at.replace(" ", "T") + "Z").getTime();
      const diffMinutes = (edgeCreatedMs - curCreatedMs) / (1000 * 60);
      const relation_type = diffMinutes < -30 ? "prior" : diffMinutes > 30 ? "next" : "related";
      relatedTopics.push({
        ...fromRow,
        shared_news_count: 0,
        pivot_news_id: null,
        relation_type,
        is_from: true,
      });
    }
  }

  const html = renderTopicDetailPage({
    topic: topicData.topicRow,
    news: topicData.news,
    relatedTopics,
    user,
    page,
  });
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": user ? "private, no-cache" : PUBLIC_HTML_CACHE_CONTROL,
      "Vary": "Cookie",
    },
  });
});

uiRouter.get("/guidelines", async (request, env) => {
  const user = await getSessionUser(request, env);
  const content = `
        <div class="static-content">
            <h2>가이드라인</h2>
            <p>하이에나뉴스는 공정한 뉴스 큐레이션을 지향합니다.</p>
            <ul>
                <li>중복된 내용은 시스템에 의해 자동으로 그룹화됩니다.</li>
                <li>자극적인 제목보다는 팩트 중심의 기사를 우선합니다.</li>
                <li>특정 정파에 치우치지 않는 다양한 시각을 제공하려 노력합니다.</li>
            </ul>
        </div>
    `;
  const html = renderHTML(content, user?.username || null, {
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
        <div class="static-content">
            <h2>법적고지</h2>
            <p>본 서비스는 각 언론사가 제공하는 RSS 피드를 기반으로 링크를 제공하는 검색 서비스입니다.</p>
            <p>모든 기사의 저작권은 해당 언론사에 있으며, 기사 내용에 대한 책임 또한 각 언론사에 있습니다.</p>
            <p>본 서비스는 링크 제공 과정에서 어떠한 기사 내용도 변조하거나 직접 호스팅하지 않습니다.</p>
        </div>
    `;
  const html = renderHTML(content, user?.username || null, {
    title: "법적고지 | 하이에나뉴스",
    description: "하이에나뉴스 RSS 피드 기반 뉴스 링크 서비스 법적고지 및 저작권 안내입니다.",
    canonicalPath: "/legal",
    hasFeedback: Boolean(user?.has_feedback),
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});

uiRouter.get(/^\/go\/(\d+)$/, async (request, env, ctx, match) => {
  const newsId = parseInt(match![1], 10);

  const news = await env.DB.prepare("SELECT url FROM news WHERE id = ?").bind(newsId).first<{ url: string }>();
  if (!news) return new Response("Not Found", { status: 404 });

  // Only increment view_count and invalidate board cache for genuine human browser navigations
  if (isHumanBrowserNavigation(request)) {
    ctx.waitUntil(
      (async () => {
        try {
          await env.DB.prepare("UPDATE news SET view_count = view_count + 1 WHERE id = ?").bind(newsId).run();
          await Promise.all([
            invalidateEdgeCache(getNewsBoardCacheKey("latest", 1, HOME_PAGE_SIZE)),
            invalidateEdgeCache(getNewsBoardCacheKey("views", 1, HOME_PAGE_SIZE)),
          ]);
        } catch {}
      })()
    );
  }

  return new Response(null, { status: 302, headers: { Location: news.url } });
});
