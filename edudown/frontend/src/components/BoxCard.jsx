const STATUS_CONFIG = {
  disponible: {
    border: 'border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Disponible',
    pulse: true,
  },
  ocupado: {
    border: 'border-l-red-500',
    badge: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
    label: 'Ocupado',
    pulse: false,
  },
  mantencion: {
    border: 'border-l-orange-500',
    badge: 'bg-orange-50 text-orange-700',
    dot: 'bg-orange-500',
    label: 'Mantención',
    pulse: false,
  },
  limpieza: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
    label: 'Limpieza',
    pulse: false,
  },
}

const TIPO_LABELS = {
  kinesiologia: 'Kinesiología',
  fonoaudiologia: 'Fonoaudiología',
}

export default function BoxCard({ box, onClick, onClose, canSchedule, canClose, highlight }) {
  const config = STATUS_CONFIG[box.estado] || STATUS_CONFIG.disponible
  const clickable = canSchedule && box.estado === 'disponible'

  return (
    <div
      className={`box-card bg-white rounded-xl border border-gray-200 border-l-4 ${config.border} p-3 ${
        clickable ? 'cursor-pointer' : 'cursor-default'
      } ${highlight ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
      onClick={clickable ? () => onClick(box) : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-gray-800 text-sm">Box {box.numero}</span>
        <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot} ${config.pulse ? 'pulse-badge' : ''}`} />
          {config.label}
        </span>
      </div>

      {/* Type */}
      <p className="text-[11px] text-gray-400 mb-2.5">{TIPO_LABELS[box.tipo]}</p>

      {/* Session info */}
      {box.sesion_activa ? (
        <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
          <p className="text-xs font-medium text-gray-700 truncate leading-tight">{box.sesion_activa.paciente}</p>
          <p className="text-[11px] text-gray-400 truncate">{box.sesion_activa.profesional}</p>
          <p className="text-[11px] text-gray-400">{box.sesion_activa.hora_inicio} – {box.sesion_activa.hora_fin}</p>
          {canClose && box.estado === 'ocupado' && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(box.sesion_activa) }}
              className="mt-1 w-full bg-red-600 hover:bg-red-700 text-white text-[11px] py-1.5 rounded-lg transition-colors font-medium"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      ) : clickable ? (
        <p className="text-[11px] text-blue-600 font-medium text-center mt-auto">Clic para agendar</p>
      ) : null}
    </div>
  )
}
