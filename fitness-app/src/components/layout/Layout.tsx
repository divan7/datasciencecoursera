import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  ListChecks,
  TrendingUp,
  ClipboardCheck,
  User,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { to: '/program', label: 'Programa', icon: ListChecks },
  { to: '/checkin', label: 'Check-in', icon: ClipboardCheck },
  { to: '/progress', label: 'Progreso', icon: TrendingUp },
  { to: '/profile', label: 'Perfil', icon: User },
]

export default function Layout() {
  const location = useLocation()
  const isWorkout = location.pathname.startsWith('/workout')

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Top header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell size={20} className="text-cyan-400" />
            <span className="font-bold text-white tracking-tight">FitProgress</span>
          </div>
          <NavLink
            to="/profile"
            className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-cyan-400/50 transition-colors"
          >
            <User size={14} className="text-zinc-400" />
          </NavLink>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav (hidden during workout) */}
      {!isWorkout && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-2 h-16 flex items-center justify-around">
            {navItems.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-colors ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`
                }
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
