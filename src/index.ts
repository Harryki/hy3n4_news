import { parseRSS } from "./rss";
import { hnScore } from "./ranking";
import { renderPage, renderStaticPage, renderTopicPage, NewsRow, TopicRow } from "./template";
import { Env, handleLogin, handleCallback, handleLogout, getSessionUser } from "./auth";

export type { Env };

type RouteHandler = (request: Request, env: Env, ctx: ExecutionContext, match?: RegExpMatchArray) => Promise<Response> | Response;

interface Route {
    method: string;
    pattern: string | RegExp;
    handler: RouteHandler;
}

class Router {
    private routes: Route[] = [];

    public get(pattern: string | RegExp, handler: RouteHandler) {
        this.routes.push({ method: "GET", pattern, handler });
    }

    public post(pattern: string | RegExp, handler: RouteHandler) {
        this.routes.push({ method: "POST", pattern, handler });
    }

    public async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        for (const route of this.routes) {
            if (route.method === request.method || route.method === "ANY") {
                if (typeof route.pattern === "string") {
                    if (route.pattern === url.pathname) {
                        return await route.handler(request, env, ctx);
                    }
                } else if (route.pattern instanceof RegExp) {
                    const match = url.pathname.match(route.pattern);
                    if (match) {
                        return await route.handler(request, env, ctx, match);
                    }
                }
            }
        }

        return getNotFoundResponse();
    }
}

export function getNotFoundResponse(): Response {
    const content = `
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
                    ░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░                                     
                      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                     
                       ▓▓▓▓▓▓▓▒▓▓▓▓▓▓▓▓▓▓▓▓░                                    
                        ▒▓▓▓▓▓▒▓▓▓▓▓▓▓▓▓▓▓▓                                     
                          ░▓▓▓▓▓▒▓▓▓▓▓▓▓▓▓░                                     
                            ░▓▒▓▒▓▓▓▓▓▓▒▓▓                                      
                               ▓▓▓▒▓▒▒▓▓▓░                                      
                                 ▒▓▒▓▓▓▓▓                                       
                                   ▒▓▓▒▒▒                                       
                                     ░▒▓                                        
            </pre>
            <p>
            <a href="/" style="color: var(--accent); font-weight: bold; text-decoration: none; margin-top: 20px; display: inline-block;">&larr; 홈으로 돌아가기</a>
            </p>
        </div>
    `;
    const html = renderStaticPage(content, null, "404 Not Found");

    return new Response(html, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" }
    });
}

const router = new Router();

function getCookie(request: Request, name: string): string | null {
    const cookieStr = request.headers.get("Cookie") || "";
    const match = cookieStr.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? match[1] : null;
}

// --- GET / : News list ---
router.get("/", async (request, env, ctx) => {
    const url = new URL(request.url);
    const user = await getSessionUser(request, env);

    const queryLimit = url.searchParams.get("limit");
    const queryTime = url.searchParams.get("time");
    const queryKeywords = url.searchParams.get("keywords");

    const cookieLimit = getCookie(request, "pref_limit");
    const cookieTime = getCookie(request, "pref_time");

    const queryPage = url.searchParams.get("page");
    const page = parseInt(queryPage || "1", 10);
    const limit = parseInt(queryLimit || cookieLimit || "25", 10);
    const timeHours = parseInt(queryTime || cookieTime || "24", 10);
    const selectedKeywords = queryKeywords ? queryKeywords.split(',').map(k => k.trim()).filter(k => k !== '') : [];

    // Fetch based on time threshold
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeHours * 60 * 60 * 1000);
    const cutoffISO = cutoffTime.toISOString();

    let newsQuery = `
        SELECT n.id, n.title, n.url, n.description, n.upvotes, n.view_count, n.published_at, n.created_at, s.name as source_name,
               (SELECT group_concat(t.keywords) FROM news_topics nt JOIN topics t ON nt.topic_id = t.id WHERE nt.news_id = n.id) as keywords
        FROM news n
        JOIN sources s ON n.source_id = s.id
        WHERE n.published_at >= ?
        ORDER BY n.created_at DESC
        LIMIT 500
    `;
    let queryParams: any[] = [cutoffISO];

    if (selectedKeywords.length > 0) {
        const likeConditions = selectedKeywords.map(() => `t.keywords LIKE ?`).join(' AND ');
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
            ORDER BY n.created_at DESC
            LIMIT 30 OFFSET ?
        `;
        queryParams = [...likeParams, offset];
    }

    const { results } = await env.DB.prepare(newsQuery).bind(...queryParams).all<NewsRow>();

    const news = results ?? [];

    // Fetch Top Topics
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
        .slice(0, 20)
        .map(e => e[0]);

    // Rank all fetched news by hnScore (per source limitation is handled in renderPage)
    const ranked = news
        .map((item) => ({ ...item, score: hnScore(item.upvotes, item.view_count || 0, item.published_at, now) }))
        .sort((a, b) => b.score - a.score);

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

// --- GET /debug/headers : Test incoming headers for OAuth ---
router.get("/debug/headers", async (request, env, ctx) => {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => { headers[key] = value; });

    return new Response(JSON.stringify({
        url: request.url,
        origin: url.origin,
        hostHeader: request.headers.get("Host"),
        allHeaders: headers
    }, null, 2), {
        headers: { "Content-Type": "application/json" }
    });
});

// --- GET /debug/vector : Dev Debugging Route ---
router.get(/^\/debug\/vector/, async (request, env, ctx) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");

    if (!q) return new Response("Provide ?q=TEXT to query vectorize", { status: 400 });

    const embedRes = await env.AI.run("@cf/baai/bge-m3", { text: [q] });
    const vector = embedRes.data[0];

    const searchRes = await env.VECTORIZE.query(vector, { topK: 10 });

    // Fetch titles for the matched topics
    const results = [];
    for (const match of searchRes.matches) {
        const topic = await env.DB.prepare("SELECT title FROM topics WHERE id = ?").bind(parseInt(match.id, 10)).first<{ title: string }>();
        results.push({
            score: match.score,
            topicId: match.id,
            title: topic?.title || "Unknown"
        });
    }

    return new Response(JSON.stringify({ query: q, results }, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
    });
});

// --- GET /topic/:id : Topic Details ---
router.get(/^\/topic\/(\d+)$/, async (request, env, ctx, match) => {
    const topicId = parseInt(match![1], 10);
    const user = await getSessionUser(request, env);

    const topicRow = await env.DB.prepare("SELECT title FROM topics WHERE id = ?").bind(topicId).first<{ title: string }>();
    if (!topicRow) return getNotFoundResponse();

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
    const html = renderTopicPage(news, topicRow.title, user);

    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
});

// --- GET /user : User's voted news ---
router.get("/user", async (request, env, ctx) => {
    const user = await getSessionUser(request, env);

    if (!user) {
        return new Response(null, {
            status: 302,
            headers: { Location: "/login" },
        });
    }

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
    const html = renderPage(news, user, "voted");
    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
});

// --- GET /guidelines ---
router.get("/guidelines", async (request, env, ctx) => {
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
    const html = renderStaticPage(content, user, "Guidelines");
    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
});

// --- GET /legal ---
router.get("/legal", async (request, env, ctx) => {
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
    const html = renderStaticPage(content, user, "Legal");
    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
});

// --- GET /go/:news_id : Click tracking + redirect ---
router.get(/^\/go\/(\d+)$/, async (request, env, ctx, match) => {
    const newsId = parseInt(match![1], 10);
    const user = await getSessionUser(request, env);

    // Get original URL to verify existence and redirect
    const row = await env.DB.prepare(
        "SELECT url FROM news WHERE id = ?"
    ).bind(newsId).first<{ url: string }>();

    if (!row) {
        return getNotFoundResponse();
    }

    // Record click & increment view count only if news exists
    await env.DB.prepare(
        "INSERT INTO clicks (user_id, news_id) VALUES (?, ?)"
    ).bind(user?.id ?? null, newsId).run();
    await env.DB.prepare(
        "UPDATE news SET view_count = view_count + 1 WHERE id = ?"
    ).bind(newsId).run();

    return new Response(null, {
        status: 302,
        headers: { Location: row.url },
    });
});

// --- Auth routes ---
router.get("/login", handleLogin);
router.get("/auth/callback", handleCallback);
router.get("/logout", handleLogout);

// --- POST /vote/:news_id : Toggle vote (requires login) ---
router.post(/^\/vote\/(\d+)$/, async (request, env, ctx, match) => {
    const user = await getSessionUser(request, env);

    if (!user) {
        // Return 401 — HTMX will handle redirect
        return new Response("login_required", {
            status: 401,
            headers: { "Content-Type": "text/plain", "HX-Redirect": "/login" },
        });
    }

    const newsId = parseInt(match![1], 10);

    // Check if already voted
    const existing = await env.DB.prepare(
        "SELECT rowid FROM votes WHERE user_id = ? AND news_id = ?"
    ).bind(user.id, newsId).first();

    if (existing) {
        // Un-vote (toggle off)
        await env.DB.prepare(
            "DELETE FROM votes WHERE user_id = ? AND news_id = ?"
        ).bind(user.id, newsId).run();
        await env.DB.prepare(
            "UPDATE news SET upvotes = MAX(upvotes - 1, 0) WHERE id = ?"
        ).bind(newsId).run();
    } else {
        // Vote (toggle on)
        await env.DB.prepare(
            "INSERT INTO votes (user_id, news_id, vote_type) VALUES (?, ?, 1)"
        ).bind(user.id, newsId).run();
        await env.DB.prepare(
            "UPDATE news SET upvotes = upvotes + 1 WHERE id = ?"
        ).bind(newsId).run();
    }

    // Return updated score
    const row = await env.DB.prepare(
        "SELECT upvotes FROM news WHERE id = ?"
    ).bind(newsId).first<{ upvotes: number }>();

    return new Response(String(row?.upvotes ?? 0), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
});

// Manual cron trigger (protected by secret key)
router.get("/___force-rss-update", async (request, env) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key || key !== (env as any).CRON_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }
    try {
        await performRSSFetch(env);
        return new Response("RSS Fetch triggered successfully.", { status: 200 });
    } catch (error: any) {
        return new Response("Failed: " + error.message, { status: 500 });
    }
});

router.get("/___force-ai-update", async (request, env, ctx) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key || key !== (env as any).CRON_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }
    try {
        // fetch 150 most recent news articles that have not been assigned any topics
        const { results: unclustered } = await env.DB.prepare(`
            SELECT n.id
            FROM news n
            LEFT JOIN news_topics nt ON n.id = nt.news_id
            WHERE nt.news_id IS NULL
            ORDER BY n.created_at DESC
            LIMIT 150
        `).all<{ id: number }>();

        if (unclustered && unclustered.length > 0 && env.NEWS_PROCESSING_QUEUE) {
            const messages = unclustered.map(item => ({ body: { news_id: item.id } }));

            const BATCH_LIMIT = 100;
            for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
                const chunk = messages.slice(i, i + BATCH_LIMIT);
                await env.NEWS_PROCESSING_QUEUE.sendBatch(chunk);
            }

            return new Response(`Queued ${unclustered.length} articles for processing.`, { status: 200 });
        }

        return new Response("No unclustered articles found to process.", { status: 200 });
    } catch (error: any) {
        return new Response("Failed: " + error.message, { status: 500 });
    }
});

// --- SEO: robots.txt ---
router.get("/robots.txt", () => {
    return new Response(
        `User-agent: *
Allow: /
Disallow: /go/
Disallow: /auth/
Sitemap: https://hy3n4.news/sitemap.xml`,
        { headers: { "Content-Type": "text/plain" } }
    );
});

// --- SEO: sitemap.xml ---
router.get("/sitemap.xml", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://hy3n4.news/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>
  <url><loc>https://hy3n4.news/guidelines</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://hy3n4.news/legal</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
</urlset>`;
    return new Response(xml, {
        headers: { "Content-Type": "application/xml" },
    });
});

async function performRSSFetch(env: Env): Promise<void> {
    const startTime = Date.now();
    console.log(`[CRON] ========== RSS fetch started at ${new Date().toISOString()} ==========`);

    const { results: sources } = await env.DB.prepare(
        "SELECT id, url, name FROM sources WHERE is_active = 1"
    ).all<{ id: number; url: string; name: string }>();

    if (!sources || sources.length === 0) {
        console.warn("[CRON] No active sources found in DB. Aborting.");
        return;
    }

    console.log(`[CRON] Found ${sources.length} active sources: ${sources.map(s => s.name).join(", ")}`);

    const feedResults = await Promise.allSettled(
        sources.map(async (source) => {
            console.log(`[FETCH] ${source.name}: Fetching ${source.url}`);
            const res = await fetch(source.url, {
                headers: {
                    "User-Agent": "hy3n4-news-bot/1.0",
                    "Cache-Control": "no-cache"
                },
                cf: {
                    cacheTtl: 0
                }
            });
            console.log(`[FETCH] ${source.name}: HTTP ${res.status} ${res.statusText}`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText} for ${source.name} (${source.url})`);
            }
            const xml = await res.text();
            console.log(`[FETCH] ${source.name}: Received ${xml.length} bytes of XML`);
            const items = parseRSS(xml, source.name);
            return { source, items };
        })
    );

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const result of feedResults) {
        if (result.status === "rejected") {
            console.error(`[ERROR] Feed fetch failed: ${result.reason}`);
            totalErrors++;
            continue;
        }

        const { source, items } = result.value;
        if (items.length === 0) {
            console.log(`[RESULT] ${source.name}: 0 items found.`);
            continue;
        }

        try {
            // Prepare an array of D1 statements for batching (return id if newly inserted)
            const statements = items.map(item =>
                env.DB.prepare(
                    "INSERT INTO news (source_id, title, url, description, published_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(url) DO NOTHING RETURNING id"
                ).bind(source.id, item.title, item.link, item.description, item.publishedAt)
            );

            // Execute all inserts for this source in a single network round-trip
            const batchResults = await env.DB.batch<{ id: number }>(statements);

            // Extract newly inserted IDs
            const newIds: number[] = [];
            for (const res of batchResults) {
                if (res.results && res.results.length > 0) {
                    newIds.push(res.results[0].id);
                }
            }

            const inserted = newIds.length;
            const skipped = items.length - inserted;

            totalInserted += inserted;
            totalSkipped += skipped;

            // Publish to queue if there are new items (max 100 per sendBatch)
            if (inserted > 0 && env.NEWS_PROCESSING_QUEUE) {
                const messages = newIds.map(id => ({ body: { news_id: id } }));

                // Cloudflare sendBatch has a strict limit of 100 messages per call
                const BATCH_LIMIT = 100;
                for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
                    const chunk = messages.slice(i, i + BATCH_LIMIT);
                    await env.NEWS_PROCESSING_QUEUE.sendBatch(chunk);
                }
                console.log(`[QUEUE] Pushed ${inserted} new articles to processing queue.`);
            }

            console.log(`[RESULT] ${source.name}: +${inserted} new | ${skipped} duplicates | 0 errors (of ${items.length} total)`);
        } catch (err) {
            totalErrors += items.length;
            console.error(`[DB ERROR] Batch insert failed for ${source.name}:`, err);
        }
    }

    console.log(`[CRON] RSS Summary: ${totalInserted} inserted | ${totalSkipped} skipped | ${totalErrors} errors`);
}

// Removed: performAIClustering (now handled by Queue Consumer)

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        return router.handle(request, env, ctx);
    },

    async scheduled(
        event: ScheduledEvent,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        ctx.waitUntil(performRSSFetch(env));
    },

    async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log(`[QUEUE] Received batch of ${batch.messages.length} messages`);

        const newsIds = batch.messages.map(m => m.body.news_id).filter(id => id !== undefined);
        if (newsIds.length === 0) return;

        // Fetch article details
        const placeholders = newsIds.map(() => "?").join(",");
        const { results: unclustered } = await env.DB.prepare(`
            SELECT id, title, description
            FROM news
            WHERE id IN (${placeholders})
        `).bind(...newsIds).all<{ id: number; title: string; description: string }>();

        if (!unclustered || unclustered.length === 0) return;

        console.log(`[QUEUE] Processing ${unclustered.length} articles for clustering...`);
        let clusteredCount = 0;
        let newTopicCount = 0;
        const topicsToCheck = new Set<number>();

        // 1. Generate Embeddings (in smaller chunks to avoid Network Connection Lost)
        const textsToEmbed = unclustered.map(item =>
            `${item.title} ${item.description || ""}`.substring(0, 1000)
        );

        let vectors: any[] = [];
        const EMBED_CHUNK_SIZE = 10;
        for (let i = 0; i < textsToEmbed.length; i += EMBED_CHUNK_SIZE) {
            const chunk = textsToEmbed.slice(i, i + EMBED_CHUNK_SIZE);
            const embedRes = await env.AI.run("@cf/baai/bge-m3", { text: chunk });
            vectors = vectors.concat(embedRes.data);
        }

        // 2. Process each item
        for (let i = 0; i < unclustered.length; i++) {
            const item = unclustered[i];
            const vector = vectors[i];

            // Search Vectorize
            const searchRes = await env.VECTORIZE.query(vector, { topK: 3 });
            const matches = searchRes.matches.filter((m: any) => m.score > 0.45);

            if (matches.length > 0) {
                // Map to existing topics
                for (const match of matches) {
                    const topicId = parseInt(match.id, 10);
                    try {
                        await env.DB.prepare(
                            "INSERT INTO news_topics (news_id, topic_id, similarity_score) VALUES (?, ?, ?)"
                        ).bind(item.id, topicId, match.score).run();

                        await env.DB.prepare(
                            "UPDATE topics SET updated_at = datetime('now') WHERE id = ?"
                        ).bind(topicId).run();

                        topicsToCheck.add(topicId);
                    } catch (e) {
                        // Ignore unique constraint violations
                    }
                }
                clusteredCount++;
            } else {
                // Create new topic
                const newTopic = await env.DB.prepare(
                    "INSERT INTO topics (title) VALUES (?) RETURNING id"
                ).bind(item.title).first<{ id: number }>();

                if (newTopic) {
                    await env.DB.prepare(
                        "INSERT INTO news_topics (news_id, topic_id, similarity_score) VALUES (?, ?, ?)"
                    ).bind(item.id, newTopic.id, 1.0).run();

                    await env.VECTORIZE.insert([{
                        id: newTopic.id.toString(),
                        values: vector
                    }]);
                    newTopicCount++;
                }
            }
        }

        console.log(`[QUEUE] Clustering complete. Mapped: ${clusteredCount}, New topics: ${newTopicCount}`);

        // 3. Summarize newly formed clusters
        if (topicsToCheck.size > 0) {
            const topicIdList = Array.from(topicsToCheck);
            const topicPlaceholders = topicIdList.map(() => "?").join(",");

            // find topics that are missing keywords but are already associated with 
            // at least two news articles
            const { results: topicsToSummarize } = await env.DB.prepare(`
                SELECT t.id, group_concat(n.title, ' || ') as titles
                FROM topics t
                JOIN news_topics nt ON t.id = nt.topic_id
                JOIN news n ON nt.news_id = n.id
                WHERE t.id IN (${topicPlaceholders}) AND t.keywords IS NULL
                GROUP BY t.id
                HAVING count(n.id) >= 2
            `).bind(...topicIdList).all<{ id: number, titles: string }>();

            if (topicsToSummarize && topicsToSummarize.length > 0) {
                console.log(`[QUEUE] Found ${topicsToSummarize.length} topics to summarize.`);

                for (const topic of topicsToSummarize) {
                    try {
                        const aiResponse = await env.AI.run("@cf/google/gemma-3-12b-it", {
                            messages: [
                                {
                                    role: "system",
                                    content: "You are a professional Korean news editor. You must respond ONLY with a JSON object."
                                },
                                {
                                    role: "user",
                                    content: `Read the following news titles and provide a unified title (under 20 Korean chars) and 3 keywords.

            News titles:
            ${topic.titles}
                
            Output format:
            {
            "title": "...",
            "keywords": "..."
            }`
                                }
                            ],
                            max_tokens: 512
                        }) as { response: string };

                        if (aiResponse?.response) {
                            try {
                                // 1. Get the raw text
                                const rawContent = aiResponse.response.trim();

                                // 2. Use a regex to extract only the part between the first { and last }
                                // This removes ```json, ``` and any other prefix/suffix text.
                                const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

                                if (jsonMatch) {
                                    const parsed = JSON.parse(jsonMatch[0]);

                                    // 3. Update the DB if we have the fields
                                    if (parsed.title && parsed.keywords) {
                                        // If keywords is an array (like in your error log), 
                                        // join it into a string to match your DB schema
                                        const keywordString = Array.isArray(parsed.keywords)
                                            ? parsed.keywords.join(", ")
                                            : parsed.keywords;

                                        await env.DB.prepare("UPDATE topics SET title = ?, keywords = ? WHERE id = ?")
                                            .bind(parsed.title, keywordString, topic.id).run();

                                        console.log(`[QUEUE] Topic ${topic.id} summarized: ${parsed.title}`);
                                    }
                                } else {
                                    throw new Error("No JSON object found in response");
                                }
                            } catch (e: any) {
                                console.error(`[QUEUE] Parse failed for topic ${topic.id}:`, e.message);
                                console.error(`[DEBUG] Raw AI output was: ${aiResponse.response}`);
                            }
                        }
                    } catch (e: any) {
                        console.error(`[QUEUE] AI Error for topic ${topic.id}:`, e.message);
                    }
                }
            }
        }
    },
};
