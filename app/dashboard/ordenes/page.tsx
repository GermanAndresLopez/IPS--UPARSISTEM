"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Calendar, Hash, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";
import { ordenesApi } from "@/lib/api";
import { getEstadoConfig, requiereAlerta, requiereAlertaSesiones } from "@/lib/calculos";
import { formatFecha } from "@/lib/utils";
import type { Orden } from "@/lib/tipos";

type OrdenExtendida = Orden & { paciente_nombre?: string; eps_nombre?: string };

const ESTADOS = ["TODOS", "NORMAL", "VENCIDA", "INACTIVO"];

export default function OrdenesPage() {
  const [ordenes, setOrdenes]         = useState<OrdenExtendida[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [busqueda, setBusqueda]       = useState("");
  const [filtroEstado, setFiltro]     = useState("TODOS");

  useEffect(() => {
    ordenesApi.getAll()
      .then(data => setOrdenes(data as OrdenExtendida[]))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const ordenesFiltradas = ordenes.filter(o => {
    const matchB = (o.paciente_nombre ?? "").toLowerCase().includes(busqueda.toLowerCase());
    const matchE = filtroEstado === "TODOS" || o.estado === filtroEstado;
    return matchB && matchE;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Órdenes</h2>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Cargando..." : `${ordenes.length} órdenes registradas`}
          </p>
        </div>
        <Link href="/dashboard/ordenes/nueva"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
          <Plus className="w-4 h-4" /> Nueva Orden
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por paciente..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltro(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          {ESTADOS.map(e => (
            <option key={e} value={e}>{e === "TODOS" ? "Todos los estados" : e}</option>
          ))}
        </select>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" /> {error}
        </div>
      ) : (
        <div className="space-y-3">
          {ordenesFiltradas.map(o => {
            const cfg = getEstadoConfig(o.estado);
            const tieneAlerta =
              requiereAlerta(o.dias_restantes) ||
              requiereAlertaSesiones(o.sesiones_restantes);
            return (
              <div key={o.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-5 hover:border-indigo-100 transition group ${
                  tieneAlerta ? "border-amber-200" : "border-gray-100"
                }`}>
                <div className={`w-1 h-16 rounded-full flex-shrink-0 ${tieneAlerta ? "bg-amber-400" : cfg.dot}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{o.paciente_nombre}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {tieneAlerta && (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700">
                        <AlertTriangle className="w-3 h-3" />
                        {o.tipo_limite === "FECHA"
                          ? `Vence en ${o.dias_restantes} días`
                          : `${o.sesiones_restantes} sesiones restantes`}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      o.tipo_limite === "FECHA" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                    }`}>
                      {o.tipo_limite === "FECHA" ? (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Por fecha</span>
                      ) : (
                        <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Por sesiones</span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{o.eps_nombre || "Particular"} · {o.modalidad_nombre}</p>
                  <p className="text-xs text-gray-400">Terapeuta inicial: {o.terapeuta_inicial_nombre}</p>
                </div>

                <div className="flex gap-6 flex-shrink-0">
                  {o.tipo_limite === "FECHA" ? (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Vence</p>
                      <p className="text-sm font-semibold text-gray-900">{o.fecha_fin ? formatFecha(o.fecha_fin) : "—"}</p>
                      <p className={`text-xs font-medium mt-0.5 ${cfg.color}`}>
                        {o.dias_restantes !== undefined && o.dias_restantes !== null
                          ? o.dias_restantes >= 0
                            ? `${o.dias_restantes} días restantes`
                            : `Venció hace ${Math.abs(o.dias_restantes)} días`
                          : "—"}
                      </p>
                    </div>
                  ) : (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Sesiones</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {o.sesiones_consumidas} / {o.sesiones_autorizadas}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 ${cfg.color}`}>
                        {o.sesiones_restantes} restantes
                      </p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Inicio</p>
                    <p className="text-sm font-semibold text-gray-900">{formatFecha(o.fecha_inicio)}</p>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 transition flex-shrink-0" />
              </div>
            );
          })}
          {ordenesFiltradas.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No se encontraron órdenes.</div>
          )}
        </div>
      )}
    </div>
  );
}
