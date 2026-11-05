import { BlogPostRecord } from "./service";

export function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Lightweight, safe Markdown to HTML converter tailored for news blog posts.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";

  // Normalize newlines
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const htmlOut: string[] = [];
  let inList = false;
  let inBlockquote = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Empty line
    if (!line.trim()) {
      if (inList) {
        htmlOut.push("</ul>");
        inList = false;
      }
      if (inBlockquote) {
        htmlOut.push("</blockquote>");
        inBlockquote = false;
      }
      continue;
    }

    // Headers
    const h3Match = line.match(/^###\s+(.+)$/);
    if (h3Match) {
      if (inList) { htmlOut.push("</ul>"); inList = false; }
      if (inBlockquote) { htmlOut.push("</blockquote>"); inBlockquote = false; }
      htmlOut.push(`<h3 class="blog-h3">${renderInlineMarkdown(h3Match[1])}</h3>`);
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      if (inList) { htmlOut.push("</ul>"); inList = false; }
      if (inBlockquote) { htmlOut.push("</blockquote>"); inBlockquote = false; }
      htmlOut.push(`<h2 class="blog-h2">${renderInlineMarkdown(h2Match[1])}</h2>`);
      continue;
    }

    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match) {
      if (inList) { htmlOut.push("</ul>"); inList = false; }
      if (inBlockquote) { htmlOut.push("</blockquote>"); inBlockquote = false; }
      htmlOut.push(`<h2 class="blog-h2 blog-h1-as-h2">${renderInlineMarkdown(h1Match[1])}</h2>`);
      continue;
    }

    // Blockquotes
    const bqMatch = line.match(/^>\s*(.*)$/);
    if (bqMatch) {
      if (inList) { htmlOut.push("</ul>"); inList = false; }
      if (!inBlockquote) {
        htmlOut.push(`<blockquote class="blog-quote">`);
        inBlockquote = true;
      }
      htmlOut.push(`<p>${renderInlineMarkdown(bqMatch[1])}</p>`);
      continue;
    } else if (inBlockquote) {
      htmlOut.push("</blockquote>");
      inBlockquote = false;
    }

    // Unordered lists
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      if (!inList) {
        htmlOut.push(`<ul class="blog-list">`);
        inList = true;
      }
      htmlOut.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`);
      continue;
    } else if (inList) {
      htmlOut.push("</ul>");
      inList = false;
    }

    // Paragraph
    htmlOut.push(`<p class="blog-p">${renderInlineMarkdown(line)}</p>`);
  }

  if (inList) htmlOut.push("</ul>");
  if (inBlockquote) htmlOut.push("</blockquote>");

  return htmlOut.join("\n");
}

function renderInlineMarkdown(text: string): string {
  let s = escapeHtml(text);

  // Bold: **text**
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links: [label](url)
  s = s.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, (_match: string, label: string, url: string) => {
    const isInternal = url.includes("hy3n4.news");
    return `<a href="${url}" ${isInternal ? "" : 'target="_blank" rel="noopener noreferrer"'} class="blog-link">${label}</a>`;
  });

  // Inline code: `code`
  s = s.replace(/`([^`]+)`/g, '<code class="blog-code">$1</code>');

  return s;
}

/**
 * Formats YYYY-MM-DD into Korean date string (예: 2026년 11월 4일)
 */
export function formatKoreanDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
}

/**
 * Renders the Blog List page.
 */
export function renderBlogListPage(
  posts: BlogPostRecord[],
  page: number = 1,
  hasMore: boolean = false
): string {
  const postCards = posts.length > 0
    ? posts.map((post) => {
        let topics: Array<{ id: number; title: string; article_count: number }> = [];
        try {
          if (post.topics_data) topics = JSON.parse(post.topics_data);
        } catch {}

        const topicBadges = topics.slice(0, 3).map((t) => `
          <a href="/topic/${t.id}" class="blog-topic-pill" title="${escapeHtml(t.title)} 타임라인 보기">
            <span>🔥 ${escapeHtml(t.title.length > 18 ? t.title.slice(0, 18) + '...' : t.title)}</span>
            <span class="pill-count">${t.article_count}건</span>
          </a>
        `).join("");

        return `
          <article class="blog-card">
            <div class="blog-card-meta">
              <span class="blog-date-badge">${formatKoreanDate(post.target_date)}</span>
              <span class="blog-meta-time">발행 ${post.published_at.slice(0, 10)}</span>
            </div>
            <h2 class="blog-card-title">
              <a href="/blog/${escapeHtml(post.slug)}">${escapeHtml(post.title)}</a>
            </h2>
            <p class="blog-card-summary">${escapeHtml(post.summary)}</p>
            ${topicBadges ? `<div class="blog-card-topics">${topicBadges}</div>` : ""}
            <div class="blog-card-footer">
              <a href="/blog/${escapeHtml(post.slug)}" class="blog-read-more">
                전체 분석 읽기 →
              </a>
            </div>
          </article>
        `;
      }).join("")
    : `
      <div class="empty-state">
        <p>아직 발행된 블로그 포스트가 없습니다.</p>
        <p style="font-size: 13px; color: var(--secondary); margin-top: 6px;">
          매일 16:00 PST (한국시간 오전 9시)에 전날의 3대 핵심 뉴스 분석이 자동 발행됩니다.
        </p>
      </div>
    `;

  const prevLink = page > 1 ? `/blog${page === 2 ? "" : `?page=${page - 1}`}` : null;
  const nextLink = hasMore ? `/blog?page=${page + 1}` : null;

  const paginationHtml = (prevLink || nextLink)
    ? `
      <nav class="blog-pagination" aria-label="블로그 페이지 이동">
        ${prevLink ? `<a href="${prevLink}" class="pagination-btn">← 이전 페이지</a>` : `<span class="pagination-btn disabled">← 이전 페이지</span>`}
        <span class="pagination-curr">${page} 페이지</span>
        ${nextLink ? `<a href="${nextLink}" class="pagination-btn">다음 페이지 →</a>` : `<span class="pagination-btn disabled">다음 페이지 →</span>`}
      </nav>
    `
    : "";

  return `
    <div class="blog-container">
      <header class="blog-index-header">
        <h1 class="blog-index-title">하이에나뉴스 일일 이슈 브리핑</h1>
        <p class="blog-index-desc">
          대한민국 주요 언론사들의 기사를 AI로 클러스터링하여, 매일 가장 뜨거웠던 3대 핵심 토픽의 전개 과정과 언론사별 시각을 심층 정리합니다.
        </p>
      </header>

      <section class="blog-feed">
        ${postCards}
      </section>

      ${paginationHtml}
    </div>
  `;
}

/**
 * Renders an individual Blog Post page with JSON-LD Schema.
 */
export function renderBlogPostPage(
  post: BlogPostRecord,
  prevPost: BlogPostRecord | null = null,
  nextPost: BlogPostRecord | null = null
): string {
  const contentHtml = markdownToHtml(post.content);

  let topics: Array<{ id: number; title: string; keywords?: string; article_count: number; source_count: number }> = [];
  try {
    if (post.topics_data) topics = JSON.parse(post.topics_data);
  } catch {}

  const topicCardsHtml = topics.length > 0
    ? `
      <section class="blog-topics-spotlight" aria-label="관련 뉴스 토픽">
        <div class="spotlight-header">
          <span>관련 실시간 토픽 타임라인 (하이에나 클러스터)</span>
        </div>
        <div class="spotlight-grid">
          ${topics.map((t) => `
            <a href="/topic/${t.id}" class="spotlight-card">
              <div class="spotlight-card-title">${escapeHtml(t.title)}</div>
              <div class="spotlight-card-meta">
                <span>기사 ${t.article_count}건</span>
                <span>언론사 ${t.source_count}곳</span>
                ${t.keywords ? `<span class="spotlight-kw">${escapeHtml(t.keywords.split(",").slice(0, 2).join(", "))}</span>` : ""}
              </div>
            </a>
          `).join("")}
        </div>
      </section>
    `
    : "";

  const postUrl = `https://hy3n4.news/blog/${encodeURIComponent(post.slug)}`;

  // JSON-LD structured data for Google SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": postUrl,
    },
    "headline": post.title,
    "description": post.summary,
    "datePublished": post.published_at.endsWith("Z") ? post.published_at : `${post.published_at.replace(" ", "T")}Z`,
    "dateModified": post.published_at.endsWith("Z") ? post.published_at : `${post.published_at.replace(" ", "T")}Z`,
    "author": {
      "@type": "Organization",
      "name": "하이에나뉴스 AI 편집팀",
      "url": "https://hy3n4.news",
    },
    "publisher": {
      "@type": "Organization",
      "name": "하이에나뉴스",
      "logo": {
        "@type": "ImageObject",
        "url": "https://hy3n4.news/hyena.svg",
      },
    },
    "inLanguage": "ko-KR",
  };

  return `
    <script type="application/ld+json">
      ${JSON.stringify(jsonLd)}
    </script>

    <div class="blog-container">
      <nav class="blog-breadcrumb" aria-label="Breadcrumb">
        <a href="/">홈</a><span class="bc-sep" aria-hidden="true">/</span><a href="/blog">블로그</a><span class="bc-sep" aria-hidden="true">/</span><span>${formatKoreanDate(post.target_date)}</span>
      </nav>

      <article class="blog-article">
        <header class="blog-article-header">
          <div class="blog-article-meta">
            <span class="blog-date-badge">${formatKoreanDate(post.target_date)} 브리핑</span>
            <span class="blog-meta-time">발행일: ${post.published_at.slice(0, 16)} KST</span>
          </div>
          <h1 class="blog-article-title">${escapeHtml(post.title)}</h1>
          <div class="blog-article-lead">
            <strong>핵심 요약:</strong> ${escapeHtml(post.summary)}
          </div>
        </header>

        <div class="blog-content">
          ${contentHtml}
        </div>

        <footer class="blog-article-footer">
          ${topicCardsHtml}

          <div class="blog-cta-box">
            <div class="cta-title">실시간 언론사별 뉴스 비교는 하이에나뉴스에서</div>
            <p class="cta-desc">
              하이에나뉴스는 대한민국 주요 언론사의 보도를 실시간으로 수집하여 동일 사건의 언론사별 관점과 타임라인을 제공합니다.
            </p>
            <div class="cta-actions">
              <a href="/" class="cta-btn primary">실시간 핫토픽 보러가기</a>
              <a href="/search" class="cta-btn secondary">과거 뉴스 토픽 검색</a>
            </div>
          </div>

          <div class="blog-nav-row">
            <div class="nav-prev">
              ${prevPost ? `
                <span class="nav-label">← 이전 브리핑</span>
                <a href="/blog/${escapeHtml(prevPost.slug)}" class="nav-title">${escapeHtml(prevPost.title)}</a>
              ` : `<span></span>`}
            </div>
            <div class="nav-next">
              ${nextPost ? `
                <span class="nav-label">다음 브리핑 →</span>
                <a href="/blog/${escapeHtml(nextPost.slug)}" class="nav-title">${escapeHtml(nextPost.title)}</a>
              ` : `<span></span>`}
            </div>
          </div>
        </footer>
      </article>
    </div>
  `;
}
