import { Router } from "../../core/router";
import { Env, getSessionUser } from "../../auth";
import { renderHTML } from "../ui/templates";
import { withEdgeCache, EDGE_CACHE_TTL_SECONDS, PUBLIC_HTML_CACHE_CONTROL } from "../ui/router";
import { BlogPostRecord, ensureBlogTable, publishDailyBlogPost, getYesterdayKstDate } from "./service";
import { renderBlogListPage, renderBlogPostPage, formatKoreanDate } from "./templates";

export const blogRouter = new Router();

const BLOG_PAGE_SIZE = 10;

/**
 * GET /blog - Blog Post List
 */
blogRouter.get("/blog", async (request, env, ctx) => {
  await ensureBlogTable(env.DB);
  const user = await getSessionUser(request, env);
  const url = new URL(request.url);
  const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const offset = (page - 1) * BLOG_PAGE_SIZE;

  const isRefresh = url.searchParams.has("refresh") || Boolean(user);
  const cacheKey = `https://cache.hy3n4.news/d1/blog/v2/list?page=${page}`;
  
  const fetchFromDb = async () => {
    const { results } = await env.DB.prepare(`
      SELECT id, slug, title, summary, content, topics_data, target_date, published_at, created_at
      FROM blog_posts
      ORDER BY target_date DESC
      LIMIT ? OFFSET ?
    `).bind(BLOG_PAGE_SIZE + 1, offset).all<BlogPostRecord>();

    const rows = results || [];
    const hasMore = rows.length > BLOG_PAGE_SIZE;
    const posts = hasMore ? rows.slice(0, BLOG_PAGE_SIZE) : rows;

    return { posts, hasMore };
  };

  const data = isRefresh
    ? await fetchFromDb()
    : await withEdgeCache<{ posts: BlogPostRecord[]; hasMore: boolean }>(
        cacheKey,
        EDGE_CACHE_TTL_SECONDS,
        ctx,
        fetchFromDb
      );

  const content = renderBlogListPage(data.posts, page, data.hasMore);
  const pageTitle = page > 1
    ? `하이에나뉴스 블로그 (${page}페이지) | 일일 뉴스 토픽 심층 브리핑`
    : `하이에나뉴스 블로그 | 대한민국 3대 뉴스 토픽 일일 심층 브리핑`;
  const pageDesc = "대한민국 주요 언론사 기사를 AI로 클러스터링하여 매일 가장 뜨거운 3대 핵심 이슈의 전개 과정과 언론사별 관점을 심층 분석합니다.";
  const canonicalPath = page > 1 ? `/blog?page=${page}` : "/blog";

  return new Response(
    renderHTML(content, user?.username || null, 25, 24, {
      title: pageTitle,
      description: pageDesc,
      canonicalPath,
      ogType: "website",
      hasFeedback: Boolean(user?.has_feedback),
    }),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": isRefresh ? "private, no-cache" : PUBLIC_HTML_CACHE_CONTROL,
        "Vary": "Cookie",
      },
    }
  );
});

/**
 * GET /blog/:slug - Individual Blog Post
 */
blogRouter.get(/^\/blog\/([a-zA-Z0-9_\-]+)$/, async (request, env, ctx, match) => {
  await ensureBlogTable(env.DB);
  const slug = match![1];
  const user = await getSessionUser(request, env);

  const cacheKey = `https://cache.hy3n4.news/d1/blog/post/${encodeURIComponent(slug)}`;
  const data = await withEdgeCache<{
    post: BlogPostRecord | null;
    prevPost: BlogPostRecord | null;
    nextPost: BlogPostRecord | null;
  }>(
    cacheKey,
    EDGE_CACHE_TTL_SECONDS,
    ctx,
    async () => {
      const post = await env.DB.prepare(`
        SELECT id, slug, title, summary, content, topics_data, target_date, published_at, created_at
        FROM blog_posts
        WHERE slug = ?
      `).bind(slug).first<BlogPostRecord>();

      if (!post) {
        return { post: null, prevPost: null, nextPost: null };
      }

      // Prev (older) post
      const prevPost = await env.DB.prepare(`
        SELECT id, slug, title, target_date
        FROM blog_posts
        WHERE target_date < ?
        ORDER BY target_date DESC
        LIMIT 1
      `).bind(post.target_date).first<BlogPostRecord>();

      // Next (newer) post
      const nextPost = await env.DB.prepare(`
        SELECT id, slug, title, target_date
        FROM blog_posts
        WHERE target_date > ?
        ORDER BY target_date ASC
        LIMIT 1
      `).bind(post.target_date).first<BlogPostRecord>();

      return { post, prevPost: prevPost || null, nextPost: nextPost || null };
    }
  );

  if (!data.post) {
    return new Response(
      renderHTML(
        `<div class="empty-state" style="padding: 60px 20px; text-align: center;">
          <h2>포스트를 찾을 수 없습니다.</h2>
          <p style="color: var(--secondary); margin-top: 8px;">요청하신 블로그 글이 존재하지 않거나 삭제되었습니다.</p>
          <a href="/blog" class="filter-btn active" style="display: inline-block; margin-top: 16px;">블로그 목록으로</a>
        </div>`,
        user?.username || null,
        25,
        24,
        {
          title: "포스트를 찾을 수 없습니다 | 하이에나뉴스 블로그",
          noindex: true,
        }
      ),
      {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }

  const post = data.post;
  const content = renderBlogPostPage(post, data.prevPost, data.nextPost);
  const canonicalPath = `/blog/${post.slug}`;
  const seoTitle = `${post.title} | 하이에나뉴스 블로그`;

  return new Response(
    renderHTML(content, user?.username || null, 25, 24, {
      title: seoTitle,
      description: post.summary,
      canonicalPath,
      ogType: "article",
      hasFeedback: Boolean(user?.has_feedback),
    }),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": PUBLIC_HTML_CACHE_CONTROL,
      },
    }
  );
});

/**
 * GET /api/cron/daily-blog - Manual trigger & backfill endpoint (protected by secret key)
 * Usage:
 *   /api/cron/daily-blog?key=YOUR_CRON_SECRET
 *   /api/cron/daily-blog?key=YOUR_CRON_SECRET&date=2026-11-03
 */
blogRouter.get("/api/cron/daily-blog", async (request, env) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!key || key !== (env as any).CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dateParam = url.searchParams.get("date")?.trim(); // optional override
  try {
    const result = await publishDailyBlogPost(env, dateParam || undefined);
    return new Response(JSON.stringify(result, null, 2), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }, null, 2),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }
});
