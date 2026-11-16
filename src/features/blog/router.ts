import { Router } from "../../core/router";
import { getSessionUser } from "../../auth";
import { isAuthorizedCronRequest } from "../../core/utils";
import { renderHTML } from "../ui/templates";
import { HOME_BRIEFINGS_CACHE_KEY } from "../ui/router";
import {
  BlogPostRecord,
  publishDailyBlogPost,
  stripBlogDatePrefix,
} from "./service";
import {
  renderBlogListPage,
  renderBlogPostPage,
  buildBlogListJsonLd,
  buildBlogPostJsonLd,
} from "./templates";

export const blogRouter = new Router();

const BLOG_PAGE_SIZE = 10;

/**
 * GET /blog - Blog Post List
 */
blogRouter.get("/blog", async (request, env) => {
  const user = await getSessionUser(request, env);
  const url = new URL(request.url);
  const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const sort: "latest" | "views" = url.searchParams.get("sort") === "views" ? "views" : "latest";
  const offset = (page - 1) * BLOG_PAGE_SIZE;

  const orderBy =
    sort === "views"
      ? "COALESCE(view_count, 0) DESC, published_at DESC, id DESC"
      : "published_at DESC, id DESC";

  const { results } = await env.DB.prepare(`
    SELECT id, slug, title, summary, content, topics_data, target_date, COALESCE(view_count, 0) as view_count, published_at, created_at
    FROM blog_posts
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).bind(BLOG_PAGE_SIZE + 1, offset).all<BlogPostRecord>();

  const rows = (results || []).map((r) => ({ ...r, title: stripBlogDatePrefix(r.title) }));
  const hasMore = rows.length > BLOG_PAGE_SIZE;
  const posts = hasMore ? rows.slice(0, BLOG_PAGE_SIZE) : rows;

  const content = renderBlogListPage(posts, page, hasMore, sort);
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
      jsonLd: buildBlogListJsonLd(posts, page),
      hasFeedback: Boolean(user?.has_feedback),
    }),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        "Vary": "Cookie",
      },
    }
  );
});

/**
 * GET /blog/:slug - Individual Blog Post
 */
blogRouter.get("/blog/:slug", async (request, env, ctx, match) => {
  const slug = match![1];
  const user = await getSessionUser(request, env);

  const post = await env.DB.prepare(`
    SELECT id, slug, title, summary, content, topics_data, target_date, COALESCE(view_count, 0) as view_count, published_at, created_at
    FROM blog_posts
    WHERE slug = ?
  `).bind(slug).first<BlogPostRecord>();

  if (!post) {
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

  post.title = stripBlogDatePrefix(post.title);

  const [prevPost, nextPost] = await Promise.all([
    env.DB.prepare(`
      SELECT id, slug, title, target_date
      FROM blog_posts
      WHERE id < ?
      ORDER BY id DESC
      LIMIT 1
    `).bind(post.id).first<BlogPostRecord>(),
    env.DB.prepare(`
      SELECT id, slug, title, target_date
      FROM blog_posts
      WHERE id > ?
      ORDER BY id ASC
      LIMIT 1
    `).bind(post.id).first<BlogPostRecord>(),
  ]);

  if (prevPost) prevPost.title = stripBlogDatePrefix(prevPost.title);
  if (nextPost) nextPost.title = stripBlogDatePrefix(nextPost.title);

  const ua = request.headers.get("user-agent") || "";
  if (request.method === "GET" && !/bot|crawl|spider|slurp|facebookexternalhit|mediapartners/i.test(ua)) {
    post.view_count = (post.view_count || 0) + 1;
    ctx.waitUntil(
      (async () => {
        try {
          await env.DB.prepare("UPDATE blog_posts SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ?")
            .bind(post.id)
            .run();
          await caches.default.delete(new Request(HOME_BRIEFINGS_CACHE_KEY));
        } catch {}
      })()
    );
  }

  const content = renderBlogPostPage(post, prevPost || null, nextPost || null);
  const canonicalPath = `/blog/${post.slug}`;
  const seoTitle = `${post.title} | 하이에나뉴스 블로그`;

  return new Response(
    renderHTML(content, user?.username || null, 25, 24, {
      title: seoTitle,
      description: post.summary,
      canonicalPath,
      ogType: "article",
      jsonLd: buildBlogPostJsonLd(post),
      hasFeedback: Boolean(user?.has_feedback),
    }),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    }
  );
});

/**
 * GET /api/cron/daily-blog - Manual trigger & backfill endpoint (protected by secret key)
 * Usage:
 *   /api/cron/daily-blog?key=YOUR_CRON_SECRET
 *   /api/cron/daily-blog?key=YOUR_CRON_SECRET&date=2026-11-04&slot=morning
 */
blogRouter.get("/api/cron/daily-blog", async (request, env) => {
  if (!isAuthorizedCronRequest(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = new URL(request.url);

  const dateParam = url.searchParams.get("date")?.trim(); // optional override (e.g. 2026-11-04)
  const slotParam = url.searchParams.get("slot")?.trim() as any; // optional slot: morning | afternoon | evening
  try {
    const result = await publishDailyBlogPost(env, dateParam || undefined, slotParam || undefined);
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
