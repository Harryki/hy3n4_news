export const CSS_STYLES = `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --text: #2b2b2b;
      --bg: #f9e9da;
      --secondary: #4c393d;
      --border: #57352b;
      --accent: #e5a657;
    }

    body {
      font-family: 'MaruBuri', Arial, serif;
      background: var(--bg);
      color: var(--text);
      max-width: 100%;
      margin: 0;
      padding: 0;
      line-height: 1.4;
    }

    header {
      font-family: "Godo", "Inter", Arial, sans-serif;
      background: var(--border);
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 3px solid var(--accent);
    }

    header h1 {
      font-weight: 400;
      font-size: 18px;
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
      font-size: 14px;
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
      padding: 15px 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
      background: var(--bg);
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .filter-label {
      font-size: 12px;
      font-weight: bold;
      color: #888;
      letter-spacing: 0.5px;
      min-width: 45px;
    }

    .filter-btn {
      text-decoration: none;
      color: var(--secondary);
      font-size: 13px;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 12px;
      background: rgba(0,0,0,0.05);
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: rgba(0,0,0,0.1);
    }

    .filter-btn.active {
      background: var(--secondary);
      color: var(--bg);
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .filter-tag {
      text-decoration: none;
      color: var(--secondary);
      background: rgba(229, 166, 87, 0.15);
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
      transition: all 0.2s;
    }

    .filter-tag:hover {
      background: rgba(229, 166, 87, 0.3);
    }

    .filter-tag.active {
      background: var(--accent);
      color: var(--bg);
    }

    .app-container {
      max-width: 1420px;
      margin: 0 auto;
      padding: 0 20px;
      box-sizing: border-box;
    }

    .news-columns {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 20px;
      padding: 20px 0px;
    }

    @media (max-width: 640px) {
      .news-columns { padding: 0 0 8px; gap: 12px; }
    }

    .hot-topics {
      padding: 20px 20px 10px;
      background: var(--bg);
    }
    
    .hot-topics-header {
      font-size: 15px;
      font-weight: bold;
      color: #d94126;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .topic-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .topic-pill {
      text-decoration: none;
      background: rgba(229, 166, 87, 0.15);
      color: var(--secondary);
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: bold;
      border: 1px solid rgba(229, 166, 87, 0.4);
      transition: all 0.2s ease;
      display: inline-flex;
      flex-direction: column;
      gap: 5px;
    }

    .topic-pill:hover {
      background: rgba(229, 166, 87, 0.25);
      border-color: var(--accent);
    }

    @media (max-width: 640px) {
      .topic-pill {
        width: 100%;
        box-sizing: border-box;
      }
    }
    
    .topic-pill-header {
      display: flex;
      align-items: center;
    }

    .topic-pill-count {
      opacity: 0.7;
      font-size: 13px;
      margin-left: 6px;
    }
    
    .topic-pill-keywords {
      font-size: 13px;
      color: #828282;
      font-weight: normal;
    }

    .news-column {
      flex: 1 1 calc(50% - 10px);
      min-width: 300px;
      max-width: 700px;
    }

    .column-header {
      font-family: "Godo", "Inter", Arial, sans-serif;
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
      padding: 12px 0;
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
      font-size: 15px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      margin-bottom: 4px;
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

    .news-item-meta {
      font-size: 12px;
      color: #828282;
      margin-top: 6px;
    }
    
    .news-item-tags {
      font-size: 12px;
      color: var(--border);
      margin: 0;
      font-weight: 700;
    }
    .news-meta {
      display: flex;
      gap: 6px;
      margin-top: 4px;
      flex-wrap: wrap;
      align-items: center;
    }

    .meta-pill {
      font-size: 12px;
      padding: 0 6px;
      border-radius: 3px;
      font-weight: bold;
      letter-spacing: 0.3px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 20px;
      box-sizing: border-box;
      line-height: 1;
    }

    .meta-points {
      color: var(--accent);
      background: rgba(229, 166, 87, 0.12);
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: background 0.2s;
    }
    
    .meta-points:hover {
      background: rgba(229, 166, 87, 0.25);
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
    }

    .static-content h3 {
      color: var(--text);
      margin-top: 24px;
      margin-bottom: 12px;
    }

    .static-content p, .static-content ul {
      margin-bottom: 16px;
    }

    .static-content li {
      margin-bottom: 8px;
      margin-left: 20px;
    }

    /* Search */
    .search-form {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-left: auto;
      margin-right: 12px;
    }

    .search-form input[type="search"] {
      font-family: 'MaruBuri', Arial, serif;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 16px;
      padding: 5px 14px;
      font-size: 13px;
      color: var(--bg);
      width: 180px;
      outline: none;
      transition: all 0.2s;
    }

    .search-form input[type="search"]::placeholder {
      color: rgba(249, 233, 218, 0.5);
    }

    .search-form input[type="search"]:focus {
      background: rgba(255,255,255,0.2);
      border-color: var(--accent);
      width: 240px;
    }

    @media (max-width: 640px) {
      .search-form input[type="search"] { width: 120px; }
      .search-form input[type="search"]:focus { width: 160px; }
    }

    .search-form button {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
      line-height: 1;
    }

    .search-form .htmx-indicator {
      display: none;
      font-size: 13px;
    }

    .search-form .htmx-indicator.htmx-request {
      display: inline;
    }

    .search-results-container {
      background: var(--bg);
      border-bottom: 2px solid var(--accent);
      padding: 0 20px 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .search-results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0 12px;
      border-bottom: 1px solid rgba(87, 53, 43, 0.2);
      font-size: 14px;
      color: var(--secondary);
    }

    .search-close-btn {
      background: none;
      border: 1px solid rgba(87, 53, 43, 0.3);
      border-radius: 50%;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 14px;
      color: var(--secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .search-close-btn:hover {
      background: rgba(87, 53, 43, 0.1);
    }

    .search-topic-group {
      padding: 14px 0;
      border-bottom: 1px dashed rgba(87, 53, 43, 0.15);
    }

    .search-topic-group:last-child {
      border-bottom: none;
    }

    .search-topic-title {
      font-size: 15px;
      font-weight: bold;
      color: var(--text);
      text-decoration: none;
    }

    .search-topic-title:hover {
      text-decoration: underline;
      color: var(--accent);
    }

    .search-topic-keywords {
      font-size: 12px;
      color: #828282;
      margin-left: 8px;
    }

    .search-news-list {
      list-style: none;
      padding: 8px 0 0 0;
    }

    .search-news-list li {
      padding: 4px 0;
      font-size: 13px;
    }

    .search-news-link {
      color: var(--text);
      text-decoration: none;
    }

    .search-news-link:hover {
      text-decoration: underline;
    }

    .search-news-meta {
      font-size: 11px;
      color: #828282;
    }
  `;

export function renderHTML(content: string, user: string | null = null, currentLimit: number = 25, currentTime: number = 24, activeKeyword: string = '') {
  const authHtml = user
    ? `<div class="auth-area"><a href="/user" class="user-name">${user}</a> | <a href="/logout">로그아웃</a></div>`
    : `<div class="auth-area"><a href="/login">login</a></div>`;

  const limits = [5, 10, 15, 25];
  const limitsHtml = limits.map(l =>
    `<a href="/?limit=${l}&time=${currentTime}${activeKeyword ? '&keyword=' + encodeURIComponent(activeKeyword) : ''}" class="filter-btn ${l === currentLimit ? 'active' : ''}">${l}</a>`
  ).join('');

  const times = [1, 3, 6, 12, 24];
  const timesHtml = times.map(t =>
    `<a href="/?limit=${currentLimit}&time=${t}${activeKeyword ? '&keyword=' + encodeURIComponent(activeKeyword) : ''}" class="filter-btn ${t === currentTime ? 'active' : ''}">${t}h</a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>하이에나뉴스 | 주요 언론사 실시간 헤드라인 모아보기</title>
  <meta name="description" content="조선 일보, 중앙 일보, 동아 일보, 한겨레 등 한국 주요 언론사의 오늘 경제 뉴스 기사 헤드라인을 한 곳에서 모아보세요.">
  <meta property="og:title" content="하이에나 뉴스">
  <meta property="og:description" content="언론사별 헤드라인을 한눈에 비교. 같은 사건을 각 언론이 어떻게 다루는지 바로 확인하세요.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://hy3n4-news.zgp7777.workers.dev/">
  <meta property="og:site_name" content="하이에나뉴스">
  <meta property="og:locale" content="ko_KR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="하이에나뉴스 | 주요 언론사 실시간 헤드라인 모아보기">
  <meta name="twitter:description" content="대한민국 주요 언론사의 뉴스를 한눈에 파악하는 가장 빠른 방법.">
  <link rel="canonical" href="https://hy3n4.news/">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📰</text></svg>">

  <link rel="preload" href="/fonts/MaruBuri-Regular.woff2" as="font" type="font/woff2" crossorigin >
  <link rel="preload" href="/fonts/GodoM.woff2" as="font" type="font/woff2" crossorigin >

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "하이에나뉴스",
    "alternateName": "hy3n4 news",
    "url": "https://hy3n4-news.zgp7777.workers.dev/",
    "description": "대한민국 주요 언론사의 실시간 뉴스와 핫이슈를 모아보는 서비스입니다."
  }
  </script>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>

    ${CSS_STYLES}

    @font-face {
      font-family: 'MaruBuri';
      src: url('/fonts/MaruBuri-Regular.woff2') format('woff2');
      font-style: normal;
      font-weight: normal;
      font-display: optional;
    }
    @font-face {
      font-family: 'Godo';
      src: url('/fonts/GodoM.woff2') format('woff2');
      font-style: normal;
      font-weight: normal;
      font-display: optional;
    }

  </style>
</head>
<body>
  <script>
    document.addEventListener('htmx:responseError', function(e) {
      if (e.detail.xhr.status === 401) { window.location.href = '/login'; }
    });
  </script>
  <div class="app-container">
    <header>
      <h1><a href="/" style="color: var(--bg); text-decoration: none;">하이에나뉴스</a></h1>
      <nav>
      </nav>
      <form class="search-form" hx-get="/api/search" hx-target="#search-results" hx-swap="innerHTML" hx-indicator="#search-spinner">
        <input type="search" name="q" placeholder="토픽 검색..." autocomplete="off" />
        <button type="submit">🔍</button>
        <span id="search-spinner" class="htmx-indicator">⏳</span>
      </form>
      ${authHtml}
    </header>
    <main>
      <div id="search-results"></div>
      ${content}
    </main>
    <footer>
      <a href="/guidelines">가이드라인 (Guidelines)</a> | <a href="/legal">법적고지 (Legal)</a> | <a href="mailto:hy3n4news@gmail.com">Contact</a>
    </footer>
  </div>
</body>
</html>`;
}

export function getRelativeTime(publishedAt: string, createdAt: string): string {
  const targetDate = new Date(publishedAt || createdAt).getTime();
  const timeDiffMs = new Date().getTime() - targetDate;
  const timeAgoMins = Math.floor(timeDiffMs / 60000);

  if (timeAgoMins < 5) return '방금 전';
  if (timeAgoMins < 60) return `${timeAgoMins}분 전`;

  const timeAgoHours = Math.floor(timeAgoMins / 60);
  if (timeAgoHours < 24) return `${timeAgoHours}시간 전`;

  return `${Math.floor(timeAgoHours / 24)}일 전`;
}

export function renderNewsList(sourceName: string, news: any[]) {
  let html = `<div class="news-column">
      <div class="column-header">${sourceName}</div>
      <ul class="news-list">`;

  news.forEach((item, index) => {
    let keywordHtml = '';
    if (item.keywords && typeof item.keywords === 'string') {
      const uniqueKeywords = Array.from(new Set(item.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k !== '')));
      keywordHtml = `<div class="news-item-tags">${uniqueKeywords.slice(0, 3).map(k => `#${k}`).join(' ')}</div>`;
    }

    const domain = new URL(item.url).hostname.replace('www.', '');
    const timeStr = getRelativeTime(item.published_at, item.created_at);

    html += `
        <li class="news-item">
          <div class="news-content">
            <a href="/go/${item.id}" rel="nofollow" target="_blank" class="news-title">${item.title}</a>
            <div class="news-meta">
              <span class="meta-pill meta-time">${timeStr}</span>
              <span class="news-domain">(${domain})</span>
              ${keywordHtml}
            </div>
          </div>
        </li>`;
  });

  html += `</ul></div>`;
  return html;
}

export function renderTopics(topics: any[], currentLimit: number = 25, currentTime: number = 24) {
  if (!topics || topics.length === 0) return '';

  let html = `<div class="hot-topics">
      <div class="hot-topics-header">뜨거운 감자</div>
      <div class="topic-pills">`;

  topics.forEach((t) => {
    const badge = `<span class="topic-pill-count">[기사 ${t.article_count}개]</span>`;
    html += `
          <a href="/topic/${t.id}" class="topic-pill">
            <div class="topic-pill-header">${t.title} ${badge}</div>
            ${t.keywords ? `<div class="topic-pill-keywords">#${t.keywords.split(',').join(' #')}</div>` : ''}
          </a>
       `;
  });

  html += `</div></div>`;
  return html;
}

export function renderWideNewsList(news: any[]) {
  let html = `<div style="padding: 0 20px; max-width: 800px; margin: 0 auto; padding-bottom: 24px;">
      <ul class="news-list" style="list-style: none; padding: 0;">`;

  news.forEach((item) => {
    let keywordHtml = '';
    if (item.keywords && typeof item.keywords === 'string') {
      const uniqueKeywords = Array.from(new Set(item.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k !== '')));
      keywordHtml = `<div class="news-item-tags">${uniqueKeywords.slice(0, 3).map(k => `#${k}`).join(' ')}</div>`;
    }

    const domain = new URL(item.url).hostname.replace('www.', '');
    const timeStr = getRelativeTime(item.published_at, item.created_at);

    html += `
        <li class="news-item" style="border-bottom: 1px dashed rgba(87,53,43,0.2); padding: 16px 0;">
          <div class="news-content">
            <a href="/go/${item.id}" target="_blank" class="news-title">${item.title}</a>
            <div class="news-meta">
              <span class="meta-pill" style="background:rgba(87,53,43,0.1); color:var(--secondary);">${item.source_name}</span>
              <span class="meta-pill meta-time">${timeStr}</span>
              ${keywordHtml}
            </div>
            ${item.description ? `<p style="font-size:12px; color:var(--secondary); margin-top:8px; line-height: 1.8; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${item.description}</p>` : ''}
          </div>
        </li>`;
  });

  html += `</ul></div>`;
  return html;
}

