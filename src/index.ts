import { parseRSS } from "./rss";
import { hnScore } from "./ranking";
import { renderPage, NewsRow } from "./template";
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

            // Get today's date in KST (UTC+9)
            const nowUTC = new Date();
            const nowKST = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000);
            const todayKSTString = nowKST.toISOString().split("T")[0];

            const { results } = await env.DB.prepare(`
        SELECT n.id, n.title, n.url, n.upvotes, n.published_at, n.created_at, s.name as source_name
        FROM news n
        JOIN sources s ON n.source_id = s.id
        WHERE date(n.published_at, '+9 hours') = ?
        ORDER BY n.created_at DESC
        LIMIT 100
      `).bind(todayKSTString).all<NewsRow>();

            const news = results ?? [];

            const now = new Date();
            const ranked = news
                .map((item) => ({ ...item, score: hnScore(item.upvotes, item.published_at, now) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 50);

            const html = renderPage(ranked, user);
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
