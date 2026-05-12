import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { createSocket } from '../socket'

const SEDE_ACCENT = [
  { ring: 'ring-blue-200', bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
  { ring: 'ring-teal-200', bar: 'bg-teal-500', text: 'text-teal-600', bg: 'bg-teal-50' },
  { ring: 'ring-violet-200', bar: 'bg-violet-500', text: 'text-violet-600', bg: 'bg-violet-50' },
  { ring: 'ring-orange-200', bar: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' },
]

function StatCard({ label, value, valueColor = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}

export default function Dashboard({ user }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await axios.get('/api/dashboard/global')
      setData(res.data)
      setLastUpdate(new Date().toLocaleTimeString('es-CL'))
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDashboard()
    const interval = setInterval(fetchDashboard, 15000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  useEffect(() => {
    const socket = createSocket()
    socket.on('connect', () => { setWsConnected(true); socket.emit('join_global', {}) })
    socket.on('disconnect', () => setWsConnected(false))
    socket.on('box_update', () => fetchDashboard())
    socket.on('session_scheduled', () => fetchDashboard())
    socket.on('session_closed', () => fetchDashboard())
    return () => socket.disconnect()
  }, [fetchDashboard])

  if (loading) return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Cargando dashboard...</div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-48 text-red-400 text-sm">Error cargando datos</div>
  )

  const { sedes, totales } = data

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard Global</h1>
          <p className="text-sm text-gray-400 mt-0.5">{sedes.length} sedes · {data.fecha}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {import.meta.env.VITE_DEMO_MODE === 'true' ? (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium bg-gray-100 text-gray-500">
              Modo demo
            </span>
          ) : (
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium ${
              wsConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 pulse-badge' : 'bg-red-500'}`} />
              {wsConnected ? 'En vivo' : 'Sin conexión'}
            </span>
          )}
          <button onClick={fetchDashboard} className="btn-secondary text-xs py-1.5 px-3">
            Actualizar
          </button>
        </div>
      </div>

      {lastUpdate && (
        <p className="text-xs text-gray-400 -mt-4">Última actualización: {lastUpdate}</p>
      )}

      {/* Global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Salas terapéuticas" value={totales.total_boxes} />
        <StatCard label="Disponibles" value={totales.disponibles} valueColor="text-emerald-600" />
        <StatCard label="Ocupados" value={totales.ocupados} valueColor="text-red-600" />
        <StatCard label="Sesiones hoy" value={totales.sesiones_hoy} valueColor="text-blue-600" />
      </div>

      {/* Occupancy bars */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Ocupación por sede</h2>
        <div className="space-y-4">
          {sedes.map((sede, idx) => {
            const accent = SEDE_ACCENT[idx % SEDE_ACCENT.length]
            const pct = sede.tasa_ocupacion
            return (
              <div key={sede.sede_id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700">{sede.sede_nombre}</span>
                  <span className={`text-sm font-semibold ${
                    pct > 70 ? 'text-red-600' : pct > 40 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sede cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sedes.map((sede, idx) => {
          const accent = SEDE_ACCENT[idx % SEDE_ACCENT.length]
          return (
            <div key={sede.sede_id} className={`bg-white rounded-xl border border-gray-200 ring-1 ${accent.ring} p-5`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{sede.sede_nombre}</h3>
                  <p className="text-xs text-gray-400">{sede.ciudad}</p>
                </div>
                <span className={`text-lg font-bold ${
                  sede.tasa_ocupacion > 70 ? 'text-red-600' :
                  sede.tasa_ocupacion > 40 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {sede.tasa_ocupacion}%
                </span>
              </div>

              {/* Box mini grid */}
              <div className="grid grid-cols-6 gap-1 mb-4">
                {Array.from({ length: sede.total_boxes }, (_, i) => {
                  const isOcupado = i < sede.ocupados
                  const isMantencion = !isOcupado && i < sede.ocupados + sede.mantencion
                  const isLimpieza = !isOcupado && !isMantencion && i < sede.ocupados + sede.mantencion + sede.limpieza
                  return (
                    <div
                      key={i}
                      title={`Box ${i + 1}`}
                      className={`h-3 rounded-sm ${
                        isOcupado ? 'bg-red-400' :
                        isMantencion ? 'bg-orange-400' :
                        isLimpieza ? 'bg-amber-400' :
                        'bg-emerald-400'
                      }`}
                    />
                  )
                })}
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { value: sede.disponibles, label: 'Libres', color: 'text-emerald-600' },
                  { value: sede.ocupados, label: 'Ocup.', color: 'text-red-600' },
                  { value: sede.sesiones_hoy, label: 'Hoy', color: 'text-blue-600' },
                  { value: sede.sesiones_completadas, label: 'Listas', color: 'text-gray-600' },
                ].map(({ value, label, color }) => (
                  <div key={label} className="bg-gray-50 rounded-lg py-2">
                    <p className={`text-base font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-gray-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* EIP note */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <p className="text-xs text-indigo-700">
          <strong>Aggregator EIP:</strong> Dashboard consolida las 4 sedes vía{' '}
          <code className="bg-indigo-100 px-1 rounded">/api/dashboard/global</code> con agregación Redis.
          Actualizaciones automáticas por WebSocket.
        </p>
      </div>
    </div>
  )
}
