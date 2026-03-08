export const CSS_STYLES = `
  :root {
    --bg: #FFFFFF;
    --text: #333333;
    --accent: #E5A657; /* 하이에나 뉴스 메인 색상 */
    --secondary: #57352B; /* 짙은 브라운 색상 */
    --border: #F0F0F0;
  }
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Pretendard";
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  header {
    background-color: var(--accent);
    color: var(--bg);
    padding: 12px 20px;
    display: flex;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  header h1 {
    font-size: 18px;
    font-weight: 800;
    letter-spacing: -0.5px;
    margin-right: 20px;
  }

  header nav {
    display: flex;
    gap: 15px;
  }

  header nav a {
    color: var(--bg);
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
    opacity: 0.9;
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
    font-size: 11px;
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

  .news-columns {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 0 20px 20px;
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
  
  .topic-pill-header {
    display: flex;
    align-items: center;
  }

  .topic-pill-count {
    opacity: 0.7;
    font-size: 11px;
    margin-left: 6px;
  }
  
  .topic-pill-keywords {
    font-size: 11px;
    color: #828282;
    font-weight: normal;
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

  .news-item-meta {
    font-size: 11px;
    color: #828282;
    margin-top: 6px;
  }
  
  .news-item-tags {
    font-size: 11px;
    color: var(--accent);
    margin-top: 4px;
    font-weight: 500;
  }
  .news-meta {
    display: flex;
    gap: 6px;
    margin-top: 4px;
    flex-wrap: wrap;
  }

  .meta-pill {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: bold;
    letter-spacing: 0.3px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .meta-points {
    color: var(--accent);
    background: rgba(229, 166, 87, 0.12);
    border: 1px solid rgba(229, 166, 87, 0.2);
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

export function renderHTML(content: string, user: string | null = null, currentLimit: number = 25, currentTime: number = 24, activeKeyword: string = '') {
  const authHtml = user
    ? `<div class="auth-area"><span class="user-name">${user}</span> | <a href="/logout">logout</a></div>`
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
  <meta name="description" content="조선일보, 중앙일보, 동아일보, 한겨레 등 대한민국 주요 언론사의 실시간 뉴스와 헤드라인을 한 곳에서 모아보세요. AI 기반 토픽 클러스터링으로 핫이슈를 한눈에 파악할 수 있습니다.">
  <meta name="keywords" content="하이에나뉴스, 뉴스 모아보기, 실시간 뉴스, 뉴스 클러스터링, 정치 뉴스, 경제 뉴스, 사회 뉴스, 조선일보, 중앙일보, 동아일보, 한겨레, 경향신문">
  <meta property="og:title" content="하이에나뉴스 | 주요 언론사 실시간 헤드라인 모아보기">
  <meta property="og:description" content="대한민국 주요 언론사의 뉴스를 한눈에 파악하는 가장 빠른 방법. AI가 요약한 핫이슈를 지금 확인하세요.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://hy3n4-news.zgp7777.workers.dev/">
  <meta property="og:site_name" content="하이에나뉴스">
  <meta property="og:locale" content="ko_KR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="하이에나뉴스 | 주요 언론사 실시간 헤드라인 모아보기">
  <meta name="twitter:description" content="대한민국 주요 언론사의 뉴스를 한눈에 파악하는 가장 빠른 방법.">
  <link rel="canonical" href="https://hy3n4-news.zgp7777.workers.dev/">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📰</text></svg>">
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
    /* Pretendard Font */
    @font-face {
      font-family: 'Pretendard';
      font-weight: 400;
      font-display: swap;
      src: local('Pretendard Regular'), url('https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Regular.woff') format('woff');
    }
    @font-face {
      font-family: 'Pretendard';
      font-weight: 500;
      font-display: swap;
      src: local('Pretendard Medium'), url('https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Medium.woff') format('woff');
    }
    @font-face {
      font-family: 'Pretendard';
      font-weight: 700;
      font-display: swap;
      src: local('Pretendard Bold'), url('https://cdn.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Bold.woff') format('woff');
    }

    ${CSS_STYLES}
  </style>
</head>
<body>
  <script>
    document.addEventListener('htmx:responseError', function(e) {
      if (e.detail.xhr.status === 401) { window.location.href = '/login'; }
    });
  </script>
  
    <header>
      <h1><a href="/" style="color: var(--bg); text-decoration: none;">하이에나뉴스</a></h1>
      <nav>
        
      </nav>
      ${authHtml}
    </header>
  <main>
    ${content}
  </main>
  
    <footer>
      <a href="/guidelines">가이드라인 (Guidelines)</a> | <a href="/legal">법적고지 (Legal)</a> | <a href="mailto:hy3n4news@gmail.com">Contact</a>
    </footer>
</body>
</html>`;
}

export function renderNewsList(sourceName: string, news: any[]) {
  let html = `<div class="news-column">
      <div class="column-header">${sourceName}</div>
      <ul class="news-list">`;

  news.forEach((item, index) => {
    const domain = new URL(item.url).hostname.replace('www.', '');
    const timeAgo = Math.floor((new Date().getTime() - new Date(item.created_at).getTime()) / 3600000);
    let timeStr = timeAgo < 1 ? 'Just now' : `${timeAgo}h ago`;

    let tagsHtml = '';
    if (item.topic_title) {
      tagsHtml = `<div class="news-item-tags">관련 토픽: ${item.topic_title}</div>`;
    }

    html += `
        <li class="news-item">
          <div class="news-vote">
            <button class="vote-btn" title="Upvote" hx-post="/vote/${item.id}?action=up" hx-swap="none">▲</button>
          </div>
          <div class="news-content">
            <a href="/go/${item.id}" target="_blank" class="news-title">${item.title}</a>
            <div class="news-meta">
              <span class="meta-pill meta-points" id="score-${item.id}">${item.upvotes || 0} pts</span>
              ${item.view_count !== undefined ? `<span class="meta-pill meta-views">${item.view_count || 0} views</span>` : ''}
              <span class="meta-pill meta-time">${timeStr}</span>
              <span class="news-domain">(${domain})</span>
            </div>
            ${tagsHtml}
          </div>
        </li>`;
  });

  html += `</ul></div>`;
  return html;
}

export function renderTopics(topics: any[], currentLimit: number = 25, currentTime: number = 24) {
  if (!topics || topics.length === 0) return '';

  let html = `<div class="hot-topics">
      <div class="hot-topics-header">🔥 실시간 핫 토픽</div>
      <div class="topic-pills">`;

  topics.forEach((t) => {
    const badge = `<span class="topic-pill-count">[기사 ${t.article_count}개]</span>`;
    html += `
          <a href="/?limit=${currentLimit}&time=${currentTime}&topic=${t.id}" class="topic-pill">
            <div class="topic-pill-header">${t.title} ${badge}</div>
            ${t.keywords ? `<div class="topic-pill-keywords">#${t.keywords.split(',').join(' #')}</div>` : ''}
          </a>
       `;
  });

  html += `</div></div>`;
  return html;
}
