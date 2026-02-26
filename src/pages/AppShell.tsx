import { Outlet } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import logo from "@/assets/whoisthat-logo-rno-bg.png";

export default function AppShell() {
  const { logout } = useAuth();

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="border-b bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img
              src={logo}
              alt="WhoIsThat Logo"
              className="h-8 w-8 rounded-full"
            />
            <span className="font-semibold">WhoIsThat</span>
          </div>
          <button
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
