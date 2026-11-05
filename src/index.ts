import { Env } from "./auth";
import { app } from "./app";
import { performRSSFetch } from "./features/rss/fetcher";
import { processNewsQueue } from "./features/ai/queue";
import { publishDailyBlogPost } from "./features/blog/service";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return app.handle(request, env, ctx);
  },

  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    // 0 0 * * * = UTC midnight (16:00 PST / 09:00 KST) -> Generate & publish daily blog post
    if (event.cron === "0 0 * * *") {
      ctx.waitUntil(
        (async () => {
          try {
            await publishDailyBlogPost(env);
          } catch (e: any) {
            console.error("[CRON] Daily blog generation failed:", e.message);
          }
          await performRSSFetch(env);
        })()
      );
    } else {
      ctx.waitUntil(performRSSFetch(env));
    }
  },

  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    await processNewsQueue(batch.messages as any[], env);
  },
};
