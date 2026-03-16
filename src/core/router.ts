import { Env } from "../auth";

export type RouteHandler = (
    request: Request,
    env: Env,
    ctx: ExecutionContext,
    match?: RegExpMatchArray
) => Promise<Response> | Response;

export interface Route {
    method: string;
    pattern: string | RegExp;
    handler: RouteHandler;
}

export class Router {
    public routes: Route[] = [];

    public get(pattern: string | RegExp, handler: RouteHandler) {
        this.routes.push({ method: "GET", pattern, handler });
    }

    public post(pattern: string | RegExp, handler: RouteHandler) {
        this.routes.push({ method: "POST", pattern, handler });
    }

    /**
     * Merge another router's routes into this one.
     * This replicates Hono's .route() functionality manually.
     */
    public use(otherRouter: Router) {
        this.routes.push(...otherRouter.routes);
    }

    public async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Global rate limiting
        // console.log(JSON.stringify(env.RATE_LIMITER))
        if (env.RATE_LIMITER) {
            const ip = request.headers.get("cf-connecting-ip") || "unknown";
            const segment = url.pathname.split("/")[1] || "root";
            const key = `${ip}:${segment}`;
            // console.log(key)
            // const { success } = await env.RATE_LIMITER.limit({ key });
            const result = await env.RATE_LIMITER.limit({ key })
            // console.log("rate limit result:", JSON.stringify(result));
            if (!result.success) {
                return new Response("Too Many Requests", { status: 429 });
            }
        }

        for (const route of this.routes) {
            if (route.method === request.method || route.method === "ANY") {
                if (typeof route.pattern === "string") {
                    if (route.pattern === url.pathname) {
                        return await route.handler(request, env, ctx);
                    }
                } else if (route.pattern instanceof RegExp) {
                    const match = url.pathname.match(route.pattern);
                    if (match) {
                        return await route.handler(request, env, ctx, match);
                    }
                }
            }
        }

        return this.getNotFoundResponse(request, env, ctx);
    }

    private getNotFoundResponse(request: Request, env: Env, ctx: ExecutionContext): Response {
        // This will be overridden or implemented to show the 404 page
        return new Response("Not Found", { status: 404 });
    }
}
