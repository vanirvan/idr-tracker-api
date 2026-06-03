import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const rateTable = pgTable("rates", {
  id: uuid().primaryKey(),
  rate: varchar({ length: 255 }).notNull(),
  dateTime: timestamp('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})