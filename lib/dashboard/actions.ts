'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/index'
import { complaints } from '@/lib/db/schema'

export async function resolveComplaint(formData: FormData): Promise<void> {
  const id = formData.get('id') as string
  if (!id) return
  await db
    .update(complaints)
    .set({ status: 'resolved', resolvedAt: new Date() })
    .where(eq(complaints.id, id))
  revalidatePath('/complaints')
  revalidatePath(`/complaints/${id}`)
}
