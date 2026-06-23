"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Clock, Users, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { ingresosApi } from "@/lib/api";
import { formatHora } from "@/lib/utils";
import type { Ingreso } from "@/lib/tipos";

const HOY = new Date().toISOString().split("T")[0];
const POR_PAGINA = 20;

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [verTodo, setVerTodo]   = useState(false);
  const [pagina, setPagina]     = useState(1);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await ingresosApi.getAll() as Ingreso[];
      setIngresos(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const ingresosDeHoy      = ingresos.filter(i => i.fecha === HOY);
  const ingresosAnteriores = ingresos.filter(i => i.fecha !== HOY);

  // Pacientes únicos del día
  const pacientesDelDia = ingresosDeHoy.reduce<{ id: number; nombre: string; hora: string; tipo: string }[]>((acc, ing) => {
    if (!acc.some(p => p.id === ing.paciente_id)) {
      acc.push({ id: ing.paciente_id, nombre: ing.paciente_nombre, hora: formatHora(ing.hora), tipo: ing.tipo_ingreso_nombre });
    }
    return acc;
  }, []);

  const historialFiltrado = ingresosAnteriores.filter(i =>
    i.paciente_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  useEffect(() => { setPagina(1); }, [busqueda, verTodo]);

  const totalPaginas  = Math.ceil(historialFiltrado.length / POR_PAGINA);
  const historialPag  = historialFiltrado.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ingresos</h2>
          <p className="text-gray-500 text-sm mt-1">
            Registro de asistencia diaria ·{" "}
            {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link href="/dashboard/ingresos/nuevo"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
          <Plus className="w-4 h-4" /> Registrar Ingreso
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Pacientes del día */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900">Pacientes del día</h3>
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
            {pacientesDelDia.length}
          </span>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-indigo-300" /></div>
        ) : pacientesDelDia.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No hay ingresos registrados hoy.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pacientesDelDia.map(p => (
              <div key={p.id}
                className="flex items-center gap-3 p-3 rounded-xl border bg-emerald-50 border-emerald-200">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold flex-shrink-0">
                  {p.nombre.split(" ").slice(0,2).map(n=>n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{p.nombre}</p>
                  <p className="text-xs text-gray-500">{p.tipo}</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold flex-shrink-0">
                  <Clock className="w-3 h-3" /> {p.hora}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm text-gray-500">
              {verTodo ? "Historial completo" : ingresosDeHoy.length > 0 ? "Ingresos de hoy" : "Últimos ingresos"}
            </h3>
            {!verTodo && (
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
            {verTodo && (
              <span className="text-xs text-gray-400">
                {historialFiltrado.length} registros
              </span>
            )}
          </div>
          {verTodo && (
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por paciente..."
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-64"
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-300" /></div>
        ) : !verTodo ? (
          <>
            <div className="space-y-3">
              {(ingresosDeHoy.length > 0 ? ingresosDeHoy : historialFiltrado.slice(0, 10)).map(i =>
                <IngresoCard key={i.id} ingreso={i} esNuevo={i.fecha === HOY} />
              )}
            </div>
            {ingresosAnteriores.length > 0 && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setVerTodo(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                >
                  Ver todo el historial ({ingresosAnteriores.length} registros)
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-3">
              {historialPag.map(i => <IngresoCard key={i.id} ingreso={i} />)}
              {historialFiltrado.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">No se encontraron resultados.</div>
              )}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Página <span className="font-semibold">{pagina}</span> de <span className="font-semibold">{totalPaginas}</span>
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  disabled={pagina === totalPaginas}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function IngresoCard({ ingreso, esNuevo }: { ingreso: Ingreso; esNuevo?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-5 transition ${
      esNuevo ? "border-emerald-300 ring-1 ring-emerald-200" : "border-gray-100"
    }`}>
      <div className="flex-shrink-0 text-center w-14">
        <div className={`rounded-xl p-2.5 ${esNuevo ? "bg-emerald-50" : "bg-indigo-50"}`}>
          <p className={`text-xs font-semibold uppercase ${esNuevo ? "text-emerald-500" : "text-indigo-500"}`}>
            {new Date(String(ingreso.fecha).slice(0, 10) + "T12:00:00").toLocaleDateString("es-CO", { month: "short" })}
          </p>
          <p className={`text-xl font-bold ${esNuevo ? "text-emerald-700" : "text-indigo-700"}`}>
            {new Date(String(ingreso.fecha).slice(0, 10) + "T12:00:00").getDate()}
          </p>
          <p className={`text-xs capitalize ${esNuevo ? "text-emerald-400" : "text-indigo-400"}`}>
            {ingreso.dia_semana}
          </p>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900">{ingreso.paciente_nombre}</p>
          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
            {ingreso.tipo_ingreso_nombre}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Clock className="w-3 h-3" />
          {formatHora(ingreso.hora)}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {ingreso.terapias.map(t => (
            <div key={t.id}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-700">{t.tipo_terapia}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">
                {t.terapeuta_nombre.split(" ").slice(0,2).join(" ")}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-gray-400">Terapias</p>
        <p className="text-2xl font-bold text-gray-900">{ingreso.total_terapias_dia}</p>
        <p className="text-xs text-gray-400 mt-0.5">Por</p>
        <p className="text-xs text-gray-600 font-medium">
          {ingreso.registrado_por?.split(" ")[0]}
        </p>
      </div>
    </div>
  );
}
