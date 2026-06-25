"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Phone, Calendar, FileText, Clock, User,
  Loader2, AlertTriangle, AlertCircle, Pencil, X, Check,
  Mail, IdCard, Activity, CheckCircle2,
} from "lucide-react";
import { pacientesApi, ingresosApi, epsApi, diagnosticosApi } from "@/lib/api";
import { getEstadoConfig, getCategoriaConfig } from "@/lib/calculos";
import { formatFecha, formatHora } from "@/lib/utils";
import type { Paciente, Ingreso, EPS, Diagnostico, EstadoOrden } from "@/lib/tipos";
import { Hash } from "lucide-react";

interface OrdenHistorial {
  id: number; tipo_limite: string; activa: boolean;
  fecha_inicio: string; fecha_fin?: string;
  sesiones_autorizadas?: number; sesiones_consumidas?: number;
  modalidad_nombre: string; estado: EstadoOrden; fecha_registro: string;
}

function calcEdad(fn: string) {
  const hoy = new Date(); const nac = new Date(fn);
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

const TIPO_DOC_LABEL: Record<string, string> = {
  CC: "Cédula de Ciudadanía",
  CE: "Cédula de Extranjería",
  TI: "Tarjeta de Identidad",
  RC: "Registro Civil",
  PA: "Pasaporte",
};

interface EditForm {
  primer_apellido: string; segundo_apellido: string;
  primer_nombre: string;   segundo_nombre: string;
  tipo_documento: string;  documento_identidad: string;
  fecha_nacimiento: string; sexo: string;
  telefono_1: string; telefono_2: string; correo: string;
  tipo_paciente: string; eps_id: string; diagnostico_id: string; novedad: string;
}

const FORM_VACIO: EditForm = {
  primer_apellido: "", segundo_apellido: "", primer_nombre: "", segundo_nombre: "",
  tipo_documento: "CC", documento_identidad: "",
  fecha_nacimiento: "", sexo: "MASCULINO",
  telefono_1: "", telefono_2: "", correo: "",
  tipo_paciente: "ORDEN", eps_id: "", diagnostico_id: "", novedad: "SIN_NOVEDAD",
};

interface Confirmacion { mensaje: string; accion: () => void }

export default function PerfilPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [paciente,  setPaciente]  = useState<Paciente | null>(null);
  const [ingresos,  setIngresos]  = useState<Ingreso[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [rol,       setRol]       = useState("");
  const [mensaje,   setMensaje]   = useState("");

  const [editando,      setEditando]      = useState(false);
  const [guardando,     setGuardando]     = useState(false);
  const [editError,     setEditError]     = useState("");
  const [editForm,      setEditForm]      = useState<EditForm>(FORM_VACIO);
  const [epsList,       setEpsList]       = useState<EPS[]>([]);
  const [diagnosticos,  setDiagnosticos]  = useState<Diagnostico[]>([]);
  const [confirmacion,  setConfirmacion]  = useState<Confirmacion | null>(null);
  const [docEstado,  setDocEstado]  = useState<"idle" | "verificando" | "duplicado" | "ok">("idle");
  const [docMensaje, setDocMensaje] = useState("");

  const cargar = async () => {
    const [p, i] = await Promise.all([
      pacientesApi.getById(Number(id)) as Promise<Paciente>,
      ingresosApi.getAll({ paciente_id: Number(id) }) as Promise<Ingreso[]>,
    ]);
    setPaciente(p);
    setIngresos(i);
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("terapia_user") || "{}");
    setRol(user.rol ?? "");
    cargar()
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    Promise.all([
      epsApi.getAll() as Promise<EPS[]>,
      diagnosticosApi.getAll() as Promise<Diagnostico[]>,
    ]).then(([eps, diags]) => {
      setEpsList(eps.filter(e => e.activa && e.nombre !== "PARTICULAR"));
      setDiagnosticos(diags.filter(d => d.activo));
    }).catch(() => { /* no bloquea la vista del perfil */ });
  }, []);

  useEffect(() => {
    if (!mensaje) return;
    const t = setTimeout(() => setMensaje(""), 4000);
    return () => clearTimeout(t);
  }, [mensaje]);

  // Verifica en tiempo real que el número de documento no esté ya registrado por otro paciente
  useEffect(() => {
    if (!editando) return;
    const doc = editForm.documento_identidad.trim();
    if (doc.length < 6) { setDocEstado("idle"); setDocMensaje(""); return; }

    setDocEstado("verificando");
    const t = setTimeout(() => {
      pacientesApi.verificarDocumento(doc, Number(id))
        .then(r => {
          if (r.existe) {
            setDocEstado("duplicado");
            setDocMensaje(`Ya existe un paciente registrado con este documento: ${r.paciente_nombre}`);
          } else {
            setDocEstado("ok");
            setDocMensaje("");
          }
        })
        .catch(() => { setDocEstado("idle"); setDocMensaje(""); });
    }, 500);
    return () => clearTimeout(t);
  }, [editForm.documento_identidad, editando, id]);

  const abrirEditar = () => {
    if (!paciente) return;
    setEditForm({
      primer_apellido:     paciente.primer_apellido     ?? "",
      segundo_apellido:    paciente.segundo_apellido    ?? "",
      primer_nombre:       paciente.primer_nombre       ?? "",
      segundo_nombre:      paciente.segundo_nombre      ?? "",
      tipo_documento:      paciente.tipo_documento      ?? "CC",
      documento_identidad: paciente.documento_identidad ?? "",
      fecha_nacimiento:    paciente.fecha_nacimiento    ?? "",
      sexo:                paciente.sexo                ?? "MASCULINO",
      telefono_1:          paciente.telefono_1,
      telefono_2:          paciente.telefono_2 ?? "",
      correo:              paciente.correo     ?? "",
      tipo_paciente:       paciente.tipo_paciente  ?? "ORDEN",
      eps_id:              paciente.eps_id?.toString()         ?? "",
      diagnostico_id:      paciente.diagnostico_id?.toString() ?? "",
      novedad:             paciente.novedad ?? "SIN_NOVEDAD",
    });
    setEditError("");
    setDocEstado("idle");
    setDocMensaje("");
    setEditando(true);
  };

  const guardar = () => {
    if (!editForm.primer_apellido || !editForm.primer_nombre || !editForm.telefono_1
        || !editForm.documento_identidad || !editForm.fecha_nacimiento || !editForm.diagnostico_id) {
      setEditError("Completa los campos obligatorios marcados con *.");
      return;
    }
    if (docEstado === "duplicado") {
      setEditError("No se puede guardar: ya existe un paciente con este número de documento.");
      return;
    }
    setConfirmacion({
      mensaje: "¿Deseas guardar los cambios realizados en los datos del paciente?",
      accion: confirmarGuardar,
    });
  };

  const confirmarGuardar = async () => {
    setConfirmacion(null);
    setGuardando(true); setEditError("");
    try {
      await pacientesApi.update(Number(id), {
        ...editForm,
        eps_id: editForm.tipo_paciente === "ORDEN" && editForm.eps_id ? Number(editForm.eps_id) : null,
        diagnostico_id: Number(editForm.diagnostico_id),
      });
      await cargar();
      setEditando(false);
      setMensaje("Datos del paciente actualizados correctamente.");
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const puedeEditar = rol === "ADMIN" || rol === "COORDINADOR";

  if (loading) return (
    <div className="flex items-center justify-center h-full py-20">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  if (error || !paciente) return (
    <div className="p-6 text-center text-gray-400">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
      <p>{error || "Paciente no encontrado."}</p>
      <Link href="/dashboard/pacientes" className="text-indigo-600 text-sm mt-2 inline-block">← Volver</Link>
    </div>
  );

  const orden     = paciente.orden_activa;
  const estadoCfg = orden ? getEstadoConfig(orden.estado) : null;
  const catCfg    = getCategoriaConfig(paciente.categoria);
  const edad      = calcEdad(paciente.fecha_nacimiento);
  const iniciales = [paciente.primer_apellido, paciente.primer_nombre]
    .map(s => s?.[0] ?? "").join("").toUpperCase();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* Navegación */}
      <Link href="/dashboard/pacientes"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="w-4 h-4" /> Volver a pacientes
      </Link>

      {mensaje && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {mensaje}
        </div>
      )}

      {/* ── Hero card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Franja de color superior */}
        <div className={`h-2 w-full ${paciente.activo ? "bg-gradient-to-r from-indigo-500 to-violet-500" : "bg-gray-300"}`} />

        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 shadow-inner ${
            paciente.activo ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
          }`}>
            {iniciales}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900 truncate">{paciente.nombre_completo}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${catCfg.bg} ${catCfg.color}`}>
                {catCfg.label}
              </span>
              {!paciente.activo && (
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">
                  Inactivo
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5 text-gray-400" />
                {TIPO_DOC_LABEL[paciente.tipo_documento] ?? paciente.tipo_documento} {paciente.documento_identidad}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                {edad} años · {formatFecha(paciente.fecha_nacimiento)}
              </span>
              <span className="text-gray-400">{paciente.sexo === "MASCULINO" ? "Masculino" : "Femenino"}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> {paciente.telefono_1}
              </span>
              {paciente.telefono_2 && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {paciente.telefono_2}
                </span>
              )}
              {paciente.correo && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" /> {paciente.correo}
                </span>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {puedeEditar && !editando && (
              <button onClick={abrirEditar}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-semibold transition">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
            )}
          </div>
        </div>

        {/* ── Panel de edición ── */}
        {editando && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-5 space-y-4">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-2">
              <Pencil className="w-3.5 h-3.5" /> Editar datos del paciente
            </p>

            {/* Datos personales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["primer_apellido","segundo_apellido","primer_nombre","segundo_nombre"] as const).map(f => (
                <div key={f}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">
                    {f.replace(/_/g," ")}{(f === "primer_apellido" || f === "primer_nombre") ? " *" : ""}
                  </label>
                  <input
                    value={editForm[f]}
                    onChange={e => setEditForm(p => ({ ...p, [f]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              ))}

              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Documento de identidad *</label>
                <div className="flex gap-2">
                  <select value={editForm.tipo_documento}
                    onChange={e => setEditForm(p => ({ ...p, tipo_documento: e.target.value }))}
                    className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 flex-shrink-0">
                    {Object.entries(TIPO_DOC_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input value={editForm.documento_identidad}
                    onChange={e => setEditForm(p => ({ ...p, documento_identidad: e.target.value }))}
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 ${
                      docEstado === "duplicado"
                        ? "border-red-300 focus:ring-red-400"
                        : "border-gray-200 focus:ring-indigo-400"
                    }`} />
                </div>
                {docEstado === "verificando" && (
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando documento...
                  </p>
                )}
                {docEstado === "duplicado" && (
                  <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {docMensaje}
                  </p>
                )}
                {docEstado === "ok" && (
                  <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Documento disponible
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Fecha de nacimiento *</label>
                <input type="date" value={editForm.fecha_nacimiento}
                  onChange={e => setEditForm(p => ({ ...p, fecha_nacimiento: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sexo</label>
                <select value={editForm.sexo}
                  onChange={e => setEditForm(p => ({ ...p, sexo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Teléfono 1 *</label>
                <input value={editForm.telefono_1}
                  onChange={e => setEditForm(p => ({ ...p, telefono_1: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Teléfono 2</label>
                <input value={editForm.telefono_2}
                  onChange={e => setEditForm(p => ({ ...p, telefono_2: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Correo electrónico</label>
                <input type="email" value={editForm.correo}
                  onChange={e => setEditForm(p => ({ ...p, correo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>

            {/* Datos clínicos */}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide flex items-center gap-2 mb-3">
                <FileText className="w-3.5 h-3.5" /> Datos clínicos
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo de paciente</label>
                  <select value={editForm.tipo_paciente}
                    onChange={e => setEditForm(p => ({ ...p, tipo_paciente: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="ORDEN">Orden EPS</option>
                    <option value="PARTICULAR">Particular</option>
                  </select>
                </div>
                {editForm.tipo_paciente === "ORDEN" && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">EPS</label>
                    <select value={editForm.eps_id}
                      onChange={e => setEditForm(p => ({ ...p, eps_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                      <option value="">Sin asignar</option>
                      {epsList.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Diagnóstico (CIE-10) *</label>
                  <select value={editForm.diagnostico_id}
                    onChange={e => setEditForm(p => ({ ...p, diagnostico_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Selecciona un diagnóstico</option>
                    {diagnosticos.map(d => <option key={d.id} value={d.id}>{d.codigo_cie10} — {d.descripcion}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-4">
                  <label className="block text-xs text-gray-500 mb-1">Novedad</label>
                  <select value={editForm.novedad}
                    onChange={e => setEditForm(p => ({ ...p, novedad: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="SIN_NOVEDAD">Sin Novedad</option>
                    <option value="DE_ALTA">De Alta</option>
                    <option value="SUSPENDIDO">Suspendido</option>
                    <option value="CAMBIO_CIUDAD">Cambio de Ciudad</option>
                    <option value="CAMBIO_DE_IPS">Cambio de IPS</option>
                    <option value="PARTICULAR">Particular</option>
                  </select>
                </div>
              </div>
            </div>

            {editError && <p className="text-xs text-red-600">{editError}</p>}

            <div className="flex gap-2">
              <button onClick={() => setEditando(false)}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-white transition">
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button onClick={guardar} disabled={guardando || docEstado === "duplicado" || docEstado === "verificando"}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition disabled:opacity-60">
                {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar cambios
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Grid: datos clínicos + orden ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Datos clínicos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-indigo-500" /> Datos Clínicos
          </h3>
          <div className="space-y-2.5">
            <Row label="EPS / Tipo" value={paciente.eps_nombre || "Particular"} />
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Diagnóstico</p>
              <p className="text-xs font-bold text-indigo-600">{paciente.codigo_cie10}</p>
              <p className="text-xs text-gray-700 leading-snug">{paciente.diagnostico_nombre}</p>
            </div>
            <Row label="Tipo de paciente" value={paciente.tipo_paciente} />
            <Row label="Novedad" value={paciente.novedad.replace(/_/g, " ")} />
            <Row label="Registrado" value={formatFecha(paciente.fecha_registro)} />
            <Row label="Por" value={paciente.registrado_por ?? "—"} />
          </div>
        </div>

        {/* Orden activa */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-4">
            <FileText className="w-4 h-4 text-indigo-500" /> Orden Activa
          </h3>
          {orden ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2 h-2 rounded-full ${estadoCfg?.dot}`} />
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${estadoCfg?.bg} ${estadoCfg?.color}`}>
                  {estadoCfg?.label}
                </span>
                <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                  orden.tipo_limite === "FECHA" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                }`}>
                  {orden.tipo_limite === "FECHA" ? "Por fecha" : "Por sesiones"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Inicio</p>
                  <p className="text-sm font-semibold text-gray-900">{formatFecha(orden.fecha_inicio)}</p>
                </div>
                {orden.fecha_fin && (
                  <div>
                    <p className="text-xs text-gray-400">Vencimiento</p>
                    <p className="text-sm font-semibold text-gray-900">{formatFecha(orden.fecha_fin)}</p>
                    {orden.dias_restantes !== undefined && (
                      <p className={`text-xs font-medium mt-0.5 ${estadoCfg?.color}`}>
                        {orden.dias_restantes >= 0
                          ? `${orden.dias_restantes} días restantes`
                          : `Venció hace ${Math.abs(orden.dias_restantes)} días`}
                      </p>
                    )}
                  </div>
                )}
                {orden.tipo_limite === "CANTIDAD_TERAPIAS" && (
                  <div>
                    <p className="text-xs text-gray-400">Sesiones</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {orden.sesiones_consumidas} / {orden.sesiones_autorizadas}
                    </p>
                    <p className={`text-xs font-medium mt-0.5 ${estadoCfg?.color}`}>
                      {orden.sesiones_restantes} restantes
                    </p>
                    <div className="mt-2 bg-gray-100 rounded-full h-1.5 w-full">
                      <div className={`h-1.5 rounded-full transition-all ${
                        (orden.sesiones_restantes || 0) <= 0 ? "bg-red-500" :
                        (orden.sesiones_restantes || 0) <= 5 ? "bg-amber-500" : "bg-emerald-500"
                      }`} style={{ width: `${Math.min(100, (orden.sesiones_consumidas / (orden.sesiones_autorizadas || 1)) * 100)}%` }} />
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Terapeuta inicial</p>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{orden.terapeuta_inicial_nombre}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Modalidad</p>
                  <p className="text-sm font-semibold text-gray-900">{orden.modalidad_nombre}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">Sin orden activa</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Historial de órdenes ── */}
      {(() => {
        const hist = (paciente as Paciente & { historial_ordenes?: OrdenHistorial[] }).historial_ordenes;
        if (!hist || hist.length === 0) return null;
        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-4">
              <FileText className="w-4 h-4 text-indigo-500" /> Historial de Órdenes
              <span className="text-xs text-gray-400 font-normal ml-1">({hist.length})</span>
            </h3>
            <div className="space-y-2">
              {hist.map(h => {
                const hCfg = getEstadoConfig(h.estado);
                return (
                  <Link key={h.id} href={`/dashboard/ordenes?orden=${h.id}`}
                    className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition group">
                    <div className="text-center flex-shrink-0 w-12">
                      <p className="text-xs text-gray-400">Orden</p>
                      <p className="text-lg font-bold text-gray-900">#{h.id}</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hCfg.bg} ${hCfg.color}`}>
                          {!h.activa && h.estado !== "INACTIVO" ? "CERRADA" : hCfg.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          h.tipo_limite === "FECHA" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                        }`}>
                          {h.tipo_limite === "FECHA" ? "Por fecha" : "Por sesiones"}
                        </span>
                        <span className="text-xs text-gray-400">{h.modalidad_nombre}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {h.tipo_limite === "FECHA" ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {formatFecha(h.fecha_inicio)} → {h.fecha_fin ? formatFecha(h.fecha_fin) : "—"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3 text-gray-400" />
                            {h.sesiones_consumidas}/{h.sesiones_autorizadas} sesiones
                          </span>
                        )}
                        <span className="text-gray-300">·</span>
                        <span>Creada: {formatFecha(h.fecha_registro)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-gray-300 group-hover:text-indigo-400 transition">
                      <AlertTriangle className="w-4 h-4 hidden" />
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Historial de ingresos ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm mb-4">
          <Clock className="w-4 h-4 text-indigo-500" /> Historial de Ingresos
          <span className="text-xs text-gray-400 font-normal ml-1">({ingresos.length})</span>
        </h3>
        {ingresos.length > 0 ? (
          <div className="space-y-2">
            {ingresos.map(ingreso => {
              const d = new Date(String(ingreso.fecha).slice(0, 10) + "T12:00:00");
              return (
                <div key={ingreso.id}
                  className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-100 transition">
                  <div className="w-10 text-center flex-shrink-0">
                    <p className="text-xs text-gray-400 leading-none">
                      {d.toLocaleDateString("es-CO", { month: "short" })}
                    </p>
                    <p className="text-lg font-bold text-gray-900 leading-tight">{d.getDate()}</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-gray-600">{formatHora(ingreso.hora)}</span>
                      <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                        {ingreso.tipo_ingreso_nombre}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {ingreso.terapias.map(t => (
                          <span key={t.id}
                            className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded-md text-gray-600">
                            {t.tipo_terapia}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-indigo-600">{ingreso.total_terapias_dia}</p>
                    <p className="text-xs text-gray-400">terapias</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">Sin ingresos registrados aún.</p>
          </div>
        )}
      </div>

      {/* ── Modal de confirmación ── */}
      {confirmacion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="text-sm text-gray-700 pt-2.5">{confirmacion.mensaje}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmacion(null)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={confirmacion.accion}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
                <Check className="w-3.5 h-3.5" /> Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
