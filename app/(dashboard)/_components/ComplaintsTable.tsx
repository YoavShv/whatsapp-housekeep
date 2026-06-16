import Link from 'next/link'
import type { Complaint, Building } from '@/lib/db/schema'
import { categoryLabel, urgencyLabel } from '@/lib/dashboard/helpers'

type ComplaintRow = Complaint & { building: Building | null }

export function ComplaintsTable({ rows }: { rows: ComplaintRow[] }) {
  if (rows.length === 0) {
    return <p className="text-gray-500">אין תלונות פתוחות.</p>
  }

  return (
    <table className="w-full border-collapse text-right">
      <thead>
        <tr className="border-b text-sm text-gray-600">
          <th className="px-3 py-2 font-medium">בניין</th>
          <th className="px-3 py-2 font-medium">כותרת</th>
          <th className="px-3 py-2 font-medium">קטגוריה</th>
          <th className="px-3 py-2 font-medium">דחיפות</th>
          <th className="px-3 py-2 font-medium">נפתחה</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b hover:bg-gray-50">
            <td className="px-3 py-2">{row.building?.name ?? '—'}</td>
            <td className="px-3 py-2">
              <Link href={`/complaints/${row.id}`} className="text-blue-600 hover:underline">
                {row.title ?? '(ללא כותרת)'}
              </Link>
            </td>
            <td className="px-3 py-2">{categoryLabel(row.category)}</td>
            <td className="px-3 py-2">{urgencyLabel(row.urgency)}</td>
            <td className="px-3 py-2">{row.openedAt.toLocaleDateString('he-IL')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
