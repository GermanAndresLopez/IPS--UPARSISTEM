"use client";
import { useState, useEffect } from "react";
import {
  Settings, Users, UserCheck, Building2, Stethoscope,
  Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight,
  Phone, Mail, User, Save, Loader2,
} from "lucide-react";
import {
  diagnosticosApi, terapeutasApi, epsApi, usuariosApi,
} from "@/lib/api";
import { formatFecha } from "@/lib/utils";
import type { Terapeuta, EPS, Diagnostico, Usuario } from "@/lib/tipos";

type Tab = "usuarios" | "terapeutas" | "eps" | "diagnosticos";

const ROL_COLOR: Record<string, string> = {
  ADMIN:       "bg-indigo-100 text-indigo-700",
  COORDINADOR: "bg-blue-100 text-blue-700",
  OPERATIVO:   "bg-emerald-100 text-emerald-700",
};

const CARGOS = [
  "Fonoaudiología","Psicología","Terapia Ocupacional",
  "Fisioterapia","Neuropsicología","Refuerzo Escolar",
];

// ── helpers ──────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
  );
}

// ─────────────────────────────────────────────────────────────────────────
export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>("usuarios");
  const [loadingTab, setLoadingTab] = useState(false);

  // ── Diagnósticos state ──
  const [diags,       setDiags]       = useState<Diagnostico[]>([]);
  const [editDiag,    setEditDiag]    = useState<Diagnostico | null>(null);
  const [showNewDiag, setShowNewDiag] = useState(false);
  const [newDiag,     setNewDiag]     = useState({ codigo_cie10: "", descripcion: "" });

  const saveDiag = async (d: Diagnostico) => {
    try {
      const updated = await diagnosticosApi.update(d.id, { codigo_cie10: d.codigo_cie10, descripcion: d.descripcion, activo: d.activo }) as Diagnostico;
      setDiags(prev => prev.map(x => x.id === d.id ? updated : x));
      setEditDiag(null);
    } catch (err: unknown) { alert((err as Error).message); }
  };
  const deleteDiag = async (id: number) => {
    if (!confirm("¿Eliminar este diagnóstico?")) return;
    try {
      await diagnosticosApi.delete(id);
      setDiags(prev => prev.filter(x => x.id !== id));
    } catch (err: unknown) { alert((err as Error).message); }
  };
  const addDiag = async () => {
    if (!newDiag.codigo_cie10 || !newDiag.descripcion) return;
    try {
      const created = await diagnosticosApi.create({ codigo_cie10: newDiag.codigo_cie10, descripcion: newDiag.descripcion }) as Diagnostico;
      setDiags(prev => [...prev, created]);
      setNewDiag({ codigo_cie10: "", descripcion: "" });
      setShowNewDiag(false);
    } catch (err: unknown) { alert((err as Error).message); }
  };

  // ── Terapeutas state ──
  const [terapeutas,   setTer]        = useState<Terapeuta[]>([]);
  const [editTer,      setEditTer]    = useState<Terapeuta | null>(null);
  const [showNewTer,   setShowNewTer] = useState(false);
  const [newTer,       setNewTer]     = useState({
    nombre_completo: "", tipo_cargo: "Fonoaudiología",
    fecha_inicio_cargo: "", telefono: "", correo: "",
  });

  const saveTer = async (t: Terapeuta) => {
    try {
      const updated = await terapeutasApi.update(t.id, {
        nombre_completo: t.nombre_completo, tipo_cargo: t.tipo_cargo,
        fecha_inicio_cargo: t.fecha_inicio_cargo, telefono: t.telefono,
        correo: t.correo, activo: t.activo,
      }) as Terapeuta;
      setTer(prev => prev.map(x => x.id === t.id ? updated : x));
      setEditTer(null);
    } catch (err: unknown) { alert((err as Error).message); }
  };
  const deleteTer = async (id: number) => {
    if (!confirm("¿Eliminar este terapeuta?")) return;
    try {
      await terapeutasApi.delete(id);
      setTer(prev => prev.filter(x => x.id !== id));
    } catch (err: unknown) { alert((err as Error).message); }
  };
  const addTer = async () => {
    if (!newTer.nombre_completo || !newTer.fecha_inicio_cargo) return;
    try {
      const created = await terapeutasApi.create({
        nombre_completo: newTer.nombre_completo, tipo_cargo: newTer.tipo_cargo,
        fecha_inicio_cargo: newTer.fecha_inicio_cargo, telefono: newTer.telefono, correo: newTer.correo,
      }) as Terapeuta;
      setTer(prev => [...prev, created]);
      setNewTer({ nombre_completo: "", tipo_cargo: "Fonoaudiología", fecha_inicio_cargo: "", telefono: "", correo: "" });
      setShowNewTer(false);
    } catch (err: unknown) { alert((err as Error).message); }
  };

  // ── EPS state ──
  const [epsList,  setEps]    = useState<EPS[]>([]);
  const [editEps,  setEditEps] = useState<EPS | null>(null);

  const saveEps = async (e: EPS) => {
    try {
      const updated = await epsApi.update(e.id, {
        nombre: e.nombre, persona_cargo: e.persona_cargo,
        telefono: e.telefono, correo: e.correo,
      }) as EPS;
      setEps(prev => prev.map(x => x.id === e.id ? updated : x));
      setEditEps(null);
    } catch (err: unknown) { alert((err as Error).message); }
  };
  const toggleEps = async (id: number) => {
    try {
      const updated = await epsApi.toggle(id) as EPS;
      setEps(prev => prev.map(x => x.id === id ? updated : x));
    } catch (err: unknown) { alert((err as Error).message); }
  };

  // ── Usuarios state ──
  const [usuarios,      setUsuarios]      = useState<Usuario[]>([]);
  const [editUser,      setEditUser]      = useState<Usuario | null>(null);
  const [editPassword,  setEditPassword]  = useState("");
  const [showNuevoUser, setShowNuevoUser] = useState(false);
  const [nuevoUser,     setNuevoUser]     = useState({ nombre: "", correo: "", rol: "OPERATIVO", contrasena: "" });

  const saveUser = async (u: Usuario) => {
    try {
      const payload: Record<string, unknown> = {
        nombre_completo: u.nombre_completo, correo: u.correo, rol: u.rol,
      };
      if (editPassword.trim()) payload.contrasena = editPassword.trim();
      const updated = await usuariosApi.update(u.id, payload) as Usuario;
      setUsuarios(prev => prev.map(x => x.id === u.id ? updated : x));
      setEditUser(null);
      setEditPassword("");
    } catch (err: unknown) { alert((err as Error).message); }
  };
  const toggleUser = async (id: number) => {
    try {
      const updated = await usuariosApi.toggle(id) as Usuario;
      setUsuarios(prev => prev.map(x => x.id === id ? updated : x));
    } catch (err: unknown) { alert((err as Error).message); }
  };
  const addUser = async () => {
    if (!nuevoUser.nombre || !nuevoUser.correo || !nuevoUser.contrasena) {
      alert("Nombre, correo y contraseña son requeridos"); return;
    }
    try {
      const created = await usuariosApi.create({
        nombre_completo: nuevoUser.nombre, correo: nuevoUser.correo,
        rol: nuevoUser.rol, contrasena: nuevoUser.contrasena,
      }) as Usuario;
      setUsuarios(prev => [...prev, created]);
      setNuevoUser({ nombre: "", correo: "", rol: "OPERATIVO", contrasena: "" });
      setShowNuevoUser(false);
    } catch (err: unknown) { alert((err as Error).message); }
  };

  // ── Carga inicial de datos según tab activa ──
  useEffect(() => {
    const loaders: Record<Tab, () => Promise<void>> = {
      diagnosticos: async () => setDiags(await diagnosticosApi.getAll() as Diagnostico[]),
      terapeutas:   async () => setTer(await terapeutasApi.getAll() as Terapeuta[]),
      eps:          async () => setEps(await epsApi.getAll() as EPS[]),
      usuarios:     async () => setUsuarios(await usuariosApi.getAll() as Usuario[]),
    };
    setLoadingTab(true);
    loaders[tab]().catch(err => alert(err.message)).finally(() => setLoadingTab(false));
  }, [tab]);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "usuarios",     label: "Usuarios",    icon: <Users className="w-4 h-4" /> },
    { key: "terapeutas",   label: "Terapeutas",  icon: <UserCheck className="w-4 h-4" /> },
    { key: "eps",          label: "EPS",          icon: <Building2 className="w-4 h-4" /> },
    { key: "diagnosticos", label: "Diagnósticos", icon: <Stethoscope className="w-4 h-4" /> },
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
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Loading overlay para el tab */}
      {loadingTab && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
        </div>
      )}

      {/* ══════════════════════════════════════════════
          USUARIOS
      ══════════════════════════════════════════════ */}
      {!loadingTab && tab === "usuarios" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{usuarios.length} usuarios registrados</p>
            <button onClick={() => { setShowNuevoUser(!showNuevoUser); setEditUser(null); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Nuevo usuario
            </button>
          </div>

          {showNuevoUser && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Crear nuevo usuario</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input placeholder="Nombre completo" value={nuevoUser.nombre}
                  onChange={e => setNuevoUser(p => ({ ...p, nombre: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input placeholder="Correo electrónico" type="email" value={nuevoUser.correo}
                  onChange={e => setNuevoUser(p => ({ ...p, correo: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input placeholder="Contraseña inicial" type="password" value={nuevoUser.contrasena}
                  onChange={e => setNuevoUser(p => ({ ...p, contrasena: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <select value={nuevoUser.rol}
                  onChange={e => setNuevoUser(p => ({ ...p, rol: e.target.value }))}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="COORDINADOR">Coordinador</option>
                  <option value="OPERATIVO">Operativo</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={addUser}
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
                  <th className="px-5 py-3.5 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usuarios.map(u => (
                  <tr key={u.id} className={`group hover:bg-gray-50/50 ${!u.activo ? "opacity-60" : ""}`}>
                    {editUser?.id === u.id ? (
                      /* ── Fila en edición ── */
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                              {editUser.nombre_completo.split(" ").slice(0, 2).map(n => n[0]).join("")}
                            </div>
                            <div className="flex flex-col gap-1.5 flex-1">
                              <input value={editUser.nombre_completo}
                                onChange={e => setEditUser(p => p ? { ...p, nombre_completo: e.target.value } : p)}
                                className="px-2 py-1.5 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full" />
                              <input type="email" value={editUser.correo}
                                onChange={e => setEditUser(p => p ? { ...p, correo: e.target.value } : p)}
                                className="px-2 py-1.5 border border-indigo-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full" />
                              <input type="password" value={editPassword}
                                onChange={e => setEditPassword(e.target.value)}
                                placeholder="Nueva contraseña (opcional)"
                                className="px-2 py-1.5 border border-indigo-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full" />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select value={editUser.rol}
                            onChange={e => setEditUser(p => p ? { ...p, rol: e.target.value as Usuario["rol"] } : p)}
                            className="px-2 py-1.5 border border-indigo-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400">
                            <option value="ADMIN">Admin</option>
                            <option value="COORDINADOR">Coordinador</option>
                            <option value="OPERATIVO">Operativo</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">—</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{formatFecha(u.fecha_creacion)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveUser(editUser)}
                              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition" title="Guardar">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { setEditUser(null); setEditPassword(""); }}
                              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Cancelar">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      /* ── Fila normal ── */
                      <>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                              {u.nombre_completo.split(" ").slice(0, 2).map(n => n[0]).join("")}
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
                          <button onClick={() => toggleUser(u.id)}
                            className="flex items-center gap-2 hover:opacity-80 transition" title={u.activo ? "Desactivar usuario" : "Activar usuario"}>
                            {u.activo
                              ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                              : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                            <span className={`text-xs font-medium ${u.activo ? "text-emerald-600" : "text-gray-400"}`}>
                              {u.activo ? "Activo" : "Inactivo"}
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">{formatFecha(u.fecha_creacion)}</td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => { setEditUser(u); setEditPassword(""); setShowNuevoUser(false); }}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition opacity-0 group-hover:opacity-100" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TERAPEUTAS
      ══════════════════════════════════════════════ */}
      {!loadingTab && tab === "terapeutas" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{terapeutas.length} terapeutas registrados</p>
            <button onClick={() => { setShowNewTer(true); setEditTer(null); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Nuevo terapeuta
            </button>
          </div>

          {/* Formulario nuevo terapeuta */}
          {showNewTer && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Nuevo terapeuta</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldRow label="Nombre completo">
                  <Input value={newTer.nombre_completo} onChange={v => setNewTer(p => ({ ...p, nombre_completo: v }))} placeholder="NOMBRE APELLIDO" />
                </FieldRow>
                <FieldRow label="Tipo de cargo">
                  <select value={newTer.tipo_cargo} onChange={e => setNewTer(p => ({ ...p, tipo_cargo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="Fecha inicio cargo">
                  <Input type="date" value={newTer.fecha_inicio_cargo} onChange={v => setNewTer(p => ({ ...p, fecha_inicio_cargo: v }))} />
                </FieldRow>
                <FieldRow label="Teléfono">
                  <Input value={newTer.telefono} onChange={v => setNewTer(p => ({ ...p, telefono: v }))} placeholder="300 000 0000" />
                </FieldRow>
                <FieldRow label="Correo electrónico">
                  <Input type="email" value={newTer.correo} onChange={v => setNewTer(p => ({ ...p, correo: v }))} placeholder="nombre@terapia.com" />
                </FieldRow>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={addTer}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                  <Save className="w-4 h-4" /> Guardar
                </button>
                <button onClick={() => setShowNewTer(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de terapeutas */}
          <div className="space-y-2">
            {terapeutas.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {editTer?.id === t.id ? (
                  /* ── Modo edición ── */
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FieldRow label="Nombre completo">
                        <Input value={editTer.nombre_completo}
                          onChange={v => setEditTer(p => p ? { ...p, nombre_completo: v } : p)} />
                      </FieldRow>
                      <FieldRow label="Tipo de cargo">
                        <select value={editTer.tipo_cargo}
                          onChange={e => setEditTer(p => p ? { ...p, tipo_cargo: e.target.value } : p)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                          {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </FieldRow>
                      <FieldRow label="Teléfono">
                        <Input value={editTer.telefono ?? ""}
                          onChange={v => setEditTer(p => p ? { ...p, telefono: v } : p)}
                          placeholder="300 000 0000" />
                      </FieldRow>
                      <FieldRow label="Correo electrónico">
                        <Input type="email" value={editTer.correo ?? ""}
                          onChange={v => setEditTer(p => p ? { ...p, correo: v } : p)}
                          placeholder="nombre@terapia.com" />
                      </FieldRow>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveTer(editTer)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition">
                        <Check className="w-3.5 h-3.5" /> Guardar
                      </button>
                      <button onClick={() => setEditTer(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition">
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Modo vista ── */
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{t.nombre_completo}</p>
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg font-medium">{t.tipo_cargo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${t.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                          {t.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        {t.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />{t.telefono}
                          </span>
                        )}
                        {t.correo && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />{t.correo}
                          </span>
                        )}
                        <span>Desde {formatFecha(t.fecha_inicio_cargo)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setEditTer(t); setShowNewTer(false); }}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteTer(t.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          EPS
      ══════════════════════════════════════════════ */}
      {!loadingTab && tab === "eps" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{epsList.length} EPS registradas</p>
          <div className="space-y-2">
            {epsList.map(eps => (
              <div key={eps.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                eps.activa ? "border-gray-100" : "border-gray-100 opacity-60"
              }`}>
                {editEps?.id === eps.id ? (
                  /* ── Modo edición EPS ── */
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FieldRow label="Nombre EPS">
                        <Input value={editEps.nombre}
                          onChange={v => setEditEps(p => p ? { ...p, nombre: v } : p)} />
                      </FieldRow>
                      <FieldRow label="Persona a cargo">
                        <Input value={editEps.persona_cargo ?? ""}
                          onChange={v => setEditEps(p => p ? { ...p, persona_cargo: v } : p)}
                          placeholder="Nombre del contacto" />
                      </FieldRow>
                      <FieldRow label="Teléfono / Celular">
                        <Input value={editEps.telefono ?? ""}
                          onChange={v => setEditEps(p => p ? { ...p, telefono: v } : p)}
                          placeholder="601 000 0000" />
                      </FieldRow>
                      <FieldRow label="Correo">
                        <Input type="email" value={editEps.correo ?? ""}
                          onChange={v => setEditEps(p => p ? { ...p, correo: v } : p)}
                          placeholder="autorizaciones@eps.com" />
                      </FieldRow>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <button onClick={() => saveEps(editEps)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition">
                        <Check className="w-3.5 h-3.5" /> Guardar
                      </button>
                      <button onClick={() => setEditEps(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition">
                        <X className="w-3.5 h-3.5" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Modo vista EPS ── */
                  <div className="flex items-start gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{eps.nombre}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          eps.activa ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {eps.activa ? "Activa" : "Inactiva"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-400">
                        {eps.persona_cargo && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />{eps.persona_cargo}
                          </span>
                        )}
                        {eps.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />{eps.telefono}
                          </span>
                        )}
                        {eps.correo && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />{eps.correo}
                          </span>
                        )}
                        {!eps.persona_cargo && !eps.telefono && !eps.correo && (
                          <span className="italic text-gray-300">Sin datos de contacto</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Toggle activa/inactiva */}
                      <button onClick={() => toggleEps(eps.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-50 transition" title={eps.activa ? "Desactivar" : "Activar"}>
                        {eps.activa
                          ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                          : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                      <button onClick={() => { setEditEps(eps); }}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          DIAGNÓSTICOS
      ══════════════════════════════════════════════ */}
      {!loadingTab && tab === "diagnosticos" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{diags.length} diagnósticos registrados</p>
            <button onClick={() => { setShowNewDiag(true); setEditDiag(null); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Agregar CIE-10
            </button>
          </div>

          {/* Formulario nuevo diagnóstico */}
          {showNewDiag && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Nuevo diagnóstico</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FieldRow label="Código CIE-10">
                  <Input value={newDiag.codigo_cie10} onChange={v => setNewDiag(p => ({ ...p, codigo_cie10: v }))}
                    placeholder="F840" />
                </FieldRow>
                <div className="sm:col-span-2">
                  <FieldRow label="Descripción">
                    <Input value={newDiag.descripcion} onChange={v => setNewDiag(p => ({ ...p, descripcion: v }))}
                      placeholder="AUTISMO" />
                  </FieldRow>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addDiag}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                  <Save className="w-4 h-4" /> Guardar
                </button>
                <button onClick={() => setShowNewDiag(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-32">Código</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Descripción</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-24">Estado</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {diags.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/50 group">
                    {editDiag?.id === d.id ? (
                      /* ── Fila en edición ── */
                      <>
                        <td className="px-4 py-2">
                          <input value={editDiag.codigo_cie10}
                            onChange={e => setEditDiag(p => p ? { ...p, codigo_cie10: e.target.value.toUpperCase() } : p)}
                            className="w-full px-2 py-1.5 border border-indigo-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase" />
                        </td>
                        <td className="px-4 py-2">
                          <input value={editDiag.descripcion}
                            onChange={e => setEditDiag(p => p ? { ...p, descripcion: e.target.value.toUpperCase() } : p)}
                            className="w-full px-2 py-1.5 border border-indigo-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 uppercase" />
                        </td>
                        <td className="px-4 py-2">
                          <select value={editDiag.activo ? "1" : "0"}
                            onChange={e => setEditDiag(p => p ? { ...p, activo: e.target.value === "1" } : p)}
                            className="px-2 py-1.5 border border-indigo-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400">
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => saveDiag(editDiag)}
                              className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition" title="Guardar">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditDiag(null)}
                              className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition" title="Cancelar">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      /* ── Fila normal ── */
                      <>
                        <td className="px-5 py-3">
                          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{d.codigo_cie10}</span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700">{d.descripcion}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-1 rounded-lg font-medium ${d.activo ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            {d.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => { setEditDiag(d); setShowNewDiag(false); }}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition" title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteDiag(d.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
