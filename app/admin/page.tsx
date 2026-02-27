import { Suspense } from "react"
import { AdminClient } from "@/components/admin/AdminClient"

export const metadata = {
  title: "Admin Dashboard | BASEBLOX",
  description: "Admin tools for BASEBLOX",
}

export default function AdminPage() {
  return (
    <main className="min-h-screen pt-16">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <AdminClient />
      </Suspense>
    </main>
  )
}
