import { Router } from "./core/router";
import {
  uiRouter,
  renderNotFoundPage,
  fetchHotTopicsCached,
  fetchNewsCached,
  fetchSitemapTopicsCached,
  PUBLIC_HTML_CACHE_CONTROL,
} from "./features/ui/router";
import { rssRouter } from "./features/rss/router";
import { userRouter } from "./features/user/router";
import { aiRouter } from "./features/ai/router";
import { blogRouter } from "./features/blog/router";
import { ensureBlogTable } from "./features/blog/service";
import { getSessionUser } from "./auth";

export const app = new Router();

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderLlmsMarkdown(
  hotTopics: any[],
  newsBySource?: Record<string, any[]>
): string {
  const nowIso = new Date().toISOString();

  let md = `# 하이에나뉴스 (hy3n4.news) - 대한민국 실시간 뉴스 트렌드 & 언론사별 헤드라인 비교

> 하이에나뉴스(https://hy3n4.news)는 대한민국 주요 언론사(조선일보, 경향신문, 연합뉴스, JTBC, 동아일보 등)의 실시간 뉴스를 수집하고, AI 임베딩·벡터 클러스터링을 통해 현재 한국에서 가장 주목받는 핵심 이슈("뜨거운 감자" 핫토픽 Top 10)와 언론사별 시각 차이를 한눈에 비교할 수 있도록 제공하는 한국 뉴스 트렌드 플랫폼입니다.

- **기준 시각 (UTC)**: ${nowIso}
- **업데이트 주기**: 30분마다 실시간 RSS 수집 및 AI 토픽 클러스터링 자동 갱신
- **주요 활용 사례**: "오늘 한국 주요 뉴스가 뭐야?", "최근 한국 경제/사회 핫이슈 알려줘", "특정 사건에 대해 한국 언론사들이 어떻게 보도하고 있어?" 등의 질문에 대한 실시간 근거 자료(Source)

## AI 에이전트 및 검색 크롤러 활용 가이드 (Endpoints for AI Agents)

1. **실시간 한국 뉴스 트렌드 JSON API**: [https://hy3n4.news/api/trends](https://hy3n4.news/api/trends)
   - 현재 핫토픽 Top 10(제목, 키워드, 기사 수, 토픽 링크)과 언론사별 최신 헤드라인을 정형화된 JSON으로 즉시 반환합니다.
2. **전체 마크다운 브리핑 (핫토픽 + 언론사별 최신 헤드라인)**: [https://hy3n4.news/llms-full.txt](https://hy3n4.news/llms-full.txt)
   - LLM 컨텍스트에 바로 주입하기 좋은 전체 뉴스 요약본입니다.
3. **토픽별 언론사 비교 페이지**: \`https://hy3n4.news/topic/{id}\`
   - 동일한 사건/이슈에 대해 조선일보, 경향신문, 연합뉴스, JTBC, 동아일보 등 각 언론사가 보도한 기사 제목과 요약문을 한 페이지에서 비교할 수 있습니다.
4. **하이브리드(시맨틱 벡터 + 키워드) 토픽 검색**:
   - 웹 검색 결과 페이지: \`https://hy3n4.news/search?q={검색어}\`
   - JSON 검색 API: \`https://hy3n4.news/api/search?q={검색어}\`

## 실시간 뜨거운 감자 (한국 뉴스 핫토픽 Top 10)
`;

  if (!hotTopics || hotTopics.length === 0) {
    md += `\n현재 집계된 실시간 핫토픽이 없습니다. [메인 페이지](https://hy3n4.news/)에서 최신 헤드라인을 확인하세요.\n`;
  } else {
    hotTopics.forEach((t, idx) => {
      const kw = t.keywords
        ? t.keywords
            .split(",")
            .map((k: string) => k.trim())
            .filter(Boolean)
            .map((k: string) => `#${k}`)
            .join(" ")
        : "";
      md += `\n${idx + 1}. **[${t.title}](https://hy3n4.news/topic/${t.id})** (관련 기사 ${t.article_count}건)${kw ? ` — 키워드: ${kw}` : ""}`;
    });
    md += "\n";
  }

  if (newsBySource && Object.keys(newsBySource).length > 0) {
    md += `\n## 언론사별 최신 주요 헤드라인 (최근 24시간)\n`;
    for (const [sourceName, items] of Object.entries(newsBySource)) {
      md += `\n### ${sourceName}\n`;
      for (const item of items) {
        const pubTime = item.published_at || item.created_at || "";
        const kw = item.keywords
          ? Array.from(
              new Set(
                item.keywords
                  .split(",")
                  .map((k: string) => k.trim())
                  .filter(Boolean)
              )
            )
              .slice(0, 3)
              .map((k) => `#${k}`)
              .join(" ")
          : "";
        md += `- [${item.title}](${item.url}) (${pubTime})${kw ? ` ${kw}` : ""}\n`;
      }
    }
  }

  md += `\n## 참고 링크
- 메인 페이지 (실시간 헤드라인 비교): [https://hy3n4.news/](https://hy3n4.news/)
- 실시간 트렌드 JSON: [https://hy3n4.news/api/trends](https://hy3n4.news/api/trends)
- 전체 LLM 브리핑: [https://hy3n4.news/llms-full.txt](https://hy3n4.news/llms-full.txt)
- 사이트맵: [https://hy3n4.news/sitemap.xml](https://hy3n4.news/sitemap.xml)
`;

  return md;
}

// SEO & AI Discovery: robots.txt
app.get("/robots.txt", () => {
  const aiBots = [
    "OAI-SearchBot",
    "ChatGPT-User",
    "GPTBot",
    "PerplexityBot",
    "Perplexity-User",
    "ClaudeBot",
    "Claude-Web",
    "Claude-SearchBot",
    "anthropic-ai",
    "Google-Extended",
    "Googlebot",
    "Bingbot",
    "Yeti",
  ];

  const botRules = aiBots
    .map(
      (bot) => `User-agent: ${bot}
Allow: /
Allow: /blog
Allow: /api/trends
Allow: /llms.txt
Allow: /llms-full.txt
Disallow: /go/
Disallow: /auth/
Disallow: /api/feedback`
    )
    .join("\n\n");

  const robotsTxt = `${botRules}

User-agent: *
Allow: /
Allow: /blog
Disallow: /go/
Disallow: /auth/
Disallow: /api/feedback

# AI Agent & LLM Context Endpoints
# Daily Blog: https://hy3n4.news/blog
# LLMs Briefing: https://hy3n4.news/llms.txt
# LLMs Full Snapshot: https://hy3n4.news/llms-full.txt
# Structured Trends JSON: https://hy3n4.news/api/trends
Sitemap: https://hy3n4.news/sitemap.xml
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": PUBLIC_HTML_CACHE_CONTROL,
    },
  });
});

// AI Agent Discovery: /llms.txt (Concise guide + Live Top 10 Hot Topics)
app.get("/llms.txt", async (_request, env, ctx) => {
  const hotTopics = await fetchHotTopicsCached(env, ctx);
  const md = renderLlmsMarkdown(hotTopics ?? []);

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": PUBLIC_HTML_CACHE_CONTROL,
      "Access-Control-Allow-Origin": "*",
    },
  });
});

// AI Agent Discovery: /llms-full.txt (Full snapshot: Live Top 10 Hot Topics + Headlines by Press)
app.get("/llms-full.txt", async (_request, env, ctx) => {
  const [hotTopics, news] = await Promise.all([
    fetchHotTopicsCached(env, ctx),
    fetchNewsCached(env, ctx, 24, 10, 1),
  ]);

  const newsBySource: Record<string, any[]> = {};
  for (const item of news ?? []) {
    const src = item.source_name || "Unknown";
    if (!newsBySource[src]) newsBySource[src] = [];
    if (newsBySource[src].length < 10) {
      newsBySource[src].push(item);
    }
  }

  const md = renderLlmsMarkdown(hotTopics ?? [], newsBySource);

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": PUBLIC_HTML_CACHE_CONTROL,
      "Access-Control-Allow-Origin": "*",
    },
  });
});

// SEO: Dynamic sitemap.xml (includes active topic cluster pages and blog posts, cached at Edge for 30m)
app.get("/sitemap.xml", async (_request, env, ctx) => {
  const topics = await fetchSitemapTopicsCached(env, ctx);
  const nowIso = new Date().toISOString();

  let blogPosts: Array<{ slug: string; published_at: string }> = [];
  try {
    await ensureBlogTable(env.DB);
    const { results } = await env.DB.prepare(
      "SELECT slug, published_at FROM blog_posts ORDER BY published_at DESC LIMIT 100"
    ).all<{ slug: string; published_at: string }>();
    blogPosts = results || [];
  } catch {}

  const topicUrls = (topics ?? [])
    .map((t) => {
      const lastMod = t.updated_at
        ? new Date(t.updated_at.endsWith("Z") ? t.updated_at : `${t.updated_at.replace(" ", "T")}Z`).toISOString()
        : nowIso;
      return `  <url><loc>https://hy3n4.news/topic/${escapeXml(String(t.id))}</loc><lastmod>${escapeXml(lastMod)}</lastmod><changefreq>hourly</changefreq><priority>0.8</priority></url>`;
    })
    .join("\n");

  const blogUrls = blogPosts
    .map((p) => {
      const lastMod = p.published_at
        ? new Date(p.published_at.endsWith("Z") ? p.published_at : `${p.published_at.replace(" ", "T")}Z`).toISOString()
        : nowIso;
      return `  <url><loc>https://hy3n4.news/blog/${escapeXml(p.slug)}</loc><lastmod>${escapeXml(lastMod)}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://hy3n4.news/</loc><lastmod>${escapeXml(nowIso)}</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>
  <url><loc>https://hy3n4.news/blog</loc><lastmod>${escapeXml(nowIso)}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
  <url><loc>https://hy3n4.news/search</loc><changefreq>hourly</changefreq><priority>0.7</priority></url>
  <url><loc>https://hy3n4.news/llms.txt</loc><changefreq>hourly</changefreq><priority>0.6</priority></url>
  <url><loc>https://hy3n4.news/llms-full.txt</loc><changefreq>hourly</changefreq><priority>0.6</priority></url>
  <url><loc>https://hy3n4.news/guidelines</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://hy3n4.news/legal</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
${blogUrls ? `${blogUrls}\n` : ""}${topicUrls ? `${topicUrls}\n` : ""}</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": PUBLIC_HTML_CACHE_CONTROL,
    },
  });
});

// Merge Feature Routers
app.use(uiRouter);
app.use(blogRouter);
app.use(rssRouter);
app.use(userRouter);
app.use(aiRouter);

/**
 * Override the default 404 handler to show our pretty 404 page.
 */
const originalHandle = app.handle.bind(app);
app.handle = async (request, env, ctx) => {
  try {
    const response = await originalHandle(request, env, ctx);
    // If the original handler returned the generic "Not Found" response from Router.handle
    if (response.status === 404 && (await response.clone().text()) === "Not Found") {
      const user = await getSessionUser(request, env);
      return new Response(renderNotFoundPage(user), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    return response;
  } catch (e: any) {
    console.error(`[ERROR] ${e.message}`);
    return new Response(`Application Error: ${e.message}`, { status: 500 });
  }
};
