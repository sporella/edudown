import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import CerrarSesionModal from '../components/CerrarSesionModal'
import AgendarModal from '../components/AgendarModal'

const STATUS_CONFIG = {
  planificada: { label: 'Planificada', color: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  en_curso:    { label: 'En curso',    color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  terminada:   { label: 'Terminada',   color: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
  suspendida:  { label: 'Suspendida',  color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  extendida:   { label: 'Extendida',   color: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
}

function formatFecha(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function isToday(isoDate) {
  return isoDate === new Date().toISOString().split('T')[0]
}

export default function Sesiones({ user }) {
  const today = new Date().toISOString().split('T')[0]

  const [sesiones, setSesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [cerrarSesion, setCerrarSesion] = useState(null)
  const [agendarModal, setAgendarModal] = useState(false)
  const [filtro, setFiltro] = useState('todas')
  const [fecha, setFecha] = useState(today)

  const sedeId = user.sede_id || 1

  const fetchSesiones = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ sede_id: sedeId, fecha })
      const res = await axios.get(`/api/sesiones/hoy?${params}`)
      setSesiones(res.data)
    } catch {}
    setLoading(false)
  }, [sedeId, fecha])

  useEffect(() => {
    fetchSesiones()
    // Solo auto-refresh cuando es hoy
    if (isToday(fecha)) {
      const interval = setInterval(fetchSesiones, 10000)
      return () => clearInterval(interval)
    }
  }, [fetchSesiones, fecha])

  const reagendadas = sesiones.filter(s => s.reagendada_por_urgencia)
  const sesionesFiltered = sesiones.filter(s => {
    if (filtro === 'reagendadas') return s.reagendada_por_urgencia
    return filtro === 'todas' || s.estado === filtro
  })
  const canClose = ['enfermera', 'medico_kinesiologo', 'medico_fonoaudiologo', 'admin_sede'].includes(user.rol)
  const canSchedule = ['enfermera', 'admin_sede'].includes(user.rol)

  const goDay = (offset) => {
    const d = new Date(fecha + 'T00:00:00')
    d.setDate(d.getDate() + offset)
    setFecha(d.toISOString().split('T')[0])
    setFiltro('todas')
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Agenda de Sesiones</h1>
          <p className="text-sm text-gray-400 mt-0.5 capitalize">{formatFecha(fecha)}</p>
        </div>
        {canSchedule && (
          <button onClick={() => setAgendarModal(true)} className="btn-primary shrink-0">
            + Nueva sesión
          </button>
        )}
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => goDay(-1)} className="btn-secondary px-2.5 py-1.5" title="Día anterior">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <input
          type="date"
          value={fecha}
          onChange={e => { setFecha(e.target.value); setFiltro('todas') }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <button onClick={() => goDay(1)} className="btn-secondary px-2.5 py-1.5" title="Día siguiente">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {!isToday(fecha) && (
          <button
            onClick={() => { setFecha(today); setFiltro('todas') }}
            className="text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors px-2 py-1.5 rounded-lg hover:bg-blue-50"
          >
            Ir a hoy
          </button>
        )}

        {isToday(fecha) && (
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
            Hoy
          </span>
        )}

        <button
          onClick={fetchSesiones}
          className="ml-auto btn-secondary px-2.5 py-1.5 text-xs"
          title="Actualizar"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Urgency rescheduling announcement */}
      {reagendadas.length > 0 && isToday(fecha) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-sm font-semibold text-amber-800">
              {reagendadas.length === 1
                ? '1 cita fue reagendada por urgencia'
                : `${reagendadas.length} citas fueron reagendadas por urgencia`}
            </p>
          </div>
          <ul className="space-y-1.5 pl-6">
            {reagendadas.map(s => (
              <li key={s.id} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>
                  <strong>{s.paciente}</strong> — nuevo horario{' '}
                  <strong>{s.hora_inicio}</strong>
                  {s.hora_fin ? `–${s.hora_fin}` : ''}, Box {s.box_numero}{' '}
                  <span className="text-amber-600">({s.profesional})</span>
                  {s.estado === 'suspendida' && (
                    <span className="ml-1.5 text-red-600 font-medium">· Suspendida — sin disponibilidad alternativa</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-600 pl-6">Contactar a los pacientes para confirmar el cambio de horario.</p>
        </div>
      )}

      {/* Filtros de estado */}
      <div className="flex flex-wrap gap-2">
        {['todas', 'planificada', 'en_curso', 'terminada', 'suspendida', 'extendida'].map(f => {
          const config = STATUS_CONFIG[f]
          const count = f === 'todas' ? sesiones.length : sesiones.filter(s => s.estado === f).length
          return (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtro === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {config && filtro !== f && (
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
              )}
              {f === 'todas' ? 'Todas' : config?.label} ({count})
            </button>
          )
        })}
        {reagendadas.length > 0 && (
          <button
            onClick={() => setFiltro('reagendadas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filtro === 'reagendadas'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Reagendadas ({reagendadas.length})
          </button>
        )}
      </div>

      {/* Sessions list */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando sesiones...</div>
      ) : sesionesFiltered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {sesiones.length === 0
              ? `Sin sesiones para el ${formatFecha(fecha)}`
              : 'No hay sesiones con este filtro'}
          </p>
          {sesiones.length === 0 && canSchedule && (
            <button onClick={() => setAgendarModal(true)} className="btn-primary mt-4 text-xs">
              + Agendar sesión para este día
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {sesionesFiltered.map(s => {
            const config = STATUS_CONFIG[s.estado] || STATUS_CONFIG.planificada
            return (
              <div key={s.id} className={`bg-white border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
                s.reagendada_por_urgencia ? 'border-amber-200 border-l-4 border-l-amber-400' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-4 min-w-0">
                  {/* Time */}
                  <div className="text-center shrink-0 w-14">
                    <p className="text-sm font-bold text-gray-800">{s.hora_inicio}</p>
                    <p className="text-[11px] text-gray-400">{s.hora_fin}</p>
                  </div>
                  {/* Divider */}
                  <div className="w-px h-8 bg-gray-100 shrink-0" />
                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-800 text-sm truncate">{s.paciente}</span>
                      {s.es_urgencia && (
                        <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium border border-red-100">
                          Urgencia
                        </span>
                      )}
                      {s.reagendada_por_urgencia && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium border border-amber-200 flex items-center gap-1">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          Reagendada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{s.profesional}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-400">
                      <span>Box {s.box_numero}</span>
                      <span>·</span>
                      <span>{s.box_tipo === 'kinesiologia' ? 'Kinesiología' : 'Fonoaudiología'}</span>
                      <span>·</span>
                      <span>{s.sede_nombre}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${config.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
                    {config.label}
                  </span>
                  {canClose && isToday(fecha) && (s.estado === 'planificada' || s.estado === 'en_curso') && (
                    <button
                      onClick={() => setCerrarSesion(s)}
                      className="text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {cerrarSesion && (
        <CerrarSesionModal sesion={cerrarSesion} onClose={() => setCerrarSesion(null)} onSuccess={() => { setCerrarSesion(null); fetchSesiones() }} />
      )}
      {agendarModal && (
        <AgendarModal
          box={null}
          sedeId={sedeId}
          onClose={() => setAgendarModal(false)}
          onSuccess={() => { setAgendarModal(false); fetchSesiones() }}
        />
      )}
    </div>
  )
}
