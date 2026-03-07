import { parseRSS } from "./rss";
import { hnScore } from "./ranking";
import { renderPage, renderStaticPage, NewsRow } from "./template";
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

        return new Response("Not Found", { status: 404 });
    }
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

    const cookieLimit = getCookie(request, "pref_limit");
    const cookieTime = getCookie(request, "pref_time");

    const limit = parseInt(queryLimit || cookieLimit || "25", 10);
    const timeHours = parseInt(queryTime || cookieTime || "24", 10);

    // Fetch based on time threshold
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - timeHours * 60 * 60 * 1000);
    const cutoffISO = cutoffTime.toISOString();

    const { results } = await env.DB.prepare(`
        SELECT n.id, n.title, n.url, n.description, n.upvotes, n.view_count, n.published_at, n.created_at, s.name as source_name
        FROM news n
        JOIN sources s ON n.source_id = s.id
        WHERE n.published_at >= ?
        ORDER BY n.created_at DESC
        LIMIT 500
    `).bind(cutoffISO).all<NewsRow>();

    const news = results ?? [];

    // Rank all fetched news by hnScore (per source limitation is handled in renderPage)
    const ranked = news
        .map((item) => ({ ...item, score: hnScore(item.upvotes, item.published_at, now) }))
        .sort((a, b) => b.score - a.score);

    const html = renderPage(ranked, user, "", limit, timeHours);
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
        SELECT n.id, n.title, n.url, n.description, n.upvotes, n.published_at, n.created_at, s.name as source_name
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

    // Record click & increment view count
    await env.DB.prepare(
        "INSERT INTO clicks (user_id, news_id) VALUES (?, ?)"
    ).bind(user?.id ?? null, newsId).run();
    await env.DB.prepare(
        "UPDATE news SET view_count = view_count + 1 WHERE id = ?"
    ).bind(newsId).run();

    // Get original URL and redirect
    const row = await env.DB.prepare(
        "SELECT url FROM news WHERE id = ?"
    ).bind(newsId).first<{ url: string }>();

    if (!row) {
        return new Response("Not Found", { status: 404 });
    }

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
        return new Response("Cron triggered successfully.", { status: 200 });
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
                headers: { "User-Agent": "hy3n4-news-bot/1.0" },
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
            // Prepare an array of D1 statements for batching
            const statements = items.map(item =>
                env.DB.prepare(
                    "INSERT OR IGNORE INTO news (source_id, title, url, description, published_at) VALUES (?, ?, ?, ?, ?)"
                ).bind(source.id, item.title, item.link, item.description, item.publishedAt)
            );

            // Execute all inserts for this source in a single network round-trip
            const batchResults = await env.DB.batch(statements);

            // Calculate how many were newly inserted vs ignored
            const inserted = batchResults.reduce((sum, res) => sum + (res.meta.changes > 0 ? 1 : 0), 0);
            const skipped = items.length - inserted;

            totalInserted += inserted;
            totalSkipped += skipped;

            console.log(`[RESULT] ${source.name}: +${inserted} new | ${skipped} duplicates | 0 errors (of ${items.length} total)`);
        } catch (err) {
            totalErrors += items.length;
            console.error(`[DB ERROR] Batch insert failed for ${source.name}:`, err);
        }
    }


    const elapsed = Date.now() - startTime;
    console.log(`[CRON] ========== RSS fetch complete in ${elapsed}ms ==========`);
    console.log(`[CRON] Summary: ${totalInserted} inserted | ${totalSkipped} skipped | ${totalErrors} errors`);
}

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
        await performRSSFetch(env);
    },
};
