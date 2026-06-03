import { clsx, type ClassValue } from "clsx";

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
}

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatFecha(fecha: string): string {
  if (!fecha) return "-";
  const solo = String(fecha).slice(0, 10);
  const d = new Date(solo + "T12:00:00");
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatFechaLarga(fecha: string): string {
  if (!fecha) return "-";
  const d = new Date(fecha);
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatHora(hora: string): string {
  if (!hora) return "-";
  const [h, m] = hora.split(":");
  const hNum = parseInt(h);
  const ampm = hNum >= 12 ? "p.m." : "a.m.";
  const h12 = hNum % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export function formatTimestamp(ts: string): string {
  if (!ts) return "-";
  const d = new Date(ts);
  return d.toLocaleString("es-CO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function diaSemana(fecha: string): string {
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return dias[new Date(fecha).getDay()];
}

export function iniciales(nombre: string): string {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function pluralizar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}
