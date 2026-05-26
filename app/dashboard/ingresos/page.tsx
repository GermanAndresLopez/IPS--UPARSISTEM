"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Clock, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { INGRESOS_MOCK, PACIENTES_MOCK } from "@/lib/mock-data";
import { getEstadoConfig } from "@/lib/calculos";
import { formatFecha, formatHora } from "@/lib/utils";
import type { Ingreso } from "@/lib/tipos";

const HOY = new Date().toISOString().split("T")[0];

// Pacientes activos con orden vigente (próximos esperados)
const PROXIMOS = PACIENTES_MOCK.filter(p =>
  p.orden_activa &&
  ["ACTIVO", "AUSENTE", "NUEVO"].includes(p.categoria) &&
  p.orden_activa.estado === "NORMAL"
).slice(0, 8);

export default function IngresosPage() {
  const [busqueda, setBusqueda]       = useState("");
  const [ingresosExtra, setExtra]     = useState<Ingreso[]>([]);

  // Cargar ingresos nuevos del día desde localStorage (registrados en esta sesión)
  useEffect(() => {
    const cargar = () => {
      const stored = localStorage.getItem("ingresos_nuevos");
      if (stored) {
        const todos: (Ingreso & { esNuevo?: boolean })[] = JSON.parse(stored);
        const deHoy = todos.filter(i => i.fecha === HOY);
        setExtra(deHoy);
      }
    };
    cargar();
    // Escuchar cambios del localStorage (por si se abre otra pestaña)
    window.addEventListener("storage", cargar);
    return () => window.removeEventListener("storage", cargar);
  }, []);

  // Combinar: primero los nuevos del día, luego los del mock
  const todosIngresos: (Ingreso & { esNuevo?: boolean })[] = [
    ...ingresosExtra,
    ...INGRESOS_MOCK,
  ];

  const ingresosDeHoy = todosIngresos.filter(i => i.fecha === HOY);
  const ingresosAnteriores = todosIngresos.filter(i => i.fecha !== HOY);

  const ingresosFiltrados = [
    ...ingresosDeHoy,
    ...ingresosAnteriores,
  ].filter(i =>
    i.paciente_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ingresos</h2>
          <p className="text-gray-500 text-sm mt-1">
            Registro de asistencia diaria ·{" "}
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
        </div>
        <Link
          href="/dashboard/ingresos/nuevo"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Registrar Ingreso
        </Link>
      </div>

      {/* ── Pacientes esperados hoy ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900">Pacientes con orden activa</h3>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            {PROXIMOS.length} pacientes
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROXIMOS.map(p => {
            const cfg   = p.orden_activa ? getEstadoConfig(p.orden_activa.estado) : null;
            const yaHoy = ingresosDeHoy.some(i => i.paciente_id === p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                  yaHoy
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-gray-50 border-gray-100 hover:border-indigo-200"
                }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                  {p.nombre_completo.split(" ").slice(0,2).map(n=>n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {p.nombre_completo}
                  </p>
                  <p className="text-xs text-gray-400">{p.diagnostico_nombre.slice(0,28)}…</p>
                </div>
                {/* Estado / Ya asistió */}
                {yaHoy ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Asistió
                  </span>
                ) : cfg ? (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Ingresos de hoy ── */}
      {ingresosDeHoy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-semibold text-gray-900 text-sm">
              Ingresos de hoy
            </h3>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
              {ingresosDeHoy.length}
            </span>
          </div>
          <div className="space-y-2">
            {ingresosDeHoy.map(ingreso => (
              <IngresoCard
                key={ingreso.id}
                ingreso={ingreso as any}
                esNuevo={(ingreso as any).esNuevo}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Buscador + historial ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm text-gray-500">Historial</h3>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar por paciente..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-64"
            />
          </div>
        </div>

        <div className="space-y-3">
          {ingresosAnteriores
            .filter(i => i.paciente_nombre.toLowerCase().includes(busqueda.toLowerCase()))
            .map(ingreso => (
              <IngresoCard key={ingreso.id} ingreso={ingreso as any} />
            ))}
          {ingresosAnteriores.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              No hay ingresos anteriores registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente tarjeta de ingreso ──
function IngresoCard({
  ingreso,
  esNuevo,
}: {
  ingreso: Ingreso & { esNuevo?: boolean };
  esNuevo?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-5 transition ${
        esNuevo ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-100"
      }`}
    >
      {/* Fecha */}
      <div className="flex-shrink-0 text-center w-14">
        <div className={`rounded-xl p-2.5 ${esNuevo ? "bg-emerald-50" : "bg-indigo-50"}`}>
          <p className={`text-xs font-semibold uppercase ${esNuevo ? "text-emerald-500" : "text-indigo-500"}`}>
            {new Date(ingreso.fecha).toLocaleDateString("es-CO", { month: "short" })}
          </p>
          <p className={`text-xl font-bold ${esNuevo ? "text-emerald-700" : "text-indigo-700"}`}>
            {new Date(ingreso.fecha).getDate()}
          </p>
          <p className={`text-xs capitalize ${esNuevo ? "text-emerald-400" : "text-indigo-400"}`}>
            {ingreso.dia_semana}
          </p>
        </div>
      </div>

      {/* Datos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900">{ingreso.paciente_nombre}</p>
          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
            {ingreso.tipo_ingreso_nombre}
          </span>
          {esNuevo && (
            <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Registrado hoy
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Clock className="w-3 h-3" />
          {formatHora(ingreso.hora)}
        </div>

        {/* Terapias con terapeuta */}
        <div className="flex flex-wrap gap-2 mt-2">
          {ingreso.terapias.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-700">{t.tipo_terapia}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">
                {t.terapeuta_nombre.split(" ")[0]} {t.terapeuta_nombre.split(" ")[1] ?? ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-gray-400">Terapias</p>
        <p className="text-2xl font-bold text-gray-900">{ingreso.total_terapias_dia}</p>
        <p className="text-xs text-gray-400 mt-0.5">Registrado por</p>
        <p className="text-xs text-gray-600 font-medium">
          {ingreso.registrado_por.split(" ")[0]}
        </p>
      </div>
    </div>
  );
}
