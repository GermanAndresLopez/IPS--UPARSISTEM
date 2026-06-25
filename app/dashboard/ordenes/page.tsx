"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus, Search, Calendar, Hash, ChevronRight, ChevronLeft, AlertTriangle,
  Loader2, Pencil, X, Check, Ban, User, Phone, Mail, FileText, Clock,
} from "lucide-react";
import { ordenesApi } from "@/lib/api";
import { getEstadoConfig, requiereAlerta, requiereAlertaSesiones } from "@/lib/calculos";
import { formatFecha, formatTimestamp, calcularEdad } from "@/lib/utils";
import type { Orden, HistorialOrden } from "@/lib/tipos";

type OrdenExtendida = Orden & { paciente_nombre?: string; eps_nombre?: string };
type TipoCambio = "EXTENSION_FECHA" | "AMPLIACION_SESIONES" | "AJUSTE_CONSUMIDAS" | "CIERRE";

interface OrdenDetalle extends OrdenExtendida {
  historial: HistorialOrden[];
  paciente?: {
    id: number; nombre_completo: string; tipo_documento: string; documento_identidad: string;
    fecha_nacimiento: string; sexo: string; telefono_1: string; correo?: string;
    tipo_paciente: string; eps_nombre?: string; codigo_cie10: string; diagnostico_nombre: string;
  };
  total_ingresos: number;
}

const ESTADOS = ["TODOS", "NORMAL", "VENCIDA", "INACTIVO"];
const PAGE_SIZE = 10;

interface EditForm {
  tipo_cambio: TipoCambio;
  valor_nuevo: string;
  motivo: string;
}

const LABELS_CAMBIO: Record<string, string> = {
  EXTENSION_FECHA: "Ampliar fecha de finalización",
  AMPLIACION_SESIONES: "Ampliar sesiones autorizadas",
  AJUSTE_CONSUMIDAS: "Registrar sesiones no contabilizadas",
  CIERRE: "Vencer / Cerrar orden",
};

const LABELS_HISTORIAL: Record<string, string> = {
  EXTENSION_FECHA: "Extensión de fecha",
  AMPLIACION_SESIONES: "Ampliación de sesiones",
  AJUSTE_CONSUMIDAS: "Ajuste de consumidas",
  CIERRE: "Cierre de orden",
};

export default function OrdenesPage() {
  const [ordenes,      setOrdenes]      = useState<OrdenExtendida[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroEstado, setFiltro]       = useState("TODOS");
  const [rol,          setRol]          = useState("");

  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);

  const [editingId,  setEditingId]  = useState<number | null>(null);
  const [editForm,   setEditForm]   = useState<EditForm>({ tipo_cambio: "EXTENSION_FECHA", valor_nuevo: "", motivo: "" });
  const [guardando,  setGuardando]  = useState(false);
  const [editError,  setEditError]  = useState("");

  const [detalle,        setDetalle]        = useState<OrdenDetalle | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const searchParams = useSearchParams();

  const abrirDetalle = useCallback(async (id: number) => {
    setDetalleLoading(true);
    setDetalle(null);
    try {
      const data = await ordenesApi.getById(id) as OrdenDetalle;
      setDetalle(data);
    } catch {
      setDetalle(null);
    } finally {
      setDetalleLoading(false);
    }
  }, []);

  useEffect(() => {
    const ordenParam = searchParams.get("orden");
    if (ordenParam) {
      abrirDetalle(Number(ordenParam));
    }
  }, [searchParams, abrirDetalle]);

  const cargar = useCallback((p: number, search: string, estado: string) => {
    setLoading(true);
    ordenesApi.getAll({ page: p, limit: PAGE_SIZE, search, estado })
      .then(res => {
        setOrdenes(res.data as OrdenExtendida[]);
        setTotalPages(res.totalPages);
        setTotal(res.total);
        setPage(res.page);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const mountedRef = useRef(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("terapia_user") || "{}");
    setRol(user.rol ?? "");
  }, []);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      cargar(1, busqueda, filtroEstado);
      return;
    }
    const timeout = setTimeout(() => {
      setPage(1);
      cargar(1, busqueda, filtroEstado);
    }, 300);
    return () => clearTimeout(timeout);
  }, [busqueda, filtroEstado, cargar]);

  const cambiarPagina = (p: number) => {
    cargar(p, busqueda, filtroEstado);
  };

  const abrirEditar = (o: OrdenExtendida) => {
    const tipoPorDefecto: TipoCambio = o.tipo_limite === "FECHA" ? "EXTENSION_FECHA" : "AMPLIACION_SESIONES";
    setEditingId(o.id);
    setEditForm({
      tipo_cambio: tipoPorDefecto,
      valor_nuevo: o.tipo_limite === "FECHA" ? (o.fecha_fin ?? "") : "",
      motivo: "",
    });
    setEditError("");
  };

  const guardarEdicion = async (ordenId: number) => {
    if (editForm.tipo_cambio !== "CIERRE" && !editForm.valor_nuevo) {
      setEditError("Completa todos los campos.");
      return;
    }
    if (!editForm.motivo) {
      setEditError("Debes indicar el motivo.");
      return;
    }
    setGuardando(true);
    setEditError("");
    try {
      await ordenesApi.update(ordenId, {
        tipo_cambio: editForm.tipo_cambio,
        ...(editForm.tipo_cambio !== "CIERRE" ? { valor_nuevo: editForm.valor_nuevo } : {}),
        motivo: editForm.motivo,
      });
      setEditingId(null);
      cargar(page, busqueda, filtroEstado);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const puedeEditar = rol === "ADMIN" || rol === "COORDINADOR";

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Órdenes</h2>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Cargando..." : `${total} órdenes registradas`}
          </p>
        </div>
        <Link href="/dashboard/ordenes/nueva"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
          <Plus className="w-4 h-4" /> Nueva Orden
        </Link>
      </div>

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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-500 text-sm">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" /> {error}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {ordenes.map(o => {
              const cfg = getEstadoConfig(o.estado);
              const tieneAlerta = requiereAlerta(o.dias_restantes) || requiereAlertaSesiones(o.sesiones_restantes);
              const esEditando  = editingId === o.id;
              const esActiva    = o.activa;

              const opcionesCambio: TipoCambio[] = esActiva
                ? o.tipo_limite === "FECHA"
                  ? ["EXTENSION_FECHA", "CIERRE"]
                  : ["AMPLIACION_SESIONES", "AJUSTE_CONSUMIDAS", "EXTENSION_FECHA", "CIERRE"]
                : [];

              return (
                <div key={o.id} className={`bg-white rounded-2xl border shadow-sm transition cursor-pointer hover:shadow-md ${
                  !esActiva ? "opacity-60 border-gray-200 hover:opacity-80" : tieneAlerta ? "border-amber-200 hover:border-amber-300" : "border-gray-100 hover:border-indigo-200"
                }`}>
                  <div className="p-5 flex items-center gap-5" onClick={() => abrirDetalle(o.id)}>
                    <div className={`w-1 h-16 rounded-full flex-shrink-0 ${!esActiva ? "bg-gray-300" : tieneAlerta ? "bg-amber-400" : cfg.dot}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 text-sm">{o.paciente_nombre}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${!esActiva ? "bg-gray-100 text-gray-500" : `${cfg.bg} ${cfg.color}`}`}>
                          {!esActiva ? "CERRADA" : cfg.label}
                        </span>
                        {esActiva && tieneAlerta && (
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
                          {o.tipo_limite === "FECHA"
                            ? <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Por fecha</span>
                            : <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> Por sesiones</span>}
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

                    {puedeEditar && esActiva && (
                      <button
                        onClick={e => { e.stopPropagation(); esEditando ? setEditingId(null) : abrirEditar(o); }}
                        className={`p-2 rounded-xl transition flex-shrink-0 ${
                          esEditando
                            ? "bg-gray-100 text-gray-600"
                            : "hover:bg-indigo-50 text-gray-400 hover:text-indigo-600"
                        }`}
                        title="Editar orden"
                      >
                        {esEditando ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {esEditando && (
                    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-2xl space-y-3" onClick={e => e.stopPropagation()}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Editar orden #{o.id}</p>

                      <div className="flex gap-4 flex-wrap">
                        {opcionesCambio.map(tc => (
                          <label key={tc} className={`flex items-center gap-2 text-sm cursor-pointer ${tc === "CIERRE" ? "text-red-700" : ""}`}>
                            <input type="radio" name={`tipo_cambio_${o.id}`}
                              checked={editForm.tipo_cambio === tc}
                              onChange={() => setEditForm(f => ({ ...f, tipo_cambio: tc, valor_nuevo: "" }))}
                              className={tc === "CIERRE" ? "text-red-600" : "text-indigo-600"} />
                            {LABELS_CAMBIO[tc]}
                          </label>
                        ))}
                      </div>

                      {editForm.tipo_cambio === "CIERRE" ? (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                            <Ban className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-700">
                              Al cerrar esta orden, el paciente podrá recibir una nueva orden. Esta acción no se puede deshacer.
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo del cierre</label>
                            <input type="text" value={editForm.motivo}
                              onChange={e => setEditForm(f => ({ ...f, motivo: e.target.value }))}
                              placeholder="Ej: Orden vencida, paciente dado de alta, cambio de EPS..."
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {editForm.tipo_cambio === "EXTENSION_FECHA" ? "Nueva fecha de vencimiento"
                                : editForm.tipo_cambio === "AMPLIACION_SESIONES" ? "Sesiones adicionales a autorizar"
                                : "Sesiones no registradas a agregar"}
                            </label>
                            <input
                              type={editForm.tipo_cambio === "EXTENSION_FECHA" ? "date" : "number"}
                              min={editForm.tipo_cambio !== "EXTENSION_FECHA" ? "1" : undefined}
                              value={editForm.valor_nuevo}
                              onChange={e => setEditForm(f => ({ ...f, valor_nuevo: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Motivo del cambio</label>
                            <input type="text" value={editForm.motivo}
                              onChange={e => setEditForm(f => ({ ...f, motivo: e.target.value }))}
                              placeholder="Ej: Ampliación autorizada por médico tratante"
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                        </div>
                      )}

                      {editError && <p className="text-xs text-red-600">{editError}</p>}

                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)}
                          className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition">
                          Cancelar
                        </button>
                        <button onClick={() => guardarEdicion(o.id)} disabled={guardando}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-60 ${
                            editForm.tipo_cambio === "CIERRE" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}>
                          {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : editForm.tipo_cambio === "CIERRE" ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          {editForm.tipo_cambio === "CIERRE" ? "Cerrar orden" : "Guardar cambio"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {ordenes.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">No se encontraron órdenes.</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">Página {page} de {totalPages} · {total} órdenes</p>
              <div className="flex items-center gap-1">
                <button onClick={() => cambiarPagina(page - 1)} disabled={page <= 1}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
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
                      <button key={p} onClick={() => cambiarPagina(p as number)}
                        className={`w-9 h-9 rounded-xl text-sm font-medium transition ${
                          p === page ? "bg-indigo-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}>{p}</button>
                    )
                  )}
                <button onClick={() => cambiarPagina(page + 1)} disabled={page >= totalPages}
                  className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de detalle */}
      {(detalle || detalleLoading) && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setDetalle(null); setDetalleLoading(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {detalleLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              </div>
            ) : detalle && (() => {
              const dCfg = getEstadoConfig(detalle.estado);
              return (
                <>
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">Orden #{detalle.id}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${!detalle.activa ? "bg-gray-100 text-gray-500" : `${dCfg.bg} ${dCfg.color}`}`}>
                          {!detalle.activa ? "CERRADA" : dCfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{detalle.paciente_nombre}</p>
                    </div>
                    <button onClick={() => setDetalle(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Info de la orden */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <InfoItem icon={<Calendar className="w-4 h-4" />} label="Emisión" value={formatFecha(detalle.fecha_emision)} />
                      <InfoItem icon={<Calendar className="w-4 h-4" />} label="Inicio" value={formatFecha(detalle.fecha_inicio)} />
                      {detalle.tipo_limite === "FECHA" && (
                        <InfoItem icon={<Calendar className="w-4 h-4" />} label="Vencimiento" value={detalle.fecha_fin ? formatFecha(detalle.fecha_fin) : "—"} />
                      )}
                      <InfoItem
                        icon={detalle.tipo_limite === "FECHA" ? <Clock className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                        label={detalle.tipo_limite === "FECHA" ? "Días restantes" : "Sesiones"}
                        value={detalle.tipo_limite === "FECHA"
                          ? detalle.dias_restantes != null
                            ? detalle.dias_restantes >= 0 ? `${detalle.dias_restantes} días` : `Venció hace ${Math.abs(detalle.dias_restantes)}d`
                            : "—"
                          : `${detalle.sesiones_consumidas} / ${detalle.sesiones_autorizadas}`
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <InfoItem icon={<FileText className="w-4 h-4" />} label="Tipo" value={detalle.tipo_limite === "FECHA" ? "Por fecha" : "Por sesiones"} />
                      <InfoItem label="Modalidad" value={detalle.modalidad_nombre} />
                      <InfoItem label="Terapeuta inicial" value={detalle.terapeuta_inicial_nombre} />
                      <InfoItem label="Ingresos registrados" value={String(detalle.total_ingresos)} />
                      {detalle.registrada_por && <InfoItem label="Registrada por" value={detalle.registrada_por} />}
                      <InfoItem label="Fecha registro" value={formatFecha(detalle.fecha_registro)} />
                    </div>

                    {detalle.tipo_limite === "CANTIDAD_TERAPIAS" && detalle.sesiones_restantes != null && (
                      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                        detalle.sesiones_restantes > 5 ? "bg-emerald-50 text-emerald-700" :
                        detalle.sesiones_restantes > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                      }`}>
                        <Hash className="w-4 h-4" />
                        {detalle.sesiones_restantes > 0
                          ? `${detalle.sesiones_restantes} sesiones restantes`
                          : "Sin sesiones disponibles"}
                      </div>
                    )}

                    {/* Paciente */}
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
                                {detalle.paciente.tipo_documento} {detalle.paciente.documento_identidad} · {calcularEdad(detalle.paciente.fecha_nacimiento)} años · {detalle.paciente.sexo === "MASCULINO" ? "M" : "F"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-gray-600">
                            {detalle.paciente.telefono_1 && (
                              <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" />{detalle.paciente.telefono_1}</span>
                            )}
                            {detalle.paciente.correo && (
                              <span className="flex items-center gap-1.5 truncate"><Mail className="w-3 h-3 text-gray-400" />{detalle.paciente.correo}</span>
                            )}
                            <span><span className="text-gray-400">EPS: </span><span className="font-medium">{detalle.paciente.eps_nombre || "Particular"}</span></span>
                            <span><span className="text-gray-400">Tipo: </span><span className="font-medium">{detalle.paciente.tipo_paciente}</span></span>
                            <span className="col-span-2"><span className="text-gray-400">CIE-10: </span><span className="font-medium">{detalle.paciente.codigo_cie10} — {detalle.paciente.diagnostico_nombre}</span></span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Historial de cambios */}
                    {detalle.historial && detalle.historial.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-500" /> Historial de cambios
                        </h4>
                        <div className="space-y-2">
                          {detalle.historial.map((h, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`font-semibold px-2 py-0.5 rounded-full ${
                                  h.tipo_cambio === "CIERRE" ? "bg-red-50 text-red-700" : "bg-indigo-50 text-indigo-700"
                                }`}>
                                  {LABELS_HISTORIAL[h.tipo_cambio] || h.tipo_cambio}
                                </span>
                                <span className="text-gray-400">{formatTimestamp(h.fecha_cambio)}</span>
                              </div>
                              {h.tipo_cambio !== "CIERRE" && (
                                <p className="text-gray-600">
                                  <span className="text-gray-400">Anterior: </span>{h.valor_anterior}
                                  <span className="text-gray-400 mx-1">→</span>
                                  <span className="font-medium">{h.valor_nuevo}</span>
                                </p>
                              )}
                              <p className="text-gray-500 mt-1">
                                <span className="text-gray-400">Motivo: </span>{h.motivo}
                              </p>
                              <p className="text-gray-400 mt-0.5">Por: {h.modificado_por}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
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
