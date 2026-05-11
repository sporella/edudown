import axios from 'axios'

// ─── Helpers ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0]

function offsetDate(isoDate, days) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function parseUrl(url) {
  const [path, qs = ''] = url.split('?')
  const params = {}
  if (qs) qs.split('&').forEach(p => {
    const [k, v] = p.split('=')
    if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '')
  })
  return { path, params }
}

function ok(data) { return { data, status: 200 } }
function err(detail, status = 400) { return { data: { detail }, status } }

// ─── Seed data ──────────────────────────────────────────────────────────────

const SEDES = [
  { id: 1, nombre: 'Providencia', ciudad: 'Santiago' },
  { id: 2, nombre: 'San Bernardo', ciudad: 'Santiago' },
  { id: 3, nombre: 'Temuco', ciudad: 'Temuco' },
  { id: 4, nombre: 'La Serena', ciudad: 'La Serena' },
]

const INITIAL_BOXES = []
let _bid = 1
for (const sede of SEDES) {
  for (let num = 1; num <= 12; num++) {
    const tipo = num <= 7 ? 'kinesiologia' : 'fonoaudiologia'
    let estado = 'disponible'
    if (num === 2 || num === 5) estado = 'ocupado'
    else if (num === 8) estado = 'mantencion'
    INITIAL_BOXES.push({ id: _bid++, numero: num, tipo, estado, sede_id: sede.id })
  }
}

const PROF_KINE = [
  ['Dr. Roberto Muñoz', 'Dr. Felipe Castro', 'Dra. Carmen López'],
  ['Dr. Andrés Silva', 'Dra. Valentina Rojo', 'Dr. Ignacio Mora'],
  ['Dr. Héctor Núñez', 'Dra. Lorena Pinto', 'Dr. Sebastián Vega'],
  ['Dra. Patricia Rojas', 'Dr. Cristóbal Díaz', 'Dra. Francisca Soto'],
]
const PROF_FONO = [
  ['Dra. Sofía Reyes', 'Dra. Daniela Herrera'],
  ['Dra. Javiera Ortiz', 'Dr. Matías Torres'],
  ['Dra. Camila Fuentes', 'Dra. Paz Morales'],
  ['Dr. Felipe Lara', 'Dra. Nicole Castro'],
]

const PROFESIONALES = []
let _pid = 1
for (let i = 0; i < 4; i++) {
  for (const n of PROF_KINE[i]) PROFESIONALES.push({ id: _pid++, nombre: n, especialidad: 'kinesiologia', sede_id: i + 1, disponible: true })
  for (const n of PROF_FONO[i]) PROFESIONALES.push({ id: _pid++, nombre: n, especialidad: 'fonoaudiologia', sede_id: i + 1, disponible: true })
}

const PAC_ROWS = [
  [
    ['Matías González', '2023-03-15', 'bebes_sin_marcha', true, false, 3, 0, 'Retraso en adquisición de marcha. Estimulación motriz gruesa. Tolera bien sesiones de 45 min.'],
    ['Sofía Hernández', '2019-07-22', 'preescolar_escolar', true, true, 2, 2, 'Hipotonicidad moderada y dificultades de lenguaje. Requiere sesiones coordinadas kine+fono.'],
    ['Diego Martínez', '2007-11-10', 'transicion_vida_adulta', false, true, 0, 3, 'Trabajo en comunicación funcional para vida independiente. Alta motivación.'],
    ['Valentina López', '2018-01-05', 'preescolar_escolar', true, true, 2, 1, 'Escoliosis leve asociada. Fisioterapia preventiva + apoyo fonoaudiológico.'],
    ['Bastián Pérez', '2022-09-28', 'bebes_sin_marcha', true, false, 3, 0, 'Recién ingresado. Inicio de programa de estimulación temprana.'],
  ],
  [
    ['Javiera Rojas', '2021-04-10', 'bebes_sin_marcha', true, true, 2, 1, 'Estimulación temprana. Buena respuesta a terapia acuática complementaria.'],
    ['Nicolás Castro', '2016-08-03', 'preescolar_escolar', true, false, 3, 0, 'Trabajo en marcha independiente. Órtesis de tobillo.'],
    ['Isidora Torres', '2005-02-18', 'transicion_vida_adulta', false, true, 0, 2, 'Habilidades comunicacionales para inserción laboral. Excelente progreso.'],
    ['Emilio Morales', '2017-06-25', 'preescolar_escolar', true, true, 2, 2, 'Dificultades de deglución y coordinación. Plan integral bilateral.'],
    ['Renata Silva', '2023-11-05', 'bebes_sin_marcha', true, false, 3, 0, 'Control postural en desarrollo.'],
  ],
  [
    ['Agustín Fuentes', '2020-03-20', 'bebes_sin_marcha', true, false, 3, 0, 'Hipersensibilidad táctil. Trabajo progresivo de integración sensorial.'],
    ['Amanda Vargas', '2015-09-12', 'preescolar_escolar', true, true, 2, 2, 'Refuerzo motriz y de lenguaje. Muy activa, sesiones dinámicas.'],
    ['Cristóbal Reyes', '2006-07-04', 'transicion_vida_adulta', true, true, 1, 2, 'Mantenimiento físico + habilidades comunicacionales. Trabaja medio tiempo.'],
    ['Catalina Soto', '2019-12-01', 'preescolar_escolar', false, true, 0, 3, 'Trastorno de habla moderado. Avances significativos en articulación.'],
    ['Lucas Díaz', '2022-05-17', 'bebes_sin_marcha', true, false, 3, 0, 'Retraso motor global. Programa intensivo primer año.'],
  ],
  [
    ['Fernanda Muñoz', '2021-01-08', 'bebes_sin_marcha', true, true, 2, 1, 'Estimulación integral. Buena vinculación con equipo clínico.'],
    ['Pablo Ortiz', '2014-10-30', 'preescolar_escolar', true, false, 2, 0, 'Postura y marcha. Usa bastones canadienses.'],
    ['Belén Navarro', '2004-03-22', 'transicion_vida_adulta', false, true, 0, 2, 'Preparación para entrevistas laborales. Dicción y pragmática del lenguaje.'],
    ['Tomás Ramírez', '2018-07-14', 'preescolar_escolar', true, true, 3, 1, 'Coordinación motora fina + lenguaje. Requiere atención personalizada.'],
    ['Martina Ríos', '2023-08-19', 'bebes_sin_marcha', true, false, 3, 0, 'Primer mes de tratamiento. Evaluación neurológica pendiente.'],
  ],
]

const PACIENTES = []
let _acId = 1
for (let si = 0; si < 4; si++) {
  const kine = PROFESIONALES.filter(p => p.sede_id === si + 1 && p.especialidad === 'kinesiologia')
  const fono = PROFESIONALES.filter(p => p.sede_id === si + 1 && p.especialidad === 'fonoaudiologia')
  PAC_ROWS[si].forEach(([nombre, nac, etapa, nk, nf, fk, ff, notas], j) => {
    PACIENTES.push({
      id: _acId++,
      nombre, fecha_nacimiento: nac, etapa,
      sede_id: si + 1,
      necesita_kine: nk, necesita_fono: nf,
      frecuencia_semanal_kine: fk, frecuencia_semanal_fono: ff,
      notas_clinicas: notas,
      profesional_preferido_kine: nk ? kine[j % kine.length] : null,
      profesional_preferido_fono: nf ? fono[j % fono.length] : null,
    })
  })
}

const USERS = [
  { id: 1, nombre: 'Carolina Vásquez', email: 'admin@edudown.cl', password: 'admin123', rol: 'admin_institucion', sede_id: null },
  { id: 2, nombre: 'Marcela Torres', email: 'enfermera@edudown.cl', password: 'enf123', rol: 'enfermera', sede_id: 1 },
  { id: 3, nombre: 'Roberto Muñoz', email: 'kine@edudown.cl', password: 'kine123', rol: 'medico_kinesiologo', sede_id: 1 },
  { id: 4, nombre: 'Sofía Reyes', email: 'fono@edudown.cl', password: 'fono123', rol: 'medico_fonoaudiologo', sede_id: 1 },
  { id: 5, nombre: 'Jorge Pérez', email: 'auxiliar@edudown.cl', password: 'aux123', rol: 'auxiliar_limpieza', sede_id: 1 },
  { id: 6, nombre: 'Ana García', email: 'adminsede@edudown.cl', password: 'sede123', rol: 'admin_sede', sede_id: 1 },
]

const HORARIOS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00']
const HORARIOS_FIN = {
  '08:00': '09:00', '09:00': '10:00', '10:00': '11:00', '11:00': '12:00',
  '12:00': '13:00', '14:00': '15:00', '15:00': '16:00', '16:00': '17:00', '17:00': '18:00',
}


// ─── Mutable in-memory state ─────────────────────────────────────────────────

function makeSessions(dateStr) {
  const isToday = dateStr === TODAY
  const isFuture = dateStr > TODAY
  const sessions = []
  for (let si = 0; si < 4; si++) {
    const profs = PROFESIONALES.filter(p => p.sede_id === si + 1)
    const pacs = PACIENTES.filter(p => p.sede_id === si + 1)
    const boxes = INITIAL_BOXES.filter(b => b.sede_id === si + 1)
    for (let j = 0; j < 5; j++) {
      const prof = profs[j % profs.length]
      const pac = pacs[j]
      const box = boxes[j]
      const estado = isToday ? (j === 1 ? 'en_curso' : 'planificada') : (isFuture ? 'planificada' : 'terminada')
      sessions.push({
        id: (si * 100 + j + 1) + (isFuture ? 2000 : isToday ? 1000 : 0),
        box_id: box.id, box_numero: box.numero, box_tipo: box.tipo,
        sede_id: si + 1, sede_nombre: SEDES[si].nombre,
        profesional_id: prof.id, profesional: prof.nombre,
        paciente_id: pac.id, paciente: pac.nombre,
        fecha: dateStr,
        hora_inicio: HORARIOS[j], hora_fin: HORARIOS_FIN[HORARIOS[j]],
        estado, es_urgencia: false, notas: null,
      })
    }
  }
  return sessions
}

const state = {
  boxes: INITIAL_BOXES.map(b => ({ ...b })),
  sessions: [
    ...makeSessions(offsetDate(TODAY, -3)),
    ...makeSessions(offsetDate(TODAY, -2)),
    ...makeSessions(offsetDate(TODAY, -1)),
    ...makeSessions(TODAY),
    ...makeSessions(offsetDate(TODAY, 1)),
    ...makeSessions(offsetDate(TODAY, 2)),
    ...makeSessions(offsetDate(TODAY, 3)),
  ],
  notifications: [],
  nextId: 5000,
  nextNotifId: 1,
}

// ─── Route handlers ──────────────────────────────────────────────────────────

function boxesWithSessions(sedeId) {
  return state.boxes
    .filter(b => b.sede_id === sedeId)
    .map(b => {
      const s = state.sessions.find(
        s => s.box_id === b.id && s.fecha === TODAY &&
          (s.estado === 'en_curso' || s.estado === 'planificada')
      )
      return {
        ...b,
        sesion_activa: s ? {
          id: s.id, paciente: s.paciente, profesional: s.profesional,
          hora_inicio: s.hora_inicio, hora_fin: s.hora_fin,
        } : null,
      }
    })
}

function handleMock(config) {
  const { url = '', method = 'get' } = config
  const { path, params } = parseUrl(url)
  const m = method.toLowerCase()
  let body = {}
  try { body = config.data ? (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) : {} } catch {}

  // POST /api/auth/login
  if (m === 'post' && path.includes('/api/auth/login')) {
    const u = USERS.find(u => u.email === body.email && u.password === body.password)
    if (!u) return err('Credenciales incorrectas', 401)
    const { password: _, ...out } = u
    return ok(out)
  }

  // GET /api/sedes
  if (m === 'get' && /\/api\/sedes$/.test(path)) return ok(SEDES)

  // GET /api/sedes/:id/boxes
  const mBoxes = path.match(/\/api\/sedes\/(\d+)\/boxes$/)
  if (m === 'get' && mBoxes) return ok(boxesWithSessions(+mBoxes[1]))

  // GET /api/sedes/:id/profesionales
  const mProfs = path.match(/\/api\/sedes\/(\d+)\/profesionales$/)
  if (m === 'get' && mProfs) {
    const sedeId = +mProfs[1]
    const busyIds = new Set(
      state.sessions
        .filter(s => s.fecha === TODAY && (s.estado === 'en_curso' || s.estado === 'planificada'))
        .map(s => s.profesional_id)
    )
    return ok(PROFESIONALES.filter(p => p.sede_id === sedeId).map(p => ({
      ...p, disponible: !busyIds.has(p.id),
    })))
  }

  // GET /api/sedes/:id/pacientes
  const mPacs = path.match(/\/api\/sedes\/(\d+)\/pacientes$/)
  if (m === 'get' && mPacs) {
    const sedeId = +mPacs[1]
    const todaySess = state.sessions.filter(s => s.fecha === TODAY && s.sede_id === sedeId)
    return ok(PACIENTES.filter(p => p.sede_id === sedeId).map(p => ({
      ...p,
      sesiones_total: state.sessions.filter(s => s.paciente_id === p.id).length,
      sesiones_completadas: state.sessions.filter(s => s.paciente_id === p.id && s.estado === 'terminada').length,
      sesiones_hoy: todaySess.filter(s => s.paciente_id === p.id).map(s => ({
        id: s.id, hora_inicio: s.hora_inicio, hora_fin: s.hora_fin, estado: s.estado,
      })),
    })))
  }

  // GET /api/sesiones/hoy
  if (m === 'get' && path.includes('/api/sesiones/hoy')) {
    const sedeId = params.sede_id ? +params.sede_id : null
    const fecha = params.fecha || TODAY
    return ok(state.sessions.filter(s =>
      s.fecha === fecha && (!sedeId || s.sede_id === sedeId)
    ))
  }

  // POST /api/sesiones
  if (m === 'post' && /\/api\/sesiones$/.test(path)) {
    const box = state.boxes.find(b => b.id === body.box_id)
    const prof = PROFESIONALES.find(p => p.id === body.profesional_id)
    const pac = PACIENTES.find(p => p.id === body.paciente_id)
    if (!box || !prof || !pac) return err('Datos inválidos')

    let desplazamientoInfo = null

    if (body.es_urgencia) {
      // Urgency: preempt planificada sessions, fail on en_curso
      const conflictoBox = state.sessions.find(s =>
        s.box_id === body.box_id && s.fecha === body.fecha &&
        s.hora_inicio === body.hora_inicio &&
        (s.estado === 'planificada' || s.estado === 'en_curso')
      )
      if (conflictoBox) {
        if (conflictoBox.estado === 'en_curso') return err('Hay una sesión en curso en este box, no se puede desplazar', 409)

        // Find a new slot for the displaced session
        const box_tipo = box.tipo
        const allBoxesTipo = state.boxes.filter(b => b.sede_id === box.sede_id && b.tipo === box_tipo)
        const allHoy = state.sessions.filter(s => s.fecha === body.fecha)
        const boxBusy = {}
        allHoy.forEach(s => {
          if (s.id !== conflictoBox.id && (s.estado === 'planificada' || s.estado === 'en_curso')) {
            if (!boxBusy[s.box_id]) boxBusy[s.box_id] = new Set()
            boxBusy[s.box_id].add(s.hora_inicio)
          }
        })
        const pacBusy = new Set(
          allHoy.filter(s => s.paciente_id === conflictoBox.paciente_id && s.id !== conflictoBox.id &&
            (s.estado === 'planificada' || s.estado === 'en_curso')).map(s => s.hora_inicio)
        )
        const horaOriginal = conflictoBox.hora_inicio
        let nuevaHora = null, nuevoBox = null
        for (const h of HORARIOS) {
          if (h === horaOriginal || pacBusy.has(h)) continue
          for (const b of allBoxesTipo) {
            if (!(boxBusy[b.id] || new Set()).has(h)) { nuevaHora = h; nuevoBox = b; break }
          }
          if (nuevaHora) break
        }
        const pacD = PACIENTES.find(p => p.id === conflictoBox.paciente_id)
        if (nuevaHora && nuevoBox) {
          conflictoBox.box_id = nuevoBox.id
          conflictoBox.hora_inicio = nuevaHora
          conflictoBox.hora_fin = HORARIOS_FIN[nuevaHora] || nuevaHora
          desplazamientoInfo = { paciente: pacD?.nombre || '', hora_original: horaOriginal, nueva_hora: nuevaHora, nuevo_box: nuevoBox.numero, suspendida: false }
        } else {
          conflictoBox.estado = 'suspendida'
          desplazamientoInfo = { paciente: pacD?.nombre || '', hora_original: horaOriginal, nueva_hora: null, nuevo_box: null, suspendida: true }
        }
      }
    } else {
      const conflictoBox = state.sessions.find(s =>
        s.box_id === body.box_id && s.fecha === body.fecha &&
        s.hora_inicio === body.hora_inicio &&
        (s.estado === 'planificada' || s.estado === 'en_curso')
      )
      if (conflictoBox) return err('El box ya tiene una sesión en ese horario', 409)

      const conflictoProf = state.sessions.find(s =>
        s.profesional_id === body.profesional_id && s.fecha === body.fecha &&
        s.hora_inicio === body.hora_inicio &&
        (s.estado === 'planificada' || s.estado === 'en_curso')
      )
      if (conflictoProf) return err('El profesional ya tiene una sesión en ese horario', 409)

      const conflictoPaciente = state.sessions.find(s =>
        s.paciente_id === body.paciente_id && s.fecha === body.fecha &&
        s.hora_inicio === body.hora_inicio &&
        (s.estado === 'planificada' || s.estado === 'en_curso')
      )
      if (conflictoPaciente) return err('El paciente ya tiene una sesión en ese horario', 409)
    }
    const sede = SEDES.find(s => s.id === box.sede_id)
    const s = {
      id: state.nextId++,
      box_id: box.id, box_numero: box.numero, box_tipo: box.tipo,
      sede_id: box.sede_id, sede_nombre: sede?.nombre || '',
      profesional_id: prof.id, profesional: prof.nombre,
      paciente_id: pac.id, paciente: pac.nombre,
      fecha: body.fecha, hora_inicio: body.hora_inicio,
      hora_fin: body.hora_fin || HORARIOS_FIN[body.hora_inicio] || '10:00',
      estado: 'planificada', es_urgencia: body.es_urgencia || false, notas: body.notas || null,
    }
    state.sessions.push(s)
    if (body.fecha === TODAY) {
      const b = state.boxes.find(b => b.id === box.id)
      if (b) b.estado = 'ocupado'
    }
    let mensaje = 'Sesión agendada correctamente'
    if (desplazamientoInfo) {
      const d = desplazamientoInfo
      mensaje = d.suspendida
        ? `Urgencia agendada. Sesión de ${d.paciente} a las ${d.hora_original} fue suspendida por falta de disponibilidad`
        : `Urgencia agendada. Sesión de ${d.paciente} reagendada a las ${d.nueva_hora} (Box ${d.nuevo_box})`
    }
    return ok({ ...s, mensaje, desplazamiento: desplazamientoInfo })
  }

  // POST /api/sesiones/:id/cerrar
  const mCerrar = path.match(/\/api\/sesiones\/(\d+)\/cerrar$/)
  if (m === 'post' && mCerrar) {
    const sesion = state.sessions.find(s => s.id === +mCerrar[1])
    if (!sesion) return err('Sesión no encontrada', 404)
    sesion.estado = body.estado_final
    const box = state.boxes.find(b => b.id === sesion.box_id)
    if (box) box.estado = body.estado_final === 'terminada' ? 'limpieza' : 'disponible'
    if (body.estado_final === 'terminada') {
      state.notifications.push({
        id: state.nextNotifId++,
        mensaje: `Box ${sesion.box_numero} requiere limpieza — sesión de ${sesion.paciente} finalizada`,
        destinatario_rol: 'auxiliar_limpieza',
        sesion_id: sesion.id,
        creado_en: new Date().toISOString(),
        leida: false,
      })
    }
    return ok({ ok: true })
  }

  // GET /api/sugerencia
  if (m === 'get' && path.includes('/api/sugerencia')) {
    const sedeId = params.sede_id ? +params.sede_id : 1
    const pac = params.paciente_id ? PACIENTES.find(p => p.id === +params.paciente_id) : null
    const profs = PROFESIONALES.filter(p => p.sede_id === sedeId)

    // Compute busy hours per box to enable rescheduling across time slots
    const boxBusyHours = {}
    state.sessions
      .filter(s => s.fecha === TODAY && (s.estado === 'planificada' || s.estado === 'en_curso'))
      .forEach(s => {
        if (!boxBusyHours[s.box_id]) boxBusyHours[s.box_id] = new Set()
        boxBusyHours[s.box_id].add(s.hora_inicio)
      })

    const pacienteBusyHours = pac ? new Set(
      state.sessions
        .filter(s => s.paciente_id === pac.id && s.fecha === TODAY &&
          (s.estado === 'planificada' || s.estado === 'en_curso'))
        .map(s => s.hora_inicio)
    ) : new Set()

    // Sort: disponible boxes first, then others (for rescheduling fallback)
    const sortBoxes = (list) => [...list].sort((a, b) =>
      (a.estado === 'disponible' ? 0 : 1) - (b.estado === 'disponible' ? 0 : 1)
    )

    const isUrgencia = params.es_urgencia === 'true'

    // Find the first (box, hora) combo — free slot first, then preempt planificada for urgency
    const findSlot = (boxList) => {
      for (const box of sortBoxes(boxList)) {
        const busy = boxBusyHours[box.id] || new Set()
        for (const hora of HORARIOS) {
          if (!busy.has(hora) && !pacienteBusyHours.has(hora)) return { box, hora, desplazamiento: null }
        }
      }
      if (!isUrgencia) return null

      // Urgency: try to preempt a planificada session
      for (const box of sortBoxes(boxList)) {
        for (const hora of HORARIOS) {
          if (pacienteBusyHours.has(hora)) continue
          const sesionAqui = state.sessions.find(s =>
            s.box_id === box.id && s.hora_inicio === hora &&
            s.fecha === TODAY && s.estado === 'planificada'
          )
          if (!sesionAqui) continue
          const pacD = PACIENTES.find(p => p.id === sesionAqui.paciente_id)
          const displacedBusy = new Set(
            state.sessions
              .filter(s => s.paciente_id === sesionAqui.paciente_id && s.fecha === TODAY &&
                s.id !== sesionAqui.id && (s.estado === 'planificada' || s.estado === 'en_curso'))
              .map(s => s.hora_inicio)
          )
          let nuevaHora = null, nuevaBox = null
          for (const h of HORARIOS) {
            if (h === hora || displacedBusy.has(h)) continue
            for (const b of sortBoxes(boxList)) {
              if (!(boxBusyHours[b.id] || new Set()).has(h)) { nuevaHora = h; nuevaBox = b; break }
            }
            if (nuevaHora) break
          }
          return {
            box, hora,
            desplazamiento: {
              sesion_id: sesionAqui.id,
              paciente: pacD?.nombre || 'paciente',
              hora_original: hora,
              nueva_hora: nuevaHora,
              nuevo_box: nuevaBox?.numero || null,
              suspendida: !nuevaHora,
            },
          }
        }
      }
      return null
    }

    const kineBoxes = state.boxes.filter(b => b.sede_id === sedeId && b.tipo === 'kinesiologia')
    const fonoBoxes = state.boxes.filter(b => b.sede_id === sedeId && b.tipo === 'fonoaudiologia')
    const sugerencias = []

    const kSlot = findSlot(kineBoxes)
    const kProf = profs.find(p => p.especialidad === 'kinesiologia')
    if (kSlot && kProf && (!pac || pac.necesita_kine)) {
      const isReagenda = kSlot.box.estado !== 'disponible' && !kSlot.desplazamiento
      const razones = [
        pac?.necesita_kine ? 'Kinesiología requerida por el paciente' : 'Box kinesiología disponible',
        pac?.profesional_preferido_kine?.id === kProf.id ? 'Profesional habitual del paciente' : 'Profesional disponible',
      ]
      if (kSlot.desplazamiento) razones.push(`urgencia-desplaza:${kSlot.desplazamiento.paciente.split(' ')[0]}-a-${kSlot.desplazamiento.nueva_hora || 'suspendida'}`)
      else if (isReagenda) razones.push(`reagendamiento:box-${kSlot.box.numero}-libre-a-${kSlot.hora}`)
      else razones.push('Horario óptimo de la jornada')
      sugerencias.push({
        tipo: 'kinesiologia', box: kSlot.box, profesional: kProf, hora_sugerida: kSlot.hora,
        confianza: (pac?.necesita_kine ? 90 : 72) - (isReagenda ? 5 : 0),
        razones, desplazamiento: kSlot.desplazamiento,
      })
    }

    const fSlot = findSlot(fonoBoxes)
    const fProf = profs.find(p => p.especialidad === 'fonoaudiologia')
    if (fSlot && fProf && (!pac || pac.necesita_fono)) {
      const isReagenda = fSlot.box.estado !== 'disponible' && !fSlot.desplazamiento
      const razones = [
        pac?.necesita_fono ? 'Fonoaudiología requerida por el paciente' : 'Box fonoaudiología disponible',
        'Profesional disponible en la sede',
      ]
      if (fSlot.desplazamiento) razones.push(`urgencia-desplaza:${fSlot.desplazamiento.paciente.split(' ')[0]}-a-${fSlot.desplazamiento.nueva_hora || 'suspendida'}`)
      else if (isReagenda) razones.push(`reagendamiento:box-${fSlot.box.numero}-libre-a-${fSlot.hora}`)
      sugerencias.push({
        tipo: 'fonoaudiologia', box: fSlot.box, profesional: fProf, hora_sugerida: fSlot.hora,
        confianza: (pac?.necesita_fono ? 88 : 65) - (isReagenda ? 5 : 0),
        razones, desplazamiento: fSlot.desplazamiento,
      })
    }

    if (!sugerencias.length) return ok({ mensaje: 'Sin disponibilidad en ningún horario hoy', sugerencias: [], confianza_baja: true })
    return ok({
      paciente_nombre: pac?.nombre || null,
      mensaje: pac
        ? `Sugerencia personalizada para ${pac.nombre} según su perfil terapéutico`
        : 'Sugerencia heurística — asignación óptima disponible',
      sugerencias,
      confianza_baja: sugerencias.every(s => s.confianza < 70),
    })
  }

  // GET /api/dashboard/global
  if (m === 'get' && path.includes('/api/dashboard/global')) {
    const sedes = SEDES.map(sede => {
      const boxes = state.boxes.filter(b => b.sede_id === sede.id)
      const todaySess = state.sessions.filter(s => s.sede_id === sede.id && s.fecha === TODAY)
      const ocupados = boxes.filter(b => b.estado === 'ocupado').length
      return {
        sede_id: sede.id, sede_nombre: sede.nombre, ciudad: sede.ciudad,
        total_boxes: boxes.length,
        disponibles: boxes.filter(b => b.estado === 'disponible').length,
        ocupados,
        mantencion: boxes.filter(b => b.estado === 'mantencion').length,
        limpieza: boxes.filter(b => b.estado === 'limpieza').length,
        tasa_ocupacion: Math.round((ocupados / boxes.length) * 100),
        sesiones_hoy: todaySess.length,
        sesiones_completadas: todaySess.filter(s => s.estado === 'terminada').length,
        sesiones_en_curso: todaySess.filter(s => s.estado === 'en_curso').length,
      }
    })
    return ok({
      fecha: TODAY, sedes,
      totales: {
        total_boxes: sedes.reduce((a, s) => a + s.total_boxes, 0),
        disponibles: sedes.reduce((a, s) => a + s.disponibles, 0),
        ocupados: sedes.reduce((a, s) => a + s.ocupados, 0),
        sesiones_hoy: sedes.reduce((a, s) => a + s.sesiones_hoy, 0),
      },
    })
  }

  // GET /api/notificaciones
  if (m === 'get' && path.includes('/api/notificaciones')) {
    return ok(state.notifications.filter(n => !n.leida))
  }

  // POST /api/notificaciones/:id/leer
  const mNotif = path.match(/\/api\/notificaciones\/(\d+)\/leer$/)
  if (m === 'post' && mNotif) {
    const n = state.notifications.find(n => n.id === +mNotif[1])
    if (n) n.leida = true
    return ok({ ok: true })
  }

  // POST /api/pacientes
  if (m === 'post' && /\/api\/pacientes$/.test(path)) {
    const { nombre, fecha_nacimiento, etapa, sede_id, necesita_kine, necesita_fono,
            frecuencia_semanal_kine, frecuencia_semanal_fono, notas_clinicas } = body
    if (!nombre?.trim()) return err('El nombre es obligatorio', 422)
    if (!necesita_kine && !necesita_fono) return err('Debe requerir al menos un tipo de tratamiento', 422)
    const pac = {
      id: state.nextId++,
      nombre: nombre.trim(), fecha_nacimiento, etapa,
      sede_id: +sede_id,
      necesita_kine: !!necesita_kine,
      necesita_fono: !!necesita_fono,
      frecuencia_semanal_kine: necesita_kine ? (+frecuencia_semanal_kine || 2) : 0,
      frecuencia_semanal_fono: necesita_fono ? (+frecuencia_semanal_fono || 2) : 0,
      notas_clinicas: notas_clinicas || null,
      profesional_preferido_kine: null,
      profesional_preferido_fono: null,
      sesiones_total: 0, sesiones_completadas: 0, sesiones_hoy: [],
    }
    PACIENTES.push(pac)
    return ok(pac)
  }

  // GET /api/pacientes/:id/historial
  const mHist = path.match(/\/api\/pacientes\/(\d+)\/historial$/)
  if (m === 'get' && mHist) {
    const pacId = +mHist[1]
    return ok(
      state.sessions
        .filter(s => s.paciente_id === pacId)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .slice(0, 20)
        .map(s => ({
          id: s.id, fecha: s.fecha, hora_inicio: s.hora_inicio, hora_fin: s.hora_fin,
          estado: s.estado, es_urgencia: s.es_urgencia, box_tipo: s.box_tipo, profesional: s.profesional,
        }))
    )
  }

  return null
}

// ─── Axios interceptor setup ─────────────────────────────────────────────────

export function setupMockApi() {
  axios.interceptors.request.use((config) => {
    const mock = handleMock(config)
    if (mock === null) return config
    config.adapter = () => {
      if (mock.status >= 400) {
        const error = Object.assign(new Error(mock.data?.detail || 'Error'), {
          response: { data: mock.data, status: mock.status, headers: {}, config },
          isAxiosError: true,
          config,
        })
        return Promise.reject(error)
      }
      return Promise.resolve({ data: mock.data, status: mock.status, statusText: 'OK', headers: {}, config, request: {} })
    }
    return config
  })
}
