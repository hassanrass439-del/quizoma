import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d0d1a]">
      <AdminSidebar />
      <div className="ml-[240px]">
        <AdminHeader />
        <main className="p-8 max-w-[1200px]">
          {children}
        </main>
      </div>
    </div>
  )
}
