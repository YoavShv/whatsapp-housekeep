import { notFound } from 'next/navigation'
import { getComplaintDetail } from '@/lib/dashboard/queries'
import { resolveComplaint } from '@/lib/dashboard/actions'
import { categoryLabel, urgencyLabel } from '@/lib/dashboard/helpers'

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const complaint = await getComplaintDetail(id)

  if (!complaint) notFound()

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">{complaint.title ?? '(ללא כותרת)'}</h1>
      <p className="mb-4 text-gray-600">{complaint.building?.name}</p>

      <dl className="mb-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="font-medium text-gray-600">קטגוריה</dt>
        <dd>{categoryLabel(complaint.category)}</dd>
        <dt className="font-medium text-gray-600">דחיפות</dt>
        <dd>{urgencyLabel(complaint.urgency)}</dd>
        <dt className="font-medium text-gray-600">סטטוס</dt>
        <dd>{complaint.status === 'open' ? 'פתוחה' : 'נסגרה'}</dd>
      </dl>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-bold">הודעות</h2>
        {complaint.messages.length === 0 ? (
          <p className="text-gray-500">אין הודעות.</p>
        ) : (
          <ul className="space-y-2">
            {complaint.messages.map((message) => (
              <li key={message.id} className="rounded border bg-white p-3">
                <p>{message.content}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {message.sentAt.toLocaleString('he-IL')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {complaint.status === 'open' && (
        <form action={resolveComplaint}>
          <input type="hidden" name="id" value={complaint.id} />
          <input type="hidden" name="buildingId" value={complaint.buildingId} />
          <button
            type="submit"
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            סמן כנפתר
          </button>
        </form>
      )}
    </div>
  )
}
