"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, Filter, Loader2, AlertTriangle } from "lucide-react";
import { dashboardApi } from "@/lib/api";

const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"];

const REPORTES_DISPONIBLES = [
  { id: "asistencias",  label: "Asistencias por período",     desc: "Listado detallado de todos los ingresos" },
  { id: "ordenes",      label: "Estado de órdenes",           desc: "Semáforo completo de órdenes activas" },
  { id: "diagnosticos", label: "Pacientes por diagnóstico",   desc: "Distribución por código CIE-10" },
  { id: "terapeutas",   label: "Rendimiento por terapeuta",   desc: "Sesiones atendidas por cada terapeuta" },
  { id: "kpis",         label: "KPIs Generales",              desc: "Resumen ejecutivo con todas las métricas" },
];

interface KpiData {
  ingresos_mes: number; pacientes_activos: number;
  pacientes_nuevos_mes: number; ordenes_en_alerta: number;
}
interface GraficaData {
  asistencias: { dia: string; total: number }[];
  por_eps: { name: string; value: number }[];
  por_diagnostico: { name: string; value: number }[];
  por_edad: { rango: string; total: number }[];
}

export default function ReportesPage() {
  const [kpi,        setKpi]        = useState<KpiData | null>(null);
  const [graficas,   setGraficas]   = useState<GraficaData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [exportando, setExportando] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardApi.kpi()     as Promise<KpiData>,
      dashboardApi.graficas() as Promise<GraficaData>,
    ])
      .then(([k, g]) => { setKpi(k); setGraficas(g); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleExportar = (id: string) => {
    setExportando(id);
    setTimeout(() => setExportando(null), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full py-20">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center text-red-500">
      <AlertTriangle className="w-8 h-8 mx-auto mb-2" />{error}
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Reportes e Informes</h2>
        <p className="text-gray-500 text-sm mt-1">Dashboard visual y exportación en PDF</p>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ingresos este mes",   value: kpi?.ingresos_mes,          color: "text-indigo-600"  },
          { label: "Pacientes activos",   value: kpi?.pacientes_activos,     color: "text-emerald-600" },
          { label: "Pacientes nuevos",    value: kpi?.pacientes_nuevos_mes,  color: "text-blue-600"    },
          { label: "Órdenes en alerta",   value: kpi?.ordenes_en_alerta,     color: "text-amber-600"   },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className={`text-3xl font-bold ${k.color}`}>{k.value ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Asistencias por día (últimos 7 días)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={graficas?.asistencias ?? []} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
              <Bar dataKey="total" fill="#6366f1" radius={[6,6,0,0]} name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Distribución por EPS</h3>
          {graficas?.por_eps.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={graficas.por_eps} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {graficas.por_eps.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 11 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Por diagnóstico CIE-10</h3>
          {graficas?.por_diagnostico.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={graficas.por_diagnostico} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={155} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0,6,6,0]} name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Distribución por Rango Etario</h3>
          {graficas?.por_edad.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={graficas.por_edad} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="rango" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
                <Bar dataKey="total" fill="#10b981" radius={[6,6,0,0]} name="Pacientes" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Exportar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Download className="w-5 h-5 text-indigo-500" />
          Exportar Reportes en PDF
        </h3>
        <p className="text-sm text-gray-400 mb-4">Seleccione el reporte que desea descargar</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORTES_DISPONIBLES.map(r => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                </div>
                <button onClick={() => handleExportar(r.id)} disabled={exportando === r.id}
                  className="flex-shrink-0 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-60">
                  {exportando === r.id ? <span className="text-xs">...</span> : <Download className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
