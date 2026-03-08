import { Env } from "../../auth";

export async function processNewsQueue(messages: any[], env: Env): Promise<void> {
    console.log(`[QUEUE] Received batch of ${messages.length} messages`);

    const newsIds = messages.map(m => m.body?.news_id).filter(id => id !== undefined);
    if (newsIds.length === 0) return;

    // Fetch article details
    const placeholders = newsIds.map(() => "?").join(",");
    const { results: unclustered } = await env.DB.prepare(`
        SELECT id, title, description
        FROM news
        WHERE id IN (${placeholders})
    `).bind(...newsIds).all<{ id: number; title: string; description: string }>();

    if (!unclustered || unclustered.length === 0) return;

    console.log(`[QUEUE] Processing ${unclustered.length} articles for clustering...`);
    let clusteredCount = 0;
    let newTopicCount = 0;
    const topicsToCheck = new Set<number>();

    // 1. Generate Embeddings (in smaller chunks to avoid Network Connection Lost)
    const textsToEmbed = unclustered.map(item =>
        `${item.title} ${item.description || ""}`.substring(0, 1000)
    );

    let vectors: any[] = [];
    const EMBED_CHUNK_SIZE = 10;
    for (let i = 0; i < textsToEmbed.length; i += EMBED_CHUNK_SIZE) {
        const chunk = textsToEmbed.slice(i, i + EMBED_CHUNK_SIZE);
        const embedRes = await env.AI.run("@cf/baai/bge-m3", { text: chunk });
        vectors = vectors.concat(embedRes.data);
    }

    // 2. Process each item (Clustering)
    for (let i = 0; i < unclustered.length; i++) {
        const item = unclustered[i];
        const vector = vectors[i];

        // Search Vectorize
        const searchRes = await env.VECTORIZE.query(vector, { topK: 3 });
        const matches = searchRes.matches.filter((m: any) => m.score > 0.45);

        if (matches.length > 0) {
            // Map to existing topics
            for (const match of matches) {
                const topicId = parseInt(match.id, 10);
                try {
                    await env.DB.prepare(
                        "INSERT INTO news_topics (news_id, topic_id, similarity_score) VALUES (?, ?, ?)"
                    ).bind(item.id, topicId, match.score).run();

                    await env.DB.prepare(
                        "UPDATE topics SET updated_at = datetime('now') WHERE id = ?"
                    ).bind(topicId).run();

                    topicsToCheck.add(topicId);
                } catch (e) {
                    // Ignore unique constraint violations
                }
            }
            clusteredCount++;
        } else {
            // Create new topic
            const newTopic = await env.DB.prepare(
                "INSERT INTO topics (title) VALUES (?) RETURNING id"
            ).bind(item.title).first<{ id: number }>();

            if (newTopic) {
                await env.DB.prepare(
                    "INSERT INTO news_topics (news_id, topic_id, similarity_score) VALUES (?, ?, ?)"
                ).bind(item.id, newTopic.id, 1.0).run();

                await env.VECTORIZE.insert([{
                    id: newTopic.id.toString(),
                    values: vector
                }]);
                newTopicCount++;
            }
        }
    }

    console.log(`[QUEUE] Clustering complete. Mapped: ${clusteredCount}, New topics: ${newTopicCount}`);

    // 3. Summarize newly formed clusters
    if (topicsToCheck.size > 0) {
        const topicIdList = Array.from(topicsToCheck);
        const topicPlaceholders = topicIdList.map(() => "?").join(",");
        const { results: topicsToSummarize } = await env.DB.prepare(`
            SELECT t.id, group_concat(n.title, ' || ') as titles
            FROM topics t
            JOIN news_topics nt ON t.id = nt.topic_id
            JOIN news n ON nt.news_id = n.id
            WHERE t.id IN (${topicPlaceholders}) AND t.keywords IS NULL
            GROUP BY t.id
            HAVING count(n.id) >= 2
        `).bind(...topicIdList).all<{ id: number, titles: string }>();

        if (topicsToSummarize && topicsToSummarize.length > 0) {
            console.log(`[QUEUE] Found ${topicsToSummarize.length} topics to summarize.`);

            for (const topic of topicsToSummarize) {
                const prompt = `You are a professional Korean news editor. Read the following news article titles and provide a concise, unified topic title (under 20 Korean characters) and exactly 3 highly relevant keywords.
    
News titles:
${topic.titles}

Respond STRICTLY in this JSON format without any markdown blocks or extra conversational text:
{
  "title": "단일화된 사건 제목",
  "keywords": "키워드1, 키워드2, 키워드3"
}`;

                try {
                    const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
                        prompt: prompt,
                        max_tokens: 256
                    }) as { response: string };

                    if (aiResponse && aiResponse.response) {
                        try {
                            const match = aiResponse.response.match(/\{[\s\S]*\}/);
                            if (match) {
                                const parsed = JSON.parse(match[0]);
                                if (parsed.title && parsed.keywords) {
                                    await env.DB.prepare("UPDATE topics SET title = ?, keywords = ? WHERE id = ?")
                                        .bind(parsed.title, parsed.keywords, topic.id).run();
                                    console.log(`[QUEUE] Topic ${topic.id} summarized: ${parsed.title}`);
                                }
                            }
                        } catch (e) {
                            console.error(`[QUEUE] JSON Parse failed for topic ${topic.id}`);
                        }
                    }
                } catch (e: any) {
                    console.error(`[QUEUE] Summarization failed for topic ${topic.id}:`, e.message);
                }
            }
        }
    }
}
