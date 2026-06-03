import { Hono } from 'hono'
import { cronjobServices } from '@/services/cron'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.get("/cron", async (c) => {
  console.log("cron called", new Date().toISOString())

  // calling the cronjob services
  await cronjobServices()

  return c.text('Cron job executed successfully!')
})

// change to */5 next time
// Bun.cron("*/1 * * * *", async () => {
//   console.log("cron called", new Date().toISOString())

//   // calling the cronjob services
//   await cronjobServices()

// })

export default app
