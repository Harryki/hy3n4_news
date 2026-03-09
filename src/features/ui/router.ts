import { Router } from "../../core/router";
import { Env, getSessionUser } from "../../auth";
import { renderHTML, renderNewsList, renderTopics, renderWideNewsList } from "./templates";

export const uiRouter = new Router();

// Define shared interfaces used by the UI routes
interface NewsRow {
    id: number;
    title: string;
    url: string;
    description: string;
    upvotes: number;
    view_count: number;
    published_at: string;
    created_at: string;
    source_name: string;
    keywords?: string;
}

interface TopicRow {
    id: number;
    title: string;
    article_count: number;
    keywords?: string;
}

// Helper: 404 Page Template
export function renderNotFoundPage(user: { username: string } | null = null): string {
    const errorHtml = `
        <div style="text-align: center; margin-top: 40px;">
            <h2>404 - Page Not Found</h2>
            <p>길을 잃으셨나요? 홈으로 돌아가세요!</p>
            <pre style="margin-top: 20px; padding: 20px; font-family: monospace; color: var(--border); font-size: 8px; text-align: center; display: inline-block; background: rgba(87, 53, 43, 0.05); border-radius: 8px; line-height: 1.2;">
                                       ░░                                       
                                     ░▓▓▓▓▓      ▒▒                             
                                   ▒▓▓▓▓▓▒▒░    ▓▓▒                             
                                  ░▓▓▓▓▓▓▓▓▓  ░▓▓▓▒                             
                             ░▓░ ░▓▓▓▓▓▓▓▓▒▓▓░░░▒▓▒                             
                           ▓▓▓▓  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░▒▒                            
                        ▒▓▓▓▓▒  ▒▓▓▓▓▓▓▒▒▓▒░░░░░░░░░░▒                          
                     ░▓▓▓▓▓▓     ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░▓                        
                   ▓▓▓▓▓▓▓▓  ░░  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░▓                      
                ▒▓▓▓▓▓▓▓▓▒  ░░░    ▓▓▓░░░░░░░░░░░░░░░░░░░░▒░                    
              ▓▓▓▓▓▓▓▓▓▓   ░░░░░░░    ░░░░░░░░░░░▒▓▒  ▓▓▓▒▒▓                    
             ▒▓▓▓▓▓▓▓▓▓   ░░░░░░░░░░░░░░░░░░░░░░░░▓▒  ▓▓▓▓▓▓▓░                  
            ░▓▓▓▓▓▓▓▓▒  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░▒░░░░▓▓▓▓▓▓▒                
            ▒▓▓▓▓▓▓▓▓   ░░░░░░░░░░░░▒░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▒             
           ░▓▓▓▓▓▓▓▓▓▒  ░░░░░░░░░░░░▓░░░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▒           
           ▓▓▓▓▓▓▓▓▓▓▓▒  ░░░░░░░░░░░▒▓░░░░░░░░░░░░░▓▒░░░▓▓▓▓▓▓▓▓▓▓▓▓            
          ░▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░░░░░░░░░▒▓▓░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             
          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░░░░░░░░░░▓▓▓▓▓▒░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░              
          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ░░░░░░░░░░░░▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░                
         ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░░░░░░░▓▓▓▓▓▓▓▓▓░                                 
           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒  ░░░░░░░▓▓▓▓▓▓▓▓▓▓                                   
            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░░░░▓▓▓▓▓▓▓▓▓▓▓                                    
             ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ░░▓▓▓▓▓▓▓▓▓▓▓▓                                     
              ▓▓▓▓▓▓▓▓▓▓▓▓▓▒ ▓▓▓▓▓▓▓▓▓▓▓▓▓                                      
               ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░                                      
                 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                       
                  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                      
                   ▒▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                      
            </pre>
            <p><a href="/" style="color: var(--accent); font-weight: bold; text-decoration: none; margin-top: 20px; display: inline-block;">&larr; 홈으로 돌아가기</a></p>
        </div>
    `;
    return renderHTML(errorHtml, user?.username || null);
}

// Helper: Hacker News Ranking Algorithm
function hnScore(upvotes: number, viewCount: number, publishedAt: string, now: Date): number {
    const p = upvotes - 1 + (viewCount * 0.1);
    const pubDate = publishedAt ? new Date(publishedAt).getTime() : now.getTime();
    const t = (now.getTime() - pubDate) / 3600000;
    const gravity = 1.8;
    return p / Math.pow((t + 2), gravity);
}

export function renderPage(
    news: any[],
    user: any,
    topicName: string = "",
    currentLimit: number = 25,
    currentTime: number = 24,
    hotTopics: any[] = [],
    hotKeywords: string[] = [],
    activeKeywords: string[] = [],
    page: number = 1
): string {
    let content = "";

    if (topicName) {
        content += `<h2 style="padding: 20px; max-width: 800px; margin: 0 auto; color: var(--border); border-bottom: 2px solid var(--accent); padding-bottom: 12px; font-size: 22px; margin-bottom: 24px;">${topicName}</h2>`;
        content += renderWideNewsList(news);
        return renderHTML(content, user?.username, currentLimit, currentTime, activeKeywords.join(','));
    }

    if (hotTopics && hotTopics.length > 0) {
        content += renderTopics(hotTopics, currentLimit, currentTime);
    }

    if (hotKeywords && hotKeywords.length > 0) {
        content += `<div class="filters" style="padding-top: 5px;"><div class="filter-group">
          <div class="tags-container">`;

        hotKeywords.forEach(k => {
            const isActive = activeKeywords.includes(k);
            let newKeywords = [...activeKeywords];
            if (isActive) {
                newKeywords = newKeywords.filter(kw => kw !== k);
            } else {
                newKeywords.push(k);
            }

            const keywordParam = newKeywords.length > 0 ? `&keywords=${encodeURIComponent(newKeywords.join(','))}` : '';
            content += `<a href="/?limit=${currentLimit}&time=${currentTime}${keywordParam}" class="filter-tag ${isActive ? 'active' : ''}">#${k}</a>`;
        });

        if (activeKeywords.length > 0) {
            content += `<a href="/?limit=${currentLimit}&time=${currentTime}" class="filter-tag" style="background: rgba(0,0,0,0.05); color: #888;">Clear All ✕</a>`;
        }
        content += `</div></div></div>`;
    }

    const kwParamStr = activeKeywords.length > 0 ? `&keywords=${encodeURIComponent(activeKeywords.join(','))}` : '';
    if (!topicName) {
        content += `
        <div class="filters">
            <div class="filter-group">
                ${[5, 10, 15, 25].map(l => `<a href="/?limit=${l}&time=${currentTime}${kwParamStr}" class="filter-btn ${currentLimit === l ? 'active' : ''}">${l}개</a>`).join('')}
            </div>
            ${activeKeywords.length === 0 ? `
            <div class="filter-group">
                ${[1, 3, 6, 12, 24].map(t => `<a href="/?limit=${currentLimit}&time=${t}${kwParamStr}" class="filter-btn ${currentTime === t ? 'active' : ''}">${t}시간</a>`).join('')}
            </div>
            ` : ''}
        </div>`;
    }

    const maxItemsPerSource = currentLimit;
    const itemsBySource: Record<string, any[]> = {};

    news.forEach(item => {
        const sourceName = item.source_name || 'Unknown';
        if (!itemsBySource[sourceName]) {
            itemsBySource[sourceName] = [];
        }
        if (itemsBySource[sourceName].length < maxItemsPerSource) {
            itemsBySource[sourceName].push(item);
        }
    });

    const sources = Object.keys(itemsBySource).sort();
    let colsHtml = "";
    sources.forEach((sourceName) => {
        colsHtml += renderNewsList(sourceName, itemsBySource[sourceName]);
    });

    content += `<div class="news-columns">${colsHtml}</div>`;

    if (activeKeywords.length > 0 && Array.isArray(news) && news.length === 30) {
        const nextKeywordsParam = activeKeywords.length > 0 ? `&keywords=${encodeURIComponent(activeKeywords.join(','))}` : '';
        content += `<div style="text-align: center; padding: 20px; border-top: 1px solid var(--border);">
            <a href="/?page=${page + 1}&limit=${currentLimit}&time=${currentTime}${nextKeywordsParam}" 
               style="display: inline-block; padding: 10px 20px; background: var(--accent); color: var(--bg); text-decoration: none; border-radius: 20px; font-weight: bold;">
               더 보기
            </a>
        </div>`;
    }

    return renderHTML(content, user?.username, currentLimit, currentTime, activeKeywords.join(','));
}

function getCookie(request: Request, name: string): string | null {
    const cookieStr = request.headers.get("Cookie") || "";
    const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? match[1] : null;
}

// --- Routes ---

uiRouter.get("/", async (request, env) => {
    const url = new URL(request.url);
    const user = await getSessionUser(request, env);

    const queryPage = url.searchParams.get("page");
    const queryLimit = url.searchParams.get("limit");
    const queryTime = url.searchParams.get("time");
    const queryKeywords = url.searchParams.get("keywords");

    const cookieLimit = getCookie(request, "pref_limit");
    const cookieTime = getCookie(request, "pref_time");

    const page = parseInt(queryPage || "1", 10);
    const limit = parseInt(queryLimit || cookieLimit || "25", 10);
    const timeHours = parseInt(queryTime || cookieTime || "24", 10);
    const selectedKeywords = queryKeywords ? queryKeywords.split(',').map(k => k.trim()).filter(k => k !== '') : [];

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeHours * 60 * 60 * 1000);
    const cutoffISO = cutoffTime.toISOString();

    let newsQuery = `
        SELECT n.id, n.title, n.url, n.description, n.upvotes, n.view_count, n.published_at, n.created_at, s.name as source_name,
               (SELECT group_concat(t.keywords) FROM news_topics nt JOIN topics t ON nt.topic_id = t.id WHERE nt.news_id = n.id) as keywords
        FROM news n
        JOIN sources s ON n.source_id = s.id
        WHERE n.published_at >= ?
        ORDER BY COALESCE(n.published_at, n.created_at) DESC
        LIMIT 500
    `;
    let queryParams: any[] = [cutoffISO];

    if (selectedKeywords.length > 0) {
        const likeConditions = selectedKeywords.map(() => "t.keywords LIKE ?").join(' AND ');
        const likeParams = selectedKeywords.map(k => `%${k}%`);
        const offset = (page - 1) * 30;

        newsQuery = `
            SELECT DISTINCT n.id, n.title, n.url, n.description, n.upvotes, n.view_count, n.published_at, n.created_at, s.name as source_name,
                   (SELECT group_concat(t2.keywords) FROM news_topics nt2 JOIN topics t2 ON nt2.topic_id = t2.id WHERE nt2.news_id = n.id) as keywords
            FROM news n
            JOIN sources s ON n.source_id = s.id
            JOIN news_topics nt ON n.id = nt.news_id
            JOIN topics t ON nt.topic_id = t.id
            WHERE (${likeConditions})
            ORDER BY COALESCE(n.published_at, n.created_at) DESC
            LIMIT 30 OFFSET ?
        `;
        queryParams = [...likeParams, offset];
    }

    const { results } = await env.DB.prepare(newsQuery).bind(...queryParams).all<NewsRow>();
    const news = results ?? [];

    const { results: topics } = await env.DB.prepare(`
        SELECT t.id, t.title, t.keywords, count(nt.news_id) as article_count
        FROM topics t
        JOIN news_topics nt ON t.id = nt.topic_id
        WHERE t.updated_at >= datetime('now', '-24 hours')
        GROUP BY t.id
        HAVING article_count > 1
        ORDER BY t.updated_at DESC, article_count DESC
        LIMIT 10
    `).all<TopicRow>();
    const hotTopics = topics ?? [];

    const keywordFreq = new Map<string, number>();
    hotTopics.forEach(t => {
        if (t.keywords) {
            t.keywords.split(',').forEach(k => {
                const tk = k.trim();
                if (tk) {
                    keywordFreq.set(tk, (keywordFreq.get(tk) || 0) + 1);
                }
            });
        }
    });
    const hotKeywords = Array.from(keywordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(e => e[0]);

    const ranked = news.sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at).getTime();
        const dateB = new Date(b.published_at || b.created_at).getTime();
        return dateB - dateA;
    });

    const html = renderPage(ranked, user, "", limit, timeHours, hotTopics, hotKeywords, selectedKeywords, page);

    const response = new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });

    if (queryLimit) {
        response.headers.append("Set-Cookie", `pref_limit=${limit}; Path=/; Max-Age=${60 * 60 * 24 * 365}`);
    }
    if (queryTime) {
        response.headers.append("Set-Cookie", `pref_time=${timeHours}; Path=/; Max-Age=${60 * 60 * 24 * 365}`);
    }

    return response;
});

uiRouter.get(/^\/topic\/(\d+)$/, async (request, env, ctx, match) => {
    const topicId = parseInt(match![1], 10);
    const user = await getSessionUser(request, env);

    const topicRow = await env.DB.prepare("SELECT title FROM topics WHERE id = ?").bind(topicId).first<{ title: string }>();
    if (!topicRow) return new Response(renderNotFoundPage(user), { status: 404, headers: { "Content-Type": "text/html" } });

    const { results } = await env.DB.prepare(`
        SELECT n.id, n.title, n.url, n.description, n.upvotes, n.view_count, n.published_at, n.created_at, s.name as source_name,
               (SELECT group_concat(t2.keywords) FROM news_topics nt2 JOIN topics t2 ON nt2.topic_id = t2.id WHERE nt2.news_id = n.id) as keywords
        FROM news n
        JOIN sources s ON n.source_id = s.id
        JOIN news_topics nt ON n.id = nt.news_id
        WHERE nt.topic_id = ?
        ORDER BY COALESCE(n.published_at, n.created_at) DESC
        LIMIT 100
    `).bind(topicId).all<NewsRow>();

    const news = results ?? [];

    const html = renderPage(news, user, topicRow.title);

    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});

uiRouter.get("/user", async (request, env) => {
    const user = await getSessionUser(request, env);
    if (!user) return new Response(null, { status: 302, headers: { Location: "/login" } });

    const { results } = await env.DB.prepare(`
        SELECT n.id, n.title, n.url, n.description, n.upvotes, n.published_at, n.created_at, s.name as source_name,
               (SELECT group_concat(t2.keywords) FROM news_topics nt2 JOIN topics t2 ON nt2.topic_id = t2.id WHERE nt2.news_id = n.id) as keywords
        FROM news n
        JOIN sources s ON n.source_id = s.id
        JOIN votes v ON v.news_id = n.id
        WHERE v.user_id = ?
        ORDER BY v.created_at DESC
        LIMIT 50
    `).bind(user.id).all<NewsRow>();

    const news = results ?? [];
    const html = renderPage(news, user, "투표한 기사");
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
});

uiRouter.get("/guidelines", async (request, env) => {
    const user = await getSessionUser(request, env);
    const content = `
        <div class="static-content">
            <h2>Community Guidelines</h2>
            <p>Welcome to <strong>hy3n4 news</strong>! As this is an automated curation service in its MVP stage, our guidelines are simple:</p>
            <ul>
                <li>Be respectful in your voting. Do not attempt to game the system through automated means or bots.</li>
                <li>We currently curate from established news sources (조선일보, 경향신문, 연합뉴스) to provide a variety of perspectives.</li>
                <li>If you experience technical issues or want to suggest a new source, please use the Contact link in the footer.</li>
                <li>Enjoy reading and sharing the news!</li>
            </ul>
        </div>
    `;
    const html = renderHTML(content, user?.username);
    return new Response(html, { headers: { "Content-Type": "text/html" } });
});

uiRouter.get("/legal", async (request, env) => {
    const user = await getSessionUser(request, env);
    const content = `
        <div class="static-content">
            <h2>Legal Information</h2>
            <h3>Terms of Service</h3>
            <p>By using hy3n4 news, you agree that this is a hobbyist news aggregator provided "as is" without any warranties. The content and copyrights belong to their respective original publishers. We are not responsible for the accuracy of the aggregated content.</p>
            
            <h3>Privacy Policy</h3>
            <p>We believe in minimal data collection. We use Google OAuth strictly for secure login purposes. We only store your Google ID, chosen username, and email to maintain your voting session. We do not track your activity across the web, nor do we sell your data to any third parties.</p>
        </div>
    `;
    const html = renderHTML(content, user?.username);
    return new Response(html, { headers: { "Content-Type": "text/html" } });
});

uiRouter.get(/^\/go\/(\d+)$/, async (request, env, ctx, match) => {
    const newsId = parseInt(match![1], 10);
    const user = await getSessionUser(request, env);

    const row = await env.DB.prepare(
        "SELECT url FROM news WHERE id = ?"
    ).bind(newsId).first<{ url: string }>();

    if (!row) return new Response(renderNotFoundPage(user), { status: 404, headers: { "Content-Type": "text/html" } });

    await env.DB.prepare(
        "INSERT INTO clicks (user_id, news_id) VALUES (?, ?)"
    ).bind(user?.id ?? null, newsId).run();
    await env.DB.prepare(
        "UPDATE news SET view_count = view_count + 1 WHERE id = ?"
    ).bind(newsId).run();

    return new Response(null, { status: 302, headers: { Location: row.url } });
});
