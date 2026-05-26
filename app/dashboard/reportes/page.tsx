"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { Download, BarChart2, Filter } from "lucide-react";
import {
  GRAFICA_ASISTENCIAS, GRAFICA_EPS, GRAFICA_DIAGNOSTICOS,
  GRAFICA_EDADES, KPIS_MOCK
} from "@/lib/mock-data";

const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6"];

const TENDENCIA = [
  { mes: "Ene", nuevos: 4, activos: 35, ausentes: 6 },
  { mes: "Feb", nuevos: 6, activos: 38, ausentes: 5 },
  { mes: "Mar", nuevos: 3, activos: 36, ausentes: 8 },
  { mes: "Abr", nuevos: 7, activos: 40, ausentes: 7 },
  { mes: "May", nuevos: 5, activos: 42, ausentes: 8 },
];

const REPORTES_DISPONIBLES = [
  { id: "asistencias",  label: "Asistencias por período",       desc: "Listado detallado de todos los ingresos" },
  { id: "ordenes",      label: "Estado de órdenes",             desc: "Semáforo completo de órdenes activas" },
  { id: "diagnosticos", label: "Pacientes por diagnóstico",     desc: "Distribución por código CIE-10" },
  { id: "tendencia",    label: "Nuevos / Activos / Ausentes",   desc: "Comparativo mensual de categorías" },
  { id: "terapeutas",   label: "Rendimiento por terapeuta",     desc: "Sesiones atendidas por cada terapeuta" },
  { id: "kpis",         label: "KPIs Generales",                desc: "Resumen ejecutivo con todas las métricas" },
];

export default function ReportesPage() {
  const [fechaDesde, setFechaDesde]   = useState("2026-05-01");
  const [fechaHasta, setFechaHasta]   = useState("2026-05-31");
  const [exportando, setExportando]   = useState<string | null>(null);

  const handleExportar = (id: string) => {
    setExportando(id);
    setTimeout(() => setExportando(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reportes e Informes</h2>
          <p className="text-gray-500 text-sm mt-1">Dashboard visual y exportación en PDF</p>
        </div>
      </div>

      {/* Filtros globales */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Desde:</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Hasta:</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
            Aplicar filtros
          </button>
        </div>
      </div>

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ingresos en el período", value: KPIS_MOCK.ingresos_mes, color: "text-indigo-600" },
          { label: "Pacientes activos",       value: KPIS_MOCK.pacientes_activos,   color: "text-emerald-600" },
          { label: "Pacientes nuevos",        value: KPIS_MOCK.pacientes_nuevos_mes, color: "text-blue-600" },
          { label: "Órdenes en alerta",       value: KPIS_MOCK.ordenes_en_alerta,  color: "text-amber-600" },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Asistencias semana */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Asistencias por día</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={GRAFICA_ASISTENCIAS} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
              <Bar dataKey="total" fill="#6366f1" radius={[6,6,0,0]} name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* EPS */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Distribución por EPS</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={GRAFICA_EPS} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                dataKey="value" paddingAngle={3}>
                {GRAFICA_EPS.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 11 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tendencia */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Tendencia mensual de pacientes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={TENDENCIA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="activos"  stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Activos"  />
              <Line type="monotone" dataKey="nuevos"   stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Nuevos"   />
              <Line type="monotone" dataKey="ausentes" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Ausentes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Diagnósticos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Por diagnóstico CIE-10</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={GRAFICA_DIAGNOSTICOS} layout="vertical" barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={155} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
              <Bar dataKey="value" fill="#6366f1" radius={[0,6,6,0]} name="Pacientes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rango etario */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Distribución por Rango Etario</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={GRAFICA_EDADES} barSize={60}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="rango" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 12 }} />
            <Bar dataKey="total" fill="#10b981" radius={[6,6,0,0]} name="Pacientes" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Exportar PDF */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Download className="w-5 h-5 text-indigo-500" />
          Exportar Reportes en PDF
        </h3>
        <p className="text-sm text-gray-400 mb-4">Seleccione el reporte que desea descargar</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REPORTES_DISPONIBLES.map(r => (
            <div key={r.id} className="border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition group">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
                </div>
                <button onClick={() => handleExportar(r.id)}
                  disabled={exportando === r.id}
                  className="flex-shrink-0 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-60">
                  {exportando === r.id
                    ? <span className="text-xs">...</span>
                    : <Download className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
