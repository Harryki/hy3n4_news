import { XMLParser } from "fast-xml-parser";

export interface RSSItem {
    title: string;
    link: string;
    description: string;
    publishedAt: string | null;
}

const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
    isArray: (name: string) => name === "item",
});

/**
 * Normalize various date formats to ISO 8601 string.
 * - pubDate (조선일보, 연합뉴스): "Fri, 06 Mar 2026 06:22:29 +0900"
 * - dc:date (경향신문): "2026-03-06T06:00:06+09:00"
 */
function normalizeDate(raw: string | undefined | null): string | null {
    if (!raw) return null;
    try {
        const d = new Date(raw);
        if (isNaN(d.getTime())) return null;
        return d.toISOString();
    } catch {
        return null;
    }
}

function decodeHTMLEntities(text: string): string {
    const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'"
    };
    return text.replace(/&(amp|lt|gt|quot|#39|apos);/g, match => entities[match] || match);
}

function stripHtmlTags(html: string): string {
    if (!html) return "";
    // Remove HTML tags
    let text = html.replace(/<[^>]*>?/gm, '');
    // Decode HTML entities that might remain
    text = decodeHTMLEntities(text);
    // Replace multiple spaces/newlines with a single space
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

export function parseRSS(xml: string, sourceName: string): RSSItem[] {
    console.log(`[PARSE] ${sourceName}: Raw XML Length is ${xml.length} characters. Prefix: ${xml.substring(0, 50).replace(/\n/g, ' ')}...`);
    const parsed = parser.parse(xml);

    const channel = parsed?.rss?.channel;
    if (!channel) return [];

    const items: any[] = channel.item ?? [];

    return items
        .map((item: any) => {
            const title = item.title;
            const link = item.link;

            // Skip Google News description as it's a list of links
            const rawDescription = sourceName === "Google News" ? "" : (item.description || "");
            const description = stripHtmlTags(String(rawDescription));

            // dc:date becomes "date" after removeNSPrefix (경향신문)
            // pubDate is used by 조선일보 and 연합뉴스
            const rawDate = item.pubDate ?? item.date ?? null;
            const publishedAt = normalizeDate(rawDate);

            if (!title || !link) return null;

            // Clean link — some feeds append UTM params
            const cleanLink = typeof link === "string" ? link.split("?")[0] : link;

            return {
                title: decodeHTMLEntities(String(title).trim()),
                link: String(cleanLink).trim(),
                description,
                publishedAt,
            };
        })
        .filter((item): item is RSSItem => item !== null);
}
