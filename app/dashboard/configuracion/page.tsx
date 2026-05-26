"use client";
import { useState } from "react";
import {
  Settings, Users, UserCheck, Building2, Stethoscope,
  Plus, Edit2, ToggleLeft, ToggleRight, ChevronRight
} from "lucide-react";
import { USUARIOS_MOCK, TERAPEUTAS, EPS_LIST, DIAGNOSTICOS } from "@/lib/mock-data";
import { formatFecha } from "@/lib/utils";

const ROL_COLOR: Record<string, string> = {
  ADMIN:       "bg-indigo-100 text-indigo-700",
  COORDINADOR: "bg-blue-100 text-blue-700",
  OPERATIVO:   "bg-emerald-100 text-emerald-700",
};

type Tab = "usuarios" | "terapeutas" | "eps" | "diagnosticos";

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("usuarios");
  const [showNuevoUser, setShowNuevoUser] = useState(false);
  const [nuevoUser, setNuevoUser]         = useState({ nombre: "", correo: "", rol: "OPERATIVO" });

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "usuarios",     label: "Usuarios",      icon: <Users className="w-4 h-4" /> },
    { key: "terapeutas",   label: "Terapeutas",    icon: <UserCheck className="w-4 h-4" /> },
    { key: "eps",          label: "EPS",            icon: <Building2 className="w-4 h-4" /> },
    { key: "diagnosticos", label: "Diagnósticos",   icon: <Stethoscope className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" /> Configuración
        </h2>
        <p className="text-gray-500 text-sm mt-1">Gestión de usuarios, catálogos y configuración del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Usuarios */}
      {tab === "usuarios" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{USUARIOS_MOCK.length} usuarios registrados</p>
            <button onClick={() => setShowNuevoUser(!showNuevoUser)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Nuevo usuario
            </button>
          </div>

          {showNuevoUser && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Crear nuevo usuario</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input placeholder="Nombre completo" value={nuevoUser.nombre}
                  onChange={e => setNuevoUser(p => ({...p, nombre: e.target.value}))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input placeholder="Correo electrónico" type="email" value={nuevoUser.correo}
                  onChange={e => setNuevoUser(p => ({...p, correo: e.target.value}))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <select value={nuevoUser.rol}
                  onChange={e => setNuevoUser(p => ({...p, rol: e.target.value}))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="COORDINADOR">Coordinador</option>
                  <option value="OPERATIVO">Operativo</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowNuevoUser(false)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                  Crear usuario
                </button>
                <button onClick={() => setShowNuevoUser(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Rol</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Creado</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {USUARIOS_MOCK.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                          {u.nombre_completo.split(" ").slice(0,2).map(n=>n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.nombre_completo}</p>
                          <p className="text-xs text-gray-400">{u.correo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ROL_COLOR[u.rol]}`}>{u.rol}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {u.activo
                          ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                          : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                        <span className={`text-xs font-medium ${u.activo ? "text-emerald-600" : "text-gray-400"}`}>
                          {u.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatFecha(u.fecha_creacion)}</td>
                    <td className="px-5 py-4">
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Terapeutas */}
      {tab === "terapeutas" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{TERAPEUTAS.length} terapeutas registrados</p>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Nuevo terapeuta
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Nombre</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Cargo</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Inicio Cargo</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {TERAPEUTAS.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{t.nombre_completo}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-medium">{t.tipo_cargo}</span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-500">{formatFecha(t.fecha_inicio_cargo)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${t.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                        {t.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EPS */}
      {tab === "eps" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EPS_LIST.map(eps => (
              <div key={eps.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{eps.nombre}</p>
                </div>
                {eps.activa
                  ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                  : <ToggleLeft className="w-5 h-5 text-gray-300" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagnósticos */}
      {tab === "diagnosticos" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex justify-between items-center p-5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{DIAGNOSTICOS.length} diagnósticos registrados</p>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Agregar CIE-10
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Código</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {DIAGNOSTICOS.map(d => (
                <tr key={d.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{d.codigo_cie10}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">{d.descripcion}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${d.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {d.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
