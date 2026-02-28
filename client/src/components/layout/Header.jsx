import { useEffect, useMemo, useState } from 'react'
import { Bell, ChevronDown, Menu, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/auth'

export default function Header({ title, breadcrumb, unreadCount = 0, onMenuToggle, recentAlerts = [] }) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [clock, setClock] = useState(() => new Date())
  const [showAlerts, setShowAlerts] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setClock(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const initials = useMemo(
    () =>
      (user?.name || 'Mission User')
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(''),
    [user?.name]
  )

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-brand-cyan/20 bg-[#060f20]/90 backdrop-blur-xl md:left-[260px]">
      <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg border border-brand-cyan/30 p-2 text-brand-cyan md:hidden"
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0">
            <p className="truncate font-orbitron text-lg text-brand-cyan">{title}</p>
            <p className="truncate text-xs text-slate-400">{breadcrumb}</p>
          </div>
        </div>

        <div className="hidden w-full max-w-xl items-center gap-2 rounded-xl border border-brand-cyan/20 bg-dark-surface/70 px-3 py-2 md:flex">
          <Search size={16} className="text-brand-cyan" />
          <input
            type="text"
            readOnly
            value=""
            placeholder="Search slots, zones, drivers..."
            className="w-full bg-transparent text-sm text-slate-300 placeholder:text-slate-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            type="button"
            className="hidden items-center gap-1 rounded-lg border border-brand-cyan/25 bg-brand-cyan/5 px-2.5 py-1.5 text-xs text-slate-200 md:flex"
          >
            <span>📍 Mumbai, Maharashtra</span>
            <ChevronDown size={14} className="text-brand-cyan" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowAlerts((v) => !v)
                setShowUserMenu(false)
              }}
              className="relative rounded-lg border border-brand-cyan/20 bg-dark-surface/80 p-2 text-slate-200 transition hover:text-brand-cyan"
            >
              <Bell size={18} />
              <span className="absolute -right-1 -top-1 rounded-full bg-brand-red px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            </button>

            {showAlerts ? (
              <div className="glass-card absolute right-0 mt-2 w-72 border border-brand-cyan/20 p-3">
                <p className="mb-2 text-sm font-semibold text-brand-cyan">Recent Alerts</p>
                <div className="space-y-2">
                  {recentAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="rounded-lg border border-dark-border bg-dark-surface/70 px-2.5 py-2">
                      <p className="text-xs font-medium text-white">{alert.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{alert.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowUserMenu((v) => !v)
                setShowAlerts(false)
              }}
              className="flex items-center gap-2 rounded-lg border border-brand-cyan/20 bg-dark-surface/80 px-2 py-1.5"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-cyan to-brand-violet font-mono text-[11px] font-bold text-dark-base">
                {initials || 'SP'}
              </span>
              <ChevronDown size={14} className="hidden text-brand-cyan md:block" />
            </button>

            {showUserMenu ? (
              <div className="glass-card absolute right-0 mt-2 w-40 border border-brand-cyan/20 py-1.5 text-sm">
                <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-brand-cyan/10">
                  Profile
                </button>
                <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-brand-cyan/10">
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block w-full px-3 py-1.5 text-left text-brand-red hover:bg-brand-red/10"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>

          <div className="hidden rounded-lg border border-brand-cyan/20 bg-dark-surface/80 px-2.5 py-1.5 font-mono text-sm text-brand-green md:block">
            {clock.toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>
    </header>
  )
}
