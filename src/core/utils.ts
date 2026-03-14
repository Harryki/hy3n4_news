export function getRelativeTime(publishedAt: string, createdAt: string): string {
  const targetDate = new Date(publishedAt || createdAt).getTime();
  const timeDiffMs = new Date().getTime() - targetDate;
  const timeAgoMins = Math.floor(timeDiffMs / 60000);

  if (timeAgoMins < 5) return '방금 전';
  if (timeAgoMins < 60) return `${timeAgoMins}분 전`;

  const timeAgoHours = Math.floor(timeAgoMins / 60);
  if (timeAgoHours < 24) return `${timeAgoHours}시간 전`;

  return `${Math.floor(timeAgoHours / 24)}일 전`;
}
