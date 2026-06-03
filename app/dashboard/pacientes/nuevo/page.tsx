"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, User, Loader2 } from "lucide-react";
import { pacientesApi, epsApi, diagnosticosApi } from "@/lib/api";
import type { EPS, Diagnostico } from "@/lib/tipos";

export default function NuevoPacientePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre_completo: "", documento_identidad: "", fecha_nacimiento: "",
    sexo: "MASCULINO", telefono_1: "", telefono_2: "",
    tipo_paciente: "ORDEN", eps_id: "", diagnostico_id: "", novedad: "SIN_NOVEDAD",
  });

  const [epsList,      setEpsList]      = useState<EPS[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<Diagnostico[]>([]);
  const [cargando,     setCargando]     = useState(true);
  const [guardando,    setGuardando]    = useState(false);
  const [error,        setError]        = useState("");

  useEffect(() => {
    Promise.all([
      epsApi.getAll() as Promise<EPS[]>,
      diagnosticosApi.getAll() as Promise<Diagnostico[]>,
    ]).then(([eps, diags]) => {
      const epsActivas = eps.filter(e => e.activa && e.nombre !== "PARTICULAR");
      setEpsList(epsActivas);
      const diagsActivos = diags.filter(d => d.activo);
      setDiagnosticos(diagsActivos);
      setForm(prev => ({
        ...prev,
        eps_id:        epsActivas[0]?.id?.toString()   ?? "",
        diagnostico_id: diagsActivos[0]?.id?.toString() ?? "",
      }));
    }).catch(err => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGuardando(true);
    try {
      await pacientesApi.create({
        nombre_completo:     form.nombre_completo,
        documento_identidad: form.documento_identidad,
        fecha_nacimiento:    form.fecha_nacimiento,
        sexo:                form.sexo,
        telefono_1:          form.telefono_1,
        telefono_2:          form.telefono_2 || undefined,
        tipo_paciente:       form.tipo_paciente,
        eps_id:              form.tipo_paciente === "ORDEN" && form.eps_id ? Number(form.eps_id) : undefined,
        diagnostico_id:      Number(form.diagnostico_id),
        novedad:             form.novedad,
      });
      router.push("/dashboard/pacientes");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/pacientes"
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nuevo Paciente</h2>
          <p className="text-gray-500 text-sm">Complete los datos del paciente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos personales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            Datos Personales
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nombre completo (apellidos + nombre)
              </label>
              <input type="text" name="nombre_completo" value={form.nombre_completo}
                onChange={handleChange} required placeholder="Ej: GARCIA LOPEZ JUAN PABLO"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Documento de identidad</label>
              <input type="text" name="documento_identidad" value={form.documento_identidad}
                onChange={handleChange} required placeholder="CC / TI / RC"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de nacimiento</label>
              <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento}
                onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sexo</label>
              <select name="sexo" value={form.sexo} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono principal</label>
              <input type="tel" name="telefono_1" value={form.telefono_1}
                onChange={handleChange} required placeholder="3001234567"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono secundario (opcional)</label>
              <input type="tel" name="telefono_2" value={form.telefono_2}
                onChange={handleChange} placeholder="3007654321"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Datos clínicos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Datos Clínicos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de paciente</label>
              <select name="tipo_paciente" value={form.tipo_paciente} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="ORDEN">Orden EPS</option>
                <option value="PARTICULAR">Particular</option>
              </select>
            </div>
            {form.tipo_paciente === "ORDEN" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">EPS</label>
                <select name="eps_id" value={form.eps_id} onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {epsList.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Diagnóstico (CIE-10)</label>
              <select name="diagnostico_id" value={form.diagnostico_id} onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {diagnosticos.map(d => (
                  <option key={d.id} value={d.id}>{d.codigo_cie10} — {d.descripcion}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Novedad inicial</label>
              <select name="novedad" value={form.novedad} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="SIN_NOVEDAD">Sin Novedad</option>
                <option value="DE_ALTA">De Alta</option>
                <option value="SUSPENDIDO">Suspendido</option>
                <option value="CAMBIO_CIUDAD">Cambio de Ciudad</option>
                <option value="CAMBIO_DE_IPS">Cambio de IPS</option>
                <option value="PARTICULAR">Particular</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/pacientes"
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={guardando}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-70">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardando ? "Guardando..." : "Guardar Paciente"}
          </button>
        </div>
      </form>
    </div>
  );
}
