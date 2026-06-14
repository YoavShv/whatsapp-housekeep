import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from '../lib/db/schema'
import { managementCompanies, buildings, residents } from '../lib/db/schema'

const COMPANY_ID = 'company-001'
const BUILDING_ID = process.env.POC_BUILDING_ID ?? 'building-001'
const RESIDENT_ID = 'resident-001'
const DEMO_PHONE = process.env.POC_RESIDENT_PHONE ?? '+972500000001'

async function seed() {
  const client = createClient({
    url: process.env.DATABASE_URL ?? 'file:./data/dev.db',
  })
  const db = drizzle(client, { schema })

  await migrate(db, { migrationsFolder: './db/migrations' })

  await db
    .insert(managementCompanies)
    .values({ id: COMPANY_ID, name: process.env.POC_COMPANY_NAME ?? 'Demo Management Co.' })
    .onConflictDoNothing()

  await db
    .insert(buildings)
    .values({
      id: BUILDING_ID,
      name: process.env.POC_BUILDING_NAME ?? 'Demo Building',
      address: '1 Demo St, Tel Aviv',
      managementCompanyId: COMPANY_ID,
    })
    .onConflictDoNothing()

  await db
    .insert(residents)
    .values({
      id: RESIDENT_ID,
      phone: DEMO_PHONE,
      name: 'Demo Resident',
      buildingId: BUILDING_ID,
      consentedAt: new Date(),
      consentToken: 'demo-consent-token',
    })
    .onConflictDoNothing()

  console.log(`Seed complete — building: ${BUILDING_ID}, resident phone: ${DEMO_PHONE}`)
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
