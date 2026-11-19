import { escapeHtml, getRelativeTime } from "../../core/utils";

export interface SeoOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
  hasFeedback?: boolean;
}

export function renderHTML(
  content: string,
  user: string | null = null,
  seo: SeoOptions = {}
) {
  const pageTitle = seo.title || "하이에나뉴스 | 주요 언론사 실시간 헤드라인 & 핫토픽 모아보기";
  const pageDescription =
    seo.description ||
    "조선일보, 경향신문, 연합뉴스, JTBC, 동아일보 등 대한민국 주요 언론사의 실시간 뉴스 헤드라인과 AI 클러스터링 핫토픽(뜨거운 감자)을 한눈에 비교하세요.";
  const canonicalPath = seo.canonicalPath ? (seo.canonicalPath.startsWith("/") ? seo.canonicalPath : `/${seo.canonicalPath}`) : "/";
  const canonicalUrl = `https://hy3n4.news${canonicalPath}`;
  const ogType = seo.ogType || "website";

  const defaultJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "하이에나뉴스",
    "alternateName": ["hy3n4 news", "Hyena News"],
    "url": "https://hy3n4.news/",
    "inLanguage": "ko-KR",
    "description": "대한민국 주요 언론사의 실시간 뉴스와 AI 클러스터링 핫이슈(뜨거운 감자)를 한눈에 비교하는 뉴스 큐레이션 서비스입니다.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://hy3n4.news/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  const jsonLdPayload = seo.jsonLd || defaultJsonLd;
  const jsonLdScript = JSON.stringify(jsonLdPayload).replace(/</g, "\\u003c");
  const robotsMeta = seo.noindex
    ? `<meta name="robots" content="noindex, follow">`
    : `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  ${robotsMeta}
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:type" content="${escapeHtml(ogType)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:site_name" content="하이에나뉴스">
  <meta property="og:locale" content="ko_KR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="alternate" type="text/markdown" href="https://hy3n4.news/llms.txt" title="LLM Context (Korean News Trends)">
  <link rel="alternate" type="text/markdown" href="https://hy3n4.news/llms-full.txt" title="LLM Full Context (Hot Topics & Headlines)">
  <link rel="alternate" type="application/json" href="https://hy3n4.news/api/trends" title="Korean News Trends JSON API">
  <link rel="icon" type="image/svg+xml" href="/hyena.svg">
  <link rel="stylesheet" href="/styles.css?v=2">

  <script type="application/ld+json">${jsonLdScript}</script>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-214JZWY0K5"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-214JZWY0K5');
  </script>
</head>
<body>
  <div class="app-container">
    <header class="site-header">
      <h1>
        <a href="/" style="color: var(--bg); text-decoration: none; display: flex; align-items: center; gap: 8px;">
          <img src="/hyena.svg" alt="logo" style="width: 28px; height: 28px; object-fit: contain;">
          하이에나뉴스
        </a>
      </h1>
      <div class="header-right">
        <a href="/blog" class="icon-btn" title="블로그 (일일 뉴스 브리핑)" aria-label="블로그 (일일 뉴스 브리핑)" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
        </a>
        <button id="header-feedback-btn" class="icon-btn" title="피드백 보내기">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button id="search-open-btn" class="icon-btn" title="검색">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </button>
        <button id="sidebar-open-btn" class="icon-btn" title="메뉴">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
      </div>
    </header>

    <main>
      ${content}
    </main>

    <div id="search-modal" class="modal-overlay">
      <div class="modal-content">
        <form class="modal-search-form" action="/search" method="GET">
          <input type="text" name="q" placeholder="관심 있는 이슈나 언론사 토픽을 검색해보세요" autocomplete="off" autofocus />
          <button type="submit">검색</button>
        </form>
      </div>
    </div>

    <!-- Sidebar (Shadcn Sheet) -->
    <div id="sidebar-overlay" class="sidebar-overlay"></div>
    <aside id="sidebar" class="sidebar">
      <div class="sidebar-header">
        <h2>Menu</h2>
        <button id="sidebar-close-btn" class="sidebar-close">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="sidebar-content">
        ${user ? `<div style="padding: 0 16px 16px; font-size: 14px; color: var(--secondary);">반가워요, <strong style="color: var(--border);">${user}</strong>님!</div>` : ''}
        <a href="/" class="sidebar-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Home
        </a>
        <a href="/blog" class="sidebar-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></svg>
          블로그 (일일 브리핑)
        </a>
        <div class="sidebar-divider"></div>
        <a href="/guidelines" class="sidebar-link">가이드라인 (Guidelines)</a>
        <a href="/legal" class="sidebar-link">법적고지 (Legal)</a>
        <a href="#" id="sidebar-feedback-btn" class="sidebar-link">💬 피드백 보내기</a>
        <a href="mailto:hy3n4news@gmail.com" class="sidebar-link">Contact</a>
        
        <div style="margin-top: auto;">
          ${user
      ? `<a href="/logout" class="sidebar-link auth-btn">로그아웃</a>`
      : `<a href="/login" class="sidebar-link auth-btn">로그인 / 시작하기</a>`
    }
        </div>
      </div>
    </aside>

    <!-- Feedback Popup Modal -->
    <div id="feedback-modal" class="fb-overlay" role="dialog" aria-labelledby="fb-modal-title" aria-modal="true">
      <div class="fb-card">
        <div class="fb-header">
          <div>
            <div id="fb-modal-title" class="fb-title">하이에나뉴스, 어떠셨나요? 🐾</div>
            <div class="fb-subtitle">10초만 시간 내어주시면 더 좋은 뉴스 서비스로 보답할게요!</div>
          </div>
          <button type="button" id="fb-close-btn" class="fb-close" title="닫기">&times;</button>
        </div>

        <form id="feedback-form">
          <div class="fb-section">
            <div class="fb-question">1. 방문하신 주된 목적은 무엇인가요? <span class="fb-question-sub">(복수 선택 가능)</span></div>
            <div class="fb-options">
              <label class="fb-chip"><input type="checkbox" name="visit_purposes" value="hot_issues"> <span>📰 실시간 주요 뉴스·핫이슈('뜨거운 감자') 빠른 파악</span></label>
              <label class="fb-chip"><input type="checkbox" name="visit_purposes" value="compare_press"> <span>⚖️ 같은 사건에 대한 언론사별 논조·헤드라인 비교</span></label>
              <label class="fb-chip"><input type="checkbox" name="visit_purposes" value="search_topic"> <span>🔍 특정 키워드/이슈의 과거~현재 기사 흐름 검색</span></label>
              <label class="fb-chip"><input type="checkbox" name="visit_purposes" value="work_invest"> <span>💼 경제·산업·트렌드 모니터링 (업무/투자 참고)</span></label>
              <label class="fb-chip"><input type="checkbox" name="visit_purposes" value="browsing"> <span>👀 우연히 방문 / 둘러보는 중</span></label>
            </div>
          </div>

          <div class="fb-section">
            <div class="fb-question">2. 앞으로 가장 추가되었으면 하는 기능은? <span class="fb-question-sub">(복수 선택 가능)</span></div>
            <div class="fb-options">
              <label class="fb-chip"><input type="checkbox" name="desired_features" value="ai_summary"> <span>🤖 토픽별 AI 3줄 요약 및 언론사별 핵심 논점 비교</span></label>
              <label class="fb-chip"><input type="checkbox" name="desired_features" value="custom_filter"> <span>🏛️ 언론사 추가 및 내 관심 언론사/카테고리 필터링</span></label>
              <label class="fb-chip"><input type="checkbox" name="desired_features" value="keyword_alert"> <span>🔔 관심 키워드·핫토픽 알림 (이메일/텔레그램/웹푸시)</span></label>
              <label class="fb-chip"><input type="checkbox" name="desired_features" value="bias_chart"> <span>📊 언론사별 성향 분석 및 보도량 추이 그래프</span></label>
              <label class="fb-chip"><input type="checkbox" name="desired_features" value="community"> <span>💬 토픽별 유저 댓글·토론 또는 투표 기능 강화</span></label>
            </div>
          </div>

          <div class="fb-section" style="margin-bottom: 8px;">
            <div class="fb-question">3. 자유로운 의견을 남겨주세요 <span class="fb-question-sub">(선택 사항)</span></div>
            <textarea id="fb-comment" name="comment" class="fb-textarea" maxlength="500" placeholder="불편했던 점, 추가되었으면 하는 언론사나 기능 등을 자유롭게 적어주세요! (최대 500자)"></textarea>
          </div>

          <div id="fb-status-msg" class="fb-msg"></div>

          <div class="fb-actions">
            <button type="button" id="fb-snooze-btn" class="fb-btn-snooze">다음에 할게요</button>
            <button type="submit" id="fb-submit-btn" class="fb-btn-submit">의견 보내기</button>
          </div>
        </form>
      </div>
    </div>

    <script>
      window.__HY3N4_FB_DONE = ${seo.hasFeedback ? "true" : "false"};

      // Search Modal
      const modal = document.getElementById('search-modal');
      const openBtn = document.getElementById('search-open-btn');
      const searchInput = modal.querySelector('input');

      openBtn.onclick = () => {
        modal.style.display = 'flex';
        searchInput.focus();
      };

      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };

      // Sidebar
      const sidebar = document.getElementById('sidebar');
      const sidebarOverlay = document.getElementById('sidebar-overlay');
      const sidebarOpenBtn = document.getElementById('sidebar-open-btn');
      const sidebarCloseBtn = document.getElementById('sidebar-close-btn');

      const toggleSidebar = (open) => {
        if (open) {
          sidebarOverlay.classList.add('open');
          sidebar.classList.add('open');
          document.body.style.overflow = 'hidden';
        } else {
          sidebarOverlay.classList.remove('open');
          sidebar.classList.remove('open');
          document.body.style.overflow = '';
        }
      };

      sidebarOpenBtn.onclick = () => toggleSidebar(true);
      sidebarCloseBtn.onclick = () => toggleSidebar(false);
      sidebarOverlay.onclick = () => toggleSidebar(false);

      // Feedback Modal Logic
      const fbModal = document.getElementById('feedback-modal');
      const fbForm = document.getElementById('feedback-form');
      const fbCloseBtn = document.getElementById('fb-close-btn');
      const fbSnoozeBtn = document.getElementById('fb-snooze-btn');
      const fbSubmitBtn = document.getElementById('fb-submit-btn');
      const fbStatusMsg = document.getElementById('fb-status-msg');
      const headerFbBtn = document.getElementById('header-feedback-btn');
      const sidebarFbBtn = document.getElementById('sidebar-feedback-btn');
      const footerFbBtn = document.getElementById('footer-feedback-btn');
      const forceFbOpen = new URLSearchParams(window.location.search).get('fb') === '1';

      const hasCookie = (name) => document.cookie.split(';').some((c) => c.trim().startsWith(name + '='));
      const setCookie = (name, val, maxAgeSec) => {
        document.cookie = name + '=' + val + '; Path=/; Max-Age=' + maxAgeSec + '; SameSite=Lax';
      };

      if (window.__HY3N4_FB_DONE) {
        try { localStorage.setItem('hy3n4_fb_done', '1'); } catch (e) {}
        if (!hasCookie('hy3n4_fb_done')) {
          setCookie('hy3n4_fb_done', '1', 31536000);
        }
      }

      const isFbDone = () => {
        try {
          if (localStorage.getItem('hy3n4_fb_done') === '1') return true;
        } catch (e) {}
        return window.__HY3N4_FB_DONE || hasCookie('hy3n4_fb_done');
      };

      const openFeedbackModal = () => {
        fbModal.classList.add('open');
        document.body.style.overflow = 'hidden';
      };

      const closeFeedbackModal = (snooze) => {
        fbModal.classList.remove('open');
        document.body.style.overflow = '';
        if (snooze && !isFbDone()) {
          const sevenDaysSec = 60 * 60 * 24 * 7;
          setCookie('hy3n4_fb_snooze', '1', sevenDaysSec);
          try {
            localStorage.setItem('hy3n4_fb_snooze_until', String(Date.now() + sevenDaysSec * 1000));
          } catch (e) {}
        }
      };

      document.querySelectorAll('.fb-chip input[type="checkbox"]').forEach((cb) => {
        cb.addEventListener('change', () => {
          cb.closest('.fb-chip').classList.toggle('selected', cb.checked);
        });
      });

      fbCloseBtn.onclick = () => closeFeedbackModal(true);
      fbSnoozeBtn.onclick = () => closeFeedbackModal(true);
      fbModal.onclick = (e) => {
        if (e.target === fbModal) closeFeedbackModal(true);
      };

      if (headerFbBtn) {
        headerFbBtn.onclick = (e) => {
          e.preventDefault();
          openFeedbackModal();
        };
      }

      if (sidebarFbBtn) {
        sidebarFbBtn.onclick = (e) => {
          e.preventDefault();
          toggleSidebar(false);
          openFeedbackModal();
        };
      }

      if (footerFbBtn) {
        footerFbBtn.onclick = (e) => {
          e.preventDefault();
          openFeedbackModal();
        };
      }

      fbForm.onsubmit = async (e) => {
        e.preventDefault();
        const purposes = Array.from(fbForm.querySelectorAll('input[name="visit_purposes"]:checked')).map((el) => el.value);
        const features = Array.from(fbForm.querySelectorAll('input[name="desired_features"]:checked')).map((el) => el.value);
        const comment = document.getElementById('fb-comment').value.trim();

        if (purposes.length === 0 && features.length === 0 && !comment) {
          fbStatusMsg.style.display = 'block';
          fbStatusMsg.style.color = '#d9534f';
          fbStatusMsg.textContent = '최소 한 가지 이상의 항목을 선택하거나 의견을 입력해주세요.';
          return;
        }

        fbSubmitBtn.disabled = true;
        fbSubmitBtn.textContent = '전송 중...';
        fbStatusMsg.style.display = 'none';

        try {
          const res = await fetch('/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visit_purposes: purposes,
              desired_features: features,
              comment,
              page_path: window.location.pathname
            })
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            try { localStorage.setItem('hy3n4_fb_done', '1'); } catch (err) {}
            setCookie('hy3n4_fb_done', '1', 31536000);
            fbStatusMsg.style.display = 'block';
            fbStatusMsg.style.color = '#2b7a3e';
            fbStatusMsg.style.fontWeight = '700';
            fbStatusMsg.textContent = '🎉 ' + (data.message || '소중한 피드백 감사합니다!');
            fbSubmitBtn.textContent = '완료!';
            setTimeout(() => closeFeedbackModal(false), 1200);
          } else {
            fbStatusMsg.style.display = 'block';
            fbStatusMsg.style.color = '#d9534f';
            fbStatusMsg.textContent = data.error || '오류가 발생했습니다.';
            fbSubmitBtn.disabled = false;
            fbSubmitBtn.textContent = '의견 보내기';
          }
        } catch (err) {
          fbStatusMsg.style.display = 'block';
          fbStatusMsg.style.color = '#d9534f';
          fbStatusMsg.textContent = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          fbSubmitBtn.disabled = false;
          fbSubmitBtn.textContent = '의견 보내기';
        }
      };

      // Open feedback modal if explicitly forced via query parameter (?fb=1)
      if (forceFbOpen) {
        openFeedbackModal();
      }

      window.onkeydown = (e) => {
        if (e.key === 'Escape') {
          modal.style.display = 'none';
          toggleSidebar(false);
          if (fbModal.classList.contains('open')) closeFeedbackModal(true);
        } else if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          e.preventDefault();
          modal.style.display = 'flex';
          const input = modal.querySelector('input');
          if (input) input.focus();
        }
      };
    </script>
    <footer>
      <a href="/blog">일일 뉴스 브리핑 (Blog)</a> | <a href="/guidelines">가이드라인 (Guidelines)</a> | <a href="/legal">법적고지 (Legal)</a> | <a href="#" id="footer-feedback-btn">피드백 보내기</a> | <a href="mailto:hy3n4news@gmail.com">Contact</a>
    </footer>
  </div>
</body>
</html>`;
}


export function renderNewsBoard(news: any[], sort: "latest" | "views" = "views"): string {
  let rowsHtml = "";

  if (!news || news.length === 0) {
    rowsHtml = `<li class="board-empty">표시할 기사가 없습니다.</li>`;
  } else {
    news.forEach((item) => {
      let tagsText = "";
      if (item.keywords && typeof item.keywords === "string") {
        const uniqueKeywords = Array.from(
          new Set<string>(
            item.keywords
              .split(",")
              .map((k: string) => k.trim())
              .filter((k: string) => k !== "")
          )
        );
        if (uniqueKeywords.length > 0) {
          tagsText = uniqueKeywords
            .slice(0, 3)
            .map((k) => `#${escapeHtml(k)}`)
            .join(" ");
        }
      }

      const timeStr = getRelativeTime(item.published_at, item.created_at);
      const viewCount = item.view_count || 0;
      const isHot = viewCount >= 1;

      rowsHtml += `
        <li class="board-row">
          <div class="board-col-title">
            <a href="/go/${item.id}" rel="nofollow" target="_blank" class="board-title${isHot ? " is-viewed" : ""}">${escapeHtml(item.title)}</a>
            ${tagsText ? `<span class="board-tags">${tagsText}</span>` : ""}
          </div>
          <div class="board-col-meta">
            <span class="board-source">${escapeHtml(item.source_name || "")}</span>
            <span class="board-time">${escapeHtml(timeStr)}</span>
            <span class="board-views${isHot ? " is-hot" : ""}"><span class="board-views-label">조회 </span>${viewCount}</span>
            ${tagsText ? `<span class="board-tags-mobile">${tagsText}</span>` : ""}
          </div>
        </li>`;
    });
  }

  return `
    <section class="news-board" aria-label="실시간 뉴스 게시판">
      <div class="board-toolbar">
        <h2 class="board-heading">전체 뉴스</h2>
        <div class="blog-sort-tabs" role="tablist" aria-label="뉴스 정렬">
          <a href="/" class="blog-sort-tab ${sort === "views" ? "active" : ""}">인기순</a>
          <a href="/?sort=latest" class="blog-sort-tab ${sort === "latest" ? "active" : ""}">최신순</a>
        </div>
      </div>
      <div class="board-table-head" aria-hidden="true">
        <span class="board-th-title">제목</span>
        <span class="board-th-source">언론사</span>
        <span class="board-th-time">작성시간</span>
        <span class="board-th-views">조회</span>
      </div>
      <ul class="board-list">
        ${rowsHtml}
      </ul>
    </section>`;
}

function getMilestoneCount(milestonesJson: string | null | undefined): number {
  if (!milestonesJson) return 0;
  try {
    const parsed = JSON.parse(milestonesJson);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
    return items.filter((m: any) => m && typeof m.text === "string" && m.text.trim().length > 0).length;
  } catch {
    return 0;
  }
}

export function renderTopics(topics: any[]) {
  if (!topics || topics.length === 0) return '';

  let html = `<div class="hot-topics">
      <div class="hot-topics-header">뜨거운 감자</div>
      <div class="topic-pills">`;

  topics.forEach((t) => {
    const milestoneCount = getMilestoneCount(t.milestones);
    const badgeText =
      milestoneCount > 0
        ? `[${milestoneCount}단계 전개 · 기사 ${t.article_count}개]`
        : `[기사 ${t.article_count}개]`;
    const badge = `<span class="topic-pill-count">${badgeText}</span>`;
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

function formatShortBriefingBadge(targetDate: string): string {
  const parts = (targetDate || "").split("-");
  if (parts.length < 3) return targetDate || "브리핑";
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const slot = parts[3];
  const slotKo =
    slot === "morning" ? " 아침" : slot === "afternoon" ? " 오후" : slot === "evening" ? " 저녁" : "";
  return `${m}월 ${d}일${slotKo}`;
}

export function renderHyenaBriefing(
  briefings: Array<{ slug: string; title: string; summary?: string; target_date: string; view_count?: number; published_at?: string }>
): string {
  if (!briefings || briefings.length === 0) return "";

  const itemsHtml = briefings
    .slice(0, 3)
    .map((b) => {
      const vc = b.view_count || 0;
      const viewHtml = vc >= 1 ? `<span class="hot-badge" title="조회수 ${vc}회">조회 ${vc}</span>` : "";
      return `
      <a href="/blog/${escapeHtml(b.slug)}" class="hyena-briefing-item" title="${escapeHtml(b.title)}">
        <span class="hyena-briefing-badge">${escapeHtml(formatShortBriefingBadge(b.target_date))}</span>
        <span class="hyena-briefing-item-title">${escapeHtml(b.title)}</span>${viewHtml}
      </a>`;
    })
    .join("");

  return `
    <section class="hyena-briefing" aria-label="하이에나 브리핑">
      <div class="hyena-briefing-header">
        <div class="hyena-briefing-title">
          <span>하이에나 브리핑</span>
          <span class="hyena-briefing-sub">매일 3회 핵심 이슈 심층 정리</span>
        </div>
        <a href="/blog" class="hyena-briefing-more">전체 브리핑 →</a>
      </div>
      <div class="hyena-briefing-list">
        ${itemsHtml}
      </div>
    </section>
  `;
}

export function renderPagination(opts: { page: number; prevUrl: string | null; nextUrl: string | null; firstUrl: string | null }): string {
  const { page, prevUrl, nextUrl, firstUrl } = opts;
  // No pagination needed on single page without prev/next
  if (!prevUrl && !nextUrl) return '';
  const btnStyle = 'display: inline-block; padding: 10px 20px; background: var(--accent); color: var(--bg); text-decoration: none; border-radius: 20px; font-weight: bold;';
  const outlineBtnStyle = 'display: inline-block; padding: 10px 20px; background: transparent; color: var(--accent); text-decoration: none; border-radius: 20px; font-weight: bold; border: 1.5px solid var(--accent);';
  const disabledStyle = 'display: inline-block; padding: 10px 20px; background: var(--border); color: var(--bg); text-decoration: none; border-radius: 20px; font-weight: bold; opacity: 0.35; pointer-events: none;';
  const pageInfo = `<span style="font-size:14px; color: var(--secondary); font-weight: bold; min-width: 70px; text-align: center;">${page} 페이지</span>`;

  let html = `<div style="display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap; padding: 20px; border-top: 1px solid var(--border); ${firstUrl ? 'margin-top: 20px;' : ''}">`;

  if (prevUrl) {
    html += `<a href="${prevUrl}" rel="prev" style="${btnStyle}">← 이전</a>`;
  } else {
    html += `<span style="${disabledStyle}">← 이전</span>`;
  }

  html += pageInfo;

  if (nextUrl) {
    html += `<a href="${nextUrl}" rel="next" style="${btnStyle}">다음 →</a>`;
  } else {
    // keep layout balanced: disabled next when on last page but prev exists
    html += `<span style="${disabledStyle}">다음 →</span>`;
  }

  if (firstUrl) {
    html += `<a href="${firstUrl}" style="${outlineBtnStyle}">처음으로</a>`;
  }

  html += `</div>`;
  return html;
}

export function renderSearchResults(query: string | null, topics: any[], newsByTopic: Record<number, any[]>, page: number = 1, hasMore: boolean = false): string {
  page = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  let html = '<div class="search-results-container">';

  if (query) {
    html += `<div class="search-results-header"><h2>"<strong>${escapeHtml(query)}</strong>" 검색 결과</h2></div>`;
  } else {
    html += `<div class="search-results-header"><h2>최신 업데이트 토픽</h2></div>`;
  }

  if (topics.length === 0) {
    html += `<p style="padding: 40px; text-align: center; color: var(--secondary);">결과가 없습니다.</p>`;
    if (page > 1) {
      const prevUrl = query ? `/search?q=${encodeURIComponent(query)}&page=${page - 1}` : `/search?page=${page - 1}`;
      const firstUrl = query ? `/search?q=${encodeURIComponent(query)}&page=1` : `/search?page=1`;
      html += renderPagination({ page, prevUrl, nextUrl: null, firstUrl });
    }
  } else {
    for (const topic of topics) {
      const topicNews = newsByTopic[topic.id] || [];
      const timeStr = topic.updated_at ? getRelativeTime(topic.updated_at, topic.updated_at) : '';
      const countStr = topic.article_count ? `(기사 ${topic.article_count}개) · ` : '';

      html += `
                <div class="search-topic-group">
                    <a href="/topic/${topic.id}" class="search-topic-title">${escapeHtml(topic.title)}</a>
                    <div class="search-news-meta">${countStr}마지막 업데이트: ${timeStr}</div>
                    ${topic.keywords ? `<div class="search-topic-keywords">#${topic.keywords.split(',').map((k: any) => k.trim()).join(' #')}</div>` : ''}
                    <ul class="search-news-list">
                        ${topicNews.map((n: any) => `
                            <li>
                                <a href="/go/${n.id}" target="_blank" class="search-news-link">${escapeHtml(n.title)}</a>
                                <div class="search-news-meta">${n.source_name} · ${getRelativeTime(n.published_at, n.created_at)}</div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
    }

    const prevUrl = page > 1
      ? (query ? `/search?q=${encodeURIComponent(query)}&page=${page - 1}` : `/search?page=${page - 1}`)
      : null;
    const nextUrl = hasMore
      ? (query ? `/search?q=${encodeURIComponent(query)}&page=${page + 1}` : `/search?page=${page + 1}`)
      : null;
    const firstUrl = page > 1
      ? (query ? `/search?q=${encodeURIComponent(query)}&page=1` : `/search?page=1`)
      : null;
    html += renderPagination({ page, prevUrl, nextUrl, firstUrl });
  }

  html += '</div>';
  return html;
}

export function renderWideNewsList(news: any[]) {
  let html = `<div style="padding: 0 0; max-width: 800px; margin: 0 auto; padding-bottom: 24px;">
      <ul class="news-list" style="list-style: none; padding: 0;">`;

  news.forEach((item) => {
    let keywordHtml = '';
    if (item.keywords && typeof item.keywords === 'string') {
      const uniqueKeywords = Array.from(new Set(item.keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k !== '')));
      keywordHtml = `<div class="news-item-tags">${uniqueKeywords.slice(0, 3).map(k => `#${k}`).join(' ')}</div>`;
    }

    const timeStr = getRelativeTime(item.published_at, item.created_at);

    const viewCount = item.view_count || 0;
    let fireHtml = '';
    let titleWeight = viewCount >= 1 ? '600' : 'normal';

    if (viewCount >= 1) {
      fireHtml = `<span class="hot-badge" title="조회수 ${viewCount}회">조회 ${viewCount}</span>`;
    }

    html += `
        <li class="news-item" style="border-bottom: 1px dashed rgba(87,53,43,0.2); padding: 16px 0;">
          <div class="news-content">
            <a href="/go/${item.id}" target="_blank" class="news-title">
              <span style="font-weight: ${titleWeight};">${item.title}</span>${fireHtml}
            </a>
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

function formatHumanMilestoneTime(rawTime: string | undefined): string {
  if (!rawTime) return "";
  const trimmed = rawTime.trim();

  // Current time in KST (UTC+9)
  const nowKst = new Date(Date.now() + 9 * 3600 * 1000);
  const curYear = nowKst.getUTCFullYear();
  const curMonth = nowKst.getUTCMonth() + 1;
  const curDay = nowKst.getUTCDate();

  let year = curYear;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;

  // Case 1: "MM/DD HH:MM" (already in KST)
  const shortMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (shortMatch) {
    month = parseInt(shortMatch[1], 10);
    day = parseInt(shortMatch[2], 10);
    hour = parseInt(shortMatch[3], 10);
    minute = parseInt(shortMatch[4], 10);
    if (month > curMonth + 1) {
      year = curYear - 1;
    }
  } else {
    // Case 2: ISO or SQLite UTC string
    const normalized = trimmed.endsWith("Z") ? trimmed : trimmed.replace(" ", "T") + "Z";
    const parsedDate = new Date(normalized);
    if (isNaN(parsedDate.getTime())) {
      return trimmed;
    }
    const kstDate = new Date(parsedDate.getTime() + 9 * 3600 * 1000);
    year = kstDate.getUTCFullYear();
    month = kstDate.getUTCMonth() + 1;
    day = kstDate.getUTCDate();
    hour = kstDate.getUTCHours();
    minute = kstDate.getUTCMinutes();
  }

  const todayDays = Math.floor(Date.UTC(curYear, curMonth - 1, curDay) / 86400000);
  const targetDays = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
  const diffDays = todayDays - targetDays;

  let datePart = "";
  if (diffDays <= 0) {
    datePart = "오늘";
  } else if (diffDays === 1) {
    datePart = "어제";
  } else if (diffDays === 2) {
    datePart = "그제";
  } else {
    datePart = `${month}월 ${day}일`;
  }

  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minStr = String(minute).padStart(2, "0");

  return `${datePart} ${period} ${hour12}:${minStr}`;
}

export function renderTopicTimeline(
  milestonesJson: string | null | undefined,
  relatedTopics: Array<{
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
  }> = [],
  currentTopicId: number | null = null
): string {
  let items: Array<{ time?: string; text?: string; article_count?: number; news_id?: number }> = [];
  if (milestonesJson) {
    try {
      const parsed = JSON.parse(milestonesJson);
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && Array.isArray(parsed.items)) {
        items = parsed.items;
      }
    } catch {}
  }

  const validItems = items.filter((m) => m && typeof m.text === "string" && m.text.trim().length > 0);
  const hasRelated = Array.isArray(relatedTopics) && relatedTopics.length > 0;
  if (validItems.length === 0 && !hasRelated) return "";

  const rowsHtml = validItems
    .map((m, idx) => {
      const isLast = idx === validItems.length - 1;
      const dotColor = isLast ? "var(--accent)" : "var(--secondary)";
      const dotSize = isLast ? "10px" : "8px";
      const fontWeight = isLast ? "700" : "500";
      const humanTime = formatHumanMilestoneTime(m.time);
      const timeBadge = humanTime
        ? `<span style="display: inline-block; font-size: 12px; color: var(--secondary); background: rgba(87, 53, 43, 0.1); padding: 2px 8px; border-radius: 4px; margin-right: 8px; flex-shrink: 0; font-weight: 600;">${escapeHtml(humanTime)}</span>`
        : "";
      const linkHtml = m.news_id
        ? ` <a href="/go/${m.news_id}" target="_blank" rel="nofollow" style="font-size: 11px; color: var(--accent); text-decoration: none; margin-left: 6px; white-space: nowrap;">[관련기사 ↗]</a>`
        : "";

      return `
        <li style="position: relative; padding-left: 22px; padding-bottom: ${isLast ? "0" : "12px"}; line-height: 1.5;">
          ${
            !isLast
              ? `<span style="position: absolute; left: 4px; top: 14px; bottom: -4px; width: 1.5px; background: rgba(87, 53, 43, 0.22);"></span>`
              : ""
          }
          <span style="position: absolute; left: ${isLast ? "0px" : "1px"}; top: 6px; width: ${dotSize}; height: ${dotSize}; border-radius: 50%; background: ${dotColor};"></span>
          <div style="display: flex; align-items: baseline; flex-wrap: wrap; font-size: 14px; color: var(--text); font-weight: ${fontWeight};">
            ${timeBadge}
            <span>${escapeHtml(m.text || "")}${linkHtml}</span>
          </div>
        </li>`;
    })
    .join("");

  const renderTopicNodeCard = (r: (typeof relatedTopics)[number]) => {
    const mCount = getMilestoneCount(r.milestones);
    const countBadge =
      mCount > 0 ? `${mCount}단계 전개 · 기사 ${r.article_count}개` : `기사 ${r.article_count}개`;
    const href = currentTopicId ? `/topic/${r.id}?from=${currentTopicId}` : `/topic/${r.id}`;

    const badges: string[] = [];
    if (r.is_from) {
      badges.push(
        `<span style="font-size: 11px; font-weight: 800; color: #fff; background: var(--accent); padding: 2px 6px; border-radius: 4px; flex-shrink: 0;">↩ 방금 본 이슈</span>`
      );
    }

    const kwText =
      r.shared_keywords && r.shared_keywords.length > 0
        ? `#${r.shared_keywords.join(" #")}`
        : r.keywords
        ? `#${r.keywords
            .split(",")
            .slice(0, 2)
            .map((k) => k.trim())
            .filter(Boolean)
            .join(" #")}`
        : "";

    const borderStyle = r.is_from
      ? "1.5px solid var(--accent)"
      : "1px solid rgba(87, 53, 43, 0.2)";
    const bgStyle = r.is_from ? "rgba(182, 73, 38, 0.07)" : "rgba(255, 255, 255, 0.5)";

    return `
      <a href="${href}" style="display: flex; flex-direction: column; gap: 5px; padding: 10px 12px; background: ${bgStyle}; border: ${borderStyle}; border-radius: 6px; text-decoration: none; color: var(--text); transition: border-color 0.15s, background 0.15s;" onmouseover="this.style.borderColor='var(--accent)';this.style.background='rgba(182,73,38,0.08)'" onmouseout="this.style.borderColor='${r.is_from ? "var(--accent)" : "rgba(87,53,43,0.2)"}';this.style.background='${bgStyle}'">
        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
          ${badges.join("")}
          <span style="font-size: 14px; font-weight: 700; color: var(--text); line-height: 1.35;">${escapeHtml(r.title)}</span>
        </div>
        <div style="font-size: 12px; color: var(--secondary);">
          <span>[${countBadge}] ${kwText ? `· <span style="opacity: 0.85;">${escapeHtml(kwText)}</span>` : ""}</span>
        </div>
      </a>`;
  };

  let explorerHtml = "";
  if (hasRelated) {
    const priorTopics = relatedTopics
      .filter((r) => r.relation_type === "prior")
      .sort((a, b) => (b.is_from ? 1 : 0) - (a.is_from ? 1 : 0));

    const rightColumnTopics = relatedTopics
      .filter((r) => r.relation_type === "next" || r.relation_type === "related")
      .sort((a, b) => {
        if ((b.is_from ? 1 : 0) !== (a.is_from ? 1 : 0)) {
          return (b.is_from ? 1 : 0) - (a.is_from ? 1 : 0);
        }
        if ((b.relation_type === "next" ? 1 : 0) !== (a.relation_type === "next" ? 1 : 0)) {
          return (b.relation_type === "next" ? 1 : 0) - (a.relation_type === "next" ? 1 : 0);
        }
        return b.shared_news_count - a.shared_news_count;
      });

    const leftCardsHtml =
      priorTopics.length > 0
        ? priorTopics.map(renderTopicNodeCard).join("")
        : `<div style="padding: 16px 12px; text-align: center; font-size: 12px; color: var(--secondary); background: rgba(87, 53, 43, 0.03); border: 1px dashed rgba(87, 53, 43, 0.18); border-radius: 6px;">이 토픽보다 앞서 기록된 배경 이슈가 없습니다.</div>`;

    const rightCardsHtml =
      rightColumnTopics.length > 0
        ? rightColumnTopics.map(renderTopicNodeCard).join("")
        : `<div style="padding: 16px 12px; text-align: center; font-size: 12px; color: var(--secondary); background: rgba(87, 53, 43, 0.03); border: 1px dashed rgba(87, 53, 43, 0.18); border-radius: 6px;">연결된 후속·연관 이슈가 아직 없습니다.</div>`;

    explorerHtml = `
      <div style="${validItems.length > 0 ? "margin-top: 18px;" : ""}">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; align-items: start;">
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 800; color: var(--border); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1.5px solid rgba(87, 53, 43, 0.2);">
              <span>← 이전·배경 이슈</span>
              <span style="font-size: 12px; color: var(--secondary); font-weight: 600;">${priorTopics.length}개</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${leftCardsHtml}
            </div>
          </div>
          <div>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 800; color: var(--border); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1.5px solid rgba(182, 73, 38, 0.35);">
              <span>연관·후속 이슈 →</span>
              <span style="font-size: 12px; color: var(--secondary); font-weight: 600;">${rightColumnTopics.length}개</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${rightCardsHtml}
            </div>
          </div>
        </div>
      </div>`;
  }

  return `
    <div style="max-width: 800px; margin: 0 auto 24px auto; padding: 16px 20px; background: rgba(87, 53, 43, 0.05); border: 1px solid rgba(87, 53, 43, 0.22); border-radius: 8px; box-sizing: border-box;">
      ${
        validItems.length > 0
          ? `<div style="display: flex; align-items: center; margin-bottom: 12px; border-bottom: 1px dashed rgba(87, 53, 43, 0.2); padding-bottom: 8px;">
        <span style="font-size: 14px; font-weight: 800; color: var(--border); letter-spacing: -0.2px;">이슈 전개 타임라인</span>
      </div>
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${rowsHtml}
      </ul>`
          : ""
      }
      ${explorerHtml}
    </div>
  `;
}
