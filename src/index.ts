import { Env } from "./auth";
import { app } from "./app";
import { performRSSFetch } from "./features/rss/fetcher";
import { processNewsQueue } from "./features/ai/queue";
import { publishDailyBlogPost, BlogSlot } from "./features/blog/service";

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
    // 3 times a day for daily editions (Morning 09:00, Afternoon 14:00, Evening 20:00 KST):
    // 0 0 * * * = 00:00 UTC (09:00 KST) -> Morning Briefing (아침 브리핑)
    // 0 5 * * * = 05:00 UTC (14:00 KST) -> Afternoon Briefing (오후 브리핑)
    // 0 11 * * * = 11:00 UTC (20:00 KST) -> Evening Briefing (저녁 브리핑)
    const isBlogCron =
      event.cron === "0 0 * * *" ||
      event.cron === "0 5 * * *" ||
      event.cron === "0 11 * * *";

    if (isBlogCron) {
      let slot: BlogSlot = "morning";
      if (event.cron === "0 5 * * *") slot = "afternoon";
      else if (event.cron === "0 11 * * *") slot = "evening";

      ctx.waitUntil(
        (async () => {
          try {
            await publishDailyBlogPost(env, undefined, slot);
          } catch (e: any) {
            console.error(`[CRON] ${slot} blog generation failed:`, e.message);
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
