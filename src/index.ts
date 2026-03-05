import { parseRSS } from "./rss";
import { hnScore } from "./ranking";
import { renderPage, renderStaticPage, NewsRow } from "./template";
import { Env, handleLogin, handleCallback, handleLogout, getSessionUser } from "./auth";

export type { Env };

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url);

        // --- GET / : News list ---
        if (url.pathname === "/" && request.method === "GET") {
            const user = await getSessionUser(request, env);

            const limit = parseInt(url.searchParams.get("limit") || "25", 10);
            const timeHours = parseInt(url.searchParams.get("time") || "24", 10);

            // Fetch based on time threshold
            const now = new Date();
            const cutoffTime = new Date(now.getTime() - timeHours * 60 * 60 * 1000);
            const cutoffISO = cutoffTime.toISOString();

            const { results } = await env.DB.prepare(`
                SELECT n.id, n.title, n.url, n.upvotes, n.published_at, n.created_at, s.name as source_name
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
            return new Response(html, {
                headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        }

        // --- GET /user : User's voted news ---
        if (url.pathname === "/user" && request.method === "GET") {
            const user = await getSessionUser(request, env);

            if (!user) {
                return new Response(null, {
                    status: 302,
                    headers: { Location: "/login" },
                });
            }

            const { results } = await env.DB.prepare(`
                SELECT n.id, n.title, n.url, n.upvotes, n.published_at, n.created_at, s.name as source_name
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
        }

        // --- GET /guidelines ---
        if (url.pathname === "/guidelines" && request.method === "GET") {
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
        }

        // --- GET /legal ---
        if (url.pathname === "/legal" && request.method === "GET") {
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
        }

        // --- Auth routes ---
        if (url.pathname === "/login" && request.method === "GET") {
            return handleLogin(request, env);
        }

        if (url.pathname === "/auth/callback" && request.method === "GET") {
            return handleCallback(request, env);
        }

        if (url.pathname === "/logout" && request.method === "GET") {
            return handleLogout(request, env);
        }

        // --- POST /vote/:news_id : Toggle vote (requires login) ---
        const voteMatch = url.pathname.match(/^\/vote\/(\d+)$/);
        if (voteMatch && request.method === "POST") {
            const user = await getSessionUser(request, env);

            if (!user) {
                // Return 401 — HTMX will handle redirect
                return new Response("login_required", {
                    status: 401,
                    headers: { "Content-Type": "text/plain", "HX-Redirect": "/login" },
                });
            }

            const newsId = parseInt(voteMatch[1], 10);

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
        }

        return new Response("Not Found", { status: 404 });
    },

    async scheduled(
        event: ScheduledEvent,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        console.log("RSS fetch started");

        const { results: sources } = await env.DB.prepare(
            "SELECT id, url, name FROM sources WHERE is_active = 1"
        ).all<{ id: number; url: string; name: string }>();

        if (!sources || sources.length === 0) {
            console.log("No active sources found");
            return;
        }

        const feedResults = await Promise.allSettled(
            sources.map(async (source) => {
                const res = await fetch(source.url, {
                    headers: { "User-Agent": "hy3n4-news-bot/1.0" },
                });
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status} for ${source.name}`);
                }
                const xml = await res.text();
                const items = parseRSS(xml);
                return { source, items };
            })
        );

        let totalInserted = 0;

        for (const result of feedResults) {
            if (result.status === "rejected") {
                console.error("Feed fetch failed:", result.reason);
                continue;
            }

            const { source, items } = result.value;
            console.log(`${source.name}: ${items.length} items parsed`);

            for (const item of items) {
                try {
                    const insertResult = await env.DB.prepare(
                        "INSERT OR IGNORE INTO news (source_id, title, url, published_at) VALUES (?, ?, ?, ?)"
                    ).bind(source.id, item.title, item.link, item.publishedAt).run();

                    if (insertResult.meta.changes > 0) {
                        totalInserted++;
                    }
                } catch (err) {
                    console.error(`Insert failed for "${item.title}":`, err);
                }
            }
        }

        console.log(`RSS fetch complete. ${totalInserted} new articles inserted.`);
    },
};
