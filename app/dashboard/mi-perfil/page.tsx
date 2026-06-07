"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User, Lock, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { usuariosApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PerfilForm {
  nombre_completo: string; correo: string;
  contrasena_actual: string; contrasena_nueva: string; confirmar_contrasena: string;
}

const FORM_VACIO: PerfilForm = {
  nombre_completo: "", correo: "",
  contrasena_actual: "", contrasena_nueva: "", confirmar_contrasena: "",
};

const ROL_LABEL: Record<string, string> = {
  ADMIN: "Administrador", COORDINADOR: "Coordinador", OPERATIVO: "Operativo",
};
const ROL_COLOR: Record<string, string> = {
  ADMIN: "bg-indigo-100 text-indigo-700",
  COORDINADOR: "bg-blue-100 text-blue-700",
  OPERATIVO: "bg-emerald-100 text-emerald-700",
};

export default function MiPerfilPage() {
  const [rol, setRol] = useState("");
  const [form, setForm]       = useState<PerfilForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error,     setError]     = useState("");
  const [mensaje,   setMensaje]   = useState("");

  useEffect(() => {
    try {
      const sesion = JSON.parse(localStorage.getItem("session") || "{}");
      setRol(sesion.rol ?? "");
      setForm({
        nombre_completo: sesion.nombre_completo ?? "",
        correo: sesion.correo ?? "",
        contrasena_actual: "", contrasena_nueva: "", confirmar_contrasena: "",
      });
    } catch { /* ignora */ }
  }, []);

  const initials = form.nombre_completo.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();

  const guardar = async () => {
    if (!form.nombre_completo || !form.correo) {
      setError("El nombre y el correo son obligatorios.");
      setMensaje("");
      return;
    }
    if (form.contrasena_nueva || form.confirmar_contrasena || form.contrasena_actual) {
      if (!form.contrasena_actual) {
        setError("Ingresa tu contraseña actual para cambiarla.");
        setMensaje("");
        return;
      }
      if (form.contrasena_nueva.length < 6) {
        setError("La nueva contraseña debe tener al menos 6 caracteres.");
        setMensaje("");
        return;
      }
      if (form.contrasena_nueva !== form.confirmar_contrasena) {
        setError("La confirmación no coincide con la nueva contraseña.");
        setMensaje("");
        return;
      }
    }

    setGuardando(true); setError(""); setMensaje("");
    try {
      const payload: Record<string, unknown> = {
        nombre_completo: form.nombre_completo,
        correo: form.correo,
      };
      if (form.contrasena_nueva) {
        payload["contrasena_actual"] = form.contrasena_actual;
        payload["contrasena_nueva"] = form.contrasena_nueva;
      }
      const actualizado = await usuariosApi.actualizarPerfil(payload);

      // Sincronizar sesión local para reflejar los cambios sin tener que volver a iniciar sesión
      const sesionGuardada = JSON.parse(localStorage.getItem("session") || "{}");
      localStorage.setItem("session", JSON.stringify({
        ...sesionGuardada,
        nombre_completo: actualizado.nombre_completo,
        correo: actualizado.correo,
      }));
      localStorage.setItem("terapia_user", JSON.stringify({
        nombre: actualizado.nombre_completo,
        rol: actualizado.rol,
        correo: actualizado.correo,
      }));

      setMensaje("Tus datos se actualizaron correctamente.");
      setForm(prev => ({ ...prev, contrasena_actual: "", contrasena_nueva: "", confirmar_contrasena: "" }));
      setTimeout(() => { window.location.reload(); }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al actualizar tus datos");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver al dashboard
        </Link>
        <h2 className="text-2xl font-bold text-gray-900">Mis datos</h2>
        <p className="text-gray-500 text-sm mt-1">Edita tu información personal y tu contraseña.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
        {/* Encabezado con avatar */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{form.nombre_completo || "—"}</p>
            {rol && (
              <span className={cn("inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium", ROL_COLOR[rol] ?? ROL_COLOR["OPERATIVO"])}>
                {ROL_LABEL[rol] ?? rol}
              </span>
            )}
          </div>
        </div>

        {/* Datos personales */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" /> Datos personales
          </h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nombre completo</label>
            <input value={form.nombre_completo}
              onChange={e => setForm(p => ({ ...p, nombre_completo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Correo</label>
            <input type="email" value={form.correo}
              onChange={e => setForm(p => ({ ...p, correo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-500" /> Cambiar contraseña <span className="text-xs font-normal text-gray-400">(opcional)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Contraseña actual</label>
              <input type="password" value={form.contrasena_actual}
                onChange={e => setForm(p => ({ ...p, contrasena_actual: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
              <input type="password" value={form.contrasena_nueva}
                onChange={e => setForm(p => ({ ...p, contrasena_nueva: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Confirmar nueva contraseña</label>
              <input type="password" value={form.confirmar_contrasena}
                onChange={e => setForm(p => ({ ...p, confirmar_contrasena: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
          </p>
        )}
        {mensaje && (
          <p className="text-xs text-emerald-600 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {mensaje}
          </p>
        )}

        <div className="flex justify-end">
          <button onClick={guardar} disabled={guardando}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-70">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
