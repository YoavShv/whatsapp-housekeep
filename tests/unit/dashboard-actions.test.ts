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

function formDataWith(id: string | null, buildingId?: string): FormData {
  const fd = new FormData()
  if (id !== null) fd.append('id', id)
  if (buildingId) fd.append('buildingId', buildingId)
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

  it('applies WHERE filter to the correct complaint id', async () => {
    await resolveComplaint(formDataWith('cmp-42'))

    const setMock = (db.update as any).mock.results[0].value.set
    const whereMock = setMock.mock.results[0].value.where
    expect(whereMock).toHaveBeenCalledTimes(1)
  })

  it('revalidates both the list and detail paths', async () => {
    await resolveComplaint(formDataWith('cmp-1'))

    expect(revalidatePath).toHaveBeenCalledWith('/complaints')
    expect(revalidatePath).toHaveBeenCalledWith('/complaints/cmp-1')
  })

  it('also revalidates the building path when buildingId is provided', async () => {
    await resolveComplaint(formDataWith('cmp-1', 'bld-99'))

    expect(revalidatePath).toHaveBeenCalledWith('/buildings/bld-99')
  })

  it('does not revalidate building path when buildingId is absent', async () => {
    await resolveComplaint(formDataWith('cmp-1'))

    const calls = (revalidatePath as any).mock.calls.map((c: string[]) => c[0])
    expect(calls.some((p: string) => p.startsWith('/buildings/'))).toBe(false)
  })

  it('is a no-op when id is missing', async () => {
    await resolveComplaint(formDataWith(null))

    expect(db.update).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('logs and rethrows when the DB update fails', async () => {
    const dbError = new Error('DB connection refused')
    ;(db.update as any).mockImplementation(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockRejectedValue(dbError),
      })),
    }))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(resolveComplaint(formDataWith('cmp-1'))).rejects.toThrow('DB connection refused')
    expect(consoleSpy).toHaveBeenCalledWith(
      '[resolveComplaint] DB update failed',
      expect.objectContaining({ complaintId: 'cmp-1' }),
    )

    consoleSpy.mockRestore()
  })
})
