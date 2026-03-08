import { XMLParser } from "fast-xml-parser";
import { Env } from "../../auth";

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
});

function decodeHtmlEntities(text: string): string {
    return text.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
}

function parseItemDate(item: any): string | null {
    const dateStr = item.pubDate || item["dc:date"] || null;
    if (!dateStr) return null;

    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    } catch {
        return null;
    }
}

function parseRSS(xmlData: string, sourceName: string) {
    console.log(`[PARSE] ${sourceName}: Raw XML Length is ${xmlData.length} characters. Prefix: ${xmlData.substring(0, 100).replace(/\n/g, '')}...`);
    let jsonObj;
    try {
        jsonObj = parser.parse(xmlData);
        if (!jsonObj) {
            console.error(`[PARSE] ${sourceName}: Parsed object is null or undefined.`);
            return [];
        }
    } catch (err: any) {
        console.error(`[PARSE] ${sourceName}: Failed to parse XML. Error: ${err.message}`);
        return [];
    }

    let items: any[] = [];
    if (jsonObj.rss && jsonObj.rss.channel && jsonObj.rss.channel.item) {
        items = Array.isArray(jsonObj.rss.channel.item) ? jsonObj.rss.channel.item : [jsonObj.rss.channel.item];
    } else if (jsonObj.feed && jsonObj.feed.entry) {
        items = Array.isArray(jsonObj.feed.entry) ? jsonObj.feed.entry : [jsonObj.feed.entry];
    } else if (jsonObj["rdf:RDF"] && jsonObj["rdf:RDF"].item) {
        items = Array.isArray(jsonObj["rdf:RDF"].item) ? jsonObj["rdf:RDF"].item : [jsonObj["rdf:RDF"].item];
    } else {
        console.warn(`[PARSE] ${sourceName}: No items found in expected paths. Top-level keys: ${Object.keys(jsonObj).join(', ')}`);
        if (jsonObj.rss) console.warn(`[PARSE] rss keys: ${Object.keys(jsonObj.rss).join(', ')}`);
        if (jsonObj.rss?.channel) console.warn(`[PARSE] rss.channel keys: ${Object.keys(jsonObj.rss.channel).join(', ')}`);
    }

    console.log(`[PARSE] ${sourceName}: Extracted ${items.length} raw items from JSON.`);

    return items.map((item: any) => {
        let link = typeof item.link === "string" ? item.link : (item.link?.["@_href"] || "");
        if (sourceName === "경향신문" && !link && item.guid) {
            link = typeof item.guid === "string" ? item.guid : item.guid["#text"];
            if (link.startsWith('http')) {
                console.log(`[PARSE] ${sourceName}: Falling back to guid for link: ${link}`);
            }
        }

        let rawDescription = item.description || item.summary || "";
        rawDescription = rawDescription.replace(/<[^>]*>?/gm, '');

        return {
            title: decodeHtmlEntities(item.title || ""),
            link: link,
            description: decodeHtmlEntities(rawDescription).substring(0, 500),
            publishedAt: parseItemDate(item)
        };
    }).filter((item: any) => item.title && item.link);
}

export async function performRSSFetch(env: Env): Promise<void> {
    const startTime = Date.now();
    console.log(`[CRON] ========== RSS fetch started at ${new Date().toISOString()} ==========`);

    const { results: sources } = await env.DB.prepare(
        "SELECT id, url, name FROM sources WHERE is_active = 1"
    ).all<{ id: number; url: string; name: string }>();

    if (!sources || sources.length === 0) {
        console.warn("[CRON] No active sources found in DB. Aborting.");
        return;
    }

    console.log(`[CRON] Found ${sources.length} active sources: ${sources.map(s => s.name).join(", ")}`);

    const feedResults = await Promise.allSettled(
        sources.map(async (source) => {
            console.log(`[FETCH] ${source.name}: Fetching ${source.url}`);
            const res = await fetch(source.url, {
                headers: {
                    "User-Agent": "hy3n4-news-bot/1.0",
                    "Cache-Control": "no-cache"
                },
                cf: {
                    cacheTtl: 0
                }
            });
            console.log(`[FETCH] ${source.name}: HTTP ${res.status} ${res.statusText}`);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText} for ${source.name} (${source.url})`);
            }
            const xml = await res.text();
            console.log(`[FETCH] ${source.name}: Received ${xml.length} bytes of XML`);
            const items = parseRSS(xml, source.name);
            return { source, items };
        })
    );

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const result of feedResults) {
        if (result.status === "rejected") {
            console.error(`[ERROR] Feed fetch failed: ${result.reason}`);
            totalErrors++;
            continue;
        }

        const { source, items } = result.value;
        if (items.length === 0) {
            console.log(`[RESULT] ${source.name}: 0 items found.`);
            continue;
        }

        try {
            const statements = items.map(item =>
                env.DB.prepare(
                    "INSERT INTO news (source_id, title, url, description, published_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(url) DO NOTHING RETURNING id"
                ).bind(source.id, item.title, item.link, item.description, item.publishedAt)
            );

            const batchResults = await env.DB.batch<{ id: number }>(statements);

            const newIds: number[] = [];
            for (const res of batchResults) {
                if (res.results && res.results.length > 0) {
                    newIds.push(res.results[0].id);
                }
            }

            const inserted = newIds.length;
            const skipped = items.length - inserted;

            totalInserted += inserted;
            totalSkipped += skipped;

            if (inserted > 0 && env.NEWS_PROCESSING_QUEUE) {
                const messages = newIds.map(id => ({ body: { news_id: id } }));

                const BATCH_LIMIT = 100;
                for (let i = 0; i < messages.length; i += BATCH_LIMIT) {
                    const chunk = messages.slice(i, i + BATCH_LIMIT);
                    await env.NEWS_PROCESSING_QUEUE.sendBatch(chunk);
                }
                console.log(`[QUEUE] Pushed ${inserted} new articles to processing queue.`);
            }

            console.log(`[RESULT] ${source.name}: +${inserted} new | ${skipped} duplicates | 0 errors (of ${items.length} total)`);
        } catch (err) {
            totalErrors += items.length;
            console.error(`[DB ERROR] Batch insert failed for ${source.name}:`, err);
        }
    }

    console.log(`[CRON] RSS Summary: ${totalInserted} inserted | ${totalSkipped} skipped | ${totalErrors} errors`);
}
