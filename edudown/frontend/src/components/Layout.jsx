import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

const ROL_LABELS = {
  admin_institucion: 'Admin Institución',
  admin_sede: 'Admin Sede',
  enfermera: 'Enfermera de Box',
  medico_kinesiologo: 'Médico Kinesiólogo',
  medico_fonoaudiologo: 'Médico Fonoaudiólogo',
  auxiliar_limpieza: 'Auxiliar de Limpieza',
  jefe_auxiliares: 'Jefe de Auxiliares',
}

const IconMap = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
)
const IconUsers = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const IconCalendar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)
const IconBell = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)
const IconChart = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)
const IconLogout = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)
const IconMenu = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <IconChart />, roles: ['admin_institucion'] },
  { path: '/mapa', label: 'Mapa de Boxes', icon: <IconMap />, roles: ['enfermera', 'medico_kinesiologo', 'medico_fonoaudiologo', 'admin_sede', 'auxiliar_limpieza', 'jefe_auxiliares', 'admin_institucion'] },
  { path: '/pacientes', label: 'Pacientes', icon: <IconUsers />, roles: ['enfermera', 'medico_kinesiologo', 'medico_fonoaudiologo', 'admin_sede', 'admin_institucion'] },
  { path: '/sesiones', label: 'Sesiones', icon: <IconCalendar />, roles: ['enfermera', 'medico_kinesiologo', 'medico_fonoaudiologo', 'admin_sede'] },
  { path: '/notificaciones', label: 'Notificaciones', icon: <IconBell />, roles: ['auxiliar_limpieza', 'jefe_auxiliares', 'enfermera', 'admin_sede'] },
]

export default function Layout({ user, onLogout, children }) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter(item => item.roles.includes(user.rol))
  const initials = user.nombre?.split(' ').map(n => n[0]).slice(0, 2).join('') || '?'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-56 bg-white border-r border-gray-100 flex flex-col
        transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-gray-100 shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shrink-0">
            <span className="text-white text-[11px] font-bold tracking-tight">ED</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">EduDown</p>
            <p className="text-[10px] text-gray-400 leading-tight">Agendamiento</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {visibleItems.map(item => {
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className={active ? 'text-blue-600' : 'text-gray-400'}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-blue-700 text-[11px] font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.nombre}</p>
              <p className="text-[10px] text-gray-400 truncate leading-tight">{ROL_LABELS[user.rol] || user.rol}</p>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors shrink-0"
            >
              <IconLogout />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-56">
        {/* Mobile topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 p-1 rounded transition-colors"
          >
            <IconMenu />
          </button>
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">ED</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">EduDown</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
