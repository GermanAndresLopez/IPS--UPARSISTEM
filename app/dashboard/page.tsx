"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  Users, ClipboardList, Bell, TrendingUp,
  AlertTriangle, UserCheck, UserX, Activity, Loader2
} from "lucide-react";
import { dashboardApi, alertasApi } from "@/lib/api";
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

interface KpiData {
  ingresos_hoy: number; ingresos_semana: number; ingresos_mes: number;
  pacientes_activos: number; pacientes_nuevos_mes: number;
  pacientes_ausentes: number; ordenes_en_alerta: number; ordenes_vencidas: number;
}

interface GraficaData {
  asistencias: { dia: string; total: number }[];
  por_eps: { name: string; value: number }[];
  por_diagnostico: { name: string; value: number }[];
  por_edad: { rango: string; total: number }[];
}

interface Alerta {
  id: number; tipo: string; prioridad: string;
  paciente_nombre: string; descripcion: string; ultimo_ingreso?: string;
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("Usuario");
  const [rol, setRol] = useState("");
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [graficas, setGraficas] = useState<GraficaData | null>(null);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const hoy = formatFecha(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    const stored = localStorage.getItem("terapia_user");
    if (stored) {
      const user = JSON.parse(stored);
      setUserName(user.nombre.split(" ")[0]);
      setRol(user.rol ?? "");
    }

    Promise.all([
      dashboardApi.kpi() as Promise<KpiData>,
      dashboardApi.graficas() as Promise<GraficaData>,
      alertasApi.getAll() as Promise<Alerta[]>,
    ])
      .then(([kpiData, graficaData, alertasData]) => {
        setKpi(kpiData);
        setGraficas(graficaData);
        setAlertas(alertasData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-red-600 font-medium">Error al cargar datos</p>
        <p className="text-gray-500 text-sm mt-1">{error}</p>
        <p className="text-gray-400 text-xs mt-3">
          Asegurate de que el backend esté corriendo en <code className="bg-gray-100 px-1 rounded">localhost:4000</code>
        </p>
      </div>
    );
  }

  if (!kpi || !graficas) return null;

  const ORDEN_PRIORIDAD: Record<string, number> = { ALTA: 0, MEDIA: 1, BAJA: 2 };
  const alertasOrdenadas = [...alertas].sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad]);
  const ESTILO_PRIORIDAD: Record<string, { caja: string; punto: string; texto: string; chip: string; etiqueta: string }> = {
    ALTA:  { caja: "bg-red-50 border-red-100",       punto: "bg-red-500",     texto: "text-red-700",     chip: "bg-red-100 text-red-700",       etiqueta: "ALTA" },
    MEDIA: { caja: "bg-amber-50 border-amber-100",   punto: "bg-amber-500",   texto: "text-amber-700",   chip: "bg-amber-100 text-amber-700",   etiqueta: "MEDIA" },
    BAJA:  { caja: "bg-gray-50 border-gray-100",     punto: "bg-gray-400",    texto: "text-gray-600",    chip: "bg-gray-200 text-gray-600",     etiqueta: "BAJA" },
  };

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
          {alertas.length} alertas activas
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Activity className="w-6 h-6 text-indigo-600" />}    label="Ingresos hoy"       value={kpi.ingresos_hoy}        sub={`${kpi.ingresos_semana} esta semana`}          color="bg-indigo-50" />
        <KpiCard icon={<UserCheck className="w-6 h-6 text-emerald-600" />}  label="Pacientes activos"  value={kpi.pacientes_activos}   sub={`+${kpi.pacientes_nuevos_mes} nuevos este mes`} color="bg-emerald-50" />
        <KpiCard icon={<UserX className="w-6 h-6 text-amber-600" />}        label="Pacientes ausentes" value={kpi.pacientes_ausentes}  sub="Sin asistencia +30 días"                        color="bg-amber-50" />
        <KpiCard icon={<AlertTriangle className="w-6 h-6 text-red-600" />}  label="Órdenes en alerta"  value={kpi.ordenes_en_alerta}   sub={`${kpi.ordenes_vencidas} vencidas`}            color="bg-red-50" />
      </div>

      {rol !== "OPERATIVO" && (
      <>
      {/* Stats adicionales */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Ingresos este mes",      value: kpi.ingresos_mes,          icon: <ClipboardList className="w-5 h-5 text-blue-500" />,    color: "text-blue-600" },
          { label: "Pacientes nuevos (mes)", value: kpi.pacientes_nuevos_mes,  icon: <Users className="w-5 h-5 text-emerald-500" />,          color: "text-emerald-600" },
          { label: "Órdenes vencidas",       value: kpi.ordenes_vencidas,      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,      color: "text-red-600" },
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
            Asistencias — últimos 7 días
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={graficas.asistencias} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} cursor={{ fill: "#f8fafc" }} />
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
          {graficas.por_eps.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={graficas.por_eps} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {graficas.por_eps.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Gráficas fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Diagnósticos */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Distribución por Diagnóstico</h3>
          {graficas.por_diagnostico.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={graficas.por_diagnostico} layout="vertical" barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={160} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0,6,6,0]} name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>

        {/* Rango etario */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Distribución por Rango Etario</h3>
          {graficas.por_edad.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={graficas.por_edad} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                <Bar dataKey="total" fill="#10b981" radius={[6,6,0,0]} name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>
      </>
      )}

      {/* Alertas activas */}
      {alertasOrdenadas.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Alertas Activas
          </h3>
          <div className="space-y-3">
            {alertasOrdenadas.map(alerta => {
              const estilo = ESTILO_PRIORIDAD[alerta.prioridad] ?? ESTILO_PRIORIDAD["BAJA"];
              return (
                <div key={alerta.id}
                  className={`flex items-start gap-4 p-4 border rounded-xl ${estilo.caja}`}>
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${estilo.punto}`} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{alerta.paciente_nombre}</p>
                    <p className={`text-sm mt-0.5 ${estilo.texto}`}>{alerta.descripcion}</p>
                    {alerta.ultimo_ingreso && (
                      <p className="text-xs text-gray-400 mt-1">Último ingreso: {formatFecha(alerta.ultimo_ingreso)}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${estilo.chip}`}>{estilo.etiqueta}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
