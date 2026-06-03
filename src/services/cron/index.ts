import puppeteer from "puppeteer"

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

    const title = await page.title()
    console.log("Page title loaded:", title)

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

    // console.log them
    console.log("Extracted IDR data:", result)
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