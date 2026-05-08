import { Router } from "../../core/router";
import { Env, getSessionUser, handleLogin, handleCallback, handleLogout } from "../../auth";

export const userRouter = new Router();

// --- Auth routes ---
userRouter.get("/login", handleLogin);
userRouter.get("/auth/callback", handleCallback);
userRouter.get("/logout", handleLogout);

// --- POST /vote/:news_id : Toggle vote (requires login) ---
userRouter.post(/^\/vote\/(\d+)$/, async (request, env, ctx, match) => {
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
