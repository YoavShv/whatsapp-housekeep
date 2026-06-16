import { eq, desc, asc } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { complaints, messages } from '@/lib/db/schema'

export async function getOpenComplaints() {
  return db.query.complaints.findMany({
    where: eq(complaints.status, 'open'),
    orderBy: [desc(complaints.openedAt)],
    with: { building: true },
    limit: 200,
  })
}

export async function getBuildingComplaints(buildingId: string) {
  return db.query.complaints.findMany({
    where: (c, { and, eq }) => and(eq(c.buildingId, buildingId), eq(c.status, 'open')),
    orderBy: [desc(complaints.openedAt)],
    with: { building: true },
    limit: 200,
  })
}

export async function getComplaintDetail(id: string) {
  return db.query.complaints.findFirst({
    where: eq(complaints.id, id),
    with: {
      messages: { orderBy: [asc(messages.sentAt)] },
      building: true,
      resident: true,
    },
  })
}
