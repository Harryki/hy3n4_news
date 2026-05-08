import { Env } from "./auth";
import { app } from "./app";
import { performRSSFetch } from "./features/rss/fetcher";
import { processNewsQueue } from "./features/ai/queue";

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
    ctx.waitUntil(performRSSFetch(env));
  },

  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    await processNewsQueue(batch.messages as any[], env);
  },
};
