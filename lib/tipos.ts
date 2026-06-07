// ===========================
// TIPOS E INTERFACES DEL SISTEMA
// ===========================

export type Rol = "ADMIN" | "COORDINADOR" | "OPERATIVO";

export type SexoPaciente = "MASCULINO" | "FEMENINO";

export type TipoPaciente = "ORDEN" | "PARTICULAR";

export type TipoLimiteOrden = "FECHA" | "CANTIDAD_TERAPIAS";

export type EstadoOrden =
  | "NORMAL"
  | "VENCIDA"
  | "INACTIVO";

export type CategoriaPaciente = "NUEVO" | "ACTIVO" | "AUSENTE" | "ANTIGUO";

export type NovedadPaciente =
  | "SIN_NOVEDAD"
  | "DE_ALTA"
  | "SUSPENDIDO"
  | "CAMBIO_CIUDAD"
  | "CAMBIO_DE_IPS"
  | "PARTICULAR";

export type TipoAccionAuditoria = "CREAR" | "EDITAR" | "ELIMINAR" | "LOGIN" | "EXPORTAR";

export type ModuloAuditoria =
  | "PACIENTES"
  | "ORDENES"
  | "INGRESOS"
  | "USUARIOS"
  | "REPORTES"
  | "CONFIGURACION";

// ===========================
export interface Usuario {
  id: number;
  nombre_completo: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  fecha_creacion: string;
}

export interface EPS {
  id: number;
  nombre: string;
  activa: boolean;
  persona_cargo?: string;
  telefono?: string;
  correo?: string;
}

export interface Diagnostico {
  id: number;
  codigo_cie10: string;
  descripcion: string;
  activo: boolean;
}

export interface Terapeuta {
  id: number;
  nombre_completo: string;
  tipo_cargo: string;
  fecha_inicio_cargo: string;
  fecha_fin_cargo?: string;
  telefono?: string;
  correo?: string;
  activo: boolean;
}

export interface Modalidad {
  id: number;
  nombre: string;
  activa: boolean;
}

export interface TipoIngreso {
  id: number;
  nombre: string;
  activo: boolean;
}

export type TipoDocumento = "CC" | "CE" | "TI" | "RC" | "PA";

export interface Paciente {
  id: number;
  primer_apellido: string;
  segundo_apellido?: string;
  primer_nombre: string;
  segundo_nombre?: string;
  nombre_completo: string;
  tipo_documento: TipoDocumento;
  documento_identidad: string;
  correo?: string;
  fecha_nacimiento: string;
  sexo: SexoPaciente;
  telefono_1: string;
  telefono_2?: string;
  eps_id?: number;
  eps_nombre?: string;
  tipo_paciente: TipoPaciente;
  diagnostico_id: number;
  codigo_cie10: string;
  diagnostico_nombre: string;
  novedad: NovedadPaciente;
  activo: boolean;
  categoria: CategoriaPaciente;
  fecha_registro: string;
  registrado_por: string;
  orden_activa?: Orden;
  ultimo_ingreso?: string;
}

export interface Orden {
  id: number;
  paciente_id: number;
  paciente_nombre?: string;
  tipo_limite: TipoLimiteOrden;
  fecha_emision: string;
  fecha_inicio: string;
  fecha_fin?: string;
  sesiones_autorizadas?: number;
  sesiones_consumidas: number;
  sesiones_restantes?: number;
  dias_restantes?: number;
  estado: EstadoOrden;
  modalidad_id: number;
  modalidad_nombre: string;
  terapeuta_inicial_id?: number;
  terapeuta_inicial_nombre: string;
  activa: boolean;
  registrada_por: string;
  fecha_registro: string;
}

export interface HistorialOrden {
  id: number;
  orden_id: number;
  tipo_cambio: "EXTENSION_FECHA" | "AMPLIACION_SESIONES" | "CIERRE" | "AJUSTE_CONSUMIDAS";
  valor_anterior: string;
  valor_nuevo: string;
  motivo: string;
  modificado_por: string;
  fecha_cambio: string;
}

export interface IngresoTerapia {
  id: number;
  ingreso_id: number;
  tipo_terapia: string;
  terapeuta_id: number;
  terapeuta_nombre: string;
}

export interface Ingreso {
  id: number;
  fecha: string;
  hora: string;
  dia_semana: string;
  paciente_id: number;
  paciente_nombre: string;
  orden_id: number;
  tipo_ingreso_id: number;
  tipo_ingreso_nombre: string;
  terapias: IngresoTerapia[];
  total_terapias_dia: number;
  observaciones?: string;
  registrado_por: string;
  fecha_registro: string;
}

export interface Alerta {
  id: number;
  tipo: "PROXIMA_VENCER" | "VENCIDA" | "POCAS_SESIONES" | "AUSENTE";
  prioridad: "ALTA" | "MEDIA" | "BAJA";
  paciente_id: number;
  paciente_nombre: string;
  orden_id: number;
  descripcion: string;
  dias_restantes?: number;
  sesiones_restantes?: number;
  ultimo_ingreso?: string;
}

export interface RegistroAuditoria {
  id: number;
  fecha_hora: string;
  usuario_id: number;
  usuario_nombre: string;
  rol_usuario: Rol;
  tipo_accion: TipoAccionAuditoria;
  modulo: ModuloAuditoria;
  registro_id?: number;
  descripcion: string;
  valor_anterior?: string;
  valor_nuevo?: string;
}

export interface KpiDashboard {
  ingresos_hoy: number;
  ingresos_semana: number;
  ingresos_mes: number;
  pacientes_activos: number;
  pacientes_nuevos_mes: number;
  pacientes_ausentes: number;
  ordenes_en_alerta: number;
  ordenes_vencidas: number;
}
