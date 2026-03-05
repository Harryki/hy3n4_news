import { parseRSS } from "./rss";
import { hnScore } from "./ranking";
import { renderPage, NewsRow } from "./template";

export interface Env {
    DB: D1Database;
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === "/") {
            // Fetch recent news with source names
            const { results } = await env.DB.prepare(`
                SELECT n.id, n.title, n.url, n.upvotes, n.published_at, n.created_at, s.name as source_name
                FROM news n
                JOIN sources s ON n.source_id = s.id
                ORDER BY n.created_at DESC
                LIMIT 200
            `).all<NewsRow>();

            const news = results ?? [];

            // Apply HN ranking algorithm and take top 50
            const now = new Date();
            const ranked = news
                .map((item) => ({ ...item, score: hnScore(item.upvotes, item.published_at, now) }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 50);

            const html = renderPage(ranked);
            return new Response(html, {
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

        // 1. Get active sources
        const { results: sources } = await env.DB.prepare(
            "SELECT id, url, name FROM sources WHERE is_active = 1"
        ).all<{ id: number; url: string; name: string }>();

        if (!sources || sources.length === 0) {
            console.log("No active sources found");
            return;
        }

        // 2. Fetch all RSS feeds concurrently
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

        // 3. Insert parsed articles into DB
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
