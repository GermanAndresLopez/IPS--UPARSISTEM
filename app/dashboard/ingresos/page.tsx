"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Search, Clock, Users, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight, X, User, FileText, Calendar, Phone, Mail, Hash,
} from "lucide-react";
import { ingresosApi } from "@/lib/api";
import { formatHora, formatFecha, calcularEdad } from "@/lib/utils";
import type { Ingreso } from "@/lib/tipos";

const HOY = new Date().toISOString().split("T")[0];
const POR_PAGINA = 20;

interface IngresoDetalle extends Ingreso {
  paciente?: {
    id: number; nombre_completo: string; tipo_documento: string; documento_identidad: string;
    fecha_nacimiento: string; sexo: string; telefono_1: string; telefono_2?: string;
    correo?: string; tipo_paciente: string; eps_nombre?: string;
    codigo_cie10: string; diagnostico_nombre: string;
  };
  orden?: {
    id: number; tipo_limite: string; fecha_emision: string; fecha_inicio: string;
    fecha_fin?: string; sesiones_autorizadas: number; sesiones_consumidas: number;
    sesiones_restantes?: number; dias_restantes?: number;
    modalidad_nombre: string; terapeuta_inicial_nombre: string;
  };
}

export default function IngresosPage() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [verTodo, setVerTodo]   = useState(false);
  const [pagina, setPagina]     = useState(1);

  const [detalle, setDetalle]           = useState<IngresoDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

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

  const abrirDetalle = async (id: number) => {
    setDetalleLoading(true);
    setDetalle(null);
    try {
      const data = await ingresosApi.getById(id) as IngresoDetalle;
      setDetalle(data);
    } catch {
      setDetalle(null);
    } finally {
      setDetalleLoading(false);
    }
  };

  const ingresosDeHoy      = ingresos.filter(i => i.fecha === HOY);
  const ingresosAnteriores = ingresos.filter(i => i.fecha !== HOY);

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
                <IngresoCard key={i.id} ingreso={i} esNuevo={i.fecha === HOY} onClick={() => abrirDetalle(i.id)} />
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
              {historialPag.map(i => <IngresoCard key={i.id} ingreso={i} onClick={() => abrirDetalle(i.id)} />)}
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

      {/* Modal de detalle */}
      {(detalle || detalleLoading) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setDetalle(null); setDetalleLoading(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {detalleLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              </div>
            ) : detalle && (
              <>
                {/* Header del modal */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Detalle del Ingreso</h3>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {formatFecha(detalle.fecha)} · {detalle.dia_semana} · {formatHora(detalle.hora)}
                    </p>
                  </div>
                  <button onClick={() => setDetalle(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {/* Info del ingreso */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <InfoItem icon={<Clock className="w-4 h-4" />} label="Hora" value={formatHora(detalle.hora)} />
                    <InfoItem icon={<Hash className="w-4 h-4" />} label="Terapias" value={String(detalle.total_terapias_dia)} />
                    <InfoItem icon={<FileText className="w-4 h-4" />} label="Tipo ingreso" value={detalle.tipo_ingreso_nombre} />
                    <InfoItem icon={<User className="w-4 h-4" />} label="Registrado por" value={detalle.registrado_por?.split(" ").slice(0, 2).join(" ") || "—"} />
                  </div>

                  {/* Terapias realizadas */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Terapias realizadas</h4>
                    <div className="space-y-2">
                      {detalle.terapias.map((t, idx) => (
                        <div key={t.id} className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{t.tipo_terapia}</p>
                            <p className="text-xs text-gray-500">Terapeuta: {t.terapeuta_nombre}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observaciones */}
                  {detalle.observaciones && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Observaciones</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">{detalle.observaciones}</p>
                    </div>
                  )}

                  {/* Datos del paciente */}
                  {detalle.paciente && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" /> Paciente
                      </h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">
                            {detalle.paciente.nombre_completo.split(" ").slice(0,2).map(n=>n[0]).join("")}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{detalle.paciente.nombre_completo}</p>
                            <p className="text-xs text-gray-400">
                              {detalle.paciente.tipo_documento} {detalle.paciente.documento_identidad} · {calcularEdad(detalle.paciente.fecha_nacimiento)} años · {detalle.paciente.sexo === "MASCULINO" ? "Masculino" : "Femenino"}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <MiniInfo icon={<Phone className="w-3 h-3" />} value={detalle.paciente.telefono_1} />
                          {detalle.paciente.telefono_2 && <MiniInfo icon={<Phone className="w-3 h-3" />} value={detalle.paciente.telefono_2} />}
                          {detalle.paciente.correo && <MiniInfo icon={<Mail className="w-3 h-3" />} value={detalle.paciente.correo} />}
                          <MiniInfo label="EPS" value={detalle.paciente.eps_nombre || "Particular"} />
                          <MiniInfo label="Tipo" value={detalle.paciente.tipo_paciente} />
                          <MiniInfo label="CIE-10" value={`${detalle.paciente.codigo_cie10} — ${detalle.paciente.diagnostico_nombre}`} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Datos de la orden */}
                  {detalle.orden && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" /> Orden #{detalle.orden.id}
                      </h4>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <MiniInfo label="Modalidad" value={detalle.orden.modalidad_nombre} />
                          <MiniInfo label="Tipo" value={detalle.orden.tipo_limite === "FECHA" ? "Por fecha" : "Por sesiones"} />
                          <MiniInfo label="Terapeuta inicial" value={detalle.orden.terapeuta_inicial_nombre} />
                          <MiniInfo icon={<Calendar className="w-3 h-3" />} label="Inicio" value={formatFecha(detalle.orden.fecha_inicio)} />
                          {detalle.orden.tipo_limite === "FECHA" && (
                            <>
                              <MiniInfo icon={<Calendar className="w-3 h-3" />} label="Vence" value={detalle.orden.fecha_fin ? formatFecha(detalle.orden.fecha_fin) : "—"} />
                              <MiniInfo label="Días restantes" value={detalle.orden.dias_restantes != null ? String(detalle.orden.dias_restantes) : "—"} />
                            </>
                          )}
                          {detalle.orden.tipo_limite === "CANTIDAD_TERAPIAS" && (
                            <>
                              <MiniInfo label="Sesiones" value={`${detalle.orden.sesiones_consumidas} / ${detalle.orden.sesiones_autorizadas}`} />
                              <MiniInfo label="Restantes" value={detalle.orden.sesiones_restantes != null ? String(detalle.orden.sesiones_restantes) : "—"} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function MiniInfo({ icon, label, value }: { icon?: React.ReactNode; label?: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600">
      {icon && <span className="text-gray-400">{icon}</span>}
      {label && <span className="text-gray-400">{label}:</span>}
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function IngresoCard({ ingreso, esNuevo, onClick }: { ingreso: Ingreso; esNuevo?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border shadow-sm p-5 flex items-start gap-5 transition cursor-pointer hover:shadow-md ${
        esNuevo ? "border-emerald-300 ring-1 ring-emerald-200 hover:ring-emerald-300" : "border-gray-100 hover:border-indigo-200"
      }`}
    >
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
    </button>
  );
}
