"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X, Save, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { PACIENTES_MOCK, TERAPEUTAS } from "@/lib/mock-data";
import { getEstadoConfig, requiereAlerta, requiereAlertaSesiones } from "@/lib/calculos";
import { formatFecha } from "@/lib/utils";
import type { Paciente } from "@/lib/tipos";

// Tipos de terapia con su cargo equivalente en terapeutas
const TIPOS_TERAPIA = [
  "Fonoaudiología",
  "Psicología",
  "Terapia Ocupacional",
  "Fisioterapia",
  "Neuropsicología",
  "Refuerzo Escolar",
];

const TIPOS_INGRESO = [
  "TERAPIAS",
  "VALORACIÓN",
  "NEUROPSICOLOGÍA",
  "REVALORACIÓN",
  "EVALUACIÓN SENSORIAL",
  "REFUERZO ESCOLAR",
];

const FRANJAS = [
  "07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30",
  "13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00",
];

interface TerapiaLine {
  tipo: string;
  terapeuta_id: string;
}

// Filtra terapeutas por tipo de terapia
function getTerapeutasPorTipo(tipo: string) {
  const filtered = TERAPEUTAS.filter(
    t => t.activo && t.tipo_cargo.toLowerCase() === tipo.toLowerCase()
  );
  // Si no hay coincidencia exacta, devolver todos (ej: Refuerzo Escolar)
  return filtered.length > 0 ? filtered : TERAPEUTAS.filter(t => t.activo);
}

export default function NuevoIngresoPage() {
  const router = useRouter();

  // --- Búsqueda de paciente ---
  const [busqueda, setBusqueda]         = useState("");
  const [sugerencias, setSugerencias]   = useState<Paciente[]>([]);
  const [paciente, setPaciente]         = useState<Paciente | null>(null);
  const [showSug, setShowSug]           = useState(false);
  const inputRef                        = useRef<HTMLInputElement>(null);

  // --- Formulario ---
  const [tipoIngreso, setTipoIngreso]   = useState("TERAPIAS");
  const [hora, setHora]                 = useState("09:00");
  const [terapias, setTerapias]         = useState<TerapiaLine[]>([
    { tipo: "Fonoaudiología", terapeuta_id: "" },
  ]);
  const [obs, setObs]                   = useState("");
  const [guardando, setGuardando]       = useState(false);
  const [guardado, setGuardado]         = useState(false);

  // Datos derivados del paciente
  const orden         = paciente?.orden_activa;
  const estadoOrden   = orden ? getEstadoConfig(orden.estado) : null;
  const ordenBloqueada =
    orden && ["VENCIDA","AGOTADA","INACTIVO"].includes(orden.estado);
  const esSinOrden    = paciente?.tipo_paciente === "PARTICULAR";

  // Buscar pacientes al escribir
  const handleBusqueda = (valor: string) => {
    setBusqueda(valor);
    if (valor.length < 2) { setSugerencias([]); setShowSug(false); return; }
    const matches = PACIENTES_MOCK.filter(p =>
      p.nombre_completo.toLowerCase().includes(valor.toLowerCase()) ||
      p.documento_identidad.includes(valor)
    ).slice(0, 6);
    setSugerencias(matches);
    setShowSug(true);
  };

  // Seleccionar paciente de la lista
  const seleccionarPaciente = (p: Paciente) => {
    setPaciente(p);
    setBusqueda(p.nombre_completo);
    setSugerencias([]);
    setShowSug(false);
  };

  // Cerrar sugerencias al hacer click afuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSug(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Agregar / quitar / actualizar terapias
  const addTerapia    = () =>
    setTerapias(prev => [...prev, { tipo: TIPOS_TERAPIA[0], terapeuta_id: "" }]);
  const removeTerapia = (i: number) =>
    setTerapias(prev => prev.filter((_, idx) => idx !== i));
  const updateTerapia = (i: number, key: keyof TerapiaLine, val: string) =>
    setTerapias(prev =>
      prev.map((t, idx) =>
        idx === i
          ? { ...t, [key]: val, ...(key === "tipo" ? { terapeuta_id: "" } : {}) }
          : t
      )
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ordenBloqueada && !esSinOrden) return;
    if (!paciente) return;
    setGuardando(true);

    // Guardar en localStorage para que la página de ingresos lo muestre
    const nuevoIngreso = {
      id: Date.now(),
      fecha: new Date().toISOString().split("T")[0],
      hora,
      dia_semana: ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"][new Date().getDay()],
      paciente_id: paciente.id,
      paciente_nombre: paciente.nombre_completo,
      orden_id: orden?.id ?? 0,
      tipo_ingreso_id: 1,
      tipo_ingreso_nombre: tipoIngreso,
      terapias: terapias.map((t, i) => ({
        id: Date.now() + i,
        ingreso_id: Date.now(),
        tipo_terapia: t.tipo,
        terapeuta_id: Number(t.terapeuta_id),
        terapeuta_nombre:
          TERAPEUTAS.find(te => te.id === Number(t.terapeuta_id))?.nombre_completo ?? "—",
      })),
      total_terapias_dia: terapias.length,
      observaciones: obs,
      registrado_por: "María Operativa",
      fecha_registro: new Date().toISOString(),
      esNuevo: true,
    };

    const previos = JSON.parse(localStorage.getItem("ingresos_nuevos") ?? "[]");
    localStorage.setItem("ingresos_nuevos", JSON.stringify([nuevoIngreso, ...previos]));

    setTimeout(() => {
      setGuardando(false);
      setGuardado(true);
      setTimeout(() => router.push("/dashboard/ingresos"), 900);
    }, 800);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/ingresos"
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-500"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registrar Ingreso</h2>
          <p className="text-gray-500 text-sm">
            Asistencia diaria ·{" "}
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── PASO 1: Buscar paciente ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">1. Buscar paciente</h3>

          <div className="relative" ref={inputRef}>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={e => handleBusqueda(e.target.value)}
              onFocus={() => sugerencias.length > 0 && setShowSug(true)}
              placeholder="Escriba nombre o número de documento..."
              autoComplete="off"
              className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Lista de sugerencias */}
            {showSug && sugerencias.length > 0 && (
              <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {sugerencias.map(p => {
                  const cfg = p.orden_activa ? getEstadoConfig(p.orden_activa.estado) : null;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => seleccionarPaciente(p)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition text-left border-b border-gray-50 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                        {p.nombre_completo.split(" ").slice(0,2).map(n=>n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {p.nombre_completo}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.documento_identidad} · {p.eps_nombre ?? "Particular"} ·{" "}
                          <span className="font-medium text-gray-500">
                            {p.codigo_cie10}
                          </span>
                        </p>
                      </div>
                      {cfg && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ficha auto-llenada del paciente */}
          {paciente && (
            <div className={`p-4 rounded-xl border ${
              ordenBloqueada
                ? "bg-red-50 border-red-200"
                : (requiereAlerta(orden?.dias_restantes) || requiereAlertaSesiones(orden?.sesiones_restantes))
                ? "bg-amber-50 border-amber-200"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              {/* Cabecera */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{paciente.nombre_completo}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {paciente.documento_identidad} ·{" "}
                    {(() => {
                      const hoy2 = new Date();
                      const nac  = new Date(paciente.fecha_nacimiento);
                      let e = hoy2.getFullYear() - nac.getFullYear();
                      const mm = hoy2.getMonth() - nac.getMonth();
                      if (mm < 0 || (mm === 0 && hoy2.getDate() < nac.getDate())) e--;
                      return `${e} años`;
                    })()} · {paciente.sexo}
                  </p>
                  {paciente.telefono_1 && (
                    <p className="text-xs text-gray-400 mt-0.5">📞 {paciente.telefono_1}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setPaciente(null); setBusqueda(""); }}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Orden */}
              <div className="mt-3 pt-3 border-t border-white/60 space-y-1 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  {esSinOrden ? (
                    <span className="flex items-center gap-1 text-purple-700 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Paciente PARTICULAR — no requiere orden
                    </span>
                  ) : orden ? (
                    <>
                      {ordenBloqueada
                        ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        : <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                      <span className={`font-semibold ${estadoOrden?.color}`}>
                        Orden {estadoOrden?.label}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400">Sin orden activa</span>
                  )}
                </div>
                <p>
                  <span className="text-gray-400">Diagnóstico: </span>
                  <strong>{paciente.codigo_cie10} — {paciente.diagnostico_nombre}</strong>
                </p>
                {orden && (
                  <>
                    <p>
                      <span className="text-gray-400">EPS: </span>
                      <strong>{paciente.eps_nombre ?? "Particular"}</strong>
                    </p>
                    {orden.tipo_limite === "FECHA" ? (
                      <p>
                        <span className="text-gray-400">Vence: </span>
                        <strong>{formatFecha(orden.fecha_fin!)}</strong>
                        {orden.dias_restantes !== undefined && (
                          <span className={`ml-1 ${estadoOrden?.color}`}>
                            ({orden.dias_restantes >= 0
                              ? `${orden.dias_restantes} días restantes`
                              : `venció hace ${Math.abs(orden.dias_restantes)} días`})
                          </span>
                        )}
                      </p>
                    ) : (
                      <p>
                        <span className="text-gray-400">Sesiones: </span>
                        <strong>{orden.sesiones_consumidas}/{orden.sesiones_autorizadas}</strong>
                        <span className={`ml-1 ${estadoOrden?.color}`}>
                          ({orden.sesiones_restantes} restantes)
                        </span>
                      </p>
                    )}
                    <p>
                      <span className="text-gray-400">Terapeuta inicial: </span>
                      <strong>{orden.terapeuta_inicial_nombre}</strong>
                    </p>
                  </>
                )}
              </div>

              {/* Bloqueo */}
              {ordenBloqueada && (
                <div className="mt-2 p-2.5 bg-red-100 rounded-lg text-red-700 text-xs font-medium">
                  ⚠️ La orden está{" "}
                  {orden?.sesiones_restantes !== undefined && orden.sesiones_restantes <= 0 ? "agotada" : "vencida"}.
                  Contacte al coordinador antes de registrar el ingreso.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── PASO 2: Tipo y hora ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">2. Tipo de ingreso y hora</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tipo de ingreso
              </label>
              <select
                value={tipoIngreso}
                onChange={e => setTipoIngreso(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TIPOS_INGRESO.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Hora de la sesión
              </label>
              <select
                value={hora}
                onChange={e => setHora(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {FRANJAS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── PASO 3: Terapias (terapeuta filtrado por tipo) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">3. Terapias del día</h3>
            <button
              type="button"
              onClick={addTerapia}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Plus className="w-4 h-4" /> Agregar terapia
            </button>
          </div>

          <div className="space-y-3">
            {terapias.map((t, i) => {
              const terapeutasDisponibles = getTerapeutasPorTipo(t.tipo);
              return (
                <div
                  key={i}
                  className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </div>
                    {/* Tipo de terapia */}
                    <select
                      value={t.tipo}
                      onChange={e => updateTerapia(i, "tipo", e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {TIPOS_TERAPIA.map(tt => <option key={tt}>{tt}</option>)}
                    </select>
                    {terapias.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTerapia(i)}
                        className="text-gray-300 hover:text-red-500 transition flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Terapeuta — filtrado por tipo */}
                  <div className="flex items-center gap-2 pl-9">
                    <select
                      value={t.terapeuta_id}
                      onChange={e => updateTerapia(i, "terapeuta_id", e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">
                        — Seleccionar terapeuta ({t.tipo}) —
                      </option>
                      {terapeutasDisponibles.map(te => (
                        <option key={te.id} value={te.id}>
                          {te.nombre_completo} · {te.tipo_cargo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-3 rounded-xl">
            <span>ℹ️</span>
            <span>
              Cada terapia descuenta 1 sesión de la orden —{" "}
              <strong>{terapias.length} sesión{terapias.length > 1 ? "es" : ""} hoy</strong>
            </span>
          </div>
        </div>

        {/* ── PASO 4: Observaciones ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-3">4. Observaciones (opcional)</h3>
          <textarea
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={3}
            placeholder="Notas clínicas breves sobre la sesión..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/ingresos"
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={guardando || guardado || !paciente || (!!ordenBloqueada && !esSinOrden)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {guardado
              ? "¡Registrado! Redirigiendo..."
              : guardando
              ? "Guardando..."
              : "Registrar Ingreso"}
          </button>
        </div>
      </form>
    </div>
  );
}
