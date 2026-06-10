# Cheapest Legitimate Infra + AI Stack — B2B SaaS, May 2026

Israeli apartment-building management SaaS. Next.js 15 on Vercel, Postgres on Neon, Claude Haiku 4.5. Scale: 1 / 10 / 100 buildings, ~50 msg/day each (100 buildings = 150K msg/month), classifier per msg (80 in / 120 out) + daily digest per building (3K in / 500 out).

## 1. Hosting

**Vercel Hobby (free):** 100 GB bandwidth, 6,000 build min, 100K function invocations, 10 s function duration ([vercel.com/docs/limits](https://vercel.com/docs/limits)). **Hard blocker:** Hobby forbids commercial / revenue-generating use; any paying customer requires Pro ([Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines)).
**Vercel Pro:** $20/seat/month, includes $20 usage credit, 1 TB bandwidth, 1,000 GB-h functions, 60 s duration; overages ~$0.15/GB bandwidth ([vercel.com/pricing](https://vercel.com/pricing)).
**Alternatives 2026:**
- **Cloudflare Pages:** free, unlimited bandwidth, 500 builds/mo, 100K Worker requests/day, commercial use allowed ([developers.cloudflare.com/pages](https://developers.cloudflare.com/pages/functions/pricing/)).
- **Railway:** $5/mo Hobby with $5 compute credit ([docs.railway.com/pricing](https://docs.railway.com/pricing)).
- **Render:** free tier spins down after 15 min idle (cold-start 30-60 s); paid Starter $7/mo ([render.com](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)).
- **Fly.io:** no free tier for new users in 2026; shared-cpu-1x ~$2/mo if always-on ([toolradar.com/tools/flyio/pricing](https://toolradar.com/tools/flyio/pricing)).
- **Netlify:** credit-based free (300 credits/mo); legacy 100 GB bandwidth ([costbench.com/netlify](https://costbench.com/software/cloud-infrastructure/netlify/)).

**Cheapest legitimate choice:** 1 building → **Cloudflare Pages + Workers (free, commercial OK)** if you can live without Vercel-specific features. Otherwise **Vercel Pro $20**. 100 buildings → still **Vercel Pro $20–30** (well within 1 TB bandwidth at this scale).

## 2. Postgres

**Neon Free:** 0.5 GB/project, 100 CU-hours/mo, up to 10 projects, pgBouncer pooled connections ([neon.com/pricing](https://neon.com/pricing)). Doubled CU allowance Oct 2025 post-Databricks deal.
**Neon Launch:** $5/mo minimum, then $0.14/CU-h + $0.30/GB-mo (≤50 GB) ([neon.com/blog/new-usage-based-pricing](https://neon.com/blog/new-usage-based-pricing)).
**Supabase Free:** 500 MB DB, paused after **7 days inactivity** — unusable for production ([supabase.com/pricing](https://supabase.com/pricing)). Pro $25/mo (8 GB, no pause).
**Alternatives:** PlanetScale killed free tier April 2024, $5/mo minimum ([planetscale.com](https://planetscale.com/)); Turso free 5 GB / 100 DBs, Scaler $29/mo ([turso.tech/pricing](https://turso.tech/pricing)); Xata free 10 GB; Crunchy Bridge from ~$10/mo (no public free tier).

**Upgrade trigger:** ≥5 buildings (chat history grows past 0.5 GB free Neon) — move to Neon Launch $5/mo. The 100 CU-h free tier handles 100 buildings if compute auto-scales to zero between bursts.

## 3. File Storage (WhatsApp .txt exports, ~50 KB × 3-10/building/mo)

100 buildings × 10 files × 50 KB ≈ **50 MB/mo** added; <1 GB even at multi-year retention. Egress trivial.
- **Cloudflare R2 free:** 10 GB storage, 1 M Class A + 10 M Class B ops/mo, **zero egress** ever ([developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/)).
- **Vercel Blob:** 1 GB free on Hobby; $0.023/GB-mo + $0.05/GB transfer thereafter ([vercel.com/docs/vercel-blob](https://vercel.com/docs/vercel-blob/usage-and-pricing)).
- **AWS S3 (eu-central-1):** ~$0.0245/GB-mo + $0.09/GB egress ([aws.amazon.com/s3/pricing](https://aws.amazon.com/s3/pricing/)).
- **Backblaze B2:** $0.005/GB-mo, 3× free egress, then $0.01/GB ([backblaze.com](https://www.backblaze.com/cloud-storage)).

**Winner: R2 free tier at all three scales.** 1 GB → $0; 10 GB → $0; 100 GB → $1.35/mo on R2 vs $2.45 S3 vs $0.50 B2 (but R2's zero-egress wins for any active reads).

## 4. Claude API (May 2026 — official: [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing))

| Model | Input | 5-m cache write | 1-h cache write | Cache read | Output |
|---|---|---|---|---|---|
| Haiku 4.5 | $1 / MTok | $1.25 | $2 | $0.10 | $5 |
| Sonnet 4.6 | $3 | $3.75 | $6 | $0.30 | $15 |
| Opus 4.7 | $5 | $6.25 | $10 | $0.50 | $25 |

**Batch API: −50% on input + output.** Cache TTL 5 min or 1 h, resets on hit. (Opus 4.7 uses a new tokenizer producing up to **35% more tokens** for the same text — flagged risk.)

**Monthly Haiku 4.5 cost (with prompt caching on digest system prompt, ~2.5 K cached + 0.5 K fresh + 0.5 K out per digest):**

| Scale | Msgs/mo | Classifier $ | Digest $ | **Total** |
|---|---|---|---|---|
| 1 building | 1,500 | $1.02 | $0.18 | **~$1.20** |
| 10 buildings | 15,000 | $10.20 | $1.50 | **~$12** |
| 100 buildings | 150,000 | $102 | $15 | **~$117** |

Run digests via **Batch API** → 100-building digest cost halves; total drops to **~$110/mo**.

## 5. Transactional Email (30 emails/day at 100-building = ~900/mo)

- **Resend free:** 3,000/mo, 100/day cap ([resend.com/pricing](https://resend.com/pricing)). Pro $20/mo = 50K.
- **Brevo free:** 9,000/mo (300/day), no card ([brevo.com](https://www.brevo.com/blog/best-email-api/)).
- **MailerSend free:** 3,000/mo (was 500 in 2025; verify on page).
- **AWS SES:** $0.10 / 1,000 emails. Cheapest at any scale ([aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing/)).
- **Postmark:** 100/mo trial → $15/mo for 10K.
- **SendGrid:** 60-day trial only; $19.95/mo after.

**Pick: Resend free** at every scale in this report. SES if you outgrow 3K/mo (~$0.09/mo at 900 emails).

## 6. Monitoring

- **Sentry Developer (free):** 5K errors + 10K perf events, 30-day retention ([sentry.io/pricing](https://sentry.io/pricing/)). Team $26/mo (50K errors).
- **Better Stack free:** 10 monitors, 1 status page; paid from $29/mo, retention $0.05/GB-mo ([betterstack.com](https://betterstack.com/)).
- **Axiom free:** **500 GB ingest/mo**, 30-day retention — most generous in 2026 ([axiom.co/pricing](https://axiom.co/pricing)).
- **OpenObserve cloud free:** 200 GB ingest/mo ([openobserve.ai/pricing](https://openobserve.ai/pricing/)). Self-hosted OSS = $0.
- **Highlight:** pricing not surfaced; flag as unverified.

**Pick: Sentry free for errors + Axiom free for logs.** Both stay free through 100-building scale.

## 7. Auth

- **Auth.js / NextAuth:** OSS, free, self-hosted ([authjs.dev](https://authjs.dev/)).
- **Clerk:** 10,000 MAU free, then $0.02/MAU ([clerk.com/pricing](https://clerk.com/pricing)).
- **Auth0:** 7,000 MAU free, then ~$0.07/MAU.
- **Supabase Auth:** 50,000 MAU free, then $0.00325/MAU (but needs Supabase Pro $25 to avoid pausing).

**Pick: Auth.js (free)** for bare-minimum; **Clerk free tier** if you want SSO/MFA/UI out of box — 100 buildings ≈ a few hundred MAU, well under 10K.

## Cost Tables

### (a) Bare minimum — free tiers + 1 unavoidable paid
| Item | Choice | $/mo |
|---|---|---|
| Hosting | Cloudflare Pages (free, commercial OK) | $0 |
| DB | Neon Free | $0 |
| Storage | R2 Free | $0 |
| Email | Resend Free | $0 |
| Monitoring | Sentry + Axiom Free | $0 |
| Auth | Auth.js | $0 |
| Claude (1 bldg) | Haiku 4.5 | $1.20 |
| **Total** | | **~$1.20** |

(If you must stay on Vercel for Next.js feature parity, add $20 → ~$21/mo.)

### (b) Recommended for a real product (10 buildings)
| Item | Choice | $/mo |
|---|---|---|
| Hosting | Vercel Pro | $20 |
| DB | Neon Launch | $5 |
| Storage | R2 Free | $0 |
| Email | Resend Free | $0 |
| Monitoring | Sentry + Axiom Free | $0 |
| Auth | Clerk Free | $0 |
| Claude (10 bldgs) | Haiku 4.5 + cache | $12 |
| **Total** | | **~$37** |

### (c) 100-building scale
| Item | Choice | $/mo |
|---|---|---|
| Hosting | Vercel Pro (1 seat) | $20–30 |
| DB | Neon Launch (~5 GB, ~50 CU-h) | $10–15 |
| Storage | R2 (≤10 GB) | $0 |
| Email | Resend Free / SES | $0–1 |
| Monitoring | Sentry + Axiom Free | $0 |
| Auth | Clerk Free (≤10K MAU) | $0 |
| Claude (100 bldgs) | Haiku 4.5 + cache + Batch digest | $110 |
| **Total** | | **~$140–160** |

## Flags / uncertainty
- **Neon usage-based pricing** changed late 2025 after Databricks acquisition — re-verify before signing.
- **Vercel Hobby commercial-use ban** is the single biggest gotcha; do not run paid customers on it.
- **Opus 4.7 tokenizer** can inflate bills ~35% vs Opus 4.6 at same per-token rate.
- **Netlify pricing** moved to credit model post-Sep 2025; older guides are stale.
- **MailerSend free quota** reportedly bumped from 500 → 3,000/mo in 2026; confirm on dashboard.
- **Highlight.io** pricing not surfaced in clean form; treat as unverified.
