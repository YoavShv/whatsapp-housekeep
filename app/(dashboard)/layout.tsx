import Link from 'next/link'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-4 border-b bg-white px-6 py-3">
        <span className="text-lg font-bold">ניהול תלונות</span>
        <Link href="/complaints" className="text-blue-600 hover:underline">
          כל התלונות הפתוחות
        </Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
