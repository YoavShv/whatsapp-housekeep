import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { eq } from 'drizzle-orm'
import * as schema from '../../lib/db/schema'
import { managementCompanies, buildings, residents, complaints } from '../../lib/db/schema'
import { db as indexDb } from '../../lib/db/index'

import type { LibSQLDatabase } from 'drizzle-orm/libsql'

describe('db smoke test', () => {
  let db: LibSQLDatabase<typeof schema>

  beforeAll(async () => {
    const client = createClient({ url: ':memory:' })
    db = drizzle(client, { schema })
    await migrate(db, { migrationsFolder: './db/migrations' })
  })

  it('inserts and reads a Complaint', async () => {
    const companyId = crypto.randomUUID()
    const buildingId = crypto.randomUUID()
    const residentId = crypto.randomUUID()
    const complaintId = crypto.randomUUID()

    await db.insert(managementCompanies).values({ id: companyId, name: 'Test Co' })
    await db.insert(buildings).values({
      id: buildingId,
      name: 'Test Bldg',
      address: '1 Test St',
      managementCompanyId: companyId,
    })
    await db.insert(residents).values({
      id: residentId,
      phone: '+972501110001',
      buildingId,
      consentToken: 'tok',
    })
    await db.insert(complaints).values({
      id: complaintId,
      buildingId,
      residentId,
      category: 'plumbing',
      urgency: 'low',
      status: 'open',
      priority: 0,
    })

    const [found] = await db.select().from(complaints).where(eq(complaints.id, complaintId))

    expect(found.id).toBe(complaintId)
    expect(found.category).toBe('plumbing')
    expect(found.status).toBe('open')
    expect(found.urgency).toBe('low')
    expect(found.resolvedAt).toBeNull()
  })

  it('allows null residentId on a Complaint (anonymous complaint)', async () => {
    const companyId = crypto.randomUUID()
    const buildingId = crypto.randomUUID()
    const complaintId = crypto.randomUUID()

    await db.insert(managementCompanies).values({ id: companyId, name: 'Anon Co' })
    await db.insert(buildings).values({
      id: buildingId,
      name: 'Anon Bldg',
      address: '2 Anon St',
      managementCompanyId: companyId,
    })
    await db.insert(complaints).values({
      id: complaintId,
      buildingId,
      residentId: null,
      category: 'noise',
      urgency: 'medium',
      status: 'open',
      priority: 0,
    })

    const [found] = await db.select().from(complaints).where(eq(complaints.id, complaintId))
    expect(found.residentId).toBeNull()
  })

  it('stores a Message linked to a Complaint', async () => {
    const companyId = crypto.randomUUID()
    const buildingId = crypto.randomUUID()
    const residentId = crypto.randomUUID()
    const complaintId = crypto.randomUUID()
    const messageId = crypto.randomUUID()

    await db.insert(managementCompanies).values({ id: companyId, name: 'Msg Co' })
    await db.insert(buildings).values({
      id: buildingId,
      name: 'Msg Bldg',
      address: '3 Msg St',
      managementCompanyId: companyId,
    })
    await db
      .insert(residents)
      .values({ id: residentId, phone: '+972502220002', buildingId, consentToken: 'tok2' })
    await db.insert(complaints).values({
      id: complaintId,
      buildingId,
      residentId,
      category: 'electrical',
      urgency: 'high',
      status: 'open',
      priority: 1,
    })
    await db.insert(schema.messages).values({
      id: messageId,
      complaintId,
      buildingId,
      residentId,
      content: 'הדלת תקועה',
      source: 'whatsapp',
      sentAt: new Date(),
    })

    const [msg] = await db.select().from(schema.messages).where(eq(schema.messages.id, messageId))
    expect(msg.source).toBe('whatsapp')
    expect(msg.content).toBe('הדלת תקועה')
  })

  it('links a duplicate complaint via dedupeTargetId', async () => {
    const companyId = crypto.randomUUID()
    const buildingId = crypto.randomUUID()
    const parentId = crypto.randomUUID()
    const dupId = crypto.randomUUID()

    await db.insert(managementCompanies).values({ id: companyId, name: 'Dedupe Co' })
    await db.insert(buildings).values({
      id: buildingId,
      name: 'Dedupe Bldg',
      address: '4 Dedupe St',
      managementCompanyId: companyId,
    })
    await db.insert(complaints).values({
      id: parentId,
      buildingId,
      category: 'plumbing',
      urgency: 'low',
      status: 'open',
      priority: 0,
    })
    await db.insert(complaints).values({
      id: dupId,
      buildingId,
      category: 'plumbing',
      urgency: 'low',
      status: 'open',
      priority: 0,
      dedupeTargetId: parentId,
    })

    const [dup] = await db.select().from(complaints).where(eq(complaints.id, dupId))
    expect(dup.dedupeTargetId).toBe(parentId)
  })
})

describe('lib/db/index canonical export', () => {
  it('exports a db instance with schema attached', () => {
    expect(indexDb).toBeDefined()
    expect(indexDb.query).toBeDefined()
    expect(indexDb.query.managementCompanies).toBeDefined()
    expect(indexDb.query.buildings).toBeDefined()
    expect(indexDb.query.residents).toBeDefined()
    expect(indexDb.query.complaints).toBeDefined()
    expect(indexDb.query.messages).toBeDefined()
  })
})
