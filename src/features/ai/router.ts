import { Router } from "../../core/router";
import { Env } from "../../auth";

export const aiRouter = new Router();

aiRouter.get("/___force-ai-update", async (request, env) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key || key !== (env as any).CRON_SECRET) {
        return new Response("Unauthorized", { status: 401 });
    }
    try {
        const { results: unclustered } = await env.DB.prepare(`
            SELECT n.id
            FROM news n
            LEFT JOIN news_topics nt ON n.id = nt.news_id
            WHERE nt.news_id IS NULL
            ORDER BY n.created_at DESC
            LIMIT 100
        `).all<{ id: number }>();

        if (unclustered && unclustered.length > 0 && env.NEWS_PROCESSING_QUEUE) {
            const sendWithRetry = async (attempt: number = 1): Promise<void> => {
                try {
                    await env.NEWS_PROCESSING_QUEUE.send({
                        news_ids: unclustered.map(item => item.id)
                    });
                } catch (error: any) {
                    if (error.message.includes("Too Many Requests") && attempt <= 3) {
                        console.warn(`[QUEUE] Rate limited. Retrying attempt ${attempt}...`);
                        await new Promise(res => setTimeout(res, 1000 * attempt));
                        return sendWithRetry(attempt + 1);
                    }
                    throw error;
                }
            };

            await sendWithRetry();
            return new Response(`Queued ${unclustered.length} articles for processing.`, { status: 200 });
        }

        return new Response("No unclustered articles found to process.", { status: 200 });
    } catch (error: any) {
        return new Response("Failed: " + error.message, { status: 500 });
    }
});

// --- GET /debug/vector : Dev Debugging Route ---
aiRouter.get(/^\/debug\/vector/, async (request, env) => {
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
