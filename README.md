# EduDown — Sistema de Agendamiento de Box de Atención

> **Proyecto académico** — Proyecto Integrador, Caso 15.
> Magíster en Ingeniería de Software, 2026.

> **Todos los datos, pacientes, profesionales y sedes son ficticios y fueron generados exclusivamente con fines demostrativos. No representan información real de ninguna organización ni persona.**

---

## Descripción

Prototipo funcional de un sistema de agendamiento de boxes de atención para una ONG dedicada a personas con síndrome de Down. El sistema permite gestionar la disponibilidad de boxes en 4 sedes, agendar sesiones de kinesiología y fonoaudiología, y coordinar la limpieza mediante notificaciones en tiempo real.

El proyecto fue desarrollado como caso de estudio para aplicar **Enterprise Integration Patterns (EIP)** en un contexto de software de salud.

## Demo

La aplicación está disponible en modo demostración (sin backend, con datos de ejemplo):

👉 **[Ver demo en GitHub Pages](https://sporella.github.io/edudown)**

Usuarios de acceso rápido disponibles en la pantalla de login.

> En el modo demo los datos se reinician al recargar la página. Las actualizaciones en tiempo real (WebSocket) no están activas.

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | FastAPI + python-socketio + SQLModel |
| Base de datos | SQLite (demo) / PostgreSQL (producción) |
| Tiempo real | WebSocket vía Socket.io |

## Ejecución local

### Requisito previo
- Python 3.11+
- Node.js 20+

### Inicio rápido

```bash
cd edudown
./start.sh
```

Luego abrir: **http://localhost:5173**

### Inicio manual

**Backend:**
```bash
cd edudown/backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:socket_app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd edudown/frontend
npm install
npm run dev
```

## Datos de ejemplo

Todos los datos del sistema son ficticios:

- **4 sedes**: Providencia, San Bernardo, Temuco, La Serena (nombres referenciales, no corresponden a sedes reales de ninguna organización)
- **48 boxes** — 12 por sede (7 kinesiología + 5 fonoaudiología)
- **20 pacientes** con perfiles clínicos inventados para demostración
- **20 profesionales** con nombres ficticios
- **Sesiones** generadas automáticamente para un rango de fechas alrededor del día actual

Los usuarios de prueba son:

| Email | Contraseña | Rol |
|-------|------------|-----|
| admin@edudown.cl | admin123 | Admin Institución |
| enfermera@edudown.cl | enf123 | Enfermera de Box |
| kine@edudown.cl | kine123 | Médico Kinesiólogo |
| fono@edudown.cl | fono123 | Médico Fonoaudiólogo |
| auxiliar@edudown.cl | aux123 | Auxiliar de Limpieza |
| adminsede@edudown.cl | sede123 | Admin Sede |

## Enterprise Integration Patterns implementados

| Patrón EIP | Implementación |
|-----------|----------------|
| **Publish-Subscribe** | Al cerrar una sesión como "Terminada", el backend emite `session_closed` a todos los suscriptores (dashboard, notificaciones) |
| **Content-Based Router** | Solo el estado "Terminada" genera notificación de limpieza; "Suspendida" y "Extendida" no lo hacen |
| **Aggregator** | `GET /api/dashboard/global` consolida el estado de las 4 sedes en una sola respuesta |
| **Dead Letter Channel** | Si la notificación push falla 3 veces, se escala al Jefe de Auxiliares como canal alternativo |
| **Anti-Corruption Layer** | Capa de adaptación para integración con sistemas externos (stub implementado) |

## Estructura del proyecto

```
topicos_is/
├── .github/workflows/deploy.yml   # CI/CD para GitHub Pages
├── edudown/
│   ├── backend/                   # API FastAPI
│   │   ├── main.py                # Endpoints + Socket.io
│   │   ├── models.py              # Modelos SQLModel
│   │   ├── seed_data.py           # Datos de ejemplo (ficticios)
│   │   └── requirements.txt
│   └── frontend/                  # App React
│       ├── src/
│       │   ├── mockApi.js         # Mock API para demo sin backend
│       │   ├── socket.js          # Socket real (dev) / mock (demo)
│       │   ├── components/        # Layout, BoxCard, modales
│       │   └── pages/             # Dashboard, BoxMap, Sesiones, etc.
│       └── vite.config.js
└── README.md
```

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` construye el frontend con `VITE_DEMO_MODE=true` y despliega automáticamente en la rama `gh-pages` al hacer push a `main`.

Para activarlo:
1. Subir el repo a GitHub
2. Ir a **Settings → Pages → Source → gh-pages branch**
3. Hacer push a `main` — el deploy se ejecuta automáticamente

---

*Proyecto académico desarrollado para el Proyecto Integrador del Magíster en Ingeniería de Software. Todos los nombres, datos clínicos y organizacionales son inventados.*
