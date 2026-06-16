import { getBuildingComplaints } from '@/lib/dashboard/queries'
import { ComplaintsTable } from '../../_components/ComplaintsTable'

export default async function BuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const rows = await getBuildingComplaints(id)
  const buildingName = rows[0]?.building?.name

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">
        תלונות פתוחות{buildingName ? ` — ${buildingName}` : ''}
      </h1>
      <ComplaintsTable rows={rows} />
    </div>
  )
}
