"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Calendar, FileText, Clock, User, Loader2, AlertTriangle } from "lucide-react";
import { pacientesApi, ingresosApi } from "@/lib/api";
import { getEstadoConfig, getCategoriaConfig } from "@/lib/calculos";
import { formatFecha, formatHora } from "@/lib/utils";
import type { Paciente, Ingreso } from "@/lib/tipos";

function calcEdad(fn: string) {
  const hoy = new Date(); const nac = new Date(fn);
  let e = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) e--;
  return e;
}

export default function PerfilPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    Promise.all([
      pacientesApi.getById(Number(id)) as Promise<Paciente>,
      ingresosApi.getAll({ paciente_id: Number(id) }) as Promise<Ingreso[]>,
    ])
      .then(([p, i]) => { setPaciente(p); setIngresos(i); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/pacientes"
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">{paciente.nombre_completo}</h2>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${catCfg.bg} ${catCfg.color}`}>
              {catCfg.label}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            {paciente.documento_identidad} · {edad} años · {paciente.sexo}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Datos personales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" /> Datos Personales
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatFecha(paciente.fecha_nacimiento)} ({edad} años)</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{paciente.telefono_1}</span>
            </div>
            {paciente.telefono_2 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{paciente.telefono_2}</span>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div>
              <p className="text-xs text-gray-400">EPS / Tipo</p>
              <p className="text-sm font-medium text-gray-800">{paciente.eps_nombre || "Particular"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Diagnóstico</p>
              <p className="text-xs font-bold text-indigo-600">{paciente.codigo_cie10}</p>
              <p className="text-sm text-gray-800 leading-tight">{paciente.diagnostico_nombre}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Novedad</p>
              <p className="text-sm text-gray-800">{paciente.novedad.replace(/_/g," ")}</p>
            </div>
          </div>
        </div>

        {/* Orden activa */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-indigo-500" /> Orden Activa
            </h3>
            {orden ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${estadoCfg?.dot}`} />
                  <span className={`text-sm font-semibold px-3 py-1 rounded-xl ${estadoCfg?.bg} ${estadoCfg?.color}`}>
                    {estadoCfg?.label}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    orden.tipo_limite === "FECHA" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                  }`}>
                    {orden.tipo_limite === "FECHA" ? "Por fecha" : "Por sesiones"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Inicio</p>
                    <p className="font-semibold text-gray-900">{formatFecha(orden.fecha_inicio)}</p>
                  </div>
                  {orden.tipo_limite === "FECHA" && orden.fecha_fin && (
                    <div>
                      <p className="text-xs text-gray-400">Vencimiento</p>
                      <p className="font-semibold text-gray-900">{formatFecha(orden.fecha_fin)}</p>
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
                      <p className="font-semibold text-gray-900">
                        {orden.sesiones_consumidas} / {orden.sesiones_autorizadas}
                      </p>
                      <p className={`text-xs font-medium mt-0.5 ${estadoCfg?.color}`}>
                        {orden.sesiones_restantes} restantes
                      </p>
                      <div className="mt-2 bg-gray-100 rounded-full h-2 w-full">
                        <div className={`h-2 rounded-full ${
                          (orden.sesiones_restantes || 0) <= 0 ? "bg-red-500" :
                          (orden.sesiones_restantes || 0) <= 5 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                          style={{ width: `${Math.min(100, (orden.sesiones_consumidas / (orden.sesiones_autorizadas || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Terapeuta inicial</p>
                    <p className="font-semibold text-gray-900">{orden.terapeuta_inicial_nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Modalidad</p>
                    <p className="font-semibold text-gray-900">{orden.modalidad_nombre}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sin orden activa</p>
            )}
          </div>
        </div>
      </div>

      {/* Historial de ingresos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-indigo-500" /> Historial de Ingresos
          <span className="text-xs text-gray-400 font-normal">({ingresos.length} registros)</span>
        </h3>
        {ingresos.length > 0 ? (
          <div className="space-y-3">
            {ingresos.map(ingreso => (
              <div key={ingreso.id}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex-shrink-0 text-center">
                  {(() => {
                    const d = new Date(String(ingreso.fecha).slice(0, 10) + "T12:00:00");
                    return (
                      <>
                        <p className="text-xs text-gray-400">
                          {d.toLocaleDateString("es-CO", { month: "short" })}
                        </p>
                        <p className="text-lg font-bold text-gray-900">{d.getDate()}</p>
                      </>
                    );
                  })()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{formatHora(ingreso.hora)}</span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                      {ingreso.tipo_ingreso_nombre}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ingreso.terapias.map(t => (
                      <span key={t.id}
                        className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-lg text-gray-700">
                        {t.tipo_terapia}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">Terapias</p>
                  <p className="text-xl font-bold text-indigo-600">{ingreso.total_terapias_dia}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 text-sm py-6">Sin ingresos registrados aún.</p>
        )}
      </div>
    </div>
  );
}
