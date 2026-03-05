export interface NewsRow {
  id: number;
  title: string;
  url: string;
  upvotes: number;
  published_at: string | null;
  created_at: string;
  source_name: string;
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
      <div class="news-rank">${rank}.</div>
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
        <a href="${escapeHtml(item.url)}" class="news-title" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
        <div class="news-meta">
          <span id="score-${item.id}">${item.upvotes}</span> points
          · ${ago}
        </div>
      </div>
    </li>`;
}

interface UserInfo {
  id: number;
  username: string;
  email: string | null;
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

  // Generate HTML columns
  const columnsHtml = Object.keys(groupedNews).map(sourceName => {
    // Slice by currentLimit
    const sourceItems = groupedNews[sourceName].slice(0, currentLimit);
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

  const authHtml = user
    ? `<a href="/user" class="user-name">${escapeHtml(user.username)}</a> | <a href="/logout">logout</a>`
    : `<a href="/login">login</a>`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hy3n4 news</title>
  <meta name="description" content="한국 뉴스 큐레이션 — 조선일보, 경향신문, 연합뉴스">
  <link href="https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css" rel="stylesheet">
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css" />
  <script src="https://unpkg.com/htmx.org@2.0.4" integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+" crossorigin="anonymous"></script>
  <style>
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
      max-width: 100%; /* Use full screen width */
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
      padding: 2px 6px;
      border: 1px solid var(--secondary);
      border-radius: 4px;
      background: var(--bg);
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

    .news-column {
      flex: 1;
      min-width: 300px; /* Fallback to single column on mobile */
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
      padding: 6px 0; /* Removed horizontal padding to fit column better */
      border-bottom: 1px dashed rgba(87, 53, 43, 0.3); /* Softer border for items in column */
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
      font-size: 12px;
      padding: 0 2px;
      line-height: 1;
    }

    .vote-btn:hover {
      color: var(--text);
    }

    .news-content {
      min-width: 0; /* Required for text-overflow to work in flex child */
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
      color: var(--secondary);
      font-size: 11px;
      margin-top: 1px;
    }

    footer {
      text-align: center;
      padding: 16px;
      font-size: 11px;
      color: var(--secondary);
      border-top: 2px solid var(--border);
    }
  </style>
</head>
<body>
  <script>
    document.addEventListener('htmx:responseError', function(e) {
      if (e.detail.xhr.status === 401) { window.location.href = '/login'; }
    });
  </script>
  <header>
    <h1><a href="/" style="color: var(--bg); text-decoration: none;">hy3n4 news</a></h1>
    <nav>
      ${pageTitle ? `<span style="color: var(--bg); font-size: 12px; font-weight: bold; margin-left: 8px;">/ ${escapeHtml(pageTitle)}</span>` : ''}
    </nav>
    <div class="auth-area">${authHtml}</div>
  </header>
  ${!pageTitle ? `
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
  ` : ''}
  <div class="news-columns">
    ${columnsHtml}
  </div>
  <footer>
    Guidelines | FAQ | Contact | Legal
  </footer>
</body>
</html>`;
}
