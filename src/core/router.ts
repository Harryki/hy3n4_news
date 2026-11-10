import { Env } from "../auth";

export type RouteHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  match?: RegExpMatchArray
) => Promise<Response> | Response;

export type NextFunction = () => Promise<Response>;

export type MiddlewareHandler = (
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  next: NextFunction
) => Promise<Response> | Response;

export type ErrorHandler = (
  error: Error,
  request: Request,
  env: Env,
  ctx: ExecutionContext
) => Promise<Response> | Response;

export interface Route {
  method: string;
  pattern: string | RegExp;
  compiledRegex?: RegExp;
  handler: RouteHandler;
}

export interface RouterOptions {
  trailingSlash?: "never" | "always" | "ignore";
}

/**
 * Standard middleware to normalize trailing slashes (301 redirect to canonical path).
 */
export function trimTrailingSlash(): MiddlewareHandler {
  return async (request, _env, _ctx, next) => {
    if (request.method === "GET" || request.method === "HEAD") {
      const url = new URL(request.url);
      if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
        url.pathname = url.pathname.replace(/\/+$/, "") || "/";
        return new Response(null, {
          status: 301,
          headers: {
            Location: `${url.pathname}${url.search}`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }
    return next();
  };
}

/**
 * Standard middleware for Cloudflare Rate Limiting binding.
 */
export function rateLimiterMiddleware(): MiddlewareHandler {
  return async (request, env, _ctx, next) => {
    if (env.RATE_LIMITER) {
      const url = new URL(request.url);
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const segment = url.pathname.split("/")[1] || "root";
      const key = `${ip}:${segment}`;
      const result = await env.RATE_LIMITER.limit({ key });
      if (!result.success) {
        return new Response("Too Many Requests", { status: 429 });
      }
    }
    return next();
  };
}

function compilePathPattern(pattern: string): RegExp | undefined {
  if (!pattern.includes(":")) return undefined;
  const regexStr =
    "^" +
    pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/:([a-zA-Z0-9_]+)/g, "([^/]+)") +
    "$";
  return new RegExp(regexStr);
}

export class Router {
  public routes: Route[] = [];
  public middlewares: MiddlewareHandler[] = [];
  private notFoundHandler: RouteHandler = () =>
    new Response("Not Found", { status: 404 });
  private errorHandler: ErrorHandler = (err) => {
    console.error(`[ERROR] ${err.message}`);
    return new Response(`Application Error: ${err.message}`, { status: 500 });
  };

  constructor(options: RouterOptions = { trailingSlash: "never" }) {
    if (options.trailingSlash === "never") {
      this.middlewares.push(trimTrailingSlash());
    }
    this.middlewares.push(rateLimiterMiddleware());
  }

  public get(pattern: string | RegExp, handler: RouteHandler) {
    this.addRoute("GET", pattern, handler);
  }

  public post(pattern: string | RegExp, handler: RouteHandler) {
    this.addRoute("POST", pattern, handler);
  }

  public head(pattern: string | RegExp, handler: RouteHandler) {
    this.addRoute("HEAD", pattern, handler);
  }

  public any(pattern: string | RegExp, handler: RouteHandler) {
    this.addRoute("ANY", pattern, handler);
  }

  private addRoute(method: string, pattern: string | RegExp, handler: RouteHandler) {
    const compiledRegex =
      typeof pattern === "string" ? compilePathPattern(pattern) : pattern;
    this.routes.push({ method, pattern, compiledRegex, handler });
  }

  /**
   * Registers a middleware function or mounts another Router's routes.
   */
  public use(target: Router | MiddlewareHandler) {
    if (target instanceof Router) {
      this.routes.push(...target.routes);
    } else {
      this.middlewares.push(target);
    }
  }

  /**
   * Registers a custom 404 Not Found handler.
   */
  public notFound(handler: RouteHandler) {
    this.notFoundHandler = handler;
  }

  /**
   * Registers a custom global error handler.
   */
  public onError(handler: ErrorHandler) {
    this.errorHandler = handler;
  }

  private matchRoute(method: string, pathname: string): { route: Route; match?: RegExpMatchArray } | null {
    for (const route of this.routes) {
      const methodMatches =
        route.method === method ||
        route.method === "ANY" ||
        (method === "HEAD" && route.method === "GET");

      if (!methodMatches) continue;

      if (typeof route.pattern === "string" && !route.compiledRegex) {
        if (route.pattern === pathname) {
          return { route };
        }
      } else {
        const regex = route.compiledRegex || (route.pattern as RegExp);
        const match = pathname.match(regex);
        if (match) {
          return { route, match };
        }
      }
    }
    return null;
  }

  public async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const isHead = request.method === "HEAD";

    const dispatch = async (index: number): Promise<Response> => {
      if (index < this.middlewares.length) {
        const mw = this.middlewares[index];
        return await mw(request, env, ctx, () => dispatch(index + 1));
      }

      const url = new URL(request.url);
      const matched = this.matchRoute(request.method, url.pathname);
      if (matched) {
        return await matched.route.handler(request, env, ctx, matched.match);
      }

      return await this.notFoundHandler(request, env, ctx);
    };

    try {
      const response = await dispatch(0);
      if (isHead && response.body !== null) {
        return new Response(null, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      return response;
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      return await this.errorHandler(err, request, env, ctx);
    }
  }
}
