import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import AgendarModal from '../components/AgendarModal'

const ETAPA_CONFIG = {
  bebes_sin_marcha: {
    label: 'Bebés sin marcha',
    color: 'bg-pink-50 text-pink-700 border-pink-100',
    dot: 'bg-pink-400',
  },
  preescolar_escolar: {
    label: 'Preescolar / Escolar',
    color: 'bg-blue-50 text-blue-700 border-blue-100',
    dot: 'bg-blue-400',
  },
  transicion_vida_adulta: {
    label: 'Transición adulta',
    color: 'bg-violet-50 text-violet-700 border-violet-100',
    dot: 'bg-violet-400',
  },
}

function calcEdad(fechaNacimiento) {
  const hoy = new Date()
  const nac = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--
  if (edad < 2) {
    const meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth())
    return `${meses} meses`
  }
  return `${edad} años`
}

function TratamientoChip({ tipo, frecuencia }) {
  const isKine = tipo === 'kine'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border ${
      isKine ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
    }`}>
      {isKine ? 'Kine' : 'Fono'}
      {frecuencia > 0 && <span className="opacity-60">{frecuencia}×/sem</span>}
    </span>
  )
}

function HistorialModal({ paciente, onClose, onAgendar }) {
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`/api/pacientes/${paciente.id}/historial`)
      .then(res => { setHistorial(res.data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [paciente.id])

  const STATUS = {
    planificada: { label: 'Planificada', color: 'bg-blue-50 text-blue-700' },
    en_curso:    { label: 'En curso',    color: 'bg-emerald-50 text-emerald-700' },
    terminada:   { label: 'Terminada',   color: 'bg-gray-100 text-gray-500' },
    suspendida:  { label: 'Suspendida',  color: 'bg-amber-50 text-amber-700' },
    extendida:   { label: 'Extendida',   color: 'bg-orange-50 text-orange-700' },
  }

  const etapa = ETAPA_CONFIG[paciente.etapa]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between shrink-0">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{paciente.nombre}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {etapa && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${etapa.color}`}>
                  {etapa.label}
                </span>
              )}
              <span className="text-xs text-gray-400">{calcEdad(paciente.fecha_nacimiento)}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Clinical notes */}
          {paciente.notas_clinicas && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1 uppercase tracking-wide">Notas clínicas</p>
              <p className="text-sm text-amber-800">{paciente.notas_clinicas}</p>
            </div>
          )}

          {/* Treatment needs */}
          <div className="grid grid-cols-2 gap-3">
            {paciente.necesita_kine && (
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-teal-700 mb-2 uppercase tracking-wide">Kinesiología</p>
                <p className="text-sm font-bold text-teal-800">{paciente.frecuencia_semanal_kine} ses. / semana</p>
                {paciente.profesional_preferido_kine && (
                  <p className="text-xs text-teal-600 mt-1">{paciente.profesional_preferido_kine.nombre}</p>
                )}
              </div>
            )}
            {paciente.necesita_fono && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">Fonoaudiología</p>
                <p className="text-sm font-bold text-emerald-800">{paciente.frecuencia_semanal_fono} ses. / semana</p>
                {paciente.profesional_preferido_fono && (
                  <p className="text-xs text-emerald-600 mt-1">{paciente.profesional_preferido_fono.nombre}</p>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: paciente.sesiones_total, label: 'Totales', color: 'text-gray-900' },
              { value: paciente.sesiones_completadas, label: 'Completadas', color: 'text-emerald-600' },
              { value: paciente.sesiones_hoy?.length || 0, label: 'Hoy', color: 'text-blue-600' },
            ].map(({ value, label, color }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Historial de sesiones</h3>
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-6">Cargando...</p>
            ) : historial.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Sin sesiones registradas</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {historial.map(s => {
                  const cfg = STATUS[s.estado] || STATUS.planificada
                  return (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono">{s.fecha}</span>
                        <span className="font-medium text-gray-700">{s.hora_inicio}</span>
                        <span className="text-gray-400">{s.box_tipo === 'kinesiologia' ? 'Kine' : 'Fono'} · {s.profesional}</span>
                        {s.es_urgencia && <span className="text-red-500 text-[10px] font-medium">URGENCIA</span>}
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cerrar</button>
          <button onClick={() => onAgendar(paciente)} className="btn-primary flex-1 justify-center">
            + Agendar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Pacientes({ user }) {
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEtapa, setFiltroEtapa] = useState('todas')
  const [filtroTrat, setFiltroTrat] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [agendarPaciente, setAgendarPaciente] = useState(null)
  const [sedes, setSedes] = useState([])
  const [selectedSede, setSelectedSede] = useState(user.sede_id || 1)

  const fetchPacientes = useCallback(async () => {
    try {
      const res = await axios.get(`/api/sedes/${selectedSede}/pacientes`)
      setPacientes(res.data)
    } catch {}
    setLoading(false)
  }, [selectedSede])

  useEffect(() => { axios.get('/api/sedes').then(r => setSedes(r.data)) }, [])
  useEffect(() => { setLoading(true); fetchPacientes() }, [fetchPacientes])

  const filtered = pacientes.filter(p => {
    if (filtroEtapa !== 'todas' && p.etapa !== filtroEtapa) return false
    if (filtroTrat === 'kine' && !p.necesita_kine) return false
    if (filtroTrat === 'fono' && !p.necesita_fono) return false
    if (filtroTrat === 'ambos' && !(p.necesita_kine && p.necesita_fono)) return false
    if (busqueda && !p.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    return true
  })

  const handleAgendar = (pac) => { setDetalle(null); setAgendarPaciente(pac) }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pacientes</h1>
        <p className="text-sm text-gray-400 mt-0.5">Perfiles clínicos y necesidades terapéuticas</p>
      </div>

      {/* Sede selector (admin) */}
      {user.rol === 'admin_institucion' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-400">Sede</span>
          {sedes.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedSede(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedSede === s.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <input
          type="text"
          className="input"
          placeholder="Buscar paciente por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">Etapa:</span>
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'bebes_sin_marcha', label: 'Bebés' },
            { key: 'preescolar_escolar', label: 'Escolar' },
            { key: 'transicion_vida_adulta', label: 'Adultos' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroEtapa(f.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filtroEtapa === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-2">Tratamiento:</span>
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'kine', label: 'Kine' },
            { key: 'fono', label: 'Fono' },
            { key: 'ambos', label: 'Ambos' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroTrat(f.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filtroTrat === f.key ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400">{filtered.length} de {pacientes.length} pacientes</p>
      </div>

      {/* Patient grid */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando pacientes...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-sm">No hay pacientes con ese filtro</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(p => {
            const etapa = ETAPA_CONFIG[p.etapa]
            const tieneHoy = p.sesiones_hoy?.length > 0
            const borderColor = p.necesita_kine && p.necesita_fono ? '#8b5cf6' : p.necesita_kine ? '#0d9488' : '#16a34a'
            return (
              <div
                key={p.id}
                className="bg-white border border-gray-200 border-l-4 rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer"
                style={{ borderLeftColor: borderColor }}
                onClick={() => setDetalle(p)}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">{p.nombre}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{calcEdad(p.fecha_nacimiento)}</p>
                  </div>
                  {tieneHoy && (
                    <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full font-medium shrink-0 pulse-badge">
                      Hoy
                    </span>
                  )}
                </div>

                {etapa && (
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border mb-2.5 font-medium ${etapa.color}`}>
                    {etapa.label}
                  </span>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {p.necesita_kine && <TratamientoChip tipo="kine" frecuencia={p.frecuencia_semanal_kine} />}
                  {p.necesita_fono && <TratamientoChip tipo="fono" frecuencia={p.frecuencia_semanal_fono} />}
                </div>

                {p.notas_clinicas && (
                  <p className="text-[11px] text-gray-400 line-clamp-2 mb-3 italic">{p.notas_clinicas}</p>
                )}

                <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 pt-2.5">
                  <span>{p.sesiones_total} sesiones</span>
                  <span>{p.sesiones_completadas} listas</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleAgendar(p) }}
                    className="text-blue-600 font-semibold hover:text-blue-800 transition-colors"
                  >
                    + Agendar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detalle && (
        <HistorialModal paciente={detalle} onClose={() => setDetalle(null)} onAgendar={handleAgendar} />
      )}
      {agendarPaciente && (
        <AgendarModal
          box={null}
          sedeId={selectedSede}
          paciente={agendarPaciente}
          onClose={() => setAgendarPaciente(null)}
          onSuccess={() => { setAgendarPaciente(null); fetchPacientes() }}
        />
      )}
    </div>
  )
}
