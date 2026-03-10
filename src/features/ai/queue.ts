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

    // prepare batch containers
    const d1Statements: any[] = [];
    const vectorizeInserts: any[] = [];
    const topicsToCheck = new Set<number>();

    // 2. Process each item (Clustering)
    for (let i = 0; i < unclustered.length; i++) {
        const item = unclustered[i];
        const vector = vectors[i];

        // Search Vectorize
        const searchRes = await env.VECTORIZE.query(vector, { topK: 3 });
        const matches = searchRes.matches.filter((m: any) => m.score > 0.65);

        if (matches.length > 0) {
            // Map to existing topics
            for (const match of matches) {
                const topicId = parseInt(match.id, 10);
                // user INSERT OR IGNORE to prevent unique constarint crashes
                d1Statements.push(env.DB.prepare(
                    "INSERT OR IGNORE INTO news_topics (news_id, topic_id, similarity_score) VALUES (?, ?, ?)"
                ).bind(item.id, topicId, match.score));

                topicsToCheck.add(topicId);

            }
            clusteredCount++;
        } else {
            // Create new topic
            const newTopic = await env.DB.prepare(
                "INSERT INTO topics (title) VALUES (?) RETURNING id"
            ).bind(item.title).first<{ id: number }>();

            if (newTopic) {
                d1Statements.push(env.DB.prepare(
                    "INSERT INTO news_topics (news_id, topic_id, similarity_score) VALUES (?, ?, ?)"
                ).bind(item.id, newTopic.id, 1.0));

                vectorizeInserts.push({ id: newTopic.id.toString(), values: vector });
                newTopicCount++;
            }
        }
    }
    // 1. 배치용 통합 배열 선언
    const finalBatch: any[] = [];
    // Add timestamp updates to the batch

    topicsToCheck.forEach(id => {
        finalBatch.push(env.DB.prepare("UPDATE topics SET updated_at = datetime('now') WHERE id = ?").bind(id));
    });
    finalBatch.push(...d1Statements);

    console.log(`[QUEUE] Executing batch: ${topicsToCheck.size} topic updates, ${d1Statements.length} link inserts`);

    if (finalBatch.length > 0) {
        try {
            await env.DB.batch(finalBatch);
        } catch (e: any) {
            console.info(finalBatch);
            throw e; // 큐가 다시 시도하도록 던짐
        }
    }

    if (vectorizeInserts.length > 0) await env.VECTORIZE.insert(vectorizeInserts);

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
                try {
                    const aiResponse = await env.AI.run("@cf/google/gemma-3-12b-it", {
                        messages: [
                            {
                                role: "system",
                                content: "You are a professional Korean news editor. You must respond ONLY with a JSON object."
                            },
                            {
                                role: "user",
                                content: `Read the following news titles and provide a unified title (under 20 Korean chars) and 3 keywords.

News titles:
${topic.titles}
    
Output format:
{
"title": "...",
"keywords": "..."
}`
                            }
                        ],
                        max_tokens: 512
                    }) as { response: string };

                    if (aiResponse?.response) {
                        try {
                            const rawContent = aiResponse.response.trim();
                            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);

                            if (jsonMatch) {
                                const parsed = JSON.parse(jsonMatch[0]);

                                if (parsed.title && parsed.keywords) {
                                    const keywordString = Array.isArray(parsed.keywords)
                                        ? parsed.keywords.join(", ")
                                        : parsed.keywords;

                                    await env.DB.prepare("UPDATE topics SET title = ?, keywords = ? WHERE id = ?")
                                        .bind(parsed.title, keywordString, topic.id).run();

                                    console.log(`[QUEUE] Topic ${topic.id} summarized: ${parsed.title}`);
                                }
                            } else {
                                throw new Error("No JSON object found in response");
                            }
                        } catch (e: any) {
                            console.error(`[QUEUE] Parse failed for topic ${topic.id}:`, e.message);
                            console.error(`[DEBUG] Raw AI output was: ${aiResponse.response}`);
                        }
                    }
                } catch (e: any) {
                    console.error(`[QUEUE] AI Error for topic ${topic.id}:`, e.message);
                }
            }
        }
    }
}
