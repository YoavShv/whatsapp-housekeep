import { describe, it, expect, beforeAll, vi } from 'vitest'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import * as schema from '../../lib/db/schema'
import {
  managementCompanies,
  buildings,
  residents,
  complaints,
  messages,
} from '../../lib/db/schema'

// vi.mock is hoisted; the getter resolves testDb lazily after beforeAll initializes it.
let testDb: LibSQLDatabase<typeof schema>
vi.mock('@/lib/db/index', () => ({
  get db() {
    return testDb
  },
}))

import {
  getOpenComplaints,
  getBuildingComplaints,
  getComplaintDetail,
} from '../../lib/dashboard/queries'

const companyId = crypto.randomUUID()
const buildingA = crypto.randomUUID()
const buildingB = crypto.randomUUID()
const residentId = crypto.randomUUID()
// Two open complaints (one per building) + one resolved; openOld is older than openNew.
const openNewId = crypto.randomUUID()
const openOldId = crypto.randomUUID()
const resolvedId = crypto.randomUUID()

describe('dashboard queries', () => {
  beforeAll(async () => {
    const client = createClient({ url: ':memory:' })
    testDb = drizzle(client, { schema })
    await migrate(testDb, { migrationsFolder: './db/migrations' })

    await testDb.insert(managementCompanies).values({ id: companyId, name: 'Test Co' })
    await testDb.insert(buildings).values([
      { id: buildingA, name: 'בניין א', address: '1 St', managementCompanyId: companyId },
      { id: buildingB, name: 'בניין ב', address: '2 St', managementCompanyId: companyId },
    ])
    await testDb.insert(residents).values({
      id: residentId,
      phone: '+972501110001',
      buildingId: buildingA,
      consentToken: 'tok',
    })

    await testDb.insert(complaints).values([
      {
        id: openOldId,
        buildingId: buildingA,
        residentId,
        title: 'תלונה ישנה',
        category: 'plumbing',
        urgency: 'low',
        status: 'open',
        openedAt: new Date(1000 * 1000),
      },
      {
        id: openNewId,
        buildingId: buildingB,
        title: 'תלונה חדשה',
        category: 'noise',
        urgency: 'high',
        status: 'open',
        openedAt: new Date(2000 * 1000),
      },
      {
        id: resolvedId,
        buildingId: buildingA,
        category: 'elevator',
        urgency: 'medium',
        status: 'resolved',
        openedAt: new Date(1500 * 1000),
        resolvedAt: new Date(1600 * 1000),
      },
    ])

    await testDb.insert(messages).values([
      {
        id: crypto.randomUUID(),
        complaintId: openOldId,
        buildingId: buildingA,
        residentId,
        content: 'הודעה ראשונה',
        source: 'whatsapp',
        sentAt: new Date(900 * 1000),
      },
      {
        id: crypto.randomUUID(),
        complaintId: openOldId,
        buildingId: buildingA,
        residentId,
        content: 'הודעה שנייה',
        source: 'whatsapp',
        sentAt: new Date(950 * 1000),
      },
    ])
  })

  it('getOpenComplaints returns only open complaints, newest first', async () => {
    const rows = await getOpenComplaints()
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.id)).toEqual([openNewId, openOldId])
    expect(rows.every((r) => r.status === 'open')).toBe(true)
    expect(rows[0].building?.name).toBe('בניין ב')
  })

  it('getBuildingComplaints filters to one building (open only)', async () => {
    const rows = await getBuildingComplaints(buildingA)
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(openOldId)
    expect(rows[0].building?.name).toBe('בניין א')
  })

  it('getComplaintDetail returns complaint with messages and building', async () => {
    const detail = await getComplaintDetail(openOldId)
    expect(detail).toBeDefined()
    expect(detail?.building?.name).toBe('בניין א')
    expect(detail?.messages.map((m) => m.content)).toEqual(['הודעה ראשונה', 'הודעה שנייה'])
  })

  it('getComplaintDetail returns undefined for unknown id', async () => {
    const detail = await getComplaintDetail('nonexistent')
    expect(detail).toBeUndefined()
  })
})
