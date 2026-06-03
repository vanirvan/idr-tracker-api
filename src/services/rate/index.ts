import { redis } from '@/lib/db/redis'
import { db } from '@/lib/db'
import { rateTable } from '@/lib/db/schema'
import { desc, asc, gte } from 'drizzle-orm'

export async function getLatestRate() {
  // Try fetching latest rate from Redis
  try {
    const cachedLatest = await redis.get("rate:latest")
    if (cachedLatest) {
      return JSON.parse(cachedLatest)
    }
  } catch (err) {
    console.error("Redis error in getLatestRate service:", err)
  }

  // Fallback to Postgres if Redis is empty or errors
  const latestDbRecord = await db
    .select()
    .from(rateTable)
    .orderBy(desc(rateTable.dateTime))
    .limit(1)

  if (latestDbRecord.length === 0) {
    return null
  }

  const latest = latestDbRecord[0]
  const parsedRateNum = parseFloat(latest.rate)

  // Get or calculate open rate
  let openRateVal = parsedRateNum
  try {
    const openRateStr = await redis.get("rate:open")
    if (openRateStr) {
      openRateVal = parseFloat(openRateStr)
    } else {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0))

      const todayRates = await db
        .select()
        .from(rateTable)
        .where(gte(rateTable.createdAt, todayStart))
        .orderBy(asc(rateTable.createdAt))
        .limit(1)

      if (todayRates.length > 0) {
        openRateVal = parseFloat(todayRates[0].rate)
      }
      await redis.set("rate:open", openRateVal.toString())
    }
  } catch (err) {
    console.error("Redis or DB error while calculating open rate in service:", err)
  }

  const change = parsedRateNum - openRateVal
  const changePercentage = (change / openRateVal) * 100

  const latestData = {
    rate: parsedRateNum,
    dateTime: latest.dateTime.toISOString(),
    change: parseFloat(change.toFixed(4)),
    changePercentage: parseFloat(changePercentage.toFixed(4)),
  }

  // Re-cache latest data
  try {
    await redis.set("rate:latest", JSON.stringify(latestData))
  } catch (err) {
    console.error("Failed to update cache in service:", err)
  }

  return latestData
}

