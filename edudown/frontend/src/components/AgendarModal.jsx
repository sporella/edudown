import { useState, useEffect } from 'react'
import axios from 'axios'

const HORARIOS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '14:00', '15:00', '16:00', '17:00'
]
const DURACION_FIN = {
  '08:00': '09:00', '09:00': '10:00', '10:00': '11:00', '11:00': '12:00',
  '12:00': '13:00', '14:00': '15:00', '15:00': '16:00', '16:00': '17:00', '17:00': '18:00'
}

const ETAPA_LABELS = {
  bebes_sin_marcha: 'Bebés sin marcha',
  preescolar_escolar: 'Preescolar/Escolar',
  transicion_vida_adulta: 'Transición vida adulta',
}

export default function AgendarModal({ box, sedeId, onClose, onSuccess, isUrgencia = false, paciente: pacienteProp = null }) {
  const [profesionales, setProfesionales] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [sugerencia, setSugerencia] = useState(null)
  const [sugerenciaLoading, setSugerenciaLoading] = useState(false)
  const [form, setForm] = useState({
    profesional_id: '',
    paciente_id: pacienteProp ? String(pacienteProp.id) : '',
    hora_inicio: '09:00',
    fecha: new Date().toISOString().split('T')[0],
    es_urgencia: isUrgencia,
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [usingSugerencia, setUsingSugerencia] = useState(false)
  const [appliedSugBox, setAppliedSugBox] = useState(null)

  const activePaciente = pacienteProp || pacientes.find(p => String(p.id) === form.paciente_id) || null

  const fetchSugerencia = (pacienteId) => {
    setSugerenciaLoading(true)
    const params = new URLSearchParams({ sede_id: sedeId, es_urgencia: isUrgencia })
    if (pacienteId) params.append('paciente_id', pacienteId)
    axios.get(`/api/sugerencia?${params}`)
      .then(res => setSugerencia(res.data.sugerencias?.length ? res.data : null))
      .catch(() => setSugerencia(null))
      .finally(() => setSugerenciaLoading(false))
  }

  useEffect(() => {
    Promise.all([
      axios.get(`/api/sedes/${sedeId}/profesionales`),
      axios.get(`/api/sedes/${sedeId}/pacientes`),
    ]).then(([profsRes, pacsRes]) => {
      setProfesionales(profsRes.data)
      setPacientes(pacsRes.data)
    })
    if (pacienteProp || isUrgencia || !box) fetchSugerencia(pacienteProp?.id || null)
  }, [sedeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePacienteChange = (newId) => {
    setForm(f => ({ ...f, paciente_id: newId, profesional_id: '' }))
    setUsingSugerencia(false)
    setAppliedSugBox(null)
    if (newId) fetchSugerencia(newId)
    else fetchSugerencia(null)
  }

  const applySugerencia = (sug) => {
    setForm(f => ({ ...f, profesional_id: String(sug.profesional.id) }))
    setAppliedSugBox(sug.box)
    setUsingSugerencia(true)
  }

  const filteredProfesionales = profesionales.filter(p => {
    if (box) return p.especialidad === box.tipo
    if (appliedSugBox) return p.especialidad === appliedSugBox.tipo
    if (activePaciente) {
      const currentSug = sugerencia?.sugerencias?.find(s => String(s.profesional.id) === form.profesional_id)
      if (currentSug) return p.especialidad === currentSug.tipo
    }
    return true
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.profesional_id || !form.paciente_id) { setError('Completa todos los campos requeridos'); return }
    setError('')
    setLoading(true)
    try {
      const boxId = box?.id || appliedSugBox?.id || sugerencia?.sugerencias?.[0]?.box?.id
      if (!boxId) { setError('No hay box disponible. Selecciona desde el mapa o espera disponibilidad.'); setLoading(false); return }
      await axios.post('/api/sesiones', {
        box_id: boxId,
        profesional_id: parseInt(form.profesional_id),
        paciente_id: parseInt(form.paciente_id),
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: DURACION_FIN[form.hora_inicio] || '10:00',
        es_urgencia: form.es_urgencia,
        notas: form.notas || null,
      })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al agendar la sesión')
    } finally {
      setLoading(false)
    }
  }

  const boxIdToUse = box?.id || appliedSugBox?.id || sugerencia?.sugerencias?.[0]?.box?.id

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 flex items-start justify-between shrink-0 ${isUrgencia ? 'bg-red-600' : 'bg-blue-600'}`}>
          <div>
            <h2 className="font-bold text-white text-base">
              {isUrgencia ? 'Sesión Urgente' : 'Agendar Sesión'}
              {box && ` — Box ${box.numero}`}
            </h2>
            {activePaciente && (
              <p className="text-sm text-white/80 mt-0.5">
                {activePaciente.nombre}
                {activePaciente.etapa && <span className="ml-2 text-white/60 text-xs">{ETAPA_LABELS[activePaciente.etapa]}</span>}
              </p>
            )}
            {box && (
              <p className="text-xs text-white/70 mt-0.5">
                {box.tipo === 'kinesiologia' ? 'Kinesiología' : 'Fonoaudiología'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Patient needs summary */}
          {activePaciente && (activePaciente.necesita_kine || activePaciente.necesita_fono) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Necesidades terapéuticas</p>
              <div className="flex flex-wrap gap-2">
                {activePaciente.necesita_kine && (
                  <span className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2.5 py-1 rounded-full font-medium">
                    Kinesiología {activePaciente.frecuencia_semanal_kine}×/sem
                    {activePaciente.profesional_preferido_kine && (
                      <span className="ml-1 opacity-60">· {activePaciente.profesional_preferido_kine.nombre.split(' ')[1]}</span>
                    )}
                  </span>
                )}
                {activePaciente.necesita_fono && (
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
                    Fonoaudiología {activePaciente.frecuencia_semanal_fono}×/sem
                    {activePaciente.profesional_preferido_fono && (
                      <span className="ml-1 opacity-60">· {activePaciente.profesional_preferido_fono.nombre.split(' ')[1]}</span>
                    )}
                  </span>
                )}
              </div>
              {activePaciente.notas_clinicas && (
                <p className="text-xs text-gray-400 mt-2 italic">{activePaciente.notas_clinicas}</p>
              )}
            </div>
          )}

          {/* AI Suggestion */}
          {sugerenciaLoading && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-sm text-blue-600 animate-pulse">
              Calculando sugerencia personalizada...
            </div>
          )}
          {!sugerenciaLoading && sugerencia && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5">
              <p className="text-sm font-semibold text-blue-800 mb-0.5">
                Sugerencia IA{sugerencia.paciente_nombre ? ` para ${sugerencia.paciente_nombre}` : ' (human-in-the-loop)'}
              </p>
              <p className="text-xs text-blue-500 mb-3 italic">{sugerencia.mensaje}</p>
              {sugerencia.sugerencias.map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-3 mb-2 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-semibold text-sm text-gray-800">Box {s.box.numero}</span>
                      <span className="text-gray-400 text-xs ml-2">→ {s.profesional.nombre}</span>
                      <span className="text-gray-400 text-xs ml-1">· {s.tipo === 'kinesiologia' ? 'Kine' : 'Fono'}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      s.confianza >= 85 ? 'bg-emerald-100 text-emerald-700'
                      : s.confianza >= 70 ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                    }`}>
                      {s.confianza}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {s.razones.map((r, j) => (
                      <span key={j} className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                        r.startsWith('⚠️') ? 'bg-red-50 text-red-600'
                        : r.includes('habitual') || r.includes('requerido') ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-100 text-gray-500'
                      }`}>{r}</span>
                    ))}
                  </div>
                  <button
                    onClick={() => applySugerencia(s)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded-lg font-medium transition-colors"
                  >
                    Usar esta sugerencia
                  </button>
                </div>
              ))}
              {sugerencia.confianza_baja && (
                <p className="text-xs text-amber-600 mt-1">Confianza baja — revisa manualmente</p>
              )}
            </div>
          )}

          {usingSugerencia && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3.5 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Sugerencia aplicada — {appliedSugBox ? `Box ${appliedSugBox.numero}` : ''} · puedes modificar si lo necesitas
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Fecha</label>
              <input type="date" className="input" value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} required />
            </div>

            <div>
              <label className="label">Hora de inicio</label>
              <select className="input" value={form.hora_inicio}
                onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))}>
                {HORARIOS.map(h => (
                  <option key={h} value={h}>{h} – {DURACION_FIN[h]}</option>
                ))}
              </select>
            </div>

            {!pacienteProp && (
              <div>
                <label className="label">Paciente *</label>
                <select className="input" value={form.paciente_id}
                  onChange={e => handlePacienteChange(e.target.value)} required>
                  <option value="">Seleccionar paciente...</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — {ETAPA_LABELS[p.etapa] || p.etapa}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">Profesional *</label>
              <select className="input" value={form.profesional_id}
                onChange={e => { setForm(f => ({ ...f, profesional_id: e.target.value })); setUsingSugerencia(false) }}
                required>
                <option value="">Seleccionar profesional...</option>
                {filteredProfesionales.map(p => (
                  <option key={p.id} value={p.id} disabled={!p.disponible}>
                    {p.nombre} · {p.especialidad === 'kinesiologia' ? 'Kine' : 'Fono'} {!p.disponible ? '(ocupado)' : '✓'}
                  </option>
                ))}
              </select>
            </div>

            {boxIdToUse && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-500">
                Box asignado: <strong className="text-gray-800">
                  {box?.numero || appliedSugBox?.numero || sugerencia?.sugerencias?.[0]?.box?.numero}
                </strong>
                {' · '}
                {(box?.tipo || appliedSugBox?.tipo || sugerencia?.sugerencias?.[0]?.box?.tipo) === 'kinesiologia'
                  ? 'Kinesiología' : 'Fonoaudiología'}
              </div>
            )}

            <div>
              <label className="label">Notas (opcional)</label>
              <textarea className="input" rows={2} value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Observaciones o instrucciones especiales..." />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="urgencia" checked={form.es_urgencia}
                onChange={e => setForm(f => ({ ...f, es_urgencia: e.target.checked }))}
                className="rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-700">Marcar como urgencia</span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className={`flex-1 justify-center ${isUrgencia ? 'btn-danger' : 'btn-primary'}`}>
                {loading ? 'Agendando...' : isUrgencia ? 'Confirmar Urgencia' : 'Confirmar Sesión'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
