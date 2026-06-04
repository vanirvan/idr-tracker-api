import { Hono } from 'hono'
import { cronjobServices } from '@/services/cron'
import router from '@/routes'

const app = new Hono()

app.route('/', router)

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
