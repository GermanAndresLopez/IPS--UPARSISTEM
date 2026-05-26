"use client";
import { useState } from "react";
import { Search, Shield, Filter } from "lucide-react";
import { AUDITORIA_MOCK } from "@/lib/mock-data";
import { formatTimestamp } from "@/lib/utils";
import type { TipoAccionAuditoria, ModuloAuditoria } from "@/lib/tipos";

const ACCION_CONFIG: Record<TipoAccionAuditoria, { label: string; color: string; bg: string }> = {
  CREAR:    { label: "Creó",     color: "text-emerald-700", bg: "bg-emerald-50" },
  EDITAR:   { label: "Editó",    color: "text-blue-700",    bg: "bg-blue-50" },
  ELIMINAR: { label: "Eliminó",  color: "text-red-700",     bg: "bg-red-50" },
  LOGIN:    { label: "Login",    color: "text-gray-600",    bg: "bg-gray-100" },
  EXPORTAR: { label: "Exportó",  color: "text-purple-700",  bg: "bg-purple-50" },
};

const ROL_COLOR: Record<string, string> = {
  ADMIN:       "bg-indigo-100 text-indigo-700",
  COORDINADOR: "bg-blue-100 text-blue-700",
  OPERATIVO:   "bg-emerald-100 text-emerald-700",
};

export default function AuditoriaPage() {
  const [busqueda, setBusqueda]   = useState("");
  const [filtroMod, setFiltroMod] = useState("TODOS");

  const MODULOS: (ModuloAuditoria | "TODOS")[] = ["TODOS","PACIENTES","ORDENES","INGRESOS","USUARIOS","REPORTES","CONFIGURACION"];

  const registros = AUDITORIA_MOCK.filter(r => {
    const matchB = r.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
                   r.usuario_nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchM = filtroMod === "TODOS" || r.modulo === filtroMod;
    return matchB && matchM;
  });

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-500" />
          Auditoría del Sistema
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Registro completo de todas las acciones — {AUDITORIA_MOCK.length} eventos registrados
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción o usuario..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>
        <select value={filtroMod} onChange={e => setFiltroMod(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          {MODULOS.map(m => <option key={m} value={m}>{m === "TODOS" ? "Todos los módulos" : m}</option>)}
        </select>
      </div>

      {/* Aviso */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl">
        <Shield className="w-3.5 h-3.5 text-gray-400" />
        Los registros de auditoría son de solo lectura y no pueden ser modificados ni eliminados.
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha y Hora</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Módulo</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Cambios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {registros.map(r => {
                const accCfg = ACCION_CONFIG[r.tipo_accion];
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-xs font-mono text-gray-600">{formatTimestamp(r.fecha_hora)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{r.usuario_nombre}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROL_COLOR[r.rol_usuario]}`}>
                        {r.rol_usuario}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${accCfg.bg} ${accCfg.color}`}>
                        {accCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg font-medium">
                        {r.modulo}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="text-sm text-gray-700 leading-tight">{r.descripcion}</p>
                    </td>
                    <td className="px-5 py-4">
                      {r.valor_anterior || r.valor_nuevo ? (
                        <div className="text-xs space-y-0.5">
                          {r.valor_anterior && (
                            <p className="text-red-600 line-through">{r.valor_anterior}</p>
                          )}
                          {r.valor_nuevo && (
                            <p className="text-emerald-600 font-medium">{r.valor_nuevo}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {registros.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">No hay registros con esos filtros.</div>
          )}
        </div>
      </div>
    </div>
  );
}
