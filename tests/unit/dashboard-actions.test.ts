import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.mock is hoisted above the imports below, so the action's deps resolve to these mocks.
vi.mock('@/lib/db/index', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { resolveComplaint } from '../../lib/dashboard/actions'
import { db } from '@/lib/db/index'
import { revalidatePath } from 'next/cache'

function formDataWith(id: string | null): FormData {
  const fd = new FormData()
  if (id !== null) fd.append('id', id)
  return fd
}

describe('resolveComplaint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(db.update as any).mockImplementation(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    }))
  })

  it('updates the complaint to resolved with a resolvedAt timestamp', async () => {
    await resolveComplaint(formDataWith('cmp-1'))

    expect(db.update).toHaveBeenCalledTimes(1)
    const setMock = (db.update as any).mock.results[0].value.set
    expect(setMock).toHaveBeenCalledTimes(1)
    const setArg = setMock.mock.calls[0][0]
    expect(setArg.status).toBe('resolved')
    expect(setArg.resolvedAt).toBeInstanceOf(Date)
  })

  it('revalidates both the list and detail paths', async () => {
    await resolveComplaint(formDataWith('cmp-1'))

    expect(revalidatePath).toHaveBeenCalledWith('/complaints')
    expect(revalidatePath).toHaveBeenCalledWith('/complaints/cmp-1')
  })

  it('is a no-op when id is missing', async () => {
    await resolveComplaint(formDataWith(null))

    expect(db.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
