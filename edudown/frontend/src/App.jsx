import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import BoxMap from './pages/BoxMap'
import Dashboard from './pages/Dashboard'
import Sesiones from './pages/Sesiones'
import Notificaciones from './pages/Notificaciones'
import Pacientes from './pages/Pacientes'
import Layout from './components/Layout'

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('edudown_user')
    return saved ? JSON.parse(saved) : null
  })

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('edudown_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('edudown_user')
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <HashRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={
            user.rol === 'admin_institucion'
              ? <Navigate to="/dashboard" replace />
              : <Navigate to="/mapa" replace />
          } />
          <Route path="/mapa" element={<BoxMap user={user} />} />
          <Route path="/sesiones" element={<Sesiones user={user} />} />
          <Route path="/notificaciones" element={<Notificaciones user={user} />} />
          <Route path="/pacientes" element={<Pacientes user={user} />} />
          {user.rol === 'admin_institucion' && (
            <Route path="/dashboard" element={<Dashboard user={user} />} />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}
