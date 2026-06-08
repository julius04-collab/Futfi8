# Cron Jobs & API Key Setup

## Scheduled Jobs

All cron jobs are Next.js API routes under `app/api/cron/`. They are invoked by Vercel Cron Jobs on a schedule.

| Route | Purpose | Schedule |
|---|---|---|
| `GET /api/cron/poll-matches` | Poll API-Football for live/finished matches, create raid windows | Every 2 min during matches |
| `GET /api/cron/close-raids` | Close expired raid windows, archive posts, recalc Fan Cred | Every 5 min |
| `GET /api/cron/open-threads` | Create match threads 30 min before kickoff | Every 5 min |

## Authentication

Cron routes are secured via `CRON_SECRET` env var. The Vercel Cron job sends it as `Authorization: Bearer <CRON_SECRET>`. The route rejects requests without the correct token (403).

## Required API Keys

### API-Football (RapidAPI)
- **Env var**: `FOOTBALL_API_KEY`
- **Purpose**: Live scores, fixtures, result confirmation
- **Endpoint**: `https://v3.football.api-sports.io`
- **Setup**: Subscribe at https://rapidapi.com/api-sports/api/api-football/
- **Rate limit**: 100 requests/day (free tier) — the polling cron polls every 2 mins, so premium tier needed for production
- **Fallback**: If key is missing, cron gracefully skips polling and logs a warning

### Nodemailer (SMTP)
- **Env vars**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **Purpose**: Transactional emails (digest, notifications)
- **Setup**: Configure any SMTP provider (Gmail App Password, SendGrid, etc.)
- **Notes**: Falls back silently if SMTP is not configured; logs a warning

### Hugging Face Inference API (Free)
- **Env var**: `HUGGINGFACE_API_KEY`
- **Purpose**: Content moderation — toxicity scoring on posts via `unitary/toxic-bert`
- **Setup**: Get a free token at https://huggingface.co/settings/tokens
- **Model**: `unitary/toxic-bert` — classifies text for toxic, severe_toxic, obscene, threat, insult, identity_hate
- **Client**: `lib/huggingface/client.ts`

## Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in real values for all API keys
3. Run `npm run dev`

For cron testing locally, send curl requests with the correct `Authorization` header:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/poll-matches
```
