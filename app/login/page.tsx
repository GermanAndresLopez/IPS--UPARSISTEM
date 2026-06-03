"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Heart } from "lucide-react";
import { authApi } from "@/lib/api";

const DEMOS = [
  { correo: "admin@terapia.com", rol: "ADMIN",       nombre: "Carlos Administrador" },
  { correo: "laura@terapia.com", rol: "COORDINADOR", nombre: "Laura Coordinadora"   },
  { correo: "maria@terapia.com", rol: "OPERATIVO",   nombre: "María Operativa"      },
];

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo]     = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authApi.login(correo.trim(), password);

      // Guardar token para las llamadas API
      localStorage.setItem(
        "session",
        JSON.stringify({ token: data.token, ...data.usuario })
      );
      // Guardar en formato legacy para layout/sidebar (sin cambiar esos archivos)
      localStorage.setItem(
        "terapia_user",
        JSON.stringify({
          nombre: data.usuario.nombre_completo,
          rol: data.usuario.rol,
          correo: data.usuario.correo,
        })
      );

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">TerapiaApp</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Gestión de Pacientes</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="usuario@terapia.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          {/* Accesos rápidos */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-1">Accesos de demostración</p>
            <p className="text-xs text-gray-400 text-center mb-3">
              Contraseña: <span className="font-mono font-semibold text-indigo-600">Terapia2024!</span>
            </p>
            <div className="space-y-2">
              {DEMOS.map(u => (
                <button
                  key={u.correo}
                  onClick={() => { setCorreo(u.correo); setPassword("Terapia2024!"); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-indigo-50 text-xs text-gray-600 hover:text-indigo-700 transition flex justify-between items-center"
                >
                  <span className="font-medium">{u.nombre}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    ${u.rol === "ADMIN" ? "bg-indigo-100 text-indigo-700" :
                      u.rol === "COORDINADOR" ? "bg-blue-100 text-blue-700" :
                      "bg-emerald-100 text-emerald-700"}`}>
                    {u.rol}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          TerapiaApp v2.0 · Centro de Terapias
        </p>
      </div>
    </div>
  );
}
