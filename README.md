# ReachInbox Email Scheduler

A production-grade email job scheduler built with BullMQ, Redis, PostgreSQL, and Ethereal Email. Features a React dashboard with Google OAuth login, Slack notifications, and Elasticsearch-powered email search.

---

## 🚀 Quick Start

### 1. Start Infrastructure (Docker)

```bash
docker-compose up -d
```
This starts PostgreSQL (5432), Redis (6379), and Elasticsearch (9200).

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env   # then fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SLACK_CLIENT_ID, SLACK_CLIENT_SECRET

# Push database schema
npx prisma db push

# Start development server (includes worker)
npm run dev
```

The backend runs at **http://localhost:3000**  
BullMQ Dashboard: **http://localhost:3000/admin/queues**

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:5173**

---

## 🔧 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_HOST` | ✅ | Redis host (default: 127.0.0.1) |
| `REDIS_PORT` | ✅ | Redis port (default: 6379) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | ✅ | `http://localhost:3000/auth/google/callback` |
| `SLACK_CLIENT_ID` | ✅ | Slack App Client ID |
| `SLACK_CLIENT_SECRET` | ✅ | Slack App Client Secret |
| `SLACK_REDIRECT_URI` | ✅ | `http://localhost:3000/slack/callback` |
| `ELASTICSEARCH_URL` | Optional | ES URL (default: http://localhost:9200) |
| `WORKER_CONCURRENCY` | Optional | Worker concurrency (default: 5) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Optional | Rate limit (default: 100) |
| `MIN_DELAY_BETWEEN_SENDS_MS` | Optional | Min delay between sends (default: 2000ms) |
| `FRONTEND_URL` | Optional | Frontend URL for CORS/redirects |

### Setting up Google OAuth
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Set Authorized redirect URI: `http://localhost:3000/auth/google/callback`
4. Copy Client ID and Secret to `.env`

### Setting up Slack App
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App
2. OAuth & Permissions → Add Redirect URL: `http://localhost:3000/slack/callback`
3. Bot Token Scopes: `incoming-webhook`
4. Copy Client ID and Secret to `.env`

---

## 🏗 Architecture

```
Frontend (React + Vite, port 5173)
    │
    │ Google OAuth redirect
    ▼
Backend (Express + TypeScript, port 3000)
    ├── GET  /auth/google           → redirect to Google OAuth
    ├── GET  /auth/google/callback  → exchange code, create session
    ├── GET  /auth/me               → get current user
    ├── POST /auth/logout           → clear session
    │
    ├── GET  /slack/connect         → redirect to Slack OAuth
    ├── GET  /slack/callback        → store webhook URL
    ├── DELETE /slack/disconnect    → remove Slack token
    │
    ├── POST /emails/schedule       → schedule email batch from leads
    ├── GET  /emails/scheduled      → list pending/sending emails
    ├── GET  /emails/sent           → list sent/failed emails
    ├── DELETE /emails/:id/cancel   → cancel a scheduled email
    ├── GET  /emails/search?q=      → search via Elasticsearch (DB fallback)
    │
    └── /admin/queues               → BullMQ live dashboard

BullMQ emailQueue (Redis-backed delayed jobs)
    └── email.worker.ts
         ├── Per-sender Ethereal SMTP pool
         ├── Redis rate limit counter (rate_limit:{sender}:{hour_window})
         ├── If limit exceeded → reschedule to next hour + Slack notify
         ├── Min 2s delay between sends (BullMQ limiter)
         ├── Idempotency via jobId = idempotencyKey
         └── On sent → update DB + index Elasticsearch

PostgreSQL (via Prisma)
    ├── User          (Google OAuth users)
    ├── SlackToken    (per-user Slack webhooks)
    ├── Sender        (SMTP credentials per sender email)
    └── Email         (scheduled/sent email records)
```

---

## ⚙️ How Scheduling Works

1. Client POSTs to `/emails/schedule` with leads[], subject, body, senderEmail, startTime, delayBetweenSeconds
2. Backend creates one `Email` DB record per lead with computed `scheduledAt`
3. A BullMQ delayed job is added with `delay = scheduledAt - now()` and `jobId = idempotencyKey`
4. The worker picks up the job at the right time and sends via Ethereal SMTP

## 🔄 Persistence on Restart

On every server startup (`server.ts`), before listening:
1. Query DB for all emails with `status = 'scheduled'` and `scheduledAt > now()`
2. For each, check if its `jobId` still exists in BullMQ
3. If missing → re-add delayed job with computed remaining delay
4. BullMQ's `jobId = idempotencyKey` ensures the same email is never added twice

## 🚦 Rate Limiting

- **Per-sender hourly limit**: Redis key `rate_limit:{senderEmail}:{YYYY-MM-DD-HH}`, TTL 2h
- Before each send, worker increments the counter
- If count > `MAX_EMAILS_PER_HOUR_PER_SENDER`:
  - Decrements counter back
  - Adds new delayed job starting at the next UTC hour window
  - Sends Slack notification (if user has connected Slack)
- **Between-send delay**: BullMQ limiter `{ max: 1, duration: 2000 }` = 1 email per 2 seconds minimum
- **Concurrency**: Worker processes up to `WORKER_CONCURRENCY` jobs in parallel (default: 5)
- **Safe across multiple workers**: Redis atomic `INCR` ensures consistent counting

## ✅ Features Implemented

### Backend
- [x] Email scheduling API (`POST /emails/schedule`)
- [x] BullMQ delayed jobs (no cron)
- [x] PostgreSQL with Prisma ORM
- [x] Multiple senders with Ethereal SMTP pool
- [x] Redis-backed per-sender hourly rate limiting
- [x] Min 2-second delay between sends (BullMQ limiter)
- [x] Idempotency via BullMQ `jobId = idempotencyKey`
- [x] Persistence on restart (job restore from DB)
- [x] Elasticsearch indexing + search (graceful fallback to DB)
- [x] BullMQ live dashboard at `/admin/queues`
- [x] Google OAuth 2.0 authentication
- [x] Slack OAuth + rate-limit webhook notification
- [x] CSV/text file lead parsing (multer)
- [x] Job cancellation

### Frontend
- [x] Google Login page
- [x] Protected dashboard with React Router
- [x] Top header (user avatar, name, email, Slack connect, logout)
- [x] Sidebar navigation (Scheduled / Sent / BullMQ Dashboard)
- [x] Compose modal with CSV upload + lead count detection
- [x] Scheduled emails table (auto-refresh every 5s)
- [x] Sent emails table (auto-refresh every 5s)
- [x] Loading states, empty states, error handling
- [x] Pagination
- [x] Cancel scheduled email action
- [x] Preview URL for Ethereal emails

---

## 📝 Trade-offs & Assumptions

- **Session store**: Using in-memory Map for simplicity. In production, use Redis-backed sessions (`connect-redis`).
- **Ethereal**: Each unique `senderEmail` gets a fresh Ethereal test account on first use. Credentials are stored in the DB for reuse.
- **Elasticsearch**: Optional — app fully works without ES (falls back to PostgreSQL ILIKE search).
- **Rate limit delay**: `MIN_DELAY_BETWEEN_SENDS_MS` is applied per worker slot via BullMQ limiter, not as a global pause. With concurrency=5, effective throughput is `5 * (1/2s) = 2.5 emails/sec`.
