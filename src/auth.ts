export interface Env {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    AI: any;
    VECTORIZE: any;
}

interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token?: string;
}

interface GoogleUserInfo {
    sub: string; // Google user ID
    name: string;
    email: string;
    picture?: string;
}

interface SessionUser {
    id: number;
    username: string;
    email: string | null;
}

const OAUTH_REDIRECT_PATH = "/auth/callback";

function getRedirectUri(request: Request): string {
    const url = new URL(request.url);
    return `${url.origin}${OAUTH_REDIRECT_PATH}`;
}

function generateToken(): string {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * GET /login — redirect to Google OAuth consent screen
 */
export function handleLogin(request: Request, env: Env): Response {
    const redirectUri = getRedirectUri(request);
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "online",
        prompt: "select_account",
    });

    return new Response(null, {
        status: 302,
        headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` },
    });
}

/**
 * GET /auth/callback — exchange code for token, create/update user, set session
 */
export async function handleCallback(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");

    if (!code) {
        return new Response("Missing authorization code", { status: 400 });
    }

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: getRedirectUri(request),
            grant_type: "authorization_code",
        }),
    });

    if (!tokenRes.ok) {
        const err = await tokenRes.text();
        console.error("Token exchange failed:", err);
        return new Response("Authentication failed", { status: 500 });
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    // 2. Get user info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
        return new Response("Failed to get user info", { status: 500 });
    }

    const userInfo = (await userRes.json()) as GoogleUserInfo;

    // 3. Upsert user in DB
    await env.DB.prepare(
        `INSERT INTO users (google_id, username, email) VALUES (?, ?, ?)
     ON CONFLICT(google_id) DO UPDATE SET username = excluded.username, email = excluded.email`
    ).bind(userInfo.sub, userInfo.name, userInfo.email).run();

    const user = await env.DB.prepare(
        "SELECT id FROM users WHERE google_id = ?"
    ).bind(userInfo.sub).first<{ id: number }>();

    if (!user) {
        return new Response("User creation failed", { status: 500 });
    }

    // 4. Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    await env.DB.prepare(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
    ).bind(token, user.id, expiresAt).run();

    // 5. Set cookie and redirect home
    return new Response(null, {
        status: 302,
        headers: {
            Location: "/",
            "Set-Cookie": `session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}`,
        },
    });
}

/**
 * GET /logout — delete session, clear cookie
 */
export async function handleLogout(request: Request, env: Env): Promise<Response> {
    const token = getSessionToken(request);
    if (token) {
        await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    }

    return new Response(null, {
        status: 302,
        headers: {
            Location: "/",
            "Set-Cookie": "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        },
    });
}

/**
 * Read session cookie and return the user if valid
 */
export async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
    const token = getSessionToken(request);
    if (!token) return null;

    const row = await env.DB.prepare(`
    SELECT u.id, u.username, u.email
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).bind(token).first<SessionUser>();

    return row ?? null;
}

function getSessionToken(request: Request): string | null {
    const cookie = request.headers.get("Cookie") ?? "";
    const match = cookie.match(/session=([a-f0-9]+)/);
    return match ? match[1] : null;
}
