import { notFound } from 'next/navigation'
import { getBuildingById, getBuildingComplaints } from '@/lib/dashboard/queries'
import { ComplaintsTable } from '../../_components/ComplaintsTable'

export default async function BuildingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const building = await getBuildingById(id)
  if (!building) notFound()
  const rows = await getBuildingComplaints(id)

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">תלונות פתוחות — {building.name}</h1>
      <ComplaintsTable rows={rows} />
    </div>
  )
}
