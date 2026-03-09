import { Router } from "./core/router";
import { uiRouter, renderNotFoundPage } from "./features/ui/router";
import { rssRouter } from "./features/rss/router";
import { userRouter } from "./features/user/router";
import { aiRouter } from "./features/ai/router";
import { getSessionUser } from "./auth";

export const app = new Router();

// SEO: robots.txt
app.get("/robots.txt", () => {
    return new Response(
        `User-agent: *
Allow: /
Disallow: /go/
Disallow: /auth/
Sitemap: https://hy3n4.news/sitemap.xml`,
        { headers: { "Content-Type": "text/plain" } }
    );
});

// SEO: sitemap.xml
app.get("/sitemap.xml", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://hy3n4.news/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>
  <url><loc>https://hy3n4.news/guidelines</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://hy3n4.news/legal</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
</urlset>`;
    return new Response(xml, {
        headers: { "Content-Type": "application/xml" },
    });
});

// Merge Feature Routers
app.use(uiRouter);
app.use(rssRouter);
app.use(userRouter);
app.use(aiRouter);

/**
 * Override the default 404 handler to show our pretty 404 page.
 */
const originalHandle = app.handle.bind(app);
app.handle = async (request, env, ctx) => {
    try {
        const response = await originalHandle(request, env, ctx);
        // If the original handler returned the generic "Not Found" response from Router.handle
        if (response.status === 404 && (await response.clone().text()) === "Not Found") {
            const user = await getSessionUser(request, env);
            return new Response(renderNotFoundPage(user), {
                status: 404,
                headers: { "Content-Type": "text/html; charset=utf-8" }
            });
        }
        return response;
    } catch (e: any) {
        console.error(`[ERROR] ${e.message}`);
        return new Response(`Application Error: ${e.message}`, { status: 500 });
    }
};
