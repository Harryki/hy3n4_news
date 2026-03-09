import { Router } from "../../core/router";
import { Env } from "../../auth";
import { performRSSFetch } from "./fetcher";

export const rssRouter = new Router();

// Manual cron trigger (protected by secret key)
rssRouter.get("/___force-rss-update", async (request, env) => {
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
