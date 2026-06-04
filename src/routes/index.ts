import { Hono } from 'hono'
import { getLatestRate } from '@/services/rate'
import { getGraphData } from '@/services/graph'

const router = new Hono()

router.get('/', async (c) => {
  const latestData = await getLatestRate()
  if (!latestData) {
    return c.json({ error: "No rate data available. Please run the cron job first." }, 404)
  }
  return c.json(latestData)
})

router.get('/graph', async (c) => {
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

export default router
