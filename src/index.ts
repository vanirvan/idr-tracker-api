import { Hono } from 'hono'
import { cronjobServices } from '@/services/cron'
import { getLatestRate } from '@/services/rate'

const app = new Hono()

app.get('/', async (c) => {
  const latestData = await getLatestRate()
  if (!latestData) {
    return c.json({ error: "No rate data available. Please run the cron job first." }, 404)
  }
  return c.json(latestData)
})

// app.get("/cron", async (c) => {
//   console.log("cron called manually", new Date().toISOString())
//   await cronjobServices()
//   return c.text('Cron job executed successfully!')
// })

Bun.cron("*/5 * * * *", async () => {
  console.log("cron called automatically", new Date().toISOString())
  await cronjobServices()
})

export default app
