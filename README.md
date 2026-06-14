# Housekeepings Platform (POC)

AI-powered WhatsApp complaint intake for Israeli apartment-building management companies.

A resident sends a complaint in Hebrew to the building's WhatsApp Business number; an AI classifier (Claude Haiku 4.5) categorizes it (door / elevator / cleaning / noise / …), files it as a structured complaint, and replies to the resident with an acknowledgement. The management company sees everything in a Hebrew RTL dashboard and marks complaints resolved.

This is a **proof of concept** — single-tenant, minimum dependencies, no payment processing, no compliance scaffolding. The full design (compliance, scaling, costs) is in [`.ai/plans/whatsapp-complaint-module-mvp.md`](.ai/plans/whatsapp-complaint-module-mvp.md).

## Stack

- **Next.js 15** (App Router, React 19, TypeScript) — dashboard + webhook in one deployable
- **Drizzle ORM + libsql** (local SQLite) — pure-JS, no native compilation
- **Anthropic SDK** with **Claude Haiku 4.5** — classifier using `messages.parse()` with `zodOutputFormat`, prompt caching on the system prompt
- **Tailwind CSS 3** — Hebrew RTL UI
- **Meta WhatsApp Cloud API** — direct (no BSP)

## Quick start

```sh
cp .env.example .env.local           # fill in WhatsApp + Anthropic keys
npm install                          # already done in this repo
npm run db:migrate                   # creates SQLite tables + seeds the building row
npm run db:seed                      # (optional) inserts demo residents + complaints
npm run dev                          # http://localhost:3000
```

Open `http://localhost:3000` to see the dashboard. With `db:seed`, three demo complaints will appear immediately.

## Wiring up Meta WhatsApp Cloud API

The webhook lives at `POST /api/whatsapp/webhook`. Meta verifies it with `GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…`.

One-time setup at [developers.facebook.com](https://developers.facebook.com):

1. **Create a Meta app** → Add the **WhatsApp** product.
2. From the WhatsApp → API Setup screen, copy the **temporary access token** and **phone number ID** into `.env.local` as `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`. (Temporary token lasts 24h; for permanent use, create a system user and a permanent token.)
3. From App Settings → Basic, copy the **app secret** into `WHATSAPP_APP_SECRET` (used to verify webhook signatures).
4. Pick a string for `WHATSAPP_VERIFY_TOKEN` in `.env.local` — anything, just remember it.
5. Expose your local server to the internet so Meta can reach it:
   ```sh
   # Using the built-in script (requires cloudflared installed system-wide):
   bun run dev:tunnel
   # Or with ngrok:
   ngrok http 3000
   ```
6. In Meta App → WhatsApp → Configuration → Webhook, set:
   - **Callback URL:** `https://<your-ngrok-subdomain>.ngrok.app/api/whatsapp/webhook`
   - **Verify token:** the same string you set in `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save** (Meta hits the GET endpoint).
   - Under **Webhook fields**, subscribe to `messages`.
7. From the WhatsApp → API Setup screen, add your own phone as a **test recipient**.
8. Send a WhatsApp message from your phone to the Meta test number. It should appear in the dashboard within ~2 seconds.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | libsql/SQLite URL. Default `file:./data/dev.db` |
| `ANTHROPIC_API_KEY` | Claude API key (get from [console.anthropic.com](https://console.anthropic.com/)) |
| `WHATSAPP_TOKEN` | Meta WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | The phone number ID Meta assigns |
| `WHATSAPP_VERIFY_TOKEN` | Any string — must match what you put in Meta's webhook config |
| `WHATSAPP_APP_SECRET` | App Secret from Meta App Settings → Basic. Used for HMAC verification |
| `POC_BUILDING_ID` | Single-tenant POC: the building all messages belong to. Default `building-001` |
| `POC_BUILDING_NAME` | Human-readable building name shown in the dashboard |
| `POC_RESIDENT_PHONE` | Phone number for the pre-consented demo resident seeded by `db:seed`. Default `+972500000001` |
| `POC_COMPANY_NAME` | Management company name for the demo seed. Leave blank to use `Acme Management` |

If `WHATSAPP_APP_SECRET` is empty, the POST webhook returns 500 — this prevents fail-open deployments where an empty key would otherwise accept any signed request.

## Project layout

```
app/
  layout.tsx                          Hebrew RTL root layout
  page.tsx                            Dashboard — lists complaints, mark-resolved button
  actions.ts                          Server actions: resolve / reopen
  api/whatsapp/webhook/route.ts       GET (verification) + POST (incoming messages)
lib/
  db/
    schema.ts                         Drizzle schema — five tables, four TypeScript enums, relations, type exports
    index.ts                          Canonical db client (drizzle + schema) — import db from here
    client.ts                         (deprecated scaffold — use index.ts)
  ai/
    classifier.ts                     Claude Haiku 4.5 classifier (messages.parse + zodOutputFormat, cached system prompt)
    prompts/
      classify.ts                     Hebrew complaint-classifier system prompt builder
  whatsapp/
    cloud-api.ts                      Meta Cloud API client — sendFreeform, sendTemplate, WhatsAppApiError
    parse-export.ts                   WhatsApp .txt chat-export parser (Android + iOS)
    verify-signature.ts               HMAC-SHA256 signature verification
  intake.ts                           Orchestrator — resident lookup → classify → store → reply
scripts/
  migrate.ts                          Idempotent CREATE TABLE — also seeds the building row
  seed.ts                             Demo residents + complaints
```

## Costs (this POC, today's prices)

- **WhatsApp Cloud API:** Service messages (user → bot) and utility messages within the 24-hour window are free. Outside-window utility templates ≈ $0.015 each. For demo traffic this is < $0.50/month.
- **Claude Haiku 4.5:** $1 / M input tokens, $5 / M output tokens. Each classifier call is ~600 input + ~200 output tokens, with the system prompt cached at $0.10/M after the first call. < $1/month at demo scale.
- **Hosting:** Run locally during the POC. Free.
- **WhatsApp number:** Meta's developer test number is free with a 5-recipient allowlist. Real Israeli SIM ≈ ₪20 one-time when graduating to a real number.

## What's NOT in this POC

Deferred until after the POC validates with real management companies:

- Chat-export upload (Path B from the brainstorm)
- Multi-tenant management companies
- Israeli privacy compliance (Amendment 13 — DPIA, DPO, consent flow, retention policy)
- Outbound status updates (templated messages outside the 24-h window)
- Daily digest job
- Resident self-service status check
- Authentication on the dashboard (right now: anyone with the URL can mark resolved)
- Production database (currently local SQLite)

The full design is in [`.ai/plans/whatsapp-complaint-module-mvp.md`](.ai/plans/whatsapp-complaint-module-mvp.md).

## Useful commands

```sh
bun run dev              # local dev server with hot reload
bun run build            # production build (used to verify the code compiles)
bun run db:generate      # regenerate migration SQL after schema changes
bun run db:migrate       # apply migrations (idempotent)
bun run db:seed          # add demo residents + complaints
```

## Commit policy

Per `CLAUDE.md`: always use `/commit` for commits. No direct `git commit`.
