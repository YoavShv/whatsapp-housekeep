import { eq, desc, asc, and } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { complaints, messages, buildings } from '@/lib/db/schema'

export async function getOpenComplaints() {
  return db.query.complaints.findMany({
    where: eq(complaints.status, 'open'),
    orderBy: [desc(complaints.openedAt)],
    with: { building: true },
    limit: 200,
  })
}

export type ComplaintRow = Awaited<ReturnType<typeof getOpenComplaints>>[number]

export async function getBuildingComplaints(buildingId: string) {
  return db.query.complaints.findMany({
    where: and(eq(complaints.buildingId, buildingId), eq(complaints.status, 'open')),
    orderBy: [desc(complaints.openedAt)],
    with: { building: true },
    limit: 200,
  })
}

export async function getBuildingById(id: string) {
  return db.query.buildings.findFirst({ where: eq(buildings.id, id) })
}

export async function getComplaintDetail(id: string) {
  return db.query.complaints.findFirst({
    where: eq(complaints.id, id),
    with: {
      messages: { orderBy: [asc(messages.sentAt)] },
      building: true,
    },
  })
}
