#!/bin/bash
set -e
export PATH="/opt/homebrew/bin:$PATH"

echo "=========================================="
echo "  EduDown — Sistema de Agendamiento"
echo "=========================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Backend ---
echo ""
echo "[1/3] Configurando entorno Python..."
cd "$ROOT_DIR/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
  echo "  Entorno virtual creado."
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "  Dependencias Python instaladas."

# Limpiar DB anterior para seed limpio
rm -f edudown.db

echo ""
echo "[2/3] Iniciando backend FastAPI en http://localhost:8000 ..."
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

sleep 3

# --- Frontend ---
echo ""
echo "[3/3] Instalando dependencias Node.js..."
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
  npm install --silent
  echo "  Dependencias instaladas."
fi

echo ""
echo "  Iniciando frontend React en http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "  LISTO"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "  Usuarios de prueba:"
echo "  admin@edudown.cl / admin123  (Admin Institución)"
echo "  enfermera@edudown.cl / enf123 (Enfermera)"
echo "  kine@edudown.cl / kine123    (Médico Kinesiólogo)"
echo "  auxiliar@edudown.cl / aux123 (Auxiliar Limpieza)"
echo ""
echo "  Presiona Ctrl+C para detener todo"
echo "=========================================="

cleanup() {
  echo ""
  echo "Deteniendo servidores..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

wait
