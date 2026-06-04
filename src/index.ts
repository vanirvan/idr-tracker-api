import { Hono } from 'hono'
import { cronjobServices } from '@/services/cron'
import { getLatestRate } from '@/services/rate'
import { getGraphData } from '@/services/graph'

const app = new Hono()

app.get('/', async (c) => {
  const latestData = await getLatestRate()
  if (!latestData) {
    return c.json({ error: "No rate data available. Please run the cron job first." }, 404)
  }
  return c.json(latestData)
})

app.get('/graph', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')

  try {
    const data = await getGraphData(from, to)
    return c.json(data)
  } catch (error) {
    console.error("Error in GET /graph:", error)
    return c.json({ error: "Failed to fetch graph data" }, 500)
  }
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
