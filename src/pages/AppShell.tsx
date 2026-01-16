import { Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export default function AppShell() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="font-semibold">WhoIsThat</div>
          <button
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
