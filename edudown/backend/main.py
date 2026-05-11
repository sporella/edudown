from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional
from datetime import date, datetime
import socketio
import hashlib
from pydantic import BaseModel

from database import create_db_and_tables, get_session, engine
from models import (
    Sede, Box, BoxStatus, BoxType, User, UserRole,
    Profesional, Paciente, Sesion, SessionStatus, Notificacion, EtapaTratamiento
)
from seed_data import seed


# --- Socket.io setup ---
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)

app = FastAPI(title="EduDown API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

socket_app = socketio.ASGIApp(sio, other_asgi_app=app)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    seed()


# ---- Auth ----

def fake_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user_id: int
    nombre: str
    rol: str
    sede_id: Optional[int]


@app.post("/api/auth/login", response_model=LoginResponse)
def login(req: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == req.email)).first()
    if not user or user.password_hash != fake_hash(req.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = f"token-{user.id}-{fake_hash(req.email)[:8]}"
    return LoginResponse(
        token=token,
        user_id=user.id,
        nombre=user.nombre,
        rol=user.rol,
        sede_id=user.sede_id,
    )


# ---- Sedes ----

@app.get("/api/sedes")
def get_sedes(session: Session = Depends(get_session)):
    sedes = session.exec(select(Sede)).all()
    return [{"id": s.id, "nombre": s.nombre, "ciudad": s.ciudad} for s in sedes]


# ---- Boxes ----

@app.get("/api/sedes/{sede_id}/boxes")
def get_boxes(sede_id: int, session: Session = Depends(get_session)):
    boxes = session.exec(select(Box).where(Box.sede_id == sede_id)).all()
    today = date.today()
    result = []
    for b in boxes:
        sesion_activa = session.exec(
            select(Sesion).where(
                Sesion.box_id == b.id,
                Sesion.fecha == today,
                Sesion.estado.in_([SessionStatus.planificada, SessionStatus.en_curso]),
            )
        ).first()
        sesion_info = None
        if sesion_activa:
            pac = session.get(Paciente, sesion_activa.paciente_id)
            prof = session.get(Profesional, sesion_activa.profesional_id)
            sesion_info = {
                "id": sesion_activa.id,
                "paciente": pac.nombre if pac else "",
                "profesional": prof.nombre if prof else "",
                "hora_inicio": sesion_activa.hora_inicio,
                "hora_fin": sesion_activa.hora_fin,
                "estado": sesion_activa.estado,
            }
        result.append({
            "id": b.id,
            "numero": b.numero,
            "tipo": b.tipo,
            "estado": b.estado,
            "sesion_activa": sesion_info,
        })
    return sorted(result, key=lambda x: x["numero"])


# ---- Profesionales ----

@app.get("/api/sedes/{sede_id}/profesionales")
def get_profesionales(sede_id: int, session: Session = Depends(get_session)):
    profs = session.exec(
        select(Profesional).where(Profesional.sede_id == sede_id)
    ).all()
    today = date.today()
    result = []
    for p in profs:
        ocupado = session.exec(
            select(Sesion).where(
                Sesion.profesional_id == p.id,
                Sesion.fecha == today,
                Sesion.estado.in_([SessionStatus.en_curso]),
            )
        ).first()
        result.append({
            "id": p.id,
            "nombre": p.nombre,
            "especialidad": p.especialidad,
            "disponible": p.disponible and not ocupado,
        })
    return result


# ---- Pacientes ----

def _paciente_dict(p: Paciente, session: Session) -> dict:
    pref_kine = session.get(Profesional, p.profesional_preferido_kine_id) if p.profesional_preferido_kine_id else None
    pref_fono = session.get(Profesional, p.profesional_preferido_fono_id) if p.profesional_preferido_fono_id else None
    sesiones_count = len(session.exec(select(Sesion).where(Sesion.paciente_id == p.id)).all())
    sesiones_completadas = len(session.exec(
        select(Sesion).where(Sesion.paciente_id == p.id, Sesion.estado == SessionStatus.terminada)
    ).all())
    today = date.today()
    sesiones_hoy = session.exec(
        select(Sesion).where(Sesion.paciente_id == p.id, Sesion.fecha == today)
    ).all()
    return {
        "id": p.id,
        "nombre": p.nombre,
        "etapa": p.etapa,
        "fecha_nacimiento": str(p.fecha_nacimiento),
        "necesita_kine": p.necesita_kine,
        "necesita_fono": p.necesita_fono,
        "frecuencia_semanal_kine": p.frecuencia_semanal_kine,
        "frecuencia_semanal_fono": p.frecuencia_semanal_fono,
        "notas_clinicas": p.notas_clinicas,
        "activo": p.activo,
        "profesional_preferido_kine": {"id": pref_kine.id, "nombre": pref_kine.nombre} if pref_kine else None,
        "profesional_preferido_fono": {"id": pref_fono.id, "nombre": pref_fono.nombre} if pref_fono else None,
        "sesiones_total": sesiones_count,
        "sesiones_completadas": sesiones_completadas,
        "sesiones_hoy": [{"id": s.id, "hora_inicio": s.hora_inicio, "hora_fin": s.hora_fin, "estado": s.estado} for s in sesiones_hoy],
    }


@app.get("/api/sedes/{sede_id}/pacientes")
def get_pacientes(sede_id: int, session: Session = Depends(get_session)):
    pacs = session.exec(
        select(Paciente).where(Paciente.sede_id == sede_id, Paciente.activo == True)
    ).all()
    return [_paciente_dict(p, session) for p in pacs]


@app.get("/api/pacientes/{paciente_id}")
def get_paciente(paciente_id: int, session: Session = Depends(get_session)):
    p = session.get(Paciente, paciente_id)
    if not p:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return _paciente_dict(p, session)


class CrearPacienteRequest(BaseModel):
    nombre: str
    fecha_nacimiento: str
    etapa: str
    sede_id: int
    necesita_kine: bool = True
    necesita_fono: bool = False
    frecuencia_semanal_kine: int = 2
    frecuencia_semanal_fono: int = 0
    notas_clinicas: Optional[str] = None


@app.post("/api/pacientes")
def crear_paciente(req: CrearPacienteRequest, session: Session = Depends(get_session)):
    if not req.nombre.strip():
        raise HTTPException(status_code=422, detail="El nombre es obligatorio")
    if not req.necesita_kine and not req.necesita_fono:
        raise HTTPException(status_code=422, detail="Debe requerir al menos un tipo de tratamiento")
    pac = Paciente(
        nombre=req.nombre.strip(),
        fecha_nacimiento=date.fromisoformat(req.fecha_nacimiento),
        etapa=EtapaTratamiento(req.etapa),
        sede_id=req.sede_id,
        necesita_kine=req.necesita_kine,
        necesita_fono=req.necesita_fono,
        frecuencia_semanal_kine=req.frecuencia_semanal_kine if req.necesita_kine else 0,
        frecuencia_semanal_fono=req.frecuencia_semanal_fono if req.necesita_fono else 0,
        notas_clinicas=req.notas_clinicas or None,
    )
    session.add(pac)
    session.commit()
    session.refresh(pac)
    return _paciente_dict(pac, session)


@app.get("/api/pacientes/{paciente_id}/historial")
def get_historial(paciente_id: int, session: Session = Depends(get_session)):
    sesiones = session.exec(
        select(Sesion).where(Sesion.paciente_id == paciente_id)
    ).all()
    result = []
    for s in sesiones:
        box = session.get(Box, s.box_id)
        prof = session.get(Profesional, s.profesional_id)
        result.append({
            "id": s.id,
            "fecha": str(s.fecha),
            "hora_inicio": s.hora_inicio,
            "hora_fin": s.hora_fin,
            "estado": s.estado,
            "es_urgencia": s.es_urgencia,
            "box_tipo": box.tipo if box else "",
            "profesional": prof.nombre if prof else "",
            "notas": s.notas,
        })
    return sorted(result, key=lambda x: (x["fecha"], x["hora_inicio"]), reverse=True)


# ---- Sesiones ----

class AgendarSesionRequest(BaseModel):
    box_id: int
    profesional_id: int
    paciente_id: int
    fecha: str
    hora_inicio: str
    hora_fin: str
    es_urgencia: bool = False
    notas: Optional[str] = None


@app.post("/api/sesiones")
async def agendar_sesion(req: AgendarSesionRequest, session: Session = Depends(get_session)):
    fecha = date.fromisoformat(req.fecha)
    box = session.get(Box, req.box_id)
    if not box:
        raise HTTPException(status_code=404, detail="Box no encontrado")

    # Atomic validation (RN-10): check box availability
    conflicto_box = session.exec(
        select(Sesion).where(
            Sesion.box_id == req.box_id,
            Sesion.fecha == fecha,
            Sesion.estado.in_([SessionStatus.planificada, SessionStatus.en_curso]),
            Sesion.hora_inicio == req.hora_inicio,
        )
    ).first()
    if conflicto_box:
        raise HTTPException(status_code=409, detail="El box ya tiene una sesión en ese horario")

    # Check professional availability (RN-06)
    conflicto_prof = session.exec(
        select(Sesion).where(
            Sesion.profesional_id == req.profesional_id,
            Sesion.fecha == fecha,
            Sesion.estado.in_([SessionStatus.planificada, SessionStatus.en_curso]),
            Sesion.hora_inicio == req.hora_inicio,
        )
    ).first()
    if conflicto_prof:
        raise HTTPException(status_code=409, detail="El profesional ya tiene una sesión en ese horario")

    # Check patient availability (RN-10): a patient cannot have two sessions at the same time
    conflicto_paciente = session.exec(
        select(Sesion).where(
            Sesion.paciente_id == req.paciente_id,
            Sesion.fecha == fecha,
            Sesion.estado.in_([SessionStatus.planificada, SessionStatus.en_curso]),
            Sesion.hora_inicio == req.hora_inicio,
        )
    ).first()
    if conflicto_paciente:
        raise HTTPException(status_code=409, detail="El paciente ya tiene una sesión en ese horario")

    # Type compatibility (RN-05)
    prof = session.get(Profesional, req.profesional_id)
    if prof and prof.especialidad != box.tipo:
        raise HTTPException(
            status_code=422,
            detail=f"El profesional es de {prof.especialidad} pero el box es de {box.tipo}"
        )

    sesion = Sesion(
        box_id=req.box_id,
        profesional_id=req.profesional_id,
        paciente_id=req.paciente_id,
        fecha=fecha,
        hora_inicio=req.hora_inicio,
        hora_fin=req.hora_fin,
        estado=SessionStatus.planificada,
        es_urgencia=req.es_urgencia,
        notas=req.notas,
    )
    session.add(sesion)
    box.estado = BoxStatus.ocupado
    session.commit()
    session.refresh(sesion)

    pac = session.get(Paciente, sesion.paciente_id)
    profesional = session.get(Profesional, sesion.profesional_id)

    event_data = {
        "type": "session_scheduled",
        "sesion_id": sesion.id,
        "box_id": req.box_id,
        "box_numero": box.numero,
        "sede_id": box.sede_id,
        "profesional": profesional.nombre if profesional else "",
        "paciente": pac.nombre if pac else "",
        "hora_inicio": req.hora_inicio,
        "hora_fin": req.hora_fin,
        "es_urgencia": req.es_urgencia,
        "box_estado": "ocupado",
    }
    await sio.emit("box_update", event_data, room=f"sede_{box.sede_id}")
    await sio.emit("session_scheduled", event_data)

    return {"id": sesion.id, "mensaje": "Sesión agendada correctamente", **event_data}


@app.get("/api/sesiones/hoy")
def get_sesiones_hoy(sede_id: Optional[int] = None, fecha: Optional[str] = None, session: Session = Depends(get_session)):
    target_date = date.fromisoformat(fecha) if fecha else date.today()
    query = select(Sesion).where(Sesion.fecha == target_date)
    sesiones = session.exec(query).all()
    result = []
    for s in sesiones:
        box = session.get(Box, s.box_id)
        if sede_id and box and box.sede_id != sede_id:
            continue
        pac = session.get(Paciente, s.paciente_id)
        prof = session.get(Profesional, s.profesional_id)
        sede = session.get(Sede, box.sede_id) if box else None
        result.append({
            "id": s.id,
            "box_numero": box.numero if box else 0,
            "box_tipo": box.tipo if box else "",
            "sede_id": box.sede_id if box else 0,
            "sede_nombre": sede.nombre if sede else "",
            "paciente": pac.nombre if pac else "",
            "profesional": prof.nombre if prof else "",
            "hora_inicio": s.hora_inicio,
            "hora_fin": s.hora_fin,
            "estado": s.estado,
            "es_urgencia": s.es_urgencia,
        })
    return result


class CerrarSesionRequest(BaseModel):
    estado_final: str  # terminada | suspendida | extendida
    notas: Optional[str] = None


@app.post("/api/sesiones/{sesion_id}/cerrar")
async def cerrar_sesion(
    sesion_id: int,
    req: CerrarSesionRequest,
    session: Session = Depends(get_session)
):
    sesion = session.get(Sesion, sesion_id)
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    estado_map = {
        "terminada": SessionStatus.terminada,
        "suspendida": SessionStatus.suspendida,
        "extendida": SessionStatus.extendida,
    }
    nuevo_estado = estado_map.get(req.estado_final)
    if not nuevo_estado:
        raise HTTPException(status_code=422, detail="Estado final inválido")

    sesion.estado = nuevo_estado
    if req.notas:
        sesion.notas = req.notas

    box = session.get(Box, sesion.box_id)
    pac = session.get(Paciente, sesion.paciente_id)

    # Content-Based Router: route by closure status
    if nuevo_estado == SessionStatus.terminada:
        if box:
            box.estado = BoxStatus.limpieza
        # Publish-Subscribe: notify cleaning staff
        notif = Notificacion(
            destinatario_rol=UserRole.auxiliar_limpieza,
            sede_id=box.sede_id if box else 0,
            mensaje=f"Box {box.numero if box else '?'} necesita limpieza. Sesión de {pac.nombre if pac else 'paciente'} finalizada.",
            sesion_id=sesion_id,
        )
        session.add(notif)
    elif nuevo_estado == SessionStatus.extendida:
        if box:
            box.estado = BoxStatus.ocupado
    elif nuevo_estado == SessionStatus.suspendida:
        if box:
            box.estado = BoxStatus.disponible

    session.commit()

    event_data = {
        "type": "session_closed",
        "sesion_id": sesion_id,
        "box_id": sesion.box_id,
        "box_numero": box.numero if box else 0,
        "sede_id": box.sede_id if box else 0,
        "estado_final": req.estado_final,
        "box_estado": box.estado if box else "disponible",
        "paciente": pac.nombre if pac else "",
        "mensaje_limpieza": f"Box {box.numero if box else '?'} necesita limpieza" if nuevo_estado == SessionStatus.terminada else None,
    }

    # Emit to sede room (Publish-Subscribe)
    await sio.emit("box_update", event_data, room=f"sede_{box.sede_id if box else 0}")
    await sio.emit("session_closed", event_data)
    if nuevo_estado == SessionStatus.terminada:
        await sio.emit("limpieza_requerida", event_data, room=f"sede_{box.sede_id if box else 0}")

    return {"mensaje": "Sesión cerrada", **event_data}


# ---- AI Suggestion (Heuristic Engine — patient-aware) ----

HORARIOS_SUGERENCIA = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]


def _build_sugerencia(box, prof, tipo: str, razones: list, confianza: int, hora_sugerida: str = "09:00") -> dict:
    return {
        "box": {"id": box.id, "numero": box.numero, "tipo": box.tipo},
        "profesional": {"id": prof.id, "nombre": prof.nombre, "especialidad": prof.especialidad},
        "confianza": min(confianza, 98),
        "razones": razones,
        "tipo": tipo,
        "hora_sugerida": hora_sugerida,
    }


@app.get("/api/sugerencia")
def get_sugerencia(
    sede_id: int,
    es_urgencia: bool = False,
    paciente_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    today = date.today()
    boxes = session.exec(select(Box).where(Box.sede_id == sede_id)).all()
    profs = session.exec(select(Profesional).where(Profesional.sede_id == sede_id)).all()
    sesiones_hoy = session.exec(select(Sesion).where(Sesion.fecha == today)).all()

    # Compute busy hours per box so we can find free slots (enables rescheduling)
    box_busy_hours = {}
    for s in sesiones_hoy:
        if s.estado in [SessionStatus.planificada, SessionStatus.en_curso]:
            box_busy_hours.setdefault(s.box_id, set()).add(s.hora_inicio)

    busy_profs = {s.profesional_id for s in sesiones_hoy
                  if s.estado == SessionStatus.en_curso}
    patient_busy_hours = {s.hora_inicio for s in sesiones_hoy
                          if s.paciente_id == paciente_id
                          and s.estado in [SessionStatus.planificada, SessionStatus.en_curso]}

    # Include ALL boxes (not just disponible): sort disponible first so we prefer free boxes,
    # but fall back to occupied boxes with a later free slot for rescheduling suggestions
    kine_boxes = sorted(
        [b for b in boxes if b.tipo == BoxType.kinesiologia],
        key=lambda b: (0 if b.estado == BoxStatus.disponible else 1)
    )
    fono_boxes = sorted(
        [b for b in boxes if b.tipo == BoxType.fonoaudiologia],
        key=lambda b: (0 if b.estado == BoxStatus.disponible else 1)
    )
    kine_profs = [p for p in profs if p.especialidad == BoxType.kinesiologia and p.id not in busy_profs]
    fono_profs = [p for p in profs if p.especialidad == BoxType.fonoaudiologia and p.id not in busy_profs]

    # Load patient context when provided
    paciente = session.get(Paciente, paciente_id) if paciente_id else None
    paciente_context = {}
    if paciente:
        sesiones_paciente = session.exec(
            select(Sesion).where(Sesion.paciente_id == paciente_id)
        ).all()
        sesiones_completadas = [s for s in sesiones_paciente if s.estado == SessionStatus.terminada]
        paciente_context = {
            "necesita_kine": paciente.necesita_kine,
            "necesita_fono": paciente.necesita_fono,
            "frec_kine": paciente.frecuencia_semanal_kine,
            "frec_fono": paciente.frecuencia_semanal_fono,
            "pref_kine_id": paciente.profesional_preferido_kine_id,
            "pref_fono_id": paciente.profesional_preferido_fono_id,
            "etapa": paciente.etapa,
            "historial_count": len(sesiones_completadas),
        }

    sugerencias = []

    def find_slot(box_list):
        """Return (box, hora) — first slot where box is free AND patient is free."""
        for box in box_list:
            busy = box_busy_hours.get(box.id, set())
            for hora in HORARIOS_SUGERENCIA:
                if hora not in busy and hora not in patient_busy_hours:
                    return box, hora
        return None, None

    # --- Heuristic rules (RN-05, RN-06, RN-19) ---

    def make_kine_sug():
        if not kine_profs:
            return None
        box, hora = find_slot(kine_boxes)
        if not box:
            return None
        is_reagenda = box.estado != BoxStatus.disponible
        disp_count = sum(1 for b in kine_boxes if b.estado == BoxStatus.disponible)
        razones = ["box-tipo-match", "prof-disponible"]
        if is_reagenda:
            razones.append(f"reagendamiento:box-{box.numero}-libre-a-{hora}")
        else:
            razones.append(f"boxes-kine-disp:{disp_count}")
        confianza = 75
        if is_reagenda:
            confianza -= 5

        if es_urgencia:
            razones.append("urgencia-prioridad-alta")
            confianza += 10

        if paciente:
            if paciente_context["necesita_kine"]:
                razones.append("tratamiento-requerido:kinesiologia")
                confianza += 8
            else:
                razones.append("⚠️ paciente-no-requiere-kine")
                confianza -= 20

            etapa = paciente_context["etapa"]
            if etapa == EtapaTratamiento.bebes_sin_marcha:
                razones.append(f"etapa:bebes-sin-marcha→prioridad-alta")
                confianza += 5
            elif etapa == EtapaTratamiento.preescolar_escolar:
                razones.append(f"etapa:preescolar-escolar")
                confianza += 3
            else:
                razones.append(f"etapa:transicion-vida-adulta")
                confianza += 2

            pref_id = paciente_context["pref_kine_id"]
            pref_prof = next((p for p in kine_profs if p.id == pref_id), None)
            if pref_prof:
                razones.append(f"prof-habitual:{pref_prof.nombre.split()[1]}")
                confianza += 7
                chosen_prof = pref_prof
            else:
                chosen_prof = kine_profs[0]
                if pref_id:
                    razones.append("prof-habitual-ocupado→alternativa")

            hist = paciente_context["historial_count"]
            if hist > 0:
                razones.append(f"historial:{hist}-sesiones-completadas")
                confianza += min(hist, 5)
            else:
                razones.append("primera-sesion→supervisión-recomendada")
                confianza -= 5

            frec = paciente_context["frec_kine"]
            if frec >= 3:
                razones.append(f"frecuencia-alta:{frec}x/semana")
                confianza += 3
        else:
            chosen_prof = kine_profs[0]

        return _build_sugerencia(box, chosen_prof, "kinesiologia", razones, confianza, hora)

    def make_fono_sug():
        if not fono_profs:
            return None
        box, hora = find_slot(fono_boxes)
        if not box:
            return None
        is_reagenda = box.estado != BoxStatus.disponible
        disp_count = sum(1 for b in fono_boxes if b.estado == BoxStatus.disponible)
        razones = ["box-tipo-match", "prof-disponible"]
        if is_reagenda:
            razones.append(f"reagendamiento:box-{box.numero}-libre-a-{hora}")
        else:
            razones.append(f"boxes-fono-disp:{disp_count}")
        confianza = 75
        if is_reagenda:
            confianza -= 5

        if es_urgencia:
            razones.append("urgencia-prioridad-alta")
            confianza += 10

        if paciente:
            if paciente_context["necesita_fono"]:
                razones.append("tratamiento-requerido:fonoaudiologia")
                confianza += 8
            else:
                razones.append("⚠️ paciente-no-requiere-fono")
                confianza -= 20

            etapa = paciente_context["etapa"]
            if etapa == EtapaTratamiento.transicion_vida_adulta:
                razones.append("etapa:transicion-fono-prioritaria")
                confianza += 6
            elif etapa == EtapaTratamiento.preescolar_escolar:
                razones.append("etapa:preescolar-lenguaje")
                confianza += 4
            else:
                razones.append("etapa:bebes-sin-marcha")
                confianza += 2

            pref_id = paciente_context["pref_fono_id"]
            pref_prof = next((p for p in fono_profs if p.id == pref_id), None)
            if pref_prof:
                razones.append(f"prof-habitual:{pref_prof.nombre.split()[1]}")
                confianza += 7
                chosen_prof = pref_prof
            else:
                chosen_prof = fono_profs[0]
                if pref_id:
                    razones.append("prof-habitual-ocupado→alternativa")

            hist = paciente_context["historial_count"]
            if hist > 0:
                razones.append(f"historial:{hist}-sesiones-completadas")
                confianza += min(hist, 5)

            frec = paciente_context["frec_fono"]
            if frec >= 2:
                razones.append(f"frecuencia:{frec}x/semana")
                confianza += 2
        else:
            chosen_prof = fono_profs[0]

        return _build_sugerencia(box, chosen_prof, "fonoaudiologia", razones, confianza, hora)

    # Decide what to suggest based on patient needs
    if paciente:
        needs_kine = paciente_context["necesita_kine"]
        needs_fono = paciente_context["necesita_fono"]
        if needs_kine:
            s = make_kine_sug()
            if s:
                sugerencias.append(s)
        if needs_fono:
            s = make_fono_sug()
            if s:
                sugerencias.append(s)
        # If patient needs neither explicitly (shouldn't happen) fall back to both
        if not sugerencias:
            for fn in [make_kine_sug, make_fono_sug]:
                s = fn()
                if s:
                    sugerencias.append(s)
    else:
        # No patient — suggest best available of each type
        for fn in [make_kine_sug, make_fono_sug]:
            s = fn()
            if s:
                sugerencias.append(s)

    # Sort by confidence descending
    sugerencias.sort(key=lambda x: x["confianza"], reverse=True)

    if not sugerencias:
        return {"sugerencias": [], "mensaje": "No hay disponibilidad en este momento", "disponibilidad_baja": True}

    paciente_nombre = paciente.nombre if paciente else None
    return {
        "sugerencias": sugerencias,
        "confianza_baja": sugerencias[0]["confianza"] < 70,
        "es_urgencia": es_urgencia,
        "paciente_nombre": paciente_nombre,
        "mensaje": (
            f"Sugerencia personalizada para {paciente_nombre} (RN-05, RN-06, RN-19)"
            if paciente_nombre
            else "Sugerencia heurística basada en RN-05, RN-06, RN-19"
        ),
    }


# ---- Dashboard Global (Aggregator EIP) ----

@app.get("/api/dashboard/global")
def dashboard_global(session: Session = Depends(get_session)):
    today = date.today()
    sedes = session.exec(select(Sede)).all()
    resultado = []

    for sede in sedes:
        boxes = session.exec(select(Box).where(Box.sede_id == sede.id)).all()
        sesiones = session.exec(
            select(Sesion).where(Sesion.fecha == today)
        ).all()
        sesiones_sede = [
            s for s in sesiones
            if any(b.id == s.box_id for b in boxes)
        ]
        disponibles = sum(1 for b in boxes if b.estado == BoxStatus.disponible)
        ocupados = sum(1 for b in boxes if b.estado == BoxStatus.ocupado)
        mantencion = sum(1 for b in boxes if b.estado == BoxStatus.mantencion)
        limpieza = sum(1 for b in boxes if b.estado == BoxStatus.limpieza)

        resultado.append({
            "sede_id": sede.id,
            "sede_nombre": sede.nombre,
            "ciudad": sede.ciudad,
            "total_boxes": len(boxes),
            "disponibles": disponibles,
            "ocupados": ocupados,
            "mantencion": mantencion,
            "limpieza": limpieza,
            "sesiones_hoy": len(sesiones_sede),
            "sesiones_completadas": sum(1 for s in sesiones_sede if s.estado == SessionStatus.terminada),
            "sesiones_en_curso": sum(1 for s in sesiones_sede if s.estado == SessionStatus.en_curso),
            "tasa_ocupacion": round((ocupados / len(boxes)) * 100) if boxes else 0,
        })

    totales = {
        "total_boxes": sum(r["total_boxes"] for r in resultado),
        "disponibles": sum(r["disponibles"] for r in resultado),
        "ocupados": sum(r["ocupados"] for r in resultado),
        "sesiones_hoy": sum(r["sesiones_hoy"] for r in resultado),
        "sesiones_completadas": sum(r["sesiones_completadas"] for r in resultado),
    }
    return {"sedes": resultado, "totales": totales, "fecha": str(today)}


# ---- Notifications ----

@app.get("/api/notificaciones")
def get_notificaciones(sede_id: int, session: Session = Depends(get_session)):
    notifs = session.exec(
        select(Notificacion).where(
            Notificacion.sede_id == sede_id,
            Notificacion.leida == False,
        )
    ).all()
    return [
        {"id": n.id, "mensaje": n.mensaje, "destinatario_rol": n.destinatario_rol,
         "creado_en": str(n.creado_en), "sesion_id": n.sesion_id}
        for n in notifs
    ]


@app.post("/api/notificaciones/{notif_id}/leer")
def marcar_leida(notif_id: int, session: Session = Depends(get_session)):
    notif = session.get(Notificacion, notif_id)
    if notif:
        notif.leida = True
        session.commit()
    return {"ok": True}


# ---- Socket.io events ----

@sio.event
async def connect(sid, environ):
    pass


@sio.event
async def disconnect(sid):
    pass


@sio.event
async def join_sede(sid, data):
    sede_id = data.get("sede_id")
    if sede_id:
        await sio.enter_room(sid, f"sede_{sede_id}")


@sio.event
async def join_global(sid, data):
    await sio.enter_room(sid, "global")
