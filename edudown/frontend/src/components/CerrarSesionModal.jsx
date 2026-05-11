import { useState } from 'react'
import axios from 'axios'

const OPCIONES = [
  {
    value: 'terminada',
    label: 'Terminada',
    desc: 'Sesión completada exitosamente',
    color: 'border-emerald-200 bg-emerald-50',
    activeRing: 'ring-2 ring-emerald-400',
    textColor: 'text-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  {
    value: 'suspendida',
    label: 'Suspendida',
    desc: 'Sesión interrumpida antes de completarse',
    color: 'border-amber-200 bg-amber-50',
    activeRing: 'ring-2 ring-amber-400',
    textColor: 'text-amber-800',
    dotColor: 'bg-amber-500',
  },
  {
    value: 'extendida',
    label: 'Extendida',
    desc: 'Sesión requiere más tiempo del planificado',
    color: 'border-orange-200 bg-orange-50',
    activeRing: 'ring-2 ring-orange-400',
    textColor: 'text-orange-800',
    dotColor: 'bg-orange-500',
  },
]

export default function CerrarSesionModal({ sesion, onClose, onSuccess }) {
  const [estadoFinal, setEstadoFinal] = useState('terminada')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await axios.post(`/api/sesiones/${sesion.id}/cerrar`, {
        estado_final: estadoFinal,
        notas: notas || null,
      })
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cerrar la sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-gray-900">Cerrar sesión</h2>
            <p className="text-xs text-gray-400 mt-0.5">Box {sesion.box_numero || '?'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Session info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Paciente</span>
              <span className="font-medium text-gray-800">{sesion.paciente}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Profesional</span>
              <span className="font-medium text-gray-800">{sesion.profesional}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Horario</span>
              <span className="font-medium text-gray-800">{sesion.hora_inicio} – {sesion.hora_fin}</span>
            </div>
          </div>

          {/* Status options */}
          <div>
            <label className="label">Estado final de la sesión</label>
            <div className="space-y-2">
              {OPCIONES.map(op => (
                <label
                  key={op.value}
                  className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${op.color} ${
                    estadoFinal === op.value ? op.activeRing : 'opacity-70 hover:opacity-90'
                  }`}
                >
                  <input
                    type="radio"
                    name="estado"
                    value={op.value}
                    checked={estadoFinal === op.value}
                    onChange={() => setEstadoFinal(op.value)}
                    className="sr-only"
                  />
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    estadoFinal === op.value ? `${op.dotColor} border-transparent` : 'border-gray-300 bg-white'
                  }`}>
                    {estadoFinal === op.value && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${op.textColor}`}>{op.label}</p>
                    <p className="text-xs text-gray-500">{op.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea
              className="input"
              rows={2}
              value={notas}
              onChange={e => setNotas(e.target.value)}
              placeholder="Observaciones sobre el cierre..."
            />
          </div>

          {/* Notify info */}
          {estadoFinal === 'terminada' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
              Se enviará notificación al auxiliar de limpieza vía <strong>Publish-Subscribe</strong>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Cerrando...' : 'Confirmar cierre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
