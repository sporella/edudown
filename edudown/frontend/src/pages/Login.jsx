import { useState } from 'react'
import axios from 'axios'

const DEMO_USERS = [
  { email: 'admin@edudown.cl', password: 'admin123', label: 'Admin Institución' },
  { email: 'enfermera@edudown.cl', password: 'enf123', label: 'Enfermera de Box' },
  { email: 'kine@edudown.cl', password: 'kine123', label: 'Médico Kinesiólogo' },
  { email: 'fono@edudown.cl', password: 'fono123', label: 'Médico Fonoaudiólogo' },
  { email: 'auxiliar@edudown.cl', password: 'aux123', label: 'Auxiliar de Limpieza' },
]

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      onLogin(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (u) => {
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', { email: u.email, password: u.password })
      onLogin(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-96 bg-blue-600 flex-col justify-between p-10 shrink-0">
        <div>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-10">
            <span className="text-white font-bold text-sm tracking-tight">ED</span>
          </div>
          <h1 className="text-white text-3xl font-bold mb-3 leading-tight">EduDown</h1>
          <p className="text-blue-200 text-sm leading-relaxed">
            Sistema de Agendamiento de Box de Atención para personas con síndrome de Down.
          </p>
        </div>
        <div className="space-y-3">
          {[
            '4 sedes — Providencia, San Bernardo, Temuco, La Serena',
            '48 boxes totales — 12 por sede',
            'Mapa en tiempo real con WebSocket',
            'Sugerencias con IA (human-in-the-loop)',
          ].map(text => (
            <div key={text} className="flex items-start gap-2.5">
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center mt-0.5 shrink-0">
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-blue-100 text-xs leading-snug">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">ED</span>
            </div>
            <span className="font-bold text-gray-900">EduDown</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Iniciar sesión</h2>
            <p className="text-sm text-gray-500">Accede a tu cuenta EduDown</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="correo@edudown.cl"
                required
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-50 px-3 text-xs text-gray-400 font-medium">Acceso rápido por rol</span>
              </div>
            </div>
            <div className="space-y-2">
              {DEMO_USERS.map(u => (
                <button
                  key={u.email}
                  onClick={() => quickLogin(u)}
                  disabled={loading}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-gray-700">{u.label}</span>
                  <span className="text-xs text-gray-400 group-hover:text-gray-500 font-mono">{u.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
