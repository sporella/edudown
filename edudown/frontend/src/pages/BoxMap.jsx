import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { createSocket } from '../socket'
import BoxCard from '../components/BoxCard'
import AgendarModal from '../components/AgendarModal'
import CerrarSesionModal from '../components/CerrarSesionModal'

const CAN_SCHEDULE = ['enfermera', 'admin_sede']
const CAN_CLOSE = ['enfermera', 'medico_kinesiologo', 'medico_fonoaudiologo', 'admin_sede']

export default function BoxMap({ user }) {
  const [sedes, setSedes] = useState([])
  const [selectedSede, setSelectedSede] = useState(user.sede_id || 1)
  const [boxes, setBoxes] = useState([])
  const [loading, setLoading] = useState(true)
  const [agendarBox, setAgendarBox] = useState(null)
  const [cerrarSesion, setCerrarSesion] = useState(null)
  const [urgenciaModal, setUrgenciaModal] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState(null)
  const [highlightBox, setHighlightBox] = useState(null)

  const fetchBoxes = useCallback(async (sedeId) => {
    try {
      const res = await axios.get(`/api/sedes/${sedeId}/boxes`)
      setBoxes(res.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    axios.get('/api/sedes').then(res => setSedes(res.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchBoxes(selectedSede)
  }, [selectedSede, fetchBoxes])

  useEffect(() => {
    const socket = createSocket()
    socket.on('connect', () => { setWsConnected(true); socket.emit('join_sede', { sede_id: selectedSede }) })
    socket.on('disconnect', () => setWsConnected(false))
    socket.on('box_update', (data) => {
      if (data.sede_id === selectedSede) {
        setLastEvent(data)
        setHighlightBox(data.box_id)
        setTimeout(() => setHighlightBox(null), 3000)
        fetchBoxes(selectedSede)
      }
    })
    return () => socket.disconnect()
  }, [selectedSede, fetchBoxes])

  const stats = {
    disponible: boxes.filter(b => b.estado === 'disponible').length,
    ocupado: boxes.filter(b => b.estado === 'ocupado').length,
    mantencion: boxes.filter(b => b.estado === 'mantencion').length,
    limpieza: boxes.filter(b => b.estado === 'limpieza').length,
  }

  const handleAgendarSuccess = () => { setAgendarBox(null); setUrgenciaModal(false); fetchBoxes(selectedSede) }
  const handleCerrarSuccess = () => { setCerrarSesion(null); fetchBoxes(selectedSede) }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mapa de Boxes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Estado en tiempo real — 12 boxes por sede</p>
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
          {CAN_SCHEDULE.includes(user.rol) && (
            <button onClick={() => setUrgenciaModal(true)} className="btn-danger">
              Urgencia
            </button>
          )}
        </div>
      </div>

      {/* Sede selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-400 mr-1">Sede</span>
        {sedes.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSede(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedSede === s.id
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.nombre}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { key: 'disponible', label: 'Disponibles', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { key: 'ocupado', label: 'Ocupados', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
          { key: 'mantencion', label: 'Mantención', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { key: 'limpieza', label: 'Limpieza', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map(item => (
          <div key={item.key} className={`${item.bg} border ${item.border} rounded-xl p-4 text-center`}>
            <p className={`text-2xl font-bold ${item.color}`}>{stats[item.key]}</p>
            <p className={`text-xs font-medium mt-0.5 ${item.color}`}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Real-time event banner */}
      {lastEvent && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-blue-800">
          <span className="text-blue-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </span>
          <span className="flex-1">
            <strong>Actualización:</strong>{' '}
            {lastEvent.type === 'session_scheduled'
              ? `Box ${lastEvent.box_numero} — nueva sesión para ${lastEvent.paciente}`
              : `Box ${lastEvent.box_numero} — sesión ${lastEvent.estado_final}`
            }
          </span>
          <button onClick={() => setLastEvent(null)} className="text-blue-300 hover:text-blue-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Box grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando boxes...</div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              {sedes.find(s => s.id === selectedSede)?.nombre || `Sede ${selectedSede}`}
            </h2>
            <span className="text-xs text-gray-400">— 12 boxes (60% Kine / 40% Fono)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {boxes.map(box => (
              <BoxCard
                key={box.id}
                box={box}
                onClick={setAgendarBox}
                onClose={setCerrarSesion}
                canSchedule={CAN_SCHEDULE.includes(user.rol)}
                canClose={CAN_CLOSE.includes(user.rol)}
                highlight={highlightBox === box.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {[
          { dot: 'bg-emerald-500', label: 'Disponible' },
          { dot: 'bg-red-500', label: 'Ocupado' },
          { dot: 'bg-orange-500', label: 'Mantención' },
          { dot: 'bg-amber-500', label: 'Limpieza' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${item.dot}`} />
            {item.label}
          </span>
        ))}
        <span className="text-gray-300 text-xs">· WCAG 2.2 — color + texto</span>
      </div>

      {agendarBox && (
        <AgendarModal box={agendarBox} sedeId={selectedSede} onClose={() => setAgendarBox(null)} onSuccess={handleAgendarSuccess} />
      )}
      {urgenciaModal && (
        <AgendarModal box={null} sedeId={selectedSede} onClose={() => setUrgenciaModal(false)} onSuccess={handleAgendarSuccess} isUrgencia={true} />
      )}
      {cerrarSesion && (
        <CerrarSesionModal sesion={cerrarSesion} onClose={() => setCerrarSesion(null)} onSuccess={handleCerrarSuccess} />
      )}
    </div>
  )
}
