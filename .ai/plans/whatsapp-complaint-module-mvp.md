# Plan: Building Management Platform — WhatsApp Complaint Module (MVP)

## Context

The user is starting a B2B SaaS for apartment-building management companies in Israel. The first and most novel feature is an AI-driven complaint intake: today, residents complain in the building's WhatsApp group, the elected committee forwards relevant complaints to the management company, and the management company handles them. The platform automates the middle step.

The original idea — an AI bot that silently monitors an existing residents' WhatsApp group — is **not legally viable**. A dedicated research agent confirmed (May 2026 sources): WhatsApp Cloud API can't join consumer groups; the new Groups API is capped at ~8 participants and gated to enterprise senders; every BSP inherits the same limit; every unofficial library (Baileys, whatsapp-web.js) violates ToS by the maintainers' own admission, and Meta's 2025 enforcement plus the *WhatsApp v. NSO Group* precedent (~$4M + injunction, Oct 2025) make commercial use of those libraries legally and operationally untenable. Disclosure to participants does not cure the violation.

The viable path is therefore to **change the resident-facing flow slightly** to one of two sanctioned channels — a 1:1 complaints bot, or manual chat-export upload by the building committee — and build the AI/dashboard on top of that.

## Scope of this plan

**In scope:** The WhatsApp complaint intake module — the first and riskiest feature of the broader platform.

**Out of scope (future plans):** Work-order tracking, vendor management, billing, resident portal beyond complaints, mobile app, multi-language beyond Hebrew/English.

## Recommended architecture: combine Path A + Path B

### Channels

1. **Path A — Direct bot (primary):** Each management company gets a dedicated WhatsApp Business number per building (or one shared with building tagging). Residents message it directly. The building committee announces it once (lobby poster, QR code, group pinned message).
2. **Path B — Chat export upload (secondary):** A building committee chair exports the existing WhatsApp group's chat (`.txt`) via WhatsApp's native "Export Chat" feature and uploads it to the platform. The AI extracts complaints from the export. Useful for buildings that resist behavior change.

Both feed the same intake pipeline.

### High-level components

| Component | Responsibility |
|-----------|----------------|
| **WhatsApp gateway** | Send/receive via Meta Cloud API webhooks; handle templated and freeform messages |
| **Chat-export ingestor** | Parse uploaded `.txt` files, normalize to message records |
| **Intake service** | Tag every inbound message with `building_id`, `resident_id`, source channel |
| **AI pipeline** | (1) Is this a complaint? (2) Category, urgency, location. (3) Dedupe vs. open complaints. (4) Generate daily/weekly digest. Powered by Claude Haiku 4.5 |
| **Postgres** | Single source of truth |
| **Dashboard** | Management-company-facing Next.js app: queue of open complaints, digest view, mark-resolved, building/resident management |
| **Notifier** | Outbound WhatsApp confirmations to residents (utility category); daily email/WhatsApp digest to management company |

### Data model (sketch)

```
ManagementCompany   1───* Building   1───* Resident
                                         │
                                         └─* Complaint ──* Message (raw)
                                              │
                                              └─ category, status, priority, opened_at, resolved_at
```

### AI pipeline contract

- Input: a single inbound message (from WhatsApp or extracted from a chat export), plus the building's current open-complaints list.
- Output: structured JSON — `{ is_complaint: bool, category: enum, urgency: enum, dedupe_target_id: uuid|null, extracted_entities: {...}, suggested_title_he: string }`.
- Model: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`). Cheap, fast, multilingual (Hebrew handled well).
- Prompt caching: cache the building's open-complaints list and category taxonomy across messages within a building's hourly window. This is non-trivial for cost at scale.

### Tech stack (cheapest legal stack)

- **Language:** TypeScript (Node.js).
- **Web/API:** Next.js 15 (App Router) — single deployment for dashboard + API routes + webhook handlers.
- **DB:** Postgres on Neon free tier (0.5 GB; sufficient for MVP of 1–10 buildings).
- **LLM:** Claude Haiku 4.5 via `@anthropic-ai/sdk` with prompt caching.
- **WhatsApp:** **Meta Cloud API direct** (no BSP markup). Use a dedicated Israeli SIM (~₪50 one-time) registered to the WhatsApp Business account.
- **Hosting:** Vercel free tier (Next.js) + Neon free tier (DB).
- **Auth:** NextAuth with email/password for management-company users.
- **i18n:** Hebrew (RTL) primary; English secondary.
- **File storage (for chat exports):** Vercel Blob free tier or Cloudflare R2.
- **Timezone:** `Asia/Jerusalem` everywhere.

## Compliance (Israeli Amendment 13)

This is the **real cost driver** — not infrastructure.

- Resident consent flow: each resident's first interaction triggers a consent message linking to a notice (purpose, data types, retention, third parties, rights). Must be opt-in and logged.
- Notice text (§11): Hebrew + English versions, drafted with legal review.
- Building-onboarding contract with the management company: data processing agreement assigning roles (controller vs. processor).
- Retention policy: complaint records ≤24 months unless dispute; raw messages purged after 90 days.
- DPO: budget for a fractional DPO (₪1,000–3,000/month) — needed because complaints can include sensitive data (health, family, political).
- Database notification to the Privacy Protection Authority: required for the first time the platform processes data of ≥10,000 individuals. Track threshold; register proactively.
- Pen-test cadence: every 18 months once at scale.

## Cost estimate (researched May 2026)

Three research agents priced every category. Detailed sources cited inline below.

### Headline totals (USD/month)

| Scenario | Recurring | One-time setup |
|---|---|---|
| **MVP (1–3 buildings, solo, bare minimum)** | **~$175/mo** | **~₪8,000 (~$2,200)** |
| **Recommended (10 buildings, real product)** | **~$700/mo** (without paid acquisition) | **~₪25,000 (~$6,800)** |
| **Mature at scale (~100 buildings, full compliance)** | **~$6,000–13,000/mo** | rolling |

**The platform itself (WhatsApp + AI + infra) is cheap at every scale.** Israeli business + privacy compliance overhead is what dominates.

### Platform costs (USD/mo)

| Item | MVP | 10 bldgs | 100 bldgs | Source |
|---|---|---|---|---|
| WhatsApp Cloud API (per-message since 1 Jul 2025; Israeli rates) | $0.45 | $4.50 | $45 | developers.facebook.com/docs/whatsapp/pricing |
| Israeli SIM for bot (019 Mobile prepaid) | $5.50 | $5.50 | $5.50 | 019mobile.com |
| Hosting — **Cloudflare Pages free (commercial-OK)** or Vercel Pro $20 | $0–20 | $20 | $20–30 | — |
| Postgres on Neon (free → Launch $5/mo at ~5 buildings) | $0 | $5 | $10–15 | neon.com/pricing |
| File storage — Cloudflare R2 (free tier covers 100 buildings) | $0 | $0 | $0 | developers.cloudflare.com/r2/pricing |
| Claude Haiku 4.5 (with prompt caching on digest prompts) | $1.20 | $12 | $117 | platform.claude.com/docs/en/about-claude/pricing |
| Email (Resend free covers ≤3,000/mo) | $0 | $0 | $0–1 | resend.com/pricing |
| Monitoring (Sentry + Axiom free tiers) | $0 | $0 | $0 | — |
| Auth (Auth.js self-hosted) | $0 | $0 | $0 | — |
| **Platform subtotal** | **~$7–27** | **~$47** | **~$200** | |

### Israeli business basics (mandatory, NIS/mo)

| Item | MVP | Notes |
|---|---|---|
| ביטוח לאומי (self-employed) | ₪265–700 | Min ₪265 below income floor; ~₪600 at modest income |
| Bookkeeper (מנהל חשבונות) | ₪300 | עוסק מורשה rate; bע"מ ₪500–1,500 |
| CPA annual report (amortized) | ₪50–150 | ₪600–1,800/yr sole proprietor; ₪5,000–12,000 for בע"מ |
| Invoicing SaaS (Morning/iCount basic) | ₪50 | Required for חשבונית ישראל allocation numbers (mandatory for B2B ≥₪5,000 from Jun 2026) |
| Business bank account fees | ₪30–80 | "מסלול" basket at major banks |
| Payment gateway (PayPlus/Cardcom) | ~2% of rev | Stripe Israel not officially supported — use IL processors |
| Annual company fee (אגרה) — only if בע"מ | ₪110/mo | ₪1,338/yr if paid by 31 Mar 2026 |
| Domains (.co.il + .com) | ₪15 | ~₪200/yr |
| **Subtotal (NIS/mo)** | **~₪800–1,400 (~$215–380)** | |

### Privacy compliance (Amendment 13)

| Item | One-time | Recurring |
|---|---|---|
| Privacy policy + ToS by IL privacy lawyer | ₪5,000–15,000 | — |
| DPIA before launching the database | ₪10,000–35,000 | — |
| Cyber liability insurance | — | ₪4,000–12,000/yr |
| Pen test (every 18 mo at scale) | — | ₪25,000–70,000 per round |
| Fractional DPO (only at scale, borderline for this use case) | — | ₪2,000–10,000/mo |
| Database registration with PPA | largely abolished for private sector by Amendment 13 | — |

### One-time setup costs

| Item | Cost |
|---|---|
| עוסק מורשה registration | ₪0 |
| בע"מ formation via Justice Ministry online | ₪2,497 |
| Lawyer for incorporation (optional if DIY) | ₪500–3,000 |
| Trademark registration (1 class) | ₪3,000–5,000 |
| .co.il + .com domains year 1 | ₪200 |
| Meta Business verification | ₪0 |
| WhatsApp Cloud API setup | ₪0 |
| Israeli SIM card (one-time) | ₪20 |

### Optional growth-stage costs

| Item | Cost |
|---|---|
| Google Workspace (custom domain email) | $7–14/user/mo |
| GitHub Pro + Figma Pro + Notion | ~$25/user/mo combined |
| LinkedIn Sales Navigator | $99–120/mo |
| Google Ads (Hebrew B2B, useful minimum) | ₪3,000–8,000/mo |
| Coworking (skip at MVP) | ₪900–2,500/mo |

### Key gotchas (verified by research, easy to miss)

1. **Vercel Hobby forbids commercial use.** Paying customers → must pay Vercel Pro ($20/mo) OR move to Cloudflare Pages (free, commercial-OK).
2. **Stripe Israel is not officially supported** for accepting payments from local customers. Use PayPlus, Cardcom, Tranzila, or iCount Pay (~1.8–2.2% effective).
3. **WhatsApp pricing changed 1 Jul 2025 to per-message**; service + in-window utility messages are now fully free. The "first 1,000 conversations free" deal is gone (replaced by unlimited free service).
4. **VAT in 2026 = 18%** (raised from 17% in 2025; 19% bump was rejected). No registration threshold — every sale triggers it.
5. **חשבונית ישראל reform**: from June 2026, all B2B invoices ≥₪5,000 require real-time allocation numbers from the Tax Authority. Wire invoicing SaaS in early.
6. **עוסק פטור (cheap exempt-dealer status) doesn't work for B2B SaaS** — buyers reject the invoices because they can't reclaim VAT. Use עוסק מורשה.
7. **FX margin**: Israeli cards add 2–3% on USD billing for Meta/Anthropic/Vercel — small but compounds.
8. **No DPO required at MVP** for this use case — Amendment 13 mandates DPO mainly for "main activity = sensitive processing" or >10,000-record data brokers. Defer the ₪2K–10K/mo DPO cost until scale triggers it; consult an IL privacy lawyer to confirm.

### Flags / things to verify before committing

- Exact Israel-specific WhatsApp Cloud API per-message rates (the research used mid-band of Meta's published global range; agent couldn't directly retrieve the Israel column).
- DPO threshold interpretation under Amendment 13 — get a privacy lawyer's opinion specific to "complaint messages about neighbours" data type, since these can include sensitive content.
- Whether one shared WhatsApp number serves all management-company tenants or each company needs its own (UX trade-off — separate numbers improve trust but add ₪20/mo per number).

## Critical files / paths to create

This is a greenfield project, so the relevant paths will be new:

- `/workspace/app/` — Next.js app
  - `app/api/whatsapp/webhook/route.ts` — Meta Cloud API webhook handler
  - `app/api/upload-chat-export/route.ts` — chat-export upload endpoint
  - `app/(dashboard)/complaints/page.tsx` — open complaints queue
  - `app/(dashboard)/buildings/[id]/page.tsx` — per-building view
  - `app/(public)/consent/[token]/page.tsx` — resident consent confirmation
- `/workspace/lib/`
  - `lib/whatsapp/cloud-api.ts` — outbound message client
  - `lib/whatsapp/parse-export.ts` — parser for WhatsApp's `.txt` export format
  - `lib/ai/classifier.ts` — single-message classifier (Claude Haiku)
  - `lib/ai/digest.ts` — daily/weekly summary generator
  - `lib/ai/prompts/` — prompt templates (Hebrew-first)
  - `lib/db/schema.ts` — Drizzle ORM schema
- `/workspace/db/migrations/` — DB migrations
- `/workspace/tests/` — already exists; add unit tests for export parser and classifier

## Phase 1 deliverables (MVP, ~3–4 weeks)

1. **Meta Cloud API setup**: Business verification, phone number registration, webhook endpoint, send/receive smoke test.
2. **Resident onboarding flow**: First-message-to-bot triggers a consent prompt; reply "agree" → resident registered against the inviting building.
3. **Complaint intake (Path A)**: Resident sends a Hebrew message ("הדלת הראשית תקועה") → bot acknowledges → classifier categorizes → Complaint row created → linked to the building's open list.
4. **Chat-export ingest (Path B)**: Committee chair uploads a `.txt` file → parser extracts messages → classifier processes each → complaints created with `source = 'export'`.
5. **Dashboard MVP**: Login, list open complaints, drill-down view, mark resolved, daily-digest view per building.
6. **Daily digest job**: At 08:00 Asia/Jerusalem, generate a per-building summary; send to the management company contact.
7. **Hebrew RTL** throughout.
8. **Consent page + privacy notice** (Hebrew + English).

## Phase 2 (post-MVP)

- Outbound status updates to residents ("complaint resolved")
- Resident self-service status check
- Multi-tenant management companies (start single-tenant for first customer)
- Vendor dispatch integration
- Billing

## Open questions to resolve before/during Phase 1

These are flagged in the plan because they require external answers I cannot definitively give:

- **Exact WhatsApp Business pricing for Israel tier in 2026** — Meta moved to per-message pricing in stages; check current rates at developers.facebook.com/docs/whatsapp/pricing.
- **Whether a fractional DPO is strictly required at MVP scale** — depends on processing-volume thresholds. Consult an Israeli privacy lawyer before onboarding the first paying building.
- **Whether management companies prefer one shared bot number across their buildings, or one number per building** — UX trade-off; user research with 2–3 management companies before locking the design.
- **Hebrew classifier quality** — must validate on a real sample of building-group messages before promising customers it works. Plan a 1-week eval phase against a labelled dataset of ~200 messages.

## Verification plan (end-to-end)

1. **Webhook smoke test**: send a manual WhatsApp message to the registered number, confirm webhook fires and message is persisted.
2. **Chat-export parsing test**: take a sample WhatsApp `.txt` export (anonymized friends-group works), run the parser, assert ≥95% messages extracted with correct timestamps.
3. **Classifier eval**: hand-label ~200 messages from a real building group (with consent), measure precision/recall on `is_complaint` and category. Target ≥85% precision before launch.
4. **End-to-end flow**: simulate a resident sending three messages over a day, confirm Complaint records are deduped sensibly and digest summary reads correctly.
5. **Compliance walkthrough**: legal review of the consent flow + notice text before first paying building.
6. **Cost check**: after 2 weeks running with one pilot building, verify monthly burn is within estimate.

## Next step

Run `/create-prd` to formalize this design as a Product Requirements Document, or push back on any of the assumptions above (especially the open questions) before that.
