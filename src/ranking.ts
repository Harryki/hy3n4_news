/**
 * Hacker News-style ranking algorithm.
 * Score = (upvotes + 1)^0.8 / (ageHours + 2)^1.8
 *
 * - Gravity (1.8): how fast posts decline in ranking
 * - +1 and +2: prevent division by zero and give new posts a boost
 */
export function hnScore(upvotes: number, publishedAt: string | null, now: Date = new Date()): number {
    const published = publishedAt ? new Date(publishedAt) : now;
    const ageMs = now.getTime() - published.getTime();
    const ageHours = Math.max(ageMs / (1000 * 60 * 60), 0);

    return Math.pow(upvotes + 1, 0.8) / Math.pow(ageHours + 2, 1.8);
}
