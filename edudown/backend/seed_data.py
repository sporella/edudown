from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import (
    Sede, Box, BoxType, BoxStatus, User, UserRole,
    Profesional, Paciente, Sesion, EtapaTratamiento, SessionStatus
)
from datetime import date, timedelta
import hashlib


def fake_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def seed():
    create_db_and_tables()
    with Session(engine) as session:
        if session.exec(select(Sede)).first():
            return

        sedes_data = [
            ("Providencia", "Santiago"),
            ("San Bernardo", "Santiago"),
            ("Temuco", "Temuco"),
            ("La Serena", "La Serena"),
        ]
        sedes = []
        for nombre, ciudad in sedes_data:
            s = Sede(nombre=nombre, ciudad=ciudad)
            session.add(s)
            sedes.append(s)
        session.commit()
        for s in sedes:
            session.refresh(s)

        # 12 boxes per sede: 7 kine + 5 fono (60/40 approx)
        boxes_por_sede = []
        for sede in sedes:
            sede_boxes = []
            for i in range(1, 13):
                tipo = BoxType.kinesiologia if i <= 7 else BoxType.fonoaudiologia
                estado = BoxStatus.disponible
                if i in [2, 5]:
                    estado = BoxStatus.ocupado
                elif i == 8:
                    estado = BoxStatus.mantencion
                b = Box(numero=i, tipo=tipo, estado=estado, sede_id=sede.id)
                session.add(b)
                sede_boxes.append(b)
            boxes_por_sede.append(sede_boxes)
        session.commit()

        # Users
        users = [
            User(nombre="Carolina Vásquez", email="admin@edudown.cl",
                 password_hash=fake_hash("admin123"),
                 rol=UserRole.admin_institucion, sede_id=None),
            User(nombre="Marcela Torres", email="enfermera@edudown.cl",
                 password_hash=fake_hash("enf123"),
                 rol=UserRole.enfermera, sede_id=sedes[0].id),
            User(nombre="Roberto Muñoz", email="kine@edudown.cl",
                 password_hash=fake_hash("kine123"),
                 rol=UserRole.medico_kinesiologo, sede_id=sedes[0].id),
            User(nombre="Sofía Reyes", email="fono@edudown.cl",
                 password_hash=fake_hash("fono123"),
                 rol=UserRole.medico_fonoaudiologo, sede_id=sedes[0].id),
            User(nombre="Jorge Pérez", email="auxiliar@edudown.cl",
                 password_hash=fake_hash("aux123"),
                 rol=UserRole.auxiliar_limpieza, sede_id=sedes[0].id),
            User(nombre="Ana García", email="adminsede@edudown.cl",
                 password_hash=fake_hash("sede123"),
                 rol=UserRole.admin_sede, sede_id=sedes[0].id),
        ]
        for u in users:
            session.add(u)
        session.commit()

        # Profesionales - 3 kine + 2 fono per sede
        prof_names_kine = [
            ["Dr. Roberto Muñoz", "Dr. Felipe Castro", "Dra. Carmen López"],
            ["Dr. Andrés Silva", "Dra. Valentina Rojo", "Dr. Ignacio Mora"],
            ["Dr. Héctor Núñez", "Dra. Lorena Pinto", "Dr. Sebastián Vega"],
            ["Dra. Patricia Rojas", "Dr. Cristóbal Díaz", "Dra. Francisca Soto"],
        ]
        prof_names_fono = [
            ["Dra. Sofía Reyes", "Dra. Daniela Herrera"],
            ["Dra. Javiera Ortiz", "Dr. Matías Torres"],
            ["Dra. Camila Fuentes", "Dra. Paz Morales"],
            ["Dr. Felipe Lara", "Dra. Nicole Castro"],
        ]
        profesionales_por_sede = []
        for idx, sede in enumerate(sedes):
            profs = []
            for nombre in prof_names_kine[idx]:
                p = Profesional(nombre=nombre, especialidad=BoxType.kinesiologia,
                                sede_id=sede.id, disponible=True)
                session.add(p)
                profs.append(p)
            for nombre in prof_names_fono[idx]:
                p = Profesional(nombre=nombre, especialidad=BoxType.fonoaudiologia,
                                sede_id=sede.id, disponible=True)
                session.add(p)
                profs.append(p)
            profesionales_por_sede.append(profs)
        session.commit()
        for profs in profesionales_por_sede:
            for p in profs:
                session.refresh(p)

        # Pacientes - 5 per sede con perfil clínico detallado
        paciente_data = [
            # (nombre, nacimiento, etapa, necesita_kine, necesita_fono, frec_kine, frec_fono, notas)
            ("Matías González",  date(2023, 3, 15), EtapaTratamiento.bebes_sin_marcha,
             True, False, 3, 0,
             "Retraso en adquisición de marcha. Prioridad: estimulación motriz gruesa. Tolera bien sesiones de 45 min."),
            ("Sofía Hernández",  date(2019, 7, 22), EtapaTratamiento.preescolar_escolar,
             True, True, 2, 2,
             "Hipotonicidad moderada y dificultades de lenguaje. Requiere sesiones coordinadas kine+fono. Avance sostenido."),
            ("Diego Martínez",   date(2007, 11, 10), EtapaTratamiento.transicion_vida_adulta,
             False, True, 0, 3,
             "Trabajo en comunicación funcional para vida independiente. Alta motivación, buen progreso en lectura labial."),
            ("Valentina López",  date(2018, 1, 5), EtapaTratamiento.preescolar_escolar,
             True, True, 2, 1,
             "Escoliosis leve asociada. Fisioterapia preventiva + apoyo fonoaudiológico para integración sensorial."),
            ("Bastián Pérez",    date(2022, 9, 28), EtapaTratamiento.bebes_sin_marcha,
             True, False, 3, 0,
             "Recién ingresado. Evaluación motriz inicial completada. Inicio de programa de estimulación temprana."),
        ]
        paciente_nombres_extra = [
            [("Javiera Rojas",  date(2021, 4, 10), EtapaTratamiento.bebes_sin_marcha,   True, True,  2, 1, "Estimulación temprana. Buena respuesta a terapia acuática complementaria."),
             ("Nicolás Castro", date(2016, 8, 3),  EtapaTratamiento.preescolar_escolar,  True, False, 3, 0, "Trabajo en marcha independiente. Órtesis de tobillo. Seguimiento mensual traumatología."),
             ("Isidora Torres", date(2005, 2, 18), EtapaTratamiento.transicion_vida_adulta, False, True, 0, 2, "Habilidades comunicacionales para inserción laboral. Excelente progreso."),
             ("Emilio Morales", date(2017, 6, 25), EtapaTratamiento.preescolar_escolar,  True, True,  2, 2, "Dificultades de deglución y coordinación. Plan integral bilateral."),
             ("Renata Silva",   date(2023, 11, 5), EtapaTratamiento.bebes_sin_marcha,   True, False, 3, 0, "Control postural en desarrollo. Primera evaluación fisioterapéutica hace 2 semanas.")],
            [("Agustín Fuentes", date(2020, 3, 20), EtapaTratamiento.bebes_sin_marcha,  True, False, 3, 0, "Hipersensibilidad táctil. Trabajo progresivo de integración sensorial."),
             ("Amanda Vargas",   date(2015, 9, 12), EtapaTratamiento.preescolar_escolar, True, True,  2, 2, "Refuerzo motriz y de lenguaje. Muy activa, sesiones dinámicas."),
             ("Cristóbal Reyes", date(2006, 7, 4),  EtapaTratamiento.transicion_vida_adulta, True, True, 1, 2, "Mantenimiento físico + habilidades comunicacionales. Trabaja medio tiempo."),
             ("Catalina Soto",   date(2019, 12, 1), EtapaTratamiento.preescolar_escolar, False, True, 0, 3, "Trastorno de habla moderado. Avances significativos en articulación."),
             ("Lucas Díaz",      date(2022, 5, 17), EtapaTratamiento.bebes_sin_marcha,   True, False, 3, 0, "Retraso motor global. Programa intensivo primer año.")],
            [("Fernanda Muñoz",  date(2021, 1, 8),  EtapaTratamiento.bebes_sin_marcha,  True, True,  2, 1, "Estimulación integral. Buena vinculación con equipo clínico."),
             ("Pablo Ortiz",     date(2014, 10, 30), EtapaTratamiento.preescolar_escolar, True, False, 2, 0, "Postura y marcha. Usa bastones canadienses. Meta: movilidad autónoma."),
             ("Belén Navarro",   date(2004, 3, 22), EtapaTratamiento.transicion_vida_adulta, False, True, 0, 2, "Preparación para entrevistas laborales. Dicción y pragmática del lenguaje."),
             ("Tomás Ramírez",   date(2018, 7, 14), EtapaTratamiento.preescolar_escolar, True, True,  3, 1, "Coordinación motora fina + lenguaje. Requiere atención personalizada."),
             ("Martina Ríos",    date(2023, 8, 19), EtapaTratamiento.bebes_sin_marcha,   True, False, 3, 0, "Primer mes de tratamiento. Evaluación neurológica pendiente.")],
        ]

        pacientes_por_sede = []
        # Sede 0 (Providencia) usa paciente_data, resto usa paciente_nombres_extra
        for idx, sede in enumerate(sedes):
            pacs = []
            data_list = paciente_data if idx == 0 else paciente_nombres_extra[idx - 1]
            profs_sede = profesionales_por_sede[idx]
            kine_profs_sede = [p for p in profs_sede if p.especialidad == BoxType.kinesiologia]
            fono_profs_sede = [p for p in profs_sede if p.especialidad == BoxType.fonoaudiologia]

            for j, row in enumerate(data_list):
                nombre, nacimiento, etapa, nk, nf, fk, ff, notas = row
                pref_kine = kine_profs_sede[j % len(kine_profs_sede)].id if nk and kine_profs_sede else None
                pref_fono = fono_profs_sede[j % len(fono_profs_sede)].id if nf and fono_profs_sede else None
                p = Paciente(
                    nombre=nombre,
                    fecha_nacimiento=nacimiento,
                    etapa=etapa,
                    sede_id=sede.id,
                    necesita_kine=nk,
                    necesita_fono=nf,
                    frecuencia_semanal_kine=fk,
                    frecuencia_semanal_fono=ff,
                    profesional_preferido_kine_id=pref_kine,
                    profesional_preferido_fono_id=pref_fono,
                    notas_clinicas=notas,
                )
                session.add(p)
                pacs.append(p)
            pacientes_por_sede.append(pacs)
        session.commit()
        for pacs in pacientes_por_sede:
            for p in pacs:
                session.refresh(p)

        # Refresh boxes
        for boxes in boxes_por_sede:
            for b in boxes:
                session.refresh(b)

        # Sessions for today
        today = date.today()
        horarios = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00"]
        fin_horarios = ["10:00", "11:00", "12:00", "13:00", "15:00", "16:00", "17:00"]

        for idx, sede in enumerate(sedes):
            profs = profesionales_por_sede[idx]
            pacs = pacientes_por_sede[idx]
            boxes = boxes_por_sede[idx]

            for j in range(min(5, len(pacs))):
                prof = profs[j % len(profs)]
                pac = pacs[j]
                box = boxes[j]
                estado = SessionStatus.en_curso if j == 1 else SessionStatus.planificada
                s = Sesion(
                    box_id=box.id,
                    profesional_id=prof.id,
                    paciente_id=pac.id,
                    fecha=today,
                    hora_inicio=horarios[j],
                    hora_fin=fin_horarios[j],
                    estado=estado,
                    es_urgencia=False,
                )
                session.add(s)
        session.commit()

    print("Seed data cargado correctamente.")


if __name__ == "__main__":
    seed()
