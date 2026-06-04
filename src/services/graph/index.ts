import { redis } from '@/lib/db/redis'

export async function getGraphData(fromParam?: string, toParam?: string) {
  let toTimestamp = Date.now();
  if (toParam) {
    const parsedTo = new Date(toParam).getTime();
    if (!isNaN(parsedTo)) {
      toTimestamp = parsedTo;
    }
  }

  let fromTimestamp = toTimestamp - 30 * 24 * 60 * 60 * 1000;
  if (fromParam) {
    const parsedFrom = new Date(fromParam).getTime();
    if (!isNaN(parsedFrom)) {
      fromTimestamp = parsedFrom;
    }
  }

  try {
    const members = await redis.zRange("rate:history", fromTimestamp, toTimestamp, {
      BY: 'SCORE'
    });

    return members.map(member => JSON.parse(member));
  } catch (error) {
    console.error("Error reading graph data from Redis:", error);
    throw error;
  }
}
