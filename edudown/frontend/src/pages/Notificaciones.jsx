import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { createSocket } from '../socket'

export default function Notificaciones({ user }) {
  const [notificaciones, setNotificaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)

  const sedeId = user.sede_id || 1

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await axios.get(`/api/notificaciones?sede_id=${sedeId}`)
      setNotificaciones(res.data)
    } catch {}
    setLoading(false)
  }, [sedeId])

  useEffect(() => { fetchNotificaciones() }, [fetchNotificaciones])

  useEffect(() => {
    const socket = createSocket()
    socket.on('connect', () => { setWsConnected(true); socket.emit('join_sede', { sede_id: sedeId }) })
    socket.on('disconnect', () => setWsConnected(false))
    socket.on('limpieza_requerida', fetchNotificaciones)
    socket.on('session_closed', fetchNotificaciones)
    return () => socket.disconnect()
  }, [sedeId, fetchNotificaciones])

  const marcarLeida = async (id) => {
    try {
      await axios.post(`/api/notificaciones/${id}/leer`)
      setNotificaciones(prev => prev.filter(n => n.id !== id))
    } catch {}
  }

  const marcarTodasLeidas = async () => {
    for (const n of notificaciones) {
      await axios.post(`/api/notificaciones/${n.id}/leer`)
    }
    setNotificaciones([])
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-400 mt-0.5">Publish-Subscribe · Dead Letter Channel</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium ${
            wsConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 pulse-badge' : 'bg-red-500'}`} />
            {wsConnected ? 'En vivo' : 'Sin conexión'}
          </span>
          {notificaciones.length > 0 && (
            <button onClick={marcarTodasLeidas} className="btn-secondary text-xs py-1.5 px-3">
              Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      {/* Role context */}
      {user.rol === 'auxiliar_limpieza' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
          Recibes notificaciones cuando un box requiere limpieza después de una sesión terminada.
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando...</div>
      ) : notificaciones.length === 0 ? (
        <div className="card text-center py-14">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">Sin notificaciones pendientes</p>
          <p className="text-xs text-gray-400 mt-1">Las notificaciones aparecerán aquí en tiempo real</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notificaciones.map(n => (
            <div key={n.id} className="bg-white border border-gray-200 border-l-4 border-l-orange-400 rounded-xl px-4 py-3.5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{n.mensaje}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                    <span>{new Date(n.creado_en).toLocaleTimeString('es-CL')}</span>
                    <span>·</span>
                    <span>{n.destinatario_rol}</span>
                    {n.sesion_id && <><span>·</span><span>Sesión #{n.sesion_id}</span></>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => marcarLeida(n.id)}
                className="shrink-0 text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                Leída
              </button>
            </div>
          ))}
        </div>
      )}

      {/* EIP note */}
      <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
        <p className="text-xs text-violet-700 space-y-0.5">
          <strong>EIPs aplicados:</strong>{' '}
          <strong>Publish-Subscribe</strong> — evento <code className="bg-violet-100 px-1 rounded">session_closed</code> activa limpieza ·{' '}
          <strong>Dead Letter Channel</strong> — escalada al Jefe de Auxiliares si falla 3 veces ·{' '}
          <strong>Content-Based Router</strong> — solo estado "Terminada" genera notificación
        </p>
      </div>
    </div>
  )
}
