"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, AlertTriangle, Clock, UserX, Calendar, Hash } from "lucide-react";
import { ALERTAS_MOCK, PACIENTES_MOCK } from "@/lib/mock-data";
import { formatFecha } from "@/lib/utils";
import type { Alerta } from "@/lib/tipos";

const TABS = [
  { key: "TODAS",          label: "Todas",            count: ALERTAS_MOCK.length },
  { key: "PROXIMA_VENCER", label: "Próximas a vencer", count: ALERTAS_MOCK.filter(a => a.tipo === "PROXIMA_VENCER").length },
  { key: "POCAS_SESIONES", label: "Pocas sesiones",   count: ALERTAS_MOCK.filter(a => a.tipo === "POCAS_SESIONES").length },
  { key: "AUSENTE",        label: "Seguimiento",      count: ALERTAS_MOCK.filter(a => a.tipo === "AUSENTE").length },
];

function AlertaCard({ alerta }: { alerta: Alerta }) {
  const paciente = PACIENTES_MOCK.find(p => p.id === alerta.paciente_id);
  const orden    = paciente?.orden_activa;

  const colorMap = {
    ALTA:  { bg: "bg-red-50",    border: "border-red-200",    icon: "text-red-500",    badge: "bg-red-100 text-red-700",    dot: "bg-red-500" },
    MEDIA: { bg: "bg-amber-50",  border: "border-amber-200",  icon: "text-amber-500",  badge: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
    BAJA:  { bg: "bg-blue-50",   border: "border-blue-200",   icon: "text-blue-500",   badge: "bg-blue-100 text-blue-700",   dot: "bg-blue-400" },
  };
  const c = colorMap[alerta.prioridad];

  const iconMap = {
    POCAS_SESIONES: <Hash className={`w-5 h-5 ${c.icon}`} />,
    PROXIMA_VENCER: <Calendar className={`w-5 h-5 ${c.icon}`} />,
    VENCIDA:        <AlertTriangle className={`w-5 h-5 ${c.icon}`} />,
    AUSENTE:        <UserX className={`w-5 h-5 ${c.icon}`} />,
  };

  return (
    <div className={`rounded-2xl border p-5 ${c.bg} ${c.border}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm`}>
          {iconMap[alerta.tipo]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-900 text-sm">{alerta.paciente_nombre}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${c.badge}`}>
              {alerta.prioridad === "ALTA" ? "CRÍTICA" : alerta.prioridad === "MEDIA" ? "MEDIA" : "SEGUIMIENTO"}
            </span>
          </div>
          <p className="text-sm text-gray-700 mt-1">{alerta.descripcion}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {alerta.ultimo_ingreso && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Último ingreso: {formatFecha(alerta.ultimo_ingreso)}
              </span>
            )}
            {orden && (
              <span>EPS: {paciente?.eps_nombre || "Particular"}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <Link href={`/dashboard/pacientes/${alerta.paciente_id}`}
            className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition text-center">
            Ver paciente
          </Link>
          {alerta.tipo !== "AUSENTE" && (
            <Link href="/dashboard/ordenes"
              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-center">
              Gestionar orden
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertasPage() {
  const [tabActiva, setTab] = useState("TODAS");

  const alertasFiltradas = tabActiva === "TODAS"
    ? ALERTAS_MOCK
    : ALERTAS_MOCK.filter(a => a.tipo === tabActiva);

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Panel de Alertas</h2>
          <p className="text-gray-500 text-sm mt-1">Órdenes y pacientes que requieren atención</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold">
          <Bell className="w-4 h-4" />
          {ALERTAS_MOCK.filter(a => a.tipo !== "AUSENTE").length} alertas activas
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              tabActiva === tab.key
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500 hover:text-gray-700"
            }`}>
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                tabActiva === tab.key
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-200 text-gray-600"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alertas */}
      <div className="space-y-3">
        {alertasFiltradas.length > 0
          ? alertasFiltradas.map(a => <AlertaCard key={a.id} alerta={a} />)
          : (
            <div className="text-center py-16 text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No hay alertas en esta categoría</p>
            </div>
          )
        }
      </div>
    </div>
  );
}
