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

export const FEEDBACK_PURPOSES: Record<string, string> = {
  hot_issues: "실시간 주요 뉴스·핫이슈('뜨거운 감자') 빠른 파악",
  compare_press: "같은 사건에 대한 언론사별 논조·헤드라인 비교",
  search_topic: "특정 키워드/이슈의 과거~현재 기사 흐름 검색",
  work_invest: "경제·산업·트렌드 모니터링 (업무/투자 참고)",
  browsing: "우연히 방문 / 둘러보는 중",
};

export const FEEDBACK_FEATURES: Record<string, string> = {
  ai_summary: "토픽별 AI 3줄 요약 및 언론사별 핵심 논점 비교",
  custom_filter: "언론사 추가 및 내 관심 언론사/카테고리 필터링",
  keyword_alert: "관심 키워드·핫토픽 알림 (이메일/텔레그램/웹푸시)",
  bias_chart: "언론사별 성향 분석 및 보도량 추이 그래프",
  community: "토픽별 유저 댓글·토론 또는 투표 기능 강화",
};

function getCookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

function generateVisitorId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// --- POST /api/feedback : Submit visitor/user feedback survey ---
userRouter.post("/api/feedback", async (request, env) => {
  try {
    const body = (await request.json().catch(() => null)) as {
      visit_purposes?: unknown;
      desired_features?: unknown;
      comment?: unknown;
      page_path?: unknown;
    } | null;

    if (!body) {
      return new Response(JSON.stringify({ ok: false, error: "잘못된 요청 형식입니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }

    const rawPurposes = Array.isArray(body.visit_purposes) ? body.visit_purposes : [];
    const rawFeatures = Array.isArray(body.desired_features) ? body.desired_features : [];

    const validPurposes = Array.from(
      new Set(
        rawPurposes
          .filter((k): k is string => typeof k === "string" && k in FEEDBACK_PURPOSES)
      )
    );
    const validFeatures = Array.from(
      new Set(
        rawFeatures
          .filter((k): k is string => typeof k === "string" && k in FEEDBACK_FEATURES)
      )
    );

    const comment =
      typeof body.comment === "string" && body.comment.trim().length > 0
        ? body.comment.trim().slice(0, 500)
        : null;

    const pagePath =
      typeof body.page_path === "string" && body.page_path.startsWith("/")
        ? body.page_path.slice(0, 200)
        : "/";

    if (validPurposes.length === 0 && validFeatures.length === 0 && !comment) {
      return new Response(
        JSON.stringify({ ok: false, error: "최소 한 가지 이상의 항목을 선택하거나 의견을 입력해주세요." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }
      );
    }

    const user = await getSessionUser(request, env);
    const existingVid = getCookieValue(request, "hy3n4_vid");
    const visitorId =
      existingVid && /^[a-f0-9]{16,64}$/i.test(existingVid)
        ? existingVid
        : generateVisitorId();

    const purposesJson = JSON.stringify(validPurposes);
    const featuresJson = JSON.stringify(validFeatures);

    if (user) {
      await env.DB.prepare(`
        INSERT INTO feedbacks (user_id, visitor_id, visit_purposes, desired_features, comment, page_path)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          visitor_id = excluded.visitor_id,
          visit_purposes = excluded.visit_purposes,
          desired_features = excluded.desired_features,
          comment = COALESCE(excluded.comment, feedbacks.comment),
          page_path = excluded.page_path,
          updated_at = datetime('now')
      `)
        .bind(user.id, visitorId, purposesJson, featuresJson, comment, pagePath)
        .run();
    } else {
      const existingAnon = existingVid
        ? await env.DB.prepare(
            "SELECT id FROM feedbacks WHERE visitor_id = ? AND user_id IS NULL LIMIT 1"
          )
            .bind(visitorId)
            .first<{ id: number }>()
        : null;

      if (existingAnon) {
        await env.DB.prepare(`
          UPDATE feedbacks
          SET visit_purposes = ?, desired_features = ?, comment = COALESCE(?, comment), page_path = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
          .bind(purposesJson, featuresJson, comment, pagePath, existingAnon.id)
          .run();
      } else {
        await env.DB.prepare(`
          INSERT INTO feedbacks (user_id, visitor_id, visit_purposes, desired_features, comment, page_path)
          VALUES (NULL, ?, ?, ?, ?, ?)
        `)
          .bind(visitorId, purposesJson, featuresJson, comment, pagePath)
          .run();
      }
    }

    const headers = new Headers({
      "Content-Type": "application/json; charset=utf-8",
    });
    const oneYear = 60 * 60 * 24 * 365;
    headers.append("Set-Cookie", `hy3n4_fb_done=1; Path=/; Max-Age=${oneYear}; SameSite=Lax`);
    headers.append("Set-Cookie", `hy3n4_vid=${visitorId}; Path=/; Max-Age=${oneYear}; SameSite=Lax`);

    return new Response(
      JSON.stringify({ ok: true, message: "소중한 피드백 감사합니다!" }),
      { status: 200, headers }
    );
  } catch (e: any) {
    console.error("[FEEDBACK ERROR]", e);
    return new Response(
      JSON.stringify({ ok: false, error: "피드백 저장 중 오류가 발생했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }
});
