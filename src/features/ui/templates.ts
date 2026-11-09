import { getRelativeTime } from "../../core/utils";

export const CSS_STYLES = `
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --text: #2b2b2b;
      --bg: #f9e9da;
      --secondary: #4c393d;
      --border: #57352b;
      --accent: #9e5b10;
      --surface: #ffffff;
      --border-light: rgba(87, 53, 43, 0.15);
      --primary: #9e5b10;
      --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", Roboto, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    }

    ::selection {
      background: rgba(158, 91, 16, 0.2);
      color: var(--text);
    }

    :focus-visible {
      outline: 2px solid var(--accent);
      outline-offset: 2px;
    }

    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      max-width: 100%;
      margin: 0;
      padding: 0;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .site-header {
      font-family: var(--font-sans);
      background: var(--border);
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid var(--accent);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .site-header h1 {
      font-weight: 400;
      font-size: 20px;
      color: var(--bg);
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* IconButton Style (Shadcn-like) */
    .icon-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--bg);
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      height: 36px;
      width: 36px;
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .icon-btn svg {
      width: 20px;
      height: 20px;
      stroke: var(--bg);
    }

    /* Sidebar (Shadcn Sheet style) */
    .sidebar-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 2000;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .sidebar-overlay.open {
      display: block;
      opacity: 1;
    }

    .sidebar {
      position: fixed;
      top: 0;
      right: -300px;
      width: 300px;
      height: 100%;
      background: var(--bg);
      z-index: 2001;
      box-shadow: -10px 0 25px rgba(0,0,0,0.1);
      transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      padding: 24px;
      border-left: 1px solid rgba(0,0,0,0.1);
    }

    .sidebar.open {
      right: 0;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }

    .sidebar-header h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--text);
    }

    .sidebar-close {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: var(--text);
      display: flex;
      align-items: center;
    }

    .sidebar-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sidebar-link {
      padding: 12px 16px;
      border-radius: 8px;
      text-decoration: none;
      color: var(--text);
      font-size: 15px;
      font-weight: 500;
      transition: background 0.2s;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .sidebar-link:hover {
      background: rgba(0,0,0,0.05);
    }

    .sidebar-link.auth-btn {
      margin-top: auto;
      background: var(--border);
      color: var(--bg);
      justify-content: center;
    }

    .sidebar-link.auth-btn:hover {
      background: #462a22;
    }

    .sidebar-divider {
      height: 1px;
      background: rgba(0,0,0,0.1);
      margin: 16px 0;
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      padding: 15px 0;
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
      font-weight: 700;
      color: var(--secondary);
      letter-spacing: 0.02em;
      min-width: 72px;
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

    main {
      padding: 0 20px;
    }

    @media (max-width: 640px) {
      .app-container { padding: 0; }
      .site-header { padding: 12px 16px; }
      main { padding: 0 16px; }
      .news-columns { padding: 0 0 8px; gap: 12px; }
    }

    .hot-topics {
      padding: 20px 0 10px;
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

    @media (max-width: 640px) {
      .topic-pills {
        display: flex;
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 8px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
      }

      .topic-pill {
        flex: 0 0 auto;
        max-width: 280px;
        box-sizing: border-box;
      }
    }

    .topic-pill {
      text-decoration: none;
      background: rgba(158, 91, 16, 0.1);
      color: var(--secondary);
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      border: 1px solid rgba(87, 53, 43, 0.18);
      transition: all 0.15s ease;
      display: inline-flex;
      flex-direction: column;
      gap: 5px;
    }

    .topic-pill:hover {
      background: rgba(158, 91, 16, 0.18);
      border-color: var(--accent);
    }
    
    .topic-pill-header {
      display: flex;
      align-items: center;
    }

    .topic-pill-count {
      opacity: 0.75;
      font-size: 12.5px;
      margin-left: 6px;
    }
    
    .topic-pill-keywords {
      font-size: 12.5px;
      color: var(--secondary);
      opacity: 0.85;
      font-weight: normal;
    }

    .news-column {
      flex: 1 1 calc(50% - 10px);
      min-width: 300px;
      max-width: 700px;
    }

    .column-header {
      font-family: var(--font-sans);
      font-size: 16px;
      font-weight: 800;
      color: var(--secondary);
      border-bottom: 2px solid var(--border);
      padding-bottom: 8px;
      margin-bottom: 12px;
      letter-spacing: 0.02em;
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
      font-size: 14.5px;
      line-height: 1.42;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: keep-all;
      text-wrap: pretty;
      margin-bottom: 6px;
    }

    .news-title:visited {
      color: var(--secondary);
    }

    .news-title:hover {
      text-decoration: underline;
      color: var(--primary);
    }

    .hot-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      line-height: 1;
      padding: 2px 5px;
      border-radius: 4px;
      background: rgba(158, 91, 16, 0.15);
      color: var(--accent);
      margin-left: 6px;
      letter-spacing: 0.04em;
      vertical-align: middle;
      flex-shrink: 0;
    }

    .news-domain {
      color: var(--secondary);
      font-size: 11px;
    }

    .news-item-meta {
      font-size: 12px;
      color: var(--secondary);
      opacity: 0.85;
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
    .search-btn {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--bg);
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      height: 32px;
      width: 32px;
      margin-left: auto;
      margin-right: 12px;
    }

    .search-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      border-color: var(--accent);
    }

    .search-btn svg {
      width: 18px;
      height: 18px;
      stroke: var(--accent);
    }

    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      justify-content: center;
      align-items: flex-start;
      padding-top: 100px;
    }

    .modal-content {
      background: var(--bg);
      width: 90%;
      max-width: 600px;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      border: 1px solid var(--accent);
    }

    .modal-search-form {
      display: flex;
      gap: 12px;
    }

    .modal-search-form input {
      flex: 1;
      font-family: var(--font-sans);
      background: rgba(87, 53, 43, 0.05);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 16px;
      color: var(--text);
      outline: none;
    }

    .modal-search-form input:focus {
      border-color: var(--accent);
    }

    .modal-search-form button {
      background: var(--accent);
      color: var(--bg);
      border: none;
      padding: 0 20px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
    }

    .search-results-container {
      background: var(--bg);
      padding: 0 0 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    .search-results-header {
      margin-bottom: 24px;
      border-bottom: 2px solid var(--accent);
      padding: 20px 0 12px;
      color: var(--border);
    }
    
    .search-results-header h2 {
      font-size: 22px;
      font-weight: bold;
    }

    .search-topic-group {
      margin-bottom: 40px;
    }

    .search-topic-title {
      font-size: 20px;
      font-weight: bold;
      color: var(--text);
      text-decoration: none;
      display: block;
      margin-bottom: 4px;
    }

    .search-topic-title:hover {
      color: var(--accent);
    }

    .search-topic-keywords {
      font-size: 13px;
      color: var(--accent);
      margin-top: 4px;
      font-weight: 500;
    }

    .search-news-list {
      list-style: none;
      padding: 0;
      margin-top: 16px;
      border-left: 3px solid rgba(229, 166, 87, 0.3);
      padding-left: 16px;
    }

    .search-news-list li {
      margin-bottom: 12px;
    }

    .search-news-link {
      color: var(--text);
      text-decoration: none;
      font-size: 15px;
      display: block;
      line-height: 1.4;
    }

    .search-news-link:hover {
      text-decoration: underline;
    }

    .search-news-meta {
      font-size: 12px;
      color: #828282;
      margin-top: 2px;
    }

    /* Feedback Modal Styles */
    .fb-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(87, 53, 43, 0.45);
      backdrop-filter: blur(2px);
      z-index: 2500;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .fb-overlay.open {
      display: flex;
    }

    .fb-card {
      background: #FFF9ED;
      border: 2px solid var(--border);
      border-radius: 14px;
      box-shadow: 0 12px 32px rgba(87, 53, 43, 0.22);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 22px 24px;
      color: var(--text);
      position: relative;
    }

    .fb-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
      border-bottom: 1.5px dashed rgba(87, 53, 43, 0.2);
      padding-bottom: 12px;
    }

    .fb-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--border);
      line-height: 1.3;
    }

    .fb-subtitle {
      font-size: 12.5px;
      color: var(--secondary);
      margin-top: 4px;
    }

    .fb-close {
      background: none;
      border: none;
      color: var(--secondary);
      cursor: pointer;
      padding: 4px;
      font-size: 20px;
      line-height: 1;
    }

    .fb-section {
      margin-bottom: 16px;
    }

    .fb-question {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--border);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .fb-question-sub {
      font-size: 11px;
      font-weight: 500;
      color: var(--secondary);
    }

    .fb-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .fb-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1.5px solid rgba(87, 53, 43, 0.2);
      background: #FFFDF8;
      font-size: 13px;
      color: var(--text);
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
    }

    .fb-chip:hover {
      border-color: var(--accent);
      background: rgba(229, 166, 87, 0.08);
    }

    .fb-chip input[type="checkbox"] {
      accent-color: var(--border);
      width: 15px;
      height: 15px;
      cursor: pointer;
      flex-shrink: 0;
    }

    .fb-chip.selected {
      border-color: var(--border);
      background: rgba(229, 166, 87, 0.22);
      font-weight: 600;
    }

    .fb-textarea {
      width: 100%;
      min-height: 70px;
      border: 1.5px solid rgba(87, 53, 43, 0.25);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      font-family: inherit;
      background: #FFFDF8;
      color: var(--text);
      resize: vertical;
      outline: none;
    }

    .fb-textarea:focus {
      border-color: var(--border);
    }

    .fb-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
    }

    .fb-btn-snooze {
      background: transparent;
      border: 1px solid rgba(87, 53, 43, 0.25);
      color: var(--secondary);
      padding: 9px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .fb-btn-submit {
      background: var(--border);
      border: none;
      color: var(--bg);
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }

    .fb-btn-submit:hover {
      background: var(--secondary);
    }

    .fb-btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .fb-msg {
      font-size: 12.5px;
      margin-top: 8px;
      text-align: right;
      display: none;
    }

    /* --- Blog System Styles --- */
    .blog-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px 0 48px;
    }

    .blog-index-header {
      padding: 16px 0 22px;
      text-align: left;
      border-bottom: 2px solid var(--border);
      margin-bottom: 4px;
    }

    .blog-index-title {
      font-size: 26px;
      font-weight: 850;
      color: var(--border);
      line-height: 1.3;
      letter-spacing: -0.02em;
      text-wrap: balance;
      margin-bottom: 8px;
    }

    .blog-index-desc {
      font-size: 14.5px;
      color: var(--secondary);
      line-height: 1.65;
      max-width: none;
      margin: 0;
      text-wrap: pretty;
    }

    .blog-feed {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .blog-card {
      background: transparent;
      border: none;
      border-bottom: 1px dashed rgba(87, 53, 43, 0.3);
      border-radius: 0;
      padding: 22px 0;
      box-shadow: none;
    }

    .blog-card:hover {
      transform: none;
      box-shadow: none;
    }

    .blog-card-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
      font-size: 12px;
    }

    .blog-date-badge {
      background: var(--border);
      color: var(--bg);
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 4px;
      font-size: 11.5px;
      display: inline-block;
      white-space: nowrap;
    }

    .blog-meta-time {
      color: var(--secondary);
    }

    .blog-card-title {
      font-size: 20px;
      font-weight: 800;
      line-height: 1.35;
      letter-spacing: -0.015em;
      text-wrap: balance;
      margin-bottom: 10px;
    }

    .blog-card-title a {
      color: var(--border);
      text-decoration: none;
    }

    .blog-card-title a:hover {
      color: var(--primary);
      text-decoration: underline;
    }

    .blog-card-summary {
      font-size: 14.5px;
      line-height: 1.68;
      color: var(--text);
      opacity: 0.9;
      margin-bottom: 14px;
      text-wrap: pretty;
    }

    .blog-card-topics {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 14px;
    }

    .blog-topic-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      background: rgba(158, 91, 16, 0.1);
      border: 1px solid rgba(87, 53, 43, 0.18);
      padding: 3px 9px;
      border-radius: 6px;
      color: var(--border);
      text-decoration: none;
      transition: background 0.15s ease;
    }

    .blog-topic-pill:hover {
      background: rgba(158, 91, 16, 0.2);
    }

    .blog-topic-pill .pill-count {
      font-size: 11px;
      opacity: 0.75;
    }

    .blog-card-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 4px;
    }

    .blog-read-more {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary);
      text-decoration: none;
    }

    .blog-read-more:hover {
      text-decoration: underline;
    }

    .blog-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-top: 32px;
      font-size: 13px;
    }

    .blog-pagination .pagination-btn {
      padding: 8px 14px;
      border: 1px solid rgba(87, 53, 43, 0.25);
      border-radius: 6px;
      background: rgba(87, 53, 43, 0.05);
      color: var(--border);
      text-decoration: none;
      font-weight: 600;
    }

    .blog-pagination .pagination-btn.disabled {
      opacity: 0.4;
      pointer-events: none;
    }

    /* --- Blog Article (Detail) Styles --- */
    .blog-breadcrumb {
      font-size: 12.5px;
      color: var(--secondary);
      margin-bottom: 14px;
      padding: 0;
    }

    .blog-breadcrumb a {
      color: var(--secondary);
      text-decoration: none;
    }

    .blog-breadcrumb a:hover {
      text-decoration: underline;
    }

    .blog-breadcrumb .bc-sep {
      margin: 0 6px;
      opacity: 0.5;
    }

    .blog-article {
      background: transparent;
      border: none;
      border-radius: 0;
      padding: 0;
      box-shadow: none;
    }

    .blog-article-header {
      display: block;
      background: transparent;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 2px solid var(--border);
    }

    .blog-article-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      font-size: 12px;
    }

    .blog-article-title {
      font-size: 28px;
      font-weight: 850;
      color: var(--border);
      line-height: 1.3;
      letter-spacing: -0.025em;
      text-wrap: balance;
      margin-bottom: 16px;
    }

    .blog-article-lead {
      background: rgba(158, 91, 16, 0.07);
      border: 1px solid rgba(158, 91, 16, 0.2);
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 15px;
      line-height: 1.7;
      color: var(--text);
      text-wrap: pretty;
    }

    .blog-topics-spotlight {
      background: rgba(87, 53, 43, 0.04);
      border: 1px solid rgba(87, 53, 43, 0.15);
      border-radius: 10px;
      padding: 18px 20px;
      margin-top: 36px;
      margin-bottom: 24px;
    }

    @media (max-width: 640px) {
      .blog-container {
        padding: 12px 0 36px;
      }

      .blog-index-header {
        padding: 10px 0 18px;
        margin-bottom: 2px;
      }

      .blog-index-title {
        font-size: 22px;
      }

      .blog-feed {
        gap: 0;
      }

      .blog-card {
        padding: 18px 0;
      }

      .blog-article {
        padding: 0;
      }

      .blog-article-header {
        margin-bottom: 20px;
        padding-bottom: 16px;
      }

      .blog-article-title {
        font-size: 22px;
        line-height: 1.35;
      }

      .blog-article-lead {
        padding: 14px 16px;
        font-size: 14.5px;
      }

      .blog-topics-spotlight {
        padding: 16px 16px;
        margin-top: 28px;
      }

      .blog-cta-box {
        padding: 18px 16px;
      }

      .blog-content .blog-quote {
        padding: 12px 16px;
      }
    }

    .spotlight-header {
      font-size: 13.5px;
      font-weight: 800;
      color: var(--border);
      margin-bottom: 12px;
      letter-spacing: -0.01em;
    }

    .spotlight-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }

    .spotlight-card {
      display: block;
      background: rgba(87, 53, 43, 0.05);
      border: 1px solid rgba(87, 53, 43, 0.18);
      border-radius: 8px;
      padding: 12px 14px;
      text-decoration: none;
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .spotlight-card:hover {
      border-color: var(--primary);
      background: rgba(158, 91, 16, 0.1);
    }

    .spotlight-card-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--border);
      margin-bottom: 4px;
      line-height: 1.35;
    }

    .spotlight-card-meta {
      font-size: 11.5px;
      color: var(--secondary);
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .spotlight-kw {
      color: var(--primary);
      font-weight: 600;
    }

    .blog-content {
      max-width: none;
      width: 100%;
      margin: 0;
      font-size: 16px;
      line-height: 1.85;
      color: var(--text);
      word-break: keep-all;
      letter-spacing: -0.015em;
    }

    .blog-content .blog-h2 {
      font-size: 23px;
      font-weight: 800;
      color: var(--border);
      margin: 44px 0 16px;
      padding-bottom: 10px;
      border-bottom: 1.5px solid rgba(87, 53, 43, 0.2);
      line-height: 1.35;
      letter-spacing: -0.02em;
      text-wrap: balance;
    }

    .blog-content .blog-h3 {
      font-size: 18.5px;
      font-weight: 750;
      color: var(--border);
      margin: 30px 0 12px;
      line-height: 1.4;
      letter-spacing: -0.01em;
      text-wrap: balance;
    }

    .blog-content .blog-p {
      margin-bottom: 20px;
      text-wrap: pretty;
    }

    .blog-content .blog-list {
      margin: 14px 0 20px 22px;
      padding: 0;
    }

    .blog-content .blog-list li {
      margin-bottom: 8px;
      line-height: 1.7;
      text-wrap: pretty;
    }

    .blog-content .blog-quote {
      background: rgba(87, 53, 43, 0.04);
      border-left: 3px solid var(--border);
      margin: 24px 0;
      padding: 14px 20px;
      font-style: normal;
      color: var(--secondary);
      line-height: 1.75;
      text-wrap: pretty;
    }

    .blog-content .blog-link {
      color: var(--primary);
      text-decoration: underline;
      font-weight: 600;
    }

    .blog-content .blog-code {
      background: rgba(87, 53, 43, 0.08);
      color: var(--border);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.88em;
      font-family: var(--font-mono);
    }

    .blog-article-footer {
      margin-top: 40px;
      padding-top: 28px;
      border-top: 1.5px solid rgba(87, 53, 43, 0.15);
    }

    .blog-cta-box {
      background: rgba(158, 91, 16, 0.05);
      border: 1px solid rgba(158, 91, 16, 0.2);
      border-radius: 10px;
      padding: 20px 24px;
      text-align: center;
      margin-bottom: 28px;
    }

    .cta-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--border);
      margin-bottom: 6px;
    }

    .cta-desc {
      font-size: 13px;
      color: var(--secondary);
      line-height: 1.55;
      margin-bottom: 14px;
    }

    .cta-actions {
      display: flex;
      justify-content: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .cta-btn {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }

    .cta-btn.primary {
      background: var(--border);
      color: var(--bg);
    }

    .cta-btn.secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--border);
    }

    .blog-nav-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
    }

    @media (max-width: 600px) {
      .blog-nav-row {
        grid-template-columns: 1fr;
      }
    }

    .nav-prev, .nav-next {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-next {
      text-align: right;
    }

    .nav-label {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .nav-title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--border);
      text-decoration: none;
      line-height: 1.4;
    }

    .nav-title:hover {
      color: var(--primary);
      text-decoration: underline;
    }
  `;

export interface SeoOptions {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogType?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
  hasFeedback?: boolean;
}

export function renderFilters(currentLimit: number = 25, currentTime: number = 24): string {
  const limits = [5, 10, 15, 25];
  const times = [1, 3, 6, 12, 24];

  const limitsHtml = limits.map(l =>
    `<a href="/?limit=${l}&time=${currentTime}" class="filter-btn ${l === currentLimit ? 'active' : ''}">${l}개</a>`
  ).join('');

  const timesHtml = times.map(t =>
    `<a href="/?limit=${currentLimit}&time=${t}" class="filter-btn ${t === currentTime ? 'active' : ''}">${t}시간</a>`
  ).join('');

  return `
    <div class="filters">
        <div class="filter-group">
            <span class="filter-label">언론사별 기사:</span>
            ${limitsHtml}
        </div>
        <div class="filter-group">
            <span class="filter-label">수집 기간:</span>
            ${timesHtml}
        </div>
    </div>`;
}

export function renderHTML(
  content: string,
  user: string | null = null,
  currentLimit: number = 25,
  currentTime: number = 24,
  seo: SeoOptions = {}
) {
  const authHtml = user
    ? `<div class="auth-area"><a href="/user" class="user-name">${user}</a> | <a href="/logout">로그아웃</a></div>`
    : `<div class="auth-area"><a href="/login">login</a></div>`;

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

  <script type="application/ld+json">${jsonLdScript}</script>
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  <style>

    ${CSS_STYLES}

  </style>
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
  <script>
    document.addEventListener('htmx:responseError', function(e) {
      if (e.detail.xhr.status === 401) { window.location.href = '/login'; }
    });
  </script>
  <div class="app-container">
    <header class="site-header">
      <h1>
        <a href="/" style="color: var(--bg); text-decoration: none; display: flex; align-items: center; gap: 8px;">
          <img src="/hyena.svg" alt="logo" style="width: 28px; height: 28px; object-fit: contain;">
          하이에나뉴스
        </a>
      </h1>
      <div class="header-right">
        <a href="/blog" class="icon-btn" title="블로그 (일일 뉴스 브리핑)" style="text-decoration: none; display: flex; align-items: center; justify-content: center;">
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

      const isFbSnoozed = () => {
        try {
          const until = parseInt(localStorage.getItem('hy3n4_fb_snooze_until') || '0', 10);
          if (until > Date.now()) return true;
        } catch (e) {}
        return hasCookie('hy3n4_fb_snooze');
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
      <a href="/guidelines">가이드라인 (Guidelines)</a> | <a href="/legal">법적고지 (Legal)</a> | <a href="#" id="footer-feedback-btn">피드백 보내기</a> | <a href="mailto:hy3n4news@gmail.com">Contact</a>
    </footer>
  </div>
</body>
</html>`;
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

    const viewCount = item.view_count || 0;
    let fireHtml = '';
    let titleWeight = viewCount >= 1 ? '600' : 'normal';

    if (viewCount >= 2) {
      fireHtml = '<span class="hot-badge" title="인기 기사">HOT 2</span>';
    } else if (viewCount === 1) {
      fireHtml = '<span class="hot-badge" title="인기 기사">HOT</span>';
    }

    html += `
        <li class="news-item">
          <div class="news-content">
            <a href="/go/${item.id}" rel="nofollow" target="_blank" class="news-title">
              <span style="font-weight: ${titleWeight};">${item.title}</span>${fireHtml}
            </a>
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

function escapeHtml(str: string): string {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderPagination(opts: { page: number; hasMore: boolean; prevUrl: string | null; nextUrl: string | null; firstUrl: string | null }): string {
  const { page, hasMore, prevUrl, nextUrl, firstUrl } = opts;
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
      html += renderPagination({ page, hasMore: false, prevUrl, nextUrl: null, firstUrl });
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
    html += renderPagination({ page, hasMore, prevUrl, nextUrl, firstUrl });
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

    const domain = new URL(item.url).hostname.replace('www.', '');
    const timeStr = getRelativeTime(item.published_at, item.created_at);

    const viewCount = item.view_count || 0;
    let fireHtml = '';
    let titleWeight = viewCount >= 1 ? '600' : 'normal';

    if (viewCount >= 2) {
      fireHtml = '<span class="hot-badge" title="인기 기사">HOT 2</span>';
    } else if (viewCount === 1) {
      fireHtml = '<span class="hot-badge" title="인기 기사">HOT</span>';
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

