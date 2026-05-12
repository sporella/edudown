from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, date, time
from enum import Enum


class BoxStatus(str, Enum):
    disponible = "disponible"
    ocupado = "ocupado"
    mantencion = "mantencion"
    limpieza = "limpieza"


class BoxType(str, Enum):
    kinesiologia = "kinesiologia"
    fonoaudiologia = "fonoaudiologia"


class SessionStatus(str, Enum):
    planificada = "planificada"
    en_curso = "en_curso"
    terminada = "terminada"
    suspendida = "suspendida"
    extendida = "extendida"


class UserRole(str, Enum):
    admin_institucion = "admin_institucion"
    admin_sede = "admin_sede"
    enfermera = "enfermera"
    medico_kinesiologo = "medico_kinesiologo"
    medico_fonoaudiologo = "medico_fonoaudiologo"
    auxiliar_limpieza = "auxiliar_limpieza"
    jefe_auxiliares = "jefe_auxiliares"


class EtapaTratamiento(str, Enum):
    bebes_sin_marcha = "bebes_sin_marcha"
    preescolar_escolar = "preescolar_escolar"
    transicion_vida_adulta = "transicion_vida_adulta"


class Sede(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    ciudad: str
    boxes: List["Box"] = Relationship(back_populates="sede")
    profesionales: List["Profesional"] = Relationship(back_populates="sede")
    pacientes: List["Paciente"] = Relationship(back_populates="sede")


class Box(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    numero: int
    tipo: BoxType
    estado: BoxStatus = BoxStatus.disponible
    sede_id: int = Field(foreign_key="sede.id")
    sede: Optional[Sede] = Relationship(back_populates="boxes")
    sesiones: List["Sesion"] = Relationship(back_populates="box")


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    email: str = Field(unique=True)
    password_hash: str
    rol: UserRole
    sede_id: Optional[int] = Field(default=None, foreign_key="sede.id")
    profesional_id: Optional[int] = Field(default=None, foreign_key="profesional.id")


class Profesional(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    especialidad: BoxType
    sede_id: int = Field(foreign_key="sede.id")
    disponible: bool = True
    sede: Optional[Sede] = Relationship(back_populates="profesionales")
    sesiones: List["Sesion"] = Relationship(back_populates="profesional")


class Paciente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    fecha_nacimiento: date
    etapa: EtapaTratamiento
    sede_id: int = Field(foreign_key="sede.id")
    # Necesidades terapéuticas (RN-05)
    necesita_kine: bool = True
    necesita_fono: bool = False
    frecuencia_semanal_kine: int = Field(default=2)  # sesiones/semana recomendadas
    frecuencia_semanal_fono: int = Field(default=0)
    # Continuidad de cuidado
    profesional_preferido_kine_id: Optional[int] = Field(default=None, foreign_key="profesional.id")
    profesional_preferido_fono_id: Optional[int] = Field(default=None, foreign_key="profesional.id")
    # Perfil clínico
    notas_clinicas: Optional[str] = None
    necesidades_especiales: Optional[str] = None
    alergias: Optional[str] = None
    activo: bool = True
    sede: Optional[Sede] = Relationship(back_populates="pacientes")
    sesiones: List["Sesion"] = Relationship(back_populates="paciente")


class Sesion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    box_id: int = Field(foreign_key="box.id")
    profesional_id: int = Field(foreign_key="profesional.id")
    paciente_id: int = Field(foreign_key="paciente.id")
    fecha: date
    hora_inicio: str
    hora_fin: str
    estado: SessionStatus = SessionStatus.planificada
    es_urgencia: bool = False
    reagendada_por_urgencia: bool = False
    notas: Optional[str] = None
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    box: Optional[Box] = Relationship(back_populates="sesiones")
    profesional: Optional[Profesional] = Relationship(back_populates="sesiones")
    paciente: Optional[Paciente] = Relationship(back_populates="sesiones")


class Notificacion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    destinatario_rol: UserRole
    sede_id: int
    mensaje: str
    leida: bool = False
    creado_en: datetime = Field(default_factory=datetime.utcnow)
    sesion_id: Optional[int] = Field(default=None, foreign_key="sesion.id")
