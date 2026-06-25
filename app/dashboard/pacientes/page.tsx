"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, Phone, ChevronRight, ChevronLeft, Loader2, AlertTriangle } from "lucide-react";
import { pacientesApi } from "@/lib/api";
import { getEstadoConfig, getCategoriaConfig } from "@/lib/calculos";
import { formatFecha } from "@/lib/utils";
import type { Paciente } from "@/lib/tipos";

function calcularEdad(fn: string): number {
  const hoy = new Date(); const nac = new Date(fn);
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

const CATEGORIAS = [
  { value: "TODOS",   label: "Todos"    },
  { value: "NUEVO",   label: "Nuevos"   },
  { value: "ACTIVO",  label: "Activos"  },
  { value: "AUSENTE", label: "Ausentes" },
  { value: "ANTIGUO", label: "Antiguos" },
];

const PAGE_SIZE = 10;

export default function PacientesPage() {
  const [pacientes, setPacientes]    = useState<Paciente[]>([]);
  const [loading,   setLoading]      = useState(true);
  const [error,     setError]        = useState("");
  const [busqueda,  setBusqueda]     = useState("");
  const [filtroCategoria, setFiltro] = useState("TODOS");
  const [rol,       setRol]          = useState("");

  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);

  const cargar = useCallback((p: number, search: string, categoria: string) => {
    setLoading(true);
    pacientesApi.getAll({ page: p, limit: PAGE_SIZE, search, categoria })
      .then(res => {
        setPacientes(res.data as Paciente[]);
        setTotalPages(res.totalPages);
        setTotal(res.total);
        setPage(res.page);
      })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("terapia_user") || "{}");
    setRol(user.rol ?? "");
    cargar(1, "", "TODOS");
  }, [cargar]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      cargar(1, busqueda, filtroCategoria);
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda, filtroCategoria, cargar]);

  const cambiarPagina = (p: number) => {
    cargar(p, busqueda, filtroCategoria);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pacientes</h2>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Cargando..." : `${total} pacientes registrados`}
          </p>
        </div>
        {rol !== "OPERATIVO" && (
          <Link href="/dashboard/pacientes/nuevo"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
            <Plus className="w-4 h-4" /> Nuevo Paciente
          </Link>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o documento..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIAS.map(c => (
            <button key={c.value} onClick={() => setFiltro(c.value)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
                filtroCategoria === c.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />{error}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">EPS / Tipo</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diagnóstico</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado Orden</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Último Ingreso</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pacientes.map(p => {
                    const estadoConfig = p.orden_activa ? getEstadoConfig(p.orden_activa.estado) : null;
                    const catConfig    = getCategoriaConfig(p.categoria);
                    const edad         = calcularEdad(p.fecha_nacimiento);

                    return (
                      <tr key={p.id} className={`hover:bg-gray-50/50 transition ${!p.activo ? "opacity-50" : ""}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                              {[p.primer_apellido, p.primer_nombre].map(s => s?.[0] ?? "").join("").toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-gray-900">{p.nombre_completo}</p>
                                {!p.activo && (
                                  <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">Inactivo</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400">{p.documento_identidad} · {edad} años · {p.sexo === "MASCULINO" ? "M" : "F"}</p>
                              {p.telefono_1 && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />{p.telefono_1}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-700">{p.eps_nombre || "—"}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.tipo_paciente === "PARTICULAR" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                          }`}>{p.tipo_paciente}</span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs font-semibold text-gray-500">{p.codigo_cie10}</p>
                          <p className="text-xs text-gray-600 max-w-[160px] leading-tight mt-0.5">{p.diagnostico_nombre}</p>
                        </td>
                        <td className="px-5 py-4">
                          {estadoConfig ? (
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${estadoConfig.dot}`} />
                              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${estadoConfig.bg} ${estadoConfig.color}`}>
                                {estadoConfig.label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Sin orden</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${catConfig.bg} ${catConfig.color}`}>
                            {catConfig.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-xs text-gray-500">
                            {p.ultimo_ingreso ? formatFecha(p.ultimo_ingreso) : "Sin ingresos"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <Link href={`/dashboard/pacientes/${p.id}`}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition inline-flex">
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {pacientes.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No se encontraron pacientes con esos filtros.
                </div>
              )}
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Página {page} de {totalPages} · {total} pacientes
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => cambiarPagina(page - 1)}
                  disabled={page <= 1}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "...")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => cambiarPagina(p as number)}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition ${
                          p === page
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => cambiarPagina(page + 1)}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
