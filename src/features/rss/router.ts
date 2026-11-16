import { Router } from "../../core/router";
import { isAuthorizedCronRequest } from "../../core/utils";
import { performRSSFetch } from "./fetcher";

export const rssRouter = new Router();

// Manual cron trigger (protected by secret key)
rssRouter.get("/___force-rss-update", async (request, env) => {
  if (!isAuthorizedCronRequest(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    await performRSSFetch(env);
    return new Response("RSS Fetch triggered successfully.", { status: 200 });
  } catch (error: any) {
    return new Response("Failed: " + error.message, { status: 500 });
  }
});
