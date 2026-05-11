# EduDown — Sistema de Agendamiento de Box de Atención

Prototipo funcional para el Proyecto Integrador (Caso 15).

## Stack
- **Frontend**: React 18 + Vite + Tailwind CSS + Socket.io-client
- **Backend**: FastAPI + python-socketio + SQLModel
- **BD**: SQLite (demo) / PostgreSQL (producción)
- **Tiempo real**: WebSocket via Socket.io

## Inicio rápido

```bash
cd edudown
./start.sh
```

Luego abrir: **http://localhost:5173**

### Inicio manual (alternativa)

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Usuarios de prueba

| Email | Password | Rol |
|-------|----------|-----|
| admin@edudown.cl | admin123 | Admin Institución |
| enfermera@edudown.cl | enf123 | Enfermera de Box |
| kine@edudown.cl | kine123 | Médico Kinesiólogo |
| fono@edudown.cl | fono123 | Médico Fonoaudiólogo |
| auxiliar@edudown.cl | aux123 | Auxiliar de Limpieza |

## Flujos demo para el video

### 1. Login con roles diferentes
- Abrir dos ventanas del navegador
- En ventana A: login como `enfermera@edudown.cl`
- En ventana B: login como `admin@edudown.cl`

### 2. Mapa de boxes en tiempo real
- Ventana A: ir a **Mapa de Boxes** → Sede Providencia
- Ver 12 boxes con estados: verde (disponible), rojo (ocupado), naranja (mantención)
- Codificación accesible WCAG 2.2: color + icono + texto

### 3. Agendar sesión con validación atómica
- Hacer clic en un box verde (disponible)
- Completar el formulario
- Observar en ventana B (Admin) que el dashboard se actualiza automáticamente

### 4. WebSocket sincronización
- Al confirmar sesión en ventana A → el box cambia de verde a rojo en ambas ventanas sin recargar

### 5. Sugerencia de IA (human-in-the-loop)
- Botón **🚨 Urgencia** → el sistema sugiere box + profesional con % de confianza
- Muestra razones explícitas: `box-tipo-match`, `prof-disponible`, etc.
- Confirmación humana obligatoria

### 6. Cierre de sesión + Publish-Subscribe
- Clic en **Cerrar sesión** en un box ocupado
- Seleccionar estado: Terminada / Suspendida / Extendida
- Si "Terminada": se crea notificación automática para auxiliar de limpieza
- En ventana del auxiliar: ver notificación en tiempo real

### 7. Dashboard Global (Aggregator EIP)
- Login como `admin@edudown.cl`
- Ver las 4 sedes consolidadas con ocupación, sesiones y estado de boxes
- Se actualiza automáticamente vía WebSocket

## Enterprise Integration Patterns implementados

| Patrón | Endpoint/Componente |
|--------|---------------------|
| Anti-Corruption Layer | `SupplyACL` (stub en backend) |
| Publish-Subscribe | `sio.emit('session_closed', ...)` → múltiples suscriptores |
| Content-Based Router | `route_session_closed_event` en `POST /sesiones/{id}/cerrar` |
| Aggregator | `GET /api/dashboard/global` |
| Dead Letter Channel | Cola de reintentos en notificaciones push |

## API Docs
Swagger UI disponible en: http://localhost:8000/docs
