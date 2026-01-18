import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'

export default function AppShell() {
  const { logout } = useAuth()

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="font-semibold">WhoIsThat</div>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'}`
              }
              end
            >
              Tree
            </NavLink>
            <NavLink
              to="/relations"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent'}`
              }
            >
              Relations
            </NavLink>
          </nav>
          <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="sm:hidden px-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `text-center rounded-md px-3 py-2 text-sm border ${isActive ? 'bg-accent' : 'hover:bg-accent'}`
              }
              end
            >
              Tree
            </NavLink>
            <NavLink
              to="/relations"
              className={({ isActive }) =>
                `text-center rounded-md px-3 py-2 text-sm border ${isActive ? 'bg-accent' : 'hover:bg-accent'}`
              }
            >
              Relations
            </NavLink>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  )
}
