'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/index'
import { complaints } from '@/lib/db/schema'

export async function resolveComplaint(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  const buildingId = formData.get('buildingId') as string
  if (!id) return
  try {
    await db
      .update(complaints)
      .set({ status: 'resolved', resolvedAt: new Date() })
      .where(eq(complaints.id, id))
    revalidatePath('/complaints')
    revalidatePath(`/complaints/${id}`)
    if (buildingId) revalidatePath(`/buildings/${buildingId}`)
  } catch (err) {
    console.error('[resolveComplaint] DB update failed', {
      complaintId: id,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}
