/**
 * Hacker News-style ranking algorithm.
 * Score = (upvotes + (viewCount * 0.1) + 1)^0.8 / (ageHours + 2)^1.8
 *
 * - Gravity (1.8): how fast posts decline in ranking
 * - +1 and +2: prevent division by zero and give new posts a boost
 * - viewCount: Adds a small weight to the score (e.g., 10 views = 1 upvote)
 */
export function hnScore(upvotes: number, viewCount: number, publishedAt: string | null, now: Date = new Date()): number {
    const published = publishedAt ? new Date(publishedAt) : now;
    const ageMs = now.getTime() - published.getTime();
    const ageHours = Math.max(ageMs / (1000 * 60 * 60), 0);

    const weightedScore = upvotes + (viewCount * 0.1) + 1;
    return Math.pow(weightedScore, 0.8) / Math.pow(ageHours + 2, 1.8);
}
