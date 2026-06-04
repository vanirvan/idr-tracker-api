# IDR Tracker API

A performant and modern backend application built with **Bun**, **Hono**, **PostgreSQL**, and **Redis** to scrape, track, cache, and serve Indonesian Rupiah (IDR) exchange rates.

## Features

* **Automated Web Scraping**: Leverages headless **Puppeteer** to regularly scrape the USD to IDR exchange rates from Morningstar's currency portal.
* **Cron Scheduling**: Uses Bun's native `Bun.cron` task scheduler (runs every 5 minutes) to automate crawler executions.
* **Dual Database Architecture**:
  * **PostgreSQL (Drizzle ORM)**: Serves as the primary source of truth for persistent historical records.
  * **Redis**: Serves as the high-speed data caching and storage layer for API endpoints.
* **Daily Performance Tracking**: Automatically computes currency `change` and `changePercentage` based on the day's opening rate (recorded at `00:00`).
* **Redis-Sourced Sorted Sets (`ZSET`)**: Caches and serves historical graph timelines directly from Redis sorted by Unix timestamps.

---

## Tech Stack

* **Runtime**: [Bun](https://bun.sh/)
* **Router / Web Framework**: [Hono](https://hono.dev/)
* **Scraper**: [Puppeteer](https://pptr.dev/)
* **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
* **Primary Database**: PostgreSQL (`pg`)
* **Caching Database**: Redis (`redis`)

---

## API Endpoints

### 1. Get Latest Rates
* **Route**: `GET /`
* **Description**: Returns the latest scraped exchange rate alongside today's computed change and change percentage.
* **Response Output**:
  ```json
  {
    "rate": 18032,
    "dateTime": "2026-06-04T06:54:26.000Z",
    "change": 100.4,
    "changePercentage": 0.5599
  }
  ```

### 2. Get Historical Graph Data
* **Route**: `GET /graph`
* **Query Parameters**:
  * `from` (optional): ISO datetime string filtering the start of the window (e.g. `2026-06-01T00:00:00.000Z`).
  * `to` (optional): ISO datetime string filtering the end of the window.
* **Description**: Returns historical rate points sorted chronologically. Defaults to the last **30 days** of data retrieved directly from the Redis Sorted Set `rate:history`.
* **Response Output**:
  ```json
  [
    {
      "rate": 18028,
      "dateTime": "2026-06-04T06:46:29.000Z"
    },
    {
      "rate": 18032,
      "dateTime": "2026-06-04T06:54:26.000Z"
    }
  ]
  ```

---

## Environment Configuration

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/idr_tracker
REDIS_URL=redis://localhost:6379
```

---

## Getting Started

### 1. Install Dependencies
```sh
bun install
```

### 2. Push Database Schema
```sh
bunx drizzle-kit push
```

### 3. Run Development Server
```sh
bun run dev
```
The server will start at `http://localhost:3000`.
