export interface NewsRow {
  id: number;
  title: string;
  url: string;
  description: string | null;
  upvotes: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
  source_name: string;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string | null;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

function renderNewsItem(item: NewsRow, rank: number): string {
  const domain = extractDomain(item.url);
  const ago = timeAgo(item.published_at ?? item.created_at);

  return `
    <li class="news-item">
      <div class="news-vote">
        <button
          class="vote-btn"
          hx-post="/vote/${item.id}"
          hx-target="#score-${item.id}"
          hx-swap="innerHTML"
          aria-label="upvote"
        >▲</button>
      </div>
      <div class="news-content">
        <a href="/go/${item.id}" class="news-title" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
        <div class="news-meta">
          <span class="meta-pill meta-points"><span id="score-${item.id}">${item.upvotes}</span> p</span>
          <span class="meta-pill meta-views">𓁹 ${item.view_count}</span>
          <span class="meta-pill meta-time">${ago}</span>
        </div>
      </div>
    </li>`;
}

function getStyles(): string {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --text: #2b2b2b;
      --bg: #f9e9da;
      --secondary: #4c393d;
      --border: #57352b;
      --accent: #e5a657;
    }

    body {
      font-family: 'MaruBuri', 'Nanum Myeongjo', serif;
      background: var(--bg);
      color: var(--text);
      max-width: 100%;
      margin: 0;
      padding: 0;
      line-height: 1.4;
    }

    header {
      font-family: 'Pretendard', sans-serif;
      background: var(--border);
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 3px solid var(--accent);
    }

    header h1 {
      font-size: 14px;
      font-weight: bold;
      color: var(--bg);
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    header nav a {
      color: var(--accent);
      text-decoration: none;
      font-size: 12px;
      font-weight: bold;
    }

    header nav a:hover {
      text-decoration: underline;
    }

    .auth-area {
      margin-left: auto;
      font-size: 12px;
      color: var(--bg);
    }

    .auth-area a {
      color: var(--accent);
      text-decoration: none;
      font-weight: bold;
    }

    .auth-area a:hover {
      text-decoration: underline;
    }

    .user-name {
      color: var(--accent);
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 12px 20px 0;
      border-bottom: 2px solid var(--border);
      background: rgba(87, 53, 43, 0.05); /* very light tint of border color */
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: bold;
      color: var(--secondary);
      margin-bottom: 12px;
    }

    .filter-label {
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .filter-btn {
      text-decoration: none;
      color: var(--secondary);
      padding: 6px 12px;
      border: 1px solid var(--secondary);
      border-radius: 4px;
      background: var(--bg);
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }

    .filter-btn:hover {
      background: var(--secondary);
      color: var(--bg);
    }

    .filter-btn.active {
      background: var(--accent);
      color: var(--secondary);
      border-color: var(--accent);
    }

    .news-columns {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      padding: 20px;
    }

    @media (max-width: 640px) {
      .news-columns { padding: 8px 0; gap: 12px; }
    }

    .news-column {
      flex: 1 1 calc(33.333% - 14px);
      min-width: 300px;
    }

    .column-header {
      font-size: 16px;
      font-weight: bold;
      color: var(--secondary);
      border-bottom: 2px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .news-list {
      list-style: none;
      padding: 0;
    }

    .news-item {
      display: flex;
      align-items: baseline;
      padding: 6px 0;
      border-bottom: 1px dashed rgba(87, 53, 43, 0.3);
      gap: 6px;
    }

    .news-item:hover {
      background: rgba(87, 53, 43, 0.06);
    }

    .news-rank {
      color: var(--secondary);
      font-size: 13px;
      min-width: 24px;
      text-align: right;
      flex-shrink: 0;
    }

    .news-vote {
      flex-shrink: 0;
    }

    .vote-btn {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      font-size: 14px;
      padding: 8px;
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }

    .vote-btn:hover {
      color: var(--text);
    }

    .news-content {
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }

    .news-title {
      color: var(--text);
      text-decoration: none;
      font-size: 13px;
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
    }

    .news-title:visited {
      color: var(--secondary);
    }

    .news-title:hover {
      text-decoration: underline;
    }

    .news-domain {
      color: var(--secondary);
      font-size: 11px;
    }

    .news-meta {
      display: flex;
      gap: 6px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .meta-pill {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
      font-weight: bold;
      letter-spacing: 0.3px;
    }

    .meta-points {
      color: var(--accent);
      background: rgba(229, 166, 87, 0.12);
    }

    .meta-views {
      color: var(--secondary);
      background: rgba(76, 57, 61, 0.2);
    }

    .meta-time {
      color: var(--secondary);
      background: none;
    }

    footer {
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: var(--secondary);
      border-top: 2px solid var(--border);
      margin-top: 40px;
    }

    footer a {
      color: var(--secondary);
      text-decoration: none;
    }

    footer a:hover {
      text-decoration: underline;
    }

    .static-content {
      padding: 30px 20px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .static-content h2 {
      color: var(--secondary);
      margin-bottom: 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--accent);
      font-family: 'Pretendard', sans-serif;
    }

    .static-content h3 {
      color: var(--text);
      margin-top: 24px;
      margin-bottom: 12px;
      font-family: 'Pretendard', sans-serif;
    }

    .static-content p, .static-content ul {
      margin-bottom: 16px;
    }

    .static-content li {
      margin-bottom: 8px;
      margin-left: 20px;
    }
  `;
}

function renderHeader(user: UserInfo | null, pageTitle: string): string {
  const authHtml = user
    ? `<a href="/user" class="user-name">${escapeHtml(user.username)}</a> | <a href="/logout">logout</a>`
    : `<a href="/login">login</a>`;

  return `
    <header>
      <h1><a href="/" style="color: var(--bg); text-decoration: none;">hy3n4 news</a></h1>
      <nav>
        ${pageTitle ? `<span style="color: var(--bg); font-size: 12px; font-weight: bold; margin-left: 8px;">/ ${escapeHtml(pageTitle)}</span>` : ''}
      </nav>
      <div class="auth-area">${authHtml}</div>
    </header>`;
}

function renderFooter(): string {
  return `
    <footer>
      <a href="/guidelines">Guidelines</a> | <a href="/legal">Legal</a> | <a href="mailto:hy3n4news@gmail.com">Contact</a>
    </footer>`;
}

interface LayoutOptions {
  headTitle?: string;
  pageTitle?: string;
  user?: UserInfo | null;
  content: string;
  jsonLd?: string;
}

function baseLayout(options: LayoutOptions): string {
  const { headTitle = "하이에나뉴스 (hy3n4 news)", pageTitle = "", user = null, content, jsonLd = "" } = options;

  const siteTitle = headTitle === "하이에나뉴스 (hy3n4 news)" ? headTitle : `hy3n4 news - ${escapeHtml(pageTitle)}`;
  const siteDescription = pageTitle
    ? `hy3n4 news — ${escapeHtml(pageTitle)}`
    : "하이에나뉴스 — 조선일보, 경향신문, 연합뉴스, Google News에서 엄선한 실시간 한국 뉴스. 커뮤니티 투표로 중요한 기사를 함께 발견하세요.";
  const canonicalUrl = pageTitle
    ? `https://hy3n4.news/${pageTitle.toLowerCase()}`
    : "https://hy3n4.news/";

  const defaultJsonLd = `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "하이에나뉴스",
    "alternateName": "hy3n4 news",
    "url": "https://hy3n4.news/",
    "description": "한국 뉴스 큐레이션 서비스",
    "inLanguage": "ko"
  }
  </script>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${siteTitle}</title>
  <meta name="description" content="${siteDescription}">
  <meta name="keywords" content="하이에나뉴스, hy3n4 news, 한국 뉴스, 뉴스 큐레이션, 실시간 뉴스, 조선일보, 경향신문, 연합뉴스">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="robots" content="index, follow">
  <meta name="theme-color" content="#57352b">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📰</text></svg>">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${siteTitle}">
  <meta property="og:description" content="${siteDescription}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="하이에나뉴스">
  <meta property="og:locale" content="ko_KR">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${siteTitle}">
  <meta name="twitter:description" content="${siteDescription}">

  <!-- Structured Data -->
  ${defaultJsonLd}
  ${jsonLd}
  <meta name="naver-site-verification" content="26cf5e8fb145f46c218dd3244eacdb2aae4295b8" />

  <link href="https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css" rel="stylesheet">
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css" />
  <script src="https://unpkg.com/htmx.org@2.0.4" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous"></script>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  <script>
    document.addEventListener('htmx:responseError', function(e) {
      if (e.detail.xhr.status === 401) { window.location.href = '/login'; }
    });
  </script>
  ${renderHeader(user, pageTitle)}
  <main>
    ${content}
  </main>
  ${renderFooter()}
</body>
</html>`;
}

export function renderPage(
  news: NewsRow[],
  user: UserInfo | null = null,
  pageTitle: string = "",
  currentLimit: number = 25,
  currentTime: number = 24
): string {
  // Group news by source_name
  const groupedNews: Record<string, NewsRow[]> = {};
  for (const item of news) {
    if (!groupedNews[item.source_name]) {
      groupedNews[item.source_name] = [];
    }
    groupedNews[item.source_name].push(item);
  }

  // Collect items for Schema.org JSON-LD
  const schemaItems: any[] = [];
  let position = 1;

  // Generate HTML columns
  const columnsHtml = Object.keys(groupedNews).map(sourceName => {
    // Slice by currentLimit
    const sourceItems = groupedNews[sourceName].slice(0, currentLimit);

    // Add to schema items
    for (const item of sourceItems) {
      schemaItems.push({
        "@type": "ListItem",
        "position": position++,
        "url": `https://hy3n4.news/go/${item.id}`,
        "name": item.title,
        "description": item.description || `Article from ${sourceName}`
      });
    }

    // Re-rank starting from 1 for each column display
    const itemsHtml = sourceItems.map((item, i) => renderNewsItem(item, i + 1)).join("\n");
    return `
      <div class="news-column">
        <h2 class="column-header">${escapeHtml(sourceName)}</h2>
        <ol class="news-list">
          ${itemsHtml}
        </ol>
      </div>
    `;
  }).join("\n");

  const filterHtml = !pageTitle ? `
  <div class="filters">
    <div class="filter-group">
      <span class="filter-label">LIMIT:</span>
      ${[5, 10, 15, 25].map(l => `<a href="/?limit=${l}&time=${currentTime}" class="filter-btn ${currentLimit === l ? 'active' : ''}">${l}</a>`).join('')}
    </div>
    <div class="filter-group">
      <span class="filter-label">TIME:</span>
      ${[1, 3, 6, 12, 24].map(t => `<a href="/?limit=${currentLimit}&time=${t}" class="filter-btn ${currentTime === t ? 'active' : ''}">${t}h</a>`).join('')}
    </div>
  </div>
  ` : '';

  const content = `
    ${filterHtml}
    <div class="news-columns">
      ${columnsHtml}
    </div>
  `;

  // Build the ItemList JSON-LD string
  let jsonLd = "";
  if (schemaItems.length > 0) {
    const listSchema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": schemaItems
    };
    jsonLd = `\n  <script type="application/ld+json">\n  ${JSON.stringify(listSchema, null, 2)}\n  </script>`;
  }

  return baseLayout({ pageTitle, user, content, jsonLd });
}

export function renderStaticPage(contentHtml: string, user: UserInfo | null = null, pageTitle: string = ""): string {
  const content = `
    <div class="static-content">
      ${contentHtml}
    </div>
  `;

  return baseLayout({ pageTitle, user, content });
}
