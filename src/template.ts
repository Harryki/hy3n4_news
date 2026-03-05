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
        <span class="news-domain">(${escapeHtml(domain)})</span>
        <div class="news-meta">
          <span id="score-${item.id}">${item.upvotes}</span> points
          · ${escapeHtml(item.source_name)}
          · ${ago}
        </div>
      </div>
    </li>`;
}

export function renderPage(news: NewsRow[]): string {
  const items = news.map((item, i) => renderNewsItem(item, i + 1)).join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hy3n4 news</title>
  <meta name="description" content="한국 뉴스 큐레이션 — 조선일보, 경향신문, 연합뉴스">
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
      font-family: 'Courier New', Courier, monospace;
      background: var(--bg);
      color: var(--text);
      max-width: 900px;
      margin: 0 auto;
      padding: 0;
      line-height: 1.4;
    }

    header {
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

    .news-list {
      list-style: none;
      padding: 0;
    }

    .news-item {
      display: flex;
      align-items: baseline;
      padding: 6px 12px;
      border-bottom: 1px solid var(--border);
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
      min-width: 0;
    }

    .news-title {
      color: var(--text);
      text-decoration: none;
      font-size: 13px;
      font-weight: bold;
      word-break: break-word;
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
  <header>
    <h1>hy3n4 news</h1>
    <nav><a href="/">top</a></nav>
  </header>
  <ol class="news-list">
    ${items}
  </ol>
  <footer>
    powered by cloudflare workers
  </footer>
</body>
</html>`;
}
