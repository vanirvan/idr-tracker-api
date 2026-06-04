import puppeteer from "puppeteer"
import { db } from "@/lib/db"
import { rateTable } from "@/lib/db/schema"
import { redis } from "@/lib/db/redis"
import { asc, gte } from "drizzle-orm"

export async function cronjobServices() {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
  const page = await browser.newPage()

  // Set user agent and viewport to look like a real browser
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  )
  await page.setViewport({ width: 1280, height: 800 })

  try {
    await page.goto("https://www.morningstar.com/markets/currencies", {
      waitUntil: "networkidle2",
    })

    // Wait for the table headers to load
    await page.waitForSelector('th[role="rowheader"]', { timeout: 15000 })

    const result = await page.evaluate(() => {
      //Look at text "Indonesian Rupiah" in the <th> with role "rowheader"
      const headers = Array.from(document.querySelectorAll('th[role="rowheader"]'))
      const idrHeader = headers.find(th => th.textContent && th.textContent.includes("Indonesian Rupiah"))
      if (!idrHeader) return null

      const row = idrHeader.closest('tr')
      if (!row) return null

      // Find all cells (td) in the same row
      const tds = Array.from(row.querySelectorAll('td'))

      // Extract text on the next td > div > span, only get the first div > span
      const firstTd = tds[0]
      const rateSpan = firstTd ? firstTd.querySelector('div > span') : null
      const rate = rateSpan ? rateSpan.textContent?.trim() : null

      // Extract text on the last <td> tag, one with td > time tag
      const lastTd = tds[tds.length - 1]
      const timeEl = lastTd ? lastTd.querySelector('time') : null
      const timeText = timeEl ? timeEl.textContent?.trim() : null
      const datetime = timeEl ? timeEl.getAttribute('datetime') : null

      return {
        rate,
        timeText,
        datetime,
      }
    })

    console.log("Extracted IDR data:", result)

    if (result && result.rate && result.datetime) {
      const parsedRateNum = parseFloat(result.rate.replace(/,/g, ""))
      const parsedDateTime = new Date(result.datetime)

      // 1. Save to PG database
      await db.insert(rateTable).values({
        id: crypto.randomUUID(),
        rate: parsedRateNum.toString(),
        dateTime: parsedDateTime,
      })

      // 2. Determine the open rate (at 00:00)
      let openRateStr = await redis.get("rate:open")
      let openRateVal: number

      if (!openRateStr) {
        // Query Postgres for the first rate of the day
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0))

        const todayRates = await db
          .select()
          .from(rateTable)
          .where(gte(rateTable.createdAt, todayStart))
          .orderBy(asc(rateTable.createdAt))
          .limit(1)

        if (todayRates.length > 0) {
          openRateVal = parseFloat(todayRates[0].rate)
        } else {
          openRateVal = parsedRateNum
        }

        await redis.set("rate:open", openRateVal.toString())
      } else {
        openRateVal = parseFloat(openRateStr)
      }

      // 3. Calculate change & changePercentage
      const change = parsedRateNum - openRateVal
      const changePercentage = (change / openRateVal) * 100

      // 4. Update Redis rate:latest
      const latestData = {
        rate: parsedRateNum,
        dateTime: parsedDateTime.toISOString(),
        change: parseFloat(change.toFixed(4)),
        changePercentage: parseFloat(changePercentage.toFixed(4)),
      }
      await redis.set("rate:latest", JSON.stringify(latestData))

      // 5. Add to Redis Sorted Set rate:history
      const historyMember = JSON.stringify({
        rate: parsedRateNum,
        dateTime: parsedDateTime.toISOString(),
      })
      const score = parsedDateTime.getTime()
      await redis.zAdd("rate:history", {
        score: score,
        value: historyMember
      })

      console.log("Updated Redis & Postgres:", latestData)
    }
  } catch (error) {
    console.error("Error during scraping:", error)
    try {
      const pageTitle = await page.title()
      console.log("Failed page title:", pageTitle)
      const pageContent = await page.content()
      console.log("Failed page content preview (first 1000 chars):", pageContent.slice(0, 1000))
    } catch (e) {
      console.error("Could not capture page details:", e)
    }
  } finally {
    await browser.close()
  }
}
