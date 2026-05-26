"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Users, ClipboardList, Bell, TrendingUp,
  AlertTriangle, UserCheck, UserX, Activity
} from "lucide-react";
import { KPIS_MOCK, GRAFICA_ASISTENCIAS, GRAFICA_EPS, GRAFICA_DIAGNOSTICOS, GRAFICA_EDADES, ALERTAS_MOCK } from "@/lib/mock-data";
import { formatFecha } from "@/lib/utils";

const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"];

function KpiCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("Usuario");
  const hoy = formatFecha(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const stored = localStorage.getItem("terapia_user");
    if (stored) setUserName(JSON.parse(stored).nombre.split(" ")[0]);
  }, []);

  const alertasCriticas = ALERTAS_MOCK.filter(a => a.prioridad === "ALTA");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bienvenido, {userName} 👋</h2>
          <p className="text-gray-500 text-sm mt-1">{hoy} · Panel de control general</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium">
          <Bell className="w-4 h-4" />
          {ALERTAS_MOCK.length} alertas activas
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Activity className="w-6 h-6 text-indigo-600" />}    label="Ingresos hoy"         value={KPIS_MOCK.ingresos_hoy}        sub={`${KPIS_MOCK.ingresos_semana} esta semana`}    color="bg-indigo-50" />
        <KpiCard icon={<UserCheck className="w-6 h-6 text-emerald-600" />}  label="Pacientes activos"    value={KPIS_MOCK.pacientes_activos}   sub={`+${KPIS_MOCK.pacientes_nuevos_mes} nuevos este mes`} color="bg-emerald-50" />
        <KpiCard icon={<UserX className="w-6 h-6 text-amber-600" />}        label="Pacientes ausentes"   value={KPIS_MOCK.pacientes_ausentes}  sub="Sin asistencia +30 días"                       color="bg-amber-50" />
        <KpiCard icon={<AlertTriangle className="w-6 h-6 text-red-600" />}  label="Órdenes en alerta"    value={KPIS_MOCK.ordenes_en_alerta}   sub={`${KPIS_MOCK.ordenes_vencidas} vencidas`}      color="bg-red-50" />
      </div>
      {/* Stats adicionales */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ingresos este mes", value: KPIS_MOCK.ingresos_mes, icon: <ClipboardList className="w-5 h-5 text-blue-500" />, color: "text-blue-600" },
          { label: "Pacientes nuevos (mes)", value: KPIS_MOCK.pacientes_nuevos_mes, icon: <Users className="w-5 h-5 text-emerald-500" />, color: "text-emerald-600" },
          { label: "Órdenes vencidas", value: KPIS_MOCK.ordenes_vencidas, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, color: "text-red-600" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
            {s.icon}
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas fila 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Asistencias por día */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Asistencias esta semana
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={GRAFICA_ASISTENCIAS} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
                cursor={{ fill: "#f8fafc" }}
              />
              <Bar dataKey="total" fill="#6366f1" radius={[6,6,0,0]} name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribución EPS */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Por EPS
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={GRAFICA_EPS} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" paddingAngle={3}>
                {GRAFICA_EPS.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 11 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficas fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Diagnósticos */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Distribución por Diagnóstico</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={GRAFICA_DIAGNOSTICOS} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={160} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="value" fill="#6366f1" radius={[0,6,6,0]} name="Pacientes" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rango etario */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Distribución por Rango Etario</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={GRAFICA_EDADES} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="rango" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="total" fill="#10b981" radius={[6,6,0,0]} name="Pacientes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas críticas */}
      {alertasCriticas.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Alertas Críticas
          </h3>
          <div className="space-y-3">
            {alertasCriticas.map(alerta => (
              <div key={alerta.id}
                className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{alerta.paciente_nombre}</p>
                  <p className="text-sm text-red-700 mt-0.5">{alerta.descripcion}</p>
                  {alerta.ultimo_ingreso && (
                    <p className="text-xs text-gray-400 mt-1">Último ingreso: {formatFecha(alerta.ultimo_ingreso)}</p>
                  )}
                </div>
                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">CRÍTICA</span>
              </div>
            ))}
          </div>
        </div>
      )}

      
    </div>
  );
}
