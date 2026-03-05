export interface Env {
    DB: D1Database;
}

export default {
    async fetch(
        request: Request,
        env: Env,
        ctx: ExecutionContext
    ): Promise<Response> {
        const url = new URL(request.url);

        if (url.pathname === "/") {
            return new Response("hy3n4 news — coming soon", {
                headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }

        return new Response("Not Found", { status: 404 });
    },

    async scheduled(
        event: ScheduledEvent,
        env: Env,
        ctx: ExecutionContext
    ): Promise<void> {
        // Phase 2: RSS fetch pipeline will be implemented here
        console.log("Scheduled event triggered");
    },
};
