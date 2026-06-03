import { EstadoOrden, CategoriaPaciente } from "./tipos";

// ===========================
// CÁLCULO DE ESTADO DE ORDEN
// ===========================
// Solo 3 estados: NORMAL, VENCIDA, INACTIVO
// Alerta separada: cuando diasRestantes < 15 (y orden aún NORMAL)

export function calcularEstadoPorFecha(diasRestantes: number): EstadoOrden {
  if (diasRestantes < -90) return "INACTIVO"; // Más de 90 días vencida → inactivo
  if (diasRestantes <= 0)  return "VENCIDA";  // Expirada
  return "NORMAL";                            // Vigente (incluye los < 15 días)
}

// Para órdenes por sesiones: NORMAL si hay sesiones, VENCIDA si se agotaron
export function calcularEstadoPorSesiones(restantes: number): EstadoOrden {
  if (restantes <= 0) return "VENCIDA";
  return "NORMAL";
}

// ¿La orden necesita alerta de próximo vencimiento? (< 15 días restantes, aún vigente)
export function requiereAlerta(diasRestantes: number | undefined): boolean {
  return diasRestantes !== undefined && diasRestantes > 0 && diasRestantes < 15;
}

// ¿La orden por sesiones requiere alerta? (≤ 5 sesiones restantes)
export function requiereAlertaSesiones(restantes: number | undefined): boolean {
  return restantes !== undefined && restantes > 0 && restantes <= 5;
}

export function calcularDiasRestantes(fechaFin: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(0, 0, 0, 0);
  const diff = fin.getTime() - hoy.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

// ===========================
// CÁLCULO DE EDAD
// ===========================

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  return edad;
}

export function rangoEtario(fechaNacimiento: string): string {
  const edad = calcularEdad(fechaNacimiento);
  if (edad < 3)  return "0-3";
  if (edad < 6)  return "3-6";
  if (edad < 9)  return "6-9";
  if (edad < 12) return "9-12";
  if (edad < 15) return "12-15";
  if (edad < 18) return "15-18";
  if (edad < 21) return "18-21";
  return "+21";
}

// ===========================
// CATEGORÍA DE PACIENTE
// ===========================

export function calcularCategoriaPaciente(
  tieneIngresos: boolean,
  diasDesdeUltimoIngreso: number | null,
  tieneOrdenVigente: boolean
): CategoriaPaciente {
  if (!tieneIngresos) return "NUEVO";
  if (diasDesdeUltimoIngreso !== null && diasDesdeUltimoIngreso <= 30) return "ACTIVO";
  if (tieneOrdenVigente) return "AUSENTE";
  return "ANTIGUO";
}

// ===========================
// COLORES Y ETIQUETAS — ESTADOS SIMPLIFICADOS
// ===========================

export function getEstadoConfig(estado: EstadoOrden): {
  label: string;
  color: string;
  bg: string;
  dot: string;
} {
  const configs: Record<EstadoOrden, { label: string; color: string; bg: string; dot: string }> = {
    NORMAL:   { label: "Normal",   color: "text-blue-700",  bg: "bg-blue-50",  dot: "bg-blue-500"  },
    VENCIDA:  { label: "Vencida",  color: "text-red-700",   bg: "bg-red-50",   dot: "bg-red-500"   },
    INACTIVO: { label: "Inactivo", color: "text-gray-500",  bg: "bg-gray-100", dot: "bg-gray-400"  },
  };
  return configs[estado] ?? { label: estado, color: "text-gray-500", bg: "bg-gray-100", dot: "bg-gray-300" };
}

export function getCategoriaConfig(categoria: string): {
  label: string;
  color: string;
  bg: string;
} {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    NUEVO:    { label: "Nuevo",    color: "text-emerald-700", bg: "bg-emerald-50" },
    ACTIVO:   { label: "Activo",   color: "text-blue-700",    bg: "bg-blue-50"    },
    AUSENTE:  { label: "Ausente",  color: "text-amber-700",   bg: "bg-amber-50"   },
    ANTIGUO:  { label: "Antiguo",  color: "text-gray-600",    bg: "bg-gray-100"   },
    INACTIVO: { label: "Inactivo", color: "text-gray-500",    bg: "bg-gray-100"   },
  };
  return configs[categoria] ?? { label: categoria, color: "text-gray-500", bg: "bg-gray-100" };
}
