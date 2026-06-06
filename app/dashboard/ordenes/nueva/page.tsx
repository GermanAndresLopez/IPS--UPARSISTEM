"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, FileText, Search, UserPlus,
  Upload, X, FileCheck, Loader2, AlertCircle,
} from "lucide-react";
import { ordenesApi, terapeutasApi, modalidadesApi, pacientesApi } from "@/lib/api";
import type { Terapeuta, Modalidad, Paciente } from "@/lib/tipos";

interface PacienteBusqueda {
  id: number; nombre_completo: string; documento_identidad: string; tipo_paciente: string;
}

export default function NuevaOrdenPage() {
  const router = useRouter();

  const [terapeutas,  setTerapeutas]  = useState<Terapeuta[]>([]);
  const [modalidades, setModalidades] = useState<Modalidad[]>([]);
  const [cargando,    setCargando]    = useState(true);

  useEffect(() => {
    Promise.all([
      terapeutasApi.getAll()  as Promise<Terapeuta[]>,
      modalidadesApi.getAll() as Promise<Modalidad[]>,
    ]).then(([t, m]) => {
      setTerapeutas(t.filter(x => x.activo));
      setModalidades(m.filter(x => x.activa));
    }).finally(() => setCargando(false));
  }, []);

  const [form, setForm] = useState({
    paciente_id: "", tipo_limite: "FECHA",
    fecha_emision: "", fecha_inicio: "", fecha_fin: "",
    sesiones_autorizadas: "", terapeuta_inicial_id: "", modalidad_id: "",
  });
  const [guardando,          setGuardando]          = useState(false);
  const [error,              setError]              = useState("");
  const [ordenActivaError,   setOrdenActivaError]   = useState("");

  const [busqueda,       setBusqueda]       = useState("");
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [sugerencias,    setSugerencias]    = useState<PacienteBusqueda[]>([]);
  const [mostrarLista,   setMostrarLista]   = useState(false);
  const busquedaRef = useRef<HTMLDivElement>(null);

  const buscarPacientes = async (q: string) => {
    setBusqueda(q);
    if (q.length < 2) { setSugerencias([]); setMostrarLista(false); return; }
    try {
      const data = await pacientesApi.buscar(q) as PacienteBusqueda[];
      setSugerencias(data);
      setMostrarLista(true);
    } catch { setSugerencias([]); }
  };

  const seleccionarPaciente = async (p: PacienteBusqueda) => {
    setBusqueda(""); setSugerencias([]); setMostrarLista(false);
    setOrdenActivaError("");
    try {
      const full = await pacientesApi.getById(p.id) as Paciente;
      if (full.orden_activa && !["VENCIDA","INACTIVO"].includes(full.orden_activa.estado)) {
        setOrdenActivaError(`Este paciente ya tiene una orden activa (#${full.orden_activa.id}). Debe cerrar la orden actual antes de crear una nueva.`);
        return;
      }
      setForm(prev => ({ ...prev, paciente_id: String(p.id) }));
      setPacienteNombre(p.nombre_completo);
    } catch {
      setForm(prev => ({ ...prev, paciente_id: String(p.id) }));
      setPacienteNombre(p.nombre_completo);
    }
  };

  const limpiarPaciente = () => {
    setForm(prev => ({ ...prev, paciente_id: "" }));
    setPacienteNombre(""); setBusqueda(""); setOrdenActivaError("");
  };

  const [archivo,        setArchivo]        = useState<File | null>(null);
  const [archivoPreview, setArchivoPreview] = useState<string | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivo(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setArchivoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setArchivoPreview(null);
    }
  };

  const quitarArchivo = () => {
    setArchivo(null); setArchivoPreview(null);
    if (inputFileRef.current) inputFileRef.current.value = "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.paciente_id) return;
    setError(""); setGuardando(true);
    try {
      const fd = new FormData();
      fd.append("paciente_id",          form.paciente_id);
      fd.append("tipo_limite",          form.tipo_limite);
      fd.append("fecha_emision",        form.fecha_emision);
      fd.append("fecha_inicio",         form.fecha_inicio);
      fd.append("modalidad_id",         form.modalidad_id || String(modalidades[0]?.id ?? ""));
      fd.append("terapeuta_inicial_id", form.terapeuta_inicial_id);
      if (form.tipo_limite === "FECHA")              fd.append("fecha_fin",            form.fecha_fin);
      if (form.tipo_limite === "CANTIDAD_TERAPIAS")  fd.append("sesiones_autorizadas", form.sesiones_autorizadas);
      if (archivo) fd.append("adjunto", archivo);

      await ordenesApi.create(fd);
      router.push("/dashboard/ordenes");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setGuardando(false);
    }
  };

  if (cargando) return (
    <div className="flex items-center justify-center h-full py-20">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ordenes"
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-500">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nueva Orden</h2>
          <p className="text-gray-500 text-sm">Registre una autorización de EPS o particular</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-500" /> Datos de la Orden
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Buscador paciente */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Paciente</label>
              {form.paciente_id ? (
                <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {pacienteNombre.split(" ").slice(0,2).map(n => n[0]).join("")}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-900">{pacienteNombre}</span>
                  <button type="button" onClick={limpiarPaciente} className="text-gray-400 hover:text-red-500 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative" ref={busquedaRef}>
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={busqueda}
                    onChange={e => buscarPacientes(e.target.value)}
                    onBlur={() => setTimeout(() => setMostrarLista(false), 150)}
                    placeholder="Buscar por nombre o documento..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  {mostrarLista && busqueda.length >= 2 && (
                    <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      {sugerencias.length > 0 ? (
                        <>
                          {sugerencias.map(p => (
                            <button key={p.id} type="button" onMouseDown={() => seleccionarPaciente(p)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 transition text-left">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                                {p.nombre_completo.split(" ").slice(0,2).map(n=>n[0]).join("")}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{p.nombre_completo}</p>
                                <p className="text-xs text-gray-400">{p.documento_identidad}</p>
                              </div>
                            </button>
                          ))}
                          <div className="border-t border-gray-100">
                            <Link href={`/dashboard/pacientes/nuevo`}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition text-emerald-700 text-sm font-semibold">
                              <UserPlus className="w-4 h-4" /> Crear nuevo paciente
                            </Link>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col">
                          <div className="px-4 py-3 text-sm text-gray-400 text-center">No se encontró ningún paciente</div>
                          <div className="border-t border-gray-100">
                            <Link href={`/dashboard/pacientes/nuevo`}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition text-emerald-700 text-sm font-semibold">
                              <UserPlus className="w-4 h-4" /> Crear nuevo paciente
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              <input type="hidden" name="paciente_id" value={form.paciente_id} required />
            </div>

            {/* Tipo de orden */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de orden</label>
              <div className="grid grid-cols-2 gap-3">
                {["FECHA","CANTIDAD_TERAPIAS"].map(tipo => (
                  <label key={tipo} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${
                    form.tipo_limite === tipo ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                    <input type="radio" name="tipo_limite" value={tipo}
                      checked={form.tipo_limite === tipo} onChange={handleChange} className="text-indigo-600" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {tipo === "FECHA" ? "Por fecha de vencimiento" : "Por cantidad de terapias"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {tipo === "FECHA" ? "La orden tiene fecha de inicio y fin" : "La orden autoriza N sesiones sin fecha fija"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de emisión (EPS)</label>
              <input type="date" name="fecha_emision" value={form.fecha_emision} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de inicio</label>
              <input type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {form.tipo_limite === "FECHA" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de fin</label>
                <input type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}
            {form.tipo_limite === "CANTIDAD_TERAPIAS" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sesiones autorizadas</label>
                <input type="number" name="sesiones_autorizadas" value={form.sesiones_autorizadas}
                  onChange={handleChange} required min="1" placeholder="Ej: 30"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Terapeuta inicial</label>
              <select name="terapeuta_inicial_id" value={form.terapeuta_inicial_id} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccione terapeuta...</option>
                {terapeutas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre_completo} — {t.tipo_cargo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Modalidad</label>
              <select name="modalidad_id" value={form.modalidad_id} onChange={handleChange} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Seleccione modalidad...</option>
                {modalidades.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Soporte / Archivo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" /> Soporte de la Orden
          </h3>
          <p className="text-xs text-gray-400">Adjunte la imagen o PDF de la autorización emitida por la EPS (opcional).</p>
          {!archivo ? (
            <label htmlFor="archivo-orden"
              className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">Haga clic para cargar</p>
                <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP o PDF · Máx. 10 MB</p>
              </div>
              <input id="archivo-orden" ref={inputFileRef} type="file"
                accept="image/*,application/pdf" onChange={handleArchivo} className="hidden" />
            </label>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {archivoPreview ? (
                <div className="relative">
                  <img src={archivoPreview} alt="Soporte" className="w-full max-h-64 object-contain bg-gray-50" />
                  <button type="button" onClick={quitarArchivo}
                    className="absolute top-2 right-2 bg-white border border-gray-200 rounded-full p-1.5 shadow hover:bg-red-50">
                    <X className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-red-50">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{archivo.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF · {(archivo.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button type="button" onClick={quitarArchivo} className="text-gray-400 hover:text-red-500 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                <span className="text-xs text-gray-500 truncate flex-1">{archivo.name}</span>
                <button type="button" onClick={() => inputFileRef.current?.click()}
                  className="text-xs text-indigo-600 font-semibold hover:underline flex-shrink-0">
                  Cambiar
                </button>
                <input ref={inputFileRef} type="file" accept="image/*,application/pdf"
                  onChange={handleArchivo} className="hidden" />
              </div>
            </div>
          )}
        </div>

        {ordenActivaError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {ordenActivaError}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/ordenes"
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </Link>
          <button type="submit" disabled={guardando || !form.paciente_id || !!ordenActivaError}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {guardando ? "Guardando..." : "Guardar Orden"}
          </button>
        </div>
      </form>
    </div>
  );
}
