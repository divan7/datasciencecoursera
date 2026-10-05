import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  ListChecks,
  TrendingUp,
  ClipboardCheck,
  User,
  Smile,
  Sun,
  Moon,
} from 'lucide-react'
import { APP_VERSION } from '../../version'

const navItems = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { to: '/program', label: 'Plan', icon: ListChecks },
  { to: '/checkin', label: 'Check-in', icon: ClipboardCheck },
  { to: '/progress', label: 'Progreso', icon: TrendingUp },
  { to: '/facial', label: 'Facial', icon: Smile },
  { to: '/profile', label: 'Perfil', icon: User },
]

export default function Layout() {
  const location = useLocation()
  const isWorkout = location.pathname.startsWith('/workout')

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = typeof localStorage !== 'undefined'
      ? (localStorage.getItem('pof-theme') as 'dark' | 'light' | null)
      : null
    const t = saved ?? 'dark'
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = t
    }
    return t
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('pof-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Top header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell size={20} className="text-cyan-400" />
            <span className="font-bold text-white tracking-tight">Ponte en Forma</span>
            <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">v{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-cyan-400/50 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark'
                ? <Sun size={14} className="text-zinc-400" />
                : <Moon size={14} className="text-zinc-400" />}
            </button>
            <NavLink
              to="/profile"
              className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:border-cyan-400/50 transition-colors"
            >
              <User size={14} className="text-zinc-400" />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav (hidden during workout) */}
      {!isWorkout && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-1 h-16 flex items-center justify-around">
            {navItems.map(({ to, label, icon: Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`
                }
              >
                <Icon size={19} />
                <span className="text-[10px] font-medium">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
