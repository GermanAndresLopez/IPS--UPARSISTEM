import type {
  Paciente, Orden, Ingreso, Alerta, RegistroAuditoria,
  EPS, Diagnostico, Terapeuta, Usuario, KpiDashboard
} from "./tipos";

// ===========================
// CATÁLOGOS
// ===========================

export const EPS_LIST: EPS[] = [
  { id: 1, nombre: "SALUD TOTAL", activa: true },
  { id: 2, nombre: "SANITAS", activa: true },
  { id: 3, nombre: "NUEVA EPS", activa: true },
  { id: 4, nombre: "SANIDAD POLICIA", activa: true },
  { id: 5, nombre: "COOSALUD", activa: true },
  { id: 6, nombre: "DUSAKAWI EPSI", activa: true },
  { id: 7, nombre: "ALLIANZ", activa: true },
  { id: 8, nombre: "PARTICULAR", activa: true },
];

export const DIAGNOSTICOS: Diagnostico[] = [
  { id: 1,  codigo_cie10: "F840", descripcion: "AUTISMO", activo: true },
  { id: 2,  codigo_cie10: "F900", descripcion: "PERTURBACION DE LA ACTIVIDAD Y DE LA ATENCION", activo: true },
  { id: 3,  codigo_cie10: "F800", descripcion: "TRASTORNO ESPECIFICO DE LA PRONUNCIACION", activo: true },
  { id: 4,  codigo_cie10: "F845", descripcion: "SINDROME DE ASPERGER", activo: true },
  { id: 5,  codigo_cie10: "G800", descripcion: "PARALISIS CEREBRAL", activo: true },
  { id: 6,  codigo_cie10: "F700", descripcion: "DISCAPACIDAD INTELECTUAL LEVE", activo: true },
  { id: 7,  codigo_cie10: "Q909", descripcion: "SINDROME DE DOWN", activo: true },
  { id: 8,  codigo_cie10: "F413", descripcion: "TRASTORNO DE ANSIEDAD", activo: true },
  { id: 9,  codigo_cie10: "R620", descripcion: "RETARDO DEL DESARROLLO", activo: true },
  { id: 10, codigo_cie10: "F809", descripcion: "TRASTORNO DEL DESARROLLO DEL HABLA Y LENGUAJE", activo: true },
];

export const TERAPEUTAS: Terapeuta[] = [
  { id: 1,  nombre_completo: "ADALBA CAMARGO",      tipo_cargo: "Fonoaudiología",       fecha_inicio_cargo: "2022-01-10", activo: true },
  { id: 2,  nombre_completo: "ADRIANA SANJUAN",     tipo_cargo: "Psicología",            fecha_inicio_cargo: "2021-03-15", activo: true },
  { id: 3,  nombre_completo: "ANDREA ORTIZ",        tipo_cargo: "Terapia Ocupacional",   fecha_inicio_cargo: "2023-05-01", activo: true },
  { id: 4,  nombre_completo: "CARLOS MORENO",       tipo_cargo: "Fisioterapia",          fecha_inicio_cargo: "2020-08-20", activo: true },
  { id: 5,  nombre_completo: "DAYANA DAZA",         tipo_cargo: "Psicología",            fecha_inicio_cargo: "2022-06-01", activo: true },
  { id: 6,  nombre_completo: "DAYANA HERNANDEZ",    tipo_cargo: "Fonoaudiología",        fecha_inicio_cargo: "2023-01-10", activo: true },
  { id: 7,  nombre_completo: "DUNNIA CHAATELI",     tipo_cargo: "Neuropsicología",       fecha_inicio_cargo: "2021-11-05", activo: true },
  { id: 8,  nombre_completo: "ELMIS PINTO",         tipo_cargo: "Terapia Ocupacional",   fecha_inicio_cargo: "2022-09-12", activo: true },
  { id: 9,  nombre_completo: "SARA ALARCON",        tipo_cargo: "Fisioterapia",          fecha_inicio_cargo: "2023-03-01", activo: true },
  { id: 10, nombre_completo: "VIVIANA RAMIREZ",     tipo_cargo: "Fonoaudiología",        fecha_inicio_cargo: "2020-02-14", activo: true },
];

export const USUARIOS_MOCK: Usuario[] = [
  { id: 1, nombre_completo: "Carlos Administrador", correo: "admin@terapia.com",       rol: "ADMIN",        activo: true, fecha_creacion: "2024-01-01" },
  { id: 2, nombre_completo: "Laura Coordinadora",   correo: "laura@terapia.com",       rol: "COORDINADOR",  activo: true, fecha_creacion: "2024-01-05" },
  { id: 3, nombre_completo: "María Operativa",      correo: "maria@terapia.com",       rol: "OPERATIVO",    activo: true, fecha_creacion: "2024-01-10" },
  { id: 4, nombre_completo: "Pedro Operativo",      correo: "pedro@terapia.com",       rol: "OPERATIVO",    activo: false, fecha_creacion: "2024-02-01" },
];

// ===========================
// PACIENTES
// ===========================

export const PACIENTES_MOCK: Paciente[] = [
  {
    id: 1, nombre_completo: "ABBRUZZESE LOBO ANTHONY", documento_identidad: "1066305293",
    fecha_nacimiento: "2020-07-14", sexo: "MASCULINO", telefono_1: "3013122548",
    eps_id: 1, eps_nombre: "SALUD TOTAL", tipo_paciente: "ORDEN",
    diagnostico_id: 1, codigo_cie10: "F840", diagnostico_nombre: "AUTISMO",
    novedad: "SIN_NOVEDAD", categoria: "ANTIGUO", fecha_registro: "2024-01-15",
    registrado_por: "María Operativa", ultimo_ingreso: "2024-04-06",
    orden_activa: {
      id: 1, paciente_id: 1, tipo_limite: "FECHA", fecha_emision: "2024-01-20",
      fecha_inicio: "2024-02-01", fecha_fin: "2024-04-30", sesiones_consumidas: 24,
      dias_restantes: -390, estado: "INACTIVO", modalidad_id: 1, modalidad_nombre: "Individual",
      terapeuta_inicial_id: 1, terapeuta_inicial_nombre: "ADALBA CAMARGO",
      activa: false, registrada_por: "Laura Coordinadora", fecha_registro: "2024-01-20",
    },
  },
  {
    id: 2, nombre_completo: "ACEVEDO CASTILLA PAULA HELENA", documento_identidad: "1241088153",
    fecha_nacimiento: "2018-09-04", sexo: "FEMENINO", telefono_1: "3046765938", telefono_2: "3243745966",
    eps_id: 1, eps_nombre: "SALUD TOTAL", tipo_paciente: "ORDEN",
    diagnostico_id: 2, codigo_cie10: "F900", diagnostico_nombre: "PERTURBACION DE LA ACTIVIDAD Y DE LA ATENCION",
    novedad: "SIN_NOVEDAD", categoria: "ACTIVO", fecha_registro: "2025-10-02",
    registrado_por: "María Operativa", ultimo_ingreso: "2026-05-20",
    orden_activa: {
      id: 2, paciente_id: 2, tipo_limite: "FECHA", fecha_emision: "2025-09-25",
      fecha_inicio: "2025-10-02", fecha_fin: "2026-08-30", sesiones_consumidas: 18,
      dias_restantes: 97, estado: "NORMAL", modalidad_id: 1, modalidad_nombre: "Individual",
      terapeuta_inicial_id: 5, terapeuta_inicial_nombre: "DAYANA DAZA",
      activa: true, registrada_por: "Laura Coordinadora", fecha_registro: "2025-09-25",
    },
  },
  {
    id: 3, nombre_completo: "TORRES GUTIERREZ SAMUEL DAVID", documento_identidad: "1065874123",
    fecha_nacimiento: "2019-03-22", sexo: "MASCULINO", telefono_1: "3125678901",
    eps_id: 2, eps_nombre: "SANITAS", tipo_paciente: "ORDEN",
    diagnostico_id: 4, codigo_cie10: "F845", diagnostico_nombre: "SINDROME DE ASPERGER",
    novedad: "SIN_NOVEDAD", categoria: "ACTIVO", fecha_registro: "2025-11-01",
    registrado_por: "María Operativa", ultimo_ingreso: "2026-05-24",
    orden_activa: {
      id: 3, paciente_id: 3, tipo_limite: "CANTIDAD_TERAPIAS", fecha_emision: "2025-10-15",
      fecha_inicio: "2025-11-01", sesiones_autorizadas: 40, sesiones_consumidas: 35,
      sesiones_restantes: 5, dias_restantes: undefined, estado: "NORMAL",
      modalidad_id: 1, modalidad_nombre: "Individual",
      terapeuta_inicial_id: 2, terapeuta_inicial_nombre: "ADRIANA SANJUAN",
      activa: true, registrada_por: "Laura Coordinadora", fecha_registro: "2025-10-15",
    },
  },
  {
    id: 4, nombre_completo: "MENDEZ PEREZ VALENTINA", documento_identidad: "1067891234",
    fecha_nacimiento: "2017-06-10", sexo: "FEMENINO", telefono_1: "3209871234",
    eps_id: 4, eps_nombre: "SANIDAD POLICIA", tipo_paciente: "ORDEN",
    diagnostico_id: 6, codigo_cie10: "F700", diagnostico_nombre: "DISCAPACIDAD INTELECTUAL LEVE",
    novedad: "SIN_NOVEDAD", categoria: "AUSENTE", fecha_registro: "2025-08-10",
    registrado_por: "María Operativa", ultimo_ingreso: "2026-04-10",
    orden_activa: {
      id: 4, paciente_id: 4, tipo_limite: "FECHA", fecha_emision: "2025-08-01",
      fecha_inicio: "2025-08-10", fecha_fin: "2026-06-02", sesiones_consumidas: 20,
      dias_restantes: 8, estado: "NORMAL", modalidad_id: 1, modalidad_nombre: "Individual",
      terapeuta_inicial_id: 8, terapeuta_inicial_nombre: "ELMIS PINTO",
      activa: true, registrada_por: "Laura Coordinadora", fecha_registro: "2025-08-01",
    },
  },
  {
    id: 5, nombre_completo: "GARCIA ROJAS MIGUEL ANGEL", documento_identidad: "1066412345",
    fecha_nacimiento: "2021-11-05", sexo: "MASCULINO", telefono_1: "3143456789",
    eps_id: 3, eps_nombre: "NUEVA EPS", tipo_paciente: "ORDEN",
    diagnostico_id: 5, codigo_cie10: "G800", diagnostico_nombre: "PARALISIS CEREBRAL",
    novedad: "SIN_NOVEDAD", categoria: "NUEVO", fecha_registro: "2026-05-20",
    registrado_por: "María Operativa",
    orden_activa: {
      id: 5, paciente_id: 5, tipo_limite: "FECHA", fecha_emision: "2026-05-15",
      fecha_inicio: "2026-05-20", fecha_fin: "2026-11-20", sesiones_consumidas: 2,
      dias_restantes: 179, estado: "NORMAL", modalidad_id: 1, modalidad_nombre: "Grupal",
      terapeuta_inicial_id: 4, terapeuta_inicial_nombre: "CARLOS MORENO",
      activa: true, registrada_por: "Laura Coordinadora", fecha_registro: "2026-05-15",
    },
  },
  {
    id: 6, nombre_completo: "LOPEZ VARGAS ISABELLA", documento_identidad: "1067345678",
    fecha_nacimiento: "2016-08-30", sexo: "FEMENINO", telefono_1: "3176543210",
    eps_id: 1, eps_nombre: "SALUD TOTAL", tipo_paciente: "ORDEN",
    diagnostico_id: 10, codigo_cie10: "F809", diagnostico_nombre: "TRASTORNO DEL DESARROLLO DEL HABLA Y LENGUAJE",
    novedad: "SIN_NOVEDAD", categoria: "ACTIVO", fecha_registro: "2026-01-05",
    registrado_por: "María Operativa", ultimo_ingreso: "2026-05-25",
    orden_activa: {
      id: 6, paciente_id: 6, tipo_limite: "CANTIDAD_TERAPIAS", fecha_emision: "2025-12-20",
      fecha_inicio: "2026-01-05", sesiones_autorizadas: 30, sesiones_consumidas: 28,
      sesiones_restantes: 2, estado: "NORMAL", modalidad_id: 1, modalidad_nombre: "Individual",
      terapeuta_inicial_id: 1, terapeuta_inicial_nombre: "ADALBA CAMARGO",
      activa: true, registrada_por: "Laura Coordinadora", fecha_registro: "2025-12-20",
    },
  },
  {
    id: 7, nombre_completo: "RAMIREZ SILVA JUAN ESTEBAN", documento_identidad: "1065123456",
    fecha_nacimiento: "2015-04-18", sexo: "MASCULINO", telefono_1: "3001234567",
    eps_id: 5, eps_nombre: "COOSALUD", tipo_paciente: "PARTICULAR",
    diagnostico_id: 8, codigo_cie10: "F413", diagnostico_nombre: "TRASTORNO DE ANSIEDAD",
    novedad: "SIN_NOVEDAD", categoria: "ACTIVO", fecha_registro: "2026-02-14",
    registrado_por: "María Operativa", ultimo_ingreso: "2026-05-22",
  },
  {
    id: 8, nombre_completo: "CASTRO MORENO ANA SOFIA", documento_identidad: "1067654321",
    fecha_nacimiento: "2013-12-01", sexo: "FEMENINO", telefono_1: "3119876543",
    eps_id: 2, eps_nombre: "SANITAS", tipo_paciente: "ORDEN",
    diagnostico_id: 7, codigo_cie10: "Q909", diagnostico_nombre: "SINDROME DE DOWN",
    novedad: "DE_ALTA", categoria: "ANTIGUO", fecha_registro: "2023-06-01",
    registrado_por: "María Operativa", ultimo_ingreso: "2025-12-30",
  },
];

// ===========================
// INGRESOS
// ===========================

export const INGRESOS_MOCK: Ingreso[] = [
  {
    id: 1, fecha: "2026-05-25", hora: "10:30", dia_semana: "lunes",
    paciente_id: 2, paciente_nombre: "ACEVEDO CASTILLA PAULA HELENA",
    orden_id: 2, tipo_ingreso_id: 1, tipo_ingreso_nombre: "TERAPIAS",
    terapias: [
      { id: 1, ingreso_id: 1, tipo_terapia: "Fonoaudiología",  terapeuta_id: 1, terapeuta_nombre: "ADALBA CAMARGO" },
      { id: 2, ingreso_id: 1, tipo_terapia: "Psicología",       terapeuta_id: 2, terapeuta_nombre: "ADRIANA SANJUAN" },
    ],
    total_terapias_dia: 2, registrado_por: "María Operativa", fecha_registro: "2026-05-25T10:35:00",
  },
  {
    id: 2, fecha: "2026-05-25", hora: "09:00", dia_semana: "lunes",
    paciente_id: 6, paciente_nombre: "LOPEZ VARGAS ISABELLA",
    orden_id: 6, tipo_ingreso_id: 1, tipo_ingreso_nombre: "TERAPIAS",
    terapias: [
      { id: 3, ingreso_id: 2, tipo_terapia: "Fonoaudiología", terapeuta_id: 1, terapeuta_nombre: "ADALBA CAMARGO" },
    ],
    total_terapias_dia: 1, registrado_por: "María Operativa", fecha_registro: "2026-05-25T09:05:00",
  },
  {
    id: 3, fecha: "2026-05-24", hora: "08:30", dia_semana: "domingo",
    paciente_id: 3, paciente_nombre: "TORRES GUTIERREZ SAMUEL DAVID",
    orden_id: 3, tipo_ingreso_id: 1, tipo_ingreso_nombre: "TERAPIAS",
    terapias: [
      { id: 4, ingreso_id: 3, tipo_terapia: "Psicología",          terapeuta_id: 2, terapeuta_nombre: "ADRIANA SANJUAN" },
      { id: 5, ingreso_id: 3, tipo_terapia: "Terapia Ocupacional", terapeuta_id: 3, terapeuta_nombre: "ANDREA ORTIZ" },
    ],
    total_terapias_dia: 2, registrado_por: "María Operativa", fecha_registro: "2026-05-24T08:35:00",
  },
  {
    id: 4, fecha: "2026-05-22", hora: "11:00", dia_semana: "viernes",
    paciente_id: 7, paciente_nombre: "RAMIREZ SILVA JUAN ESTEBAN",
    orden_id: 0, tipo_ingreso_id: 1, tipo_ingreso_nombre: "TERAPIAS",
    terapias: [
      { id: 6, ingreso_id: 4, tipo_terapia: "Psicología", terapeuta_id: 5, terapeuta_nombre: "DAYANA DAZA" },
    ],
    total_terapias_dia: 1, registrado_por: "María Operativa", fecha_registro: "2026-05-22T11:05:00",
  },
  {
    id: 5, fecha: "2026-05-20", hora: "14:00", dia_semana: "miércoles",
    paciente_id: 5, paciente_nombre: "GARCIA ROJAS MIGUEL ANGEL",
    orden_id: 5, tipo_ingreso_id: 2, tipo_ingreso_nombre: "VALORACIÓN",
    terapias: [
      { id: 7, ingreso_id: 5, tipo_terapia: "Fisioterapia", terapeuta_id: 4, terapeuta_nombre: "CARLOS MORENO" },
    ],
    total_terapias_dia: 1, registrado_por: "María Operativa", fecha_registro: "2026-05-20T14:05:00",
  },
];

// ===========================
// ALERTAS
// ===========================

export const ALERTAS_MOCK: Alerta[] = [
  {
    id: 1, tipo: "POCAS_SESIONES", prioridad: "ALTA",
    paciente_id: 6, paciente_nombre: "LOPEZ VARGAS ISABELLA",
    orden_id: 6, descripcion: "Quedan solo 2 sesiones de 30 autorizadas",
    sesiones_restantes: 2, ultimo_ingreso: "2026-05-25",
  },
  {
    id: 2, tipo: "POCAS_SESIONES", prioridad: "ALTA",
    paciente_id: 3, paciente_nombre: "TORRES GUTIERREZ SAMUEL DAVID",
    orden_id: 3, descripcion: "Quedan 5 sesiones de 40 autorizadas",
    sesiones_restantes: 5, ultimo_ingreso: "2026-05-24",
  },
  {
    id: 3, tipo: "PROXIMA_VENCER", prioridad: "ALTA",
    paciente_id: 4, paciente_nombre: "MENDEZ PEREZ VALENTINA",
    orden_id: 4, descripcion: "La orden vence en 8 días (02-jun-2026)",
    dias_restantes: 8, ultimo_ingreso: "2026-04-10",
  },
  {
    id: 4, tipo: "AUSENTE", prioridad: "BAJA",
    paciente_id: 4, paciente_nombre: "MENDEZ PEREZ VALENTINA",
    orden_id: 4, descripcion: "Sin asistencia hace más de 30 días — orden aún vigente",
    ultimo_ingreso: "2026-04-10",
  },
];

// ===========================
// KPIs
// ===========================

export const KPIS_MOCK: KpiDashboard = {
  ingresos_hoy: 4,
  ingresos_semana: 18,
  ingresos_mes: 67,
  pacientes_activos: 42,
  pacientes_nuevos_mes: 5,
  pacientes_ausentes: 8,
  ordenes_en_alerta: 4,
  ordenes_vencidas: 2,
};

export const GRAFICA_ASISTENCIAS = [
  { dia: "Lun", total: 12 },
  { dia: "Mar", total: 9  },
  { dia: "Mié", total: 14 },
  { dia: "Jue", total: 11 },
  { dia: "Vie", total: 10 },
  { dia: "Sáb", total: 7  },
];

export const GRAFICA_EPS = [
  { name: "Salud Total",     value: 18 },
  { name: "Sanitas",         value: 9  },
  { name: "Nueva EPS",       value: 6  },
  { name: "Sanidad Policía", value: 5  },
  { name: "Particular",      value: 4  },
  { name: "Otros",           value: 5  },
];

export const GRAFICA_DIAGNOSTICOS = [
  { name: "Autismo (F840)",            value: 14 },
  { name: "TDAH (F900)",               value: 11 },
  { name: "P. Cerebral (G800)",        value: 7  },
  { name: "Asperger (F845)",           value: 6  },
  { name: "Disc. Intelectual (F700)",  value: 5  },
  { name: "Trastorno Lenguaje (F809)", value: 4  },
  { name: "Otros",                     value: 10 },
];

export const GRAFICA_EDADES = [
  { rango: "0-5 años",    total: 12 },
  { rango: "6-12 años",   total: 19 },
  { rango: "13-17 años",  total: 7  },
  { rango: "18-60 años",  total: 4  },
];

// ===========================
// AUDITORÍA
// ===========================

export const AUDITORIA_MOCK: RegistroAuditoria[] = [
  {
    id: 1, fecha_hora: "2026-05-25T10:35:00", usuario_id: 3,
    usuario_nombre: "María Operativa", rol_usuario: "OPERATIVO",
    tipo_accion: "CREAR", modulo: "INGRESOS", registro_id: 1,
    descripcion: "Registró ingreso para ACEVEDO CASTILLA PAULA HELENA — 2 terapias",
  },
  {
    id: 2, fecha_hora: "2026-05-24T15:20:00", usuario_id: 2,
    usuario_nombre: "Laura Coordinadora", rol_usuario: "COORDINADOR",
    tipo_accion: "EDITAR", modulo: "ORDENES", registro_id: 4,
    descripcion: "Modificó fecha fin de orden #4 — MENDEZ PEREZ VALENTINA",
    valor_anterior: "2026-05-30", valor_nuevo: "2026-06-15",
  },
  {
    id: 3, fecha_hora: "2026-05-20T08:00:00", usuario_id: 3,
    usuario_nombre: "María Operativa", rol_usuario: "OPERATIVO",
    tipo_accion: "CREAR", modulo: "PACIENTES", registro_id: 5,
    descripcion: "Registró nuevo paciente GARCIA ROJAS MIGUEL ANGEL",
  },
  {
    id: 4, fecha_hora: "2026-05-15T14:10:00", usuario_id: 1,
    usuario_nombre: "Carlos Administrador", rol_usuario: "ADMIN",
    tipo_accion: "EXPORTAR", modulo: "REPORTES",
    descripcion: "Exportó PDF — Reporte de asistencias Mayo 2026",
  },
  {
    id: 5, fecha_hora: "2026-05-10T09:00:00", usuario_id: 1,
    usuario_nombre: "Carlos Administrador", rol_usuario: "ADMIN",
    tipo_accion: "CREAR", modulo: "USUARIOS", registro_id: 4,
    descripcion: "Creó usuario Pedro Operativo con rol OPERATIVO",
  },
  {
    id: 6, fecha_hora: "2026-05-08T16:30:00", usuario_id: 1,
    usuario_nombre: "Carlos Administrador", rol_usuario: "ADMIN",
    tipo_accion: "ELIMINAR", modulo: "INGRESOS", registro_id: 99,
    descripcion: "Eliminó ingreso #99 — Motivo: registro duplicado",
  },
];
