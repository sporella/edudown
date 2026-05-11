import { io } from 'socket.io-client'

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'

const MOCK_SOCKET = { on: () => {}, emit: () => {}, disconnect: () => {} }

export function createSocket() {
  if (DEMO_MODE) return MOCK_SOCKET
  return io('http://localhost:8000', { path: '/socket.io' })
}
