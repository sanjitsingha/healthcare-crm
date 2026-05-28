import Sidebar from '@/components/crm/Sidebar'

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 md:ml-[220px] min-w-0">
        {children}
      </main>
    </div>
  )
}
