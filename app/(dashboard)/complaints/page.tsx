import { getOpenComplaints } from '@/lib/dashboard/queries'
import { ComplaintsTable } from '../_components/ComplaintsTable'

export default async function ComplaintsPage() {
  const rows = await getOpenComplaints()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">תלונות פתוחות</h1>
      <ComplaintsTable rows={rows} />
    </div>
  )
}
