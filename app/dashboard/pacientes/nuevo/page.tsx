"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, User } from "lucide-react";
import { EPS_LIST, DIAGNOSTICOS } from "@/lib/mock-data";

export default function NuevoPacientePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre_completo: "", documento: "", fecha_nacimiento: "",
    sexo: "MASCULINO", telefono_1: "", telefono_2: "",
    tipo_paciente: "ORDEN", eps_id: "1", diagnostico_id: "1", novedad: "SIN_NOVEDAD",
  });
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado]   = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setTimeout(() => {
      setGuardando(false);
      setGuardado(true);
      setTimeout(() => router.push("/dashboard/pacientes"), 1200);
    }, 1000);
  };

  const Field = ({ label, name, type = "text", children }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children || (
        <input type={type} name={name} value={(form as any)[name]} onChange={handleChange}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      )}
    </div>
  );

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
              <Field label="Nombre completo (apellidos + nombre)" name="nombre_completo">
                <input type="text" name="nombre_completo" value={form.nombre_completo}
                  onChange={handleChange} required placeholder="Ej: GARCIA LOPEZ JUAN PABLO"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </Field>
            </div>
            <Field label="Documento de identidad" name="documento">
              <input type="text" name="documento" value={form.documento} onChange={handleChange}
                required placeholder="CC / TI / RC"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </Field>
            <Field label="Fecha de nacimiento" name="fecha_nacimiento">
              <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento}
                onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </Field>
            <Field label="Sexo" name="sexo">
              <select name="sexo" value={form.sexo} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
              </select>
            </Field>
            <Field label="Teléfono principal" name="telefono_1">
              <input type="tel" name="telefono_1" value={form.telefono_1} onChange={handleChange}
                placeholder="3001234567"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </Field>
            <Field label="Teléfono secundario (opcional)" name="telefono_2">
              <input type="tel" name="telefono_2" value={form.telefono_2} onChange={handleChange}
                placeholder="3007654321"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </Field>
          </div>
        </div>

        {/* Datos clínicos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Datos Clínicos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tipo de paciente" name="tipo_paciente">
              <select name="tipo_paciente" value={form.tipo_paciente} onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="ORDEN">Orden EPS</option>
                <option value="PARTICULAR">Particular</option>
              </select>
            </Field>
            {form.tipo_paciente === "ORDEN" && (
              <Field label="EPS" name="eps_id">
                <select name="eps_id" value={form.eps_id} onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {EPS_LIST.filter(e => e.nombre !== "PARTICULAR").map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field label="Diagnóstico (CIE-10)" name="diagnostico_id">
                <select name="diagnostico_id" value={form.diagnostico_id} onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {DIAGNOSTICOS.map(d => (
                    <option key={d.id} value={d.id}>{d.codigo_cie10} — {d.descripcion}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Novedad inicial" name="novedad">
                <select name="novedad" value={form.novedad} onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="SIN_NOVEDAD">Sin Novedad</option>
                  <option value="DE_ALTA">De Alta</option>
                  <option value="SUSPENDIDO">Suspendido</option>
                  <option value="CAMBIO_CIUDAD">Cambio de Ciudad</option>
                  <option value="CAMBIO_DE_IPS">Cambio de IPS</option>
                  <option value="PARTICULAR">Particular</option>
                </select>
              </Field>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/pacientes"
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={guardando || guardado}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-70">
            <Save className="w-4 h-4" />
            {guardado ? "¡Guardado!" : guardando ? "Guardando..." : "Guardar Paciente"}
          </button>
        </div>
      </form>
    </div>
  );
}
