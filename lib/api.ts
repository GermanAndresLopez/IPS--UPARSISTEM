/**
 * Cliente API — todas las llamadas al backend Node.js
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// ─── Token JWT ────────────────────────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const session = localStorage.getItem("session");
    if (!session) return null;
    return JSON.parse(session).token ?? null;
  } catch {
    return null;
  }
}

// ─── Fetch base ───────────────────────────────────────────────────────────────
async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string>),
  };

  // Solo agregar Content-Type para JSON (no para FormData)
  if (!(options?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && token) {
    // Había un token y el servidor lo rechazó — sesión expirada o inválida
    if (typeof window !== "undefined") {
      localStorage.removeItem("session");
      localStorage.removeItem("terapia_user");
      window.location.href = "/";
    }
    throw new Error("Sesión expirada");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `Error ${res.status}` }));
    throw new Error(body.error || `Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  usuario: { id: number; nombre_completo: string; correo: string; rol: string };
}

export const authApi = {
  login: (correo: string, contrasena: string) =>
    apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ correo, contrasena }),
    }),
  me: () => apiFetch<LoginResponse["usuario"]>("/auth/me"),
};

// ─── PACIENTES ────────────────────────────────────────────────────────────────
export const pacientesApi = {
  getAll: () => apiFetch<unknown[]>("/pacientes"),
  getById: (id: number) => apiFetch<unknown>(`/pacientes/${id}`),
  buscar: (q: string) => apiFetch<unknown[]>(`/pacientes/buscar?q=${encodeURIComponent(q)}`),
  verificarDocumento: (documento: string, excluirId?: number) => {
    const qs = new URLSearchParams({ documento });
    if (excluirId) qs.set("excluir_id", String(excluirId));
    return apiFetch<{ existe: boolean; paciente_id?: number; paciente_nombre?: string }>(
      `/pacientes/verificar-documento?${qs.toString()}`
    );
  },
  create: (data: Record<string, unknown>) =>
    apiFetch<unknown>("/pacientes", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<unknown>(`/pacientes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  toggle: (id: number) =>
    apiFetch<{ activo: boolean }>(`/pacientes/${id}/toggle`, { method: "PATCH" }),
};

// ─── ÓRDENES ──────────────────────────────────────────────────────────────────
export interface OrdenesPaginadas {
  data: unknown[];
  total: number;
  page: number;
  totalPages: number;
}
export const ordenesApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; estado?: string }) => {
    const qs = new URLSearchParams();
    if (params?.page)   qs.set("page",   String(params.page));
    if (params?.limit)  qs.set("limit",  String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.estado && params.estado !== "TODOS") qs.set("estado", params.estado);
    return apiFetch<OrdenesPaginadas>(`/ordenes${qs.toString() ? "?" + qs : ""}`);
  },
  getById: (id: number) => apiFetch<unknown>(`/ordenes/${id}`),
  create: (data: FormData) =>
    apiFetch<unknown>("/ordenes", { method: "POST", body: data }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<unknown>(`/ordenes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};

// ─── INGRESOS ─────────────────────────────────────────────────────────────────
export const ingresosApi = {
  getAll: (params?: { fecha?: string; paciente_id?: number }) => {
    const qs = new URLSearchParams();
    if (params?.fecha) qs.set("fecha", params.fecha);
    if (params?.paciente_id) qs.set("paciente_id", String(params.paciente_id));
    return apiFetch<unknown[]>(`/ingresos${qs.toString() ? "?" + qs : ""}`);
  },
  getById: (id: number) => apiFetch<unknown>(`/ingresos/${id}`),
  create: (data: Record<string, unknown>) =>
    apiFetch<unknown>("/ingresos", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<{ ok: boolean }>(`/ingresos/${id}`, { method: "DELETE" }),
};

// ─── ALERTAS ──────────────────────────────────────────────────────────────────
export const alertasApi = {
  getAll: () => apiFetch<unknown[]>("/alertas"),
};

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  kpi: () => apiFetch<unknown>("/dashboard/kpi"),
  graficas: () => apiFetch<unknown>("/dashboard/graficas"),
};

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────
export const epsApi = {
  getAll: () => apiFetch<unknown[]>("/configuracion/eps"),
  create: (data: Record<string, unknown>) =>
    apiFetch<unknown>("/configuracion/eps", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<unknown>(`/configuracion/eps/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  toggle: (id: number) =>
    apiFetch<unknown>(`/configuracion/eps/${id}/toggle`, { method: "PATCH" }),
};

export const diagnosticosApi = {
  getAll: () => apiFetch<unknown[]>("/configuracion/diagnosticos"),
  create: (data: Record<string, unknown>) =>
    apiFetch<unknown>("/configuracion/diagnosticos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<unknown>(`/configuracion/diagnosticos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<{ ok: boolean }>(`/configuracion/diagnosticos/${id}`, { method: "DELETE" }),
};

export const terapeutasApi = {
  getAll: () => apiFetch<unknown[]>("/configuracion/terapeutas"),
  create: (data: Record<string, unknown>) =>
    apiFetch<unknown>("/configuracion/terapeutas", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<unknown>(`/configuracion/terapeutas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiFetch<{ ok: boolean }>(`/configuracion/terapeutas/${id}`, { method: "DELETE" }),
};

export const modalidadesApi = {
  getAll: () => apiFetch<unknown[]>("/configuracion/modalidades"),
  create: (data: Record<string, unknown>) =>
    apiFetch<unknown>("/configuracion/modalidades", { method: "POST", body: JSON.stringify(data) }),
};

export const tiposIngresoApi = {
  getAll: () => apiFetch<unknown[]>("/configuracion/tipos-ingreso"),
};

// ─── REPORTES ────────────────────────────────────────────────────────────────
export interface PacienteReporte {
  nombre_completo: string; edad: number; eps: string; cie10: string; telefono: string;
}
export interface AsistenciaDetalle {
  fecha: string; tipo_documento: string; documento_identidad: string;
  apellidos: string; nombres: string; eps: string; telefono: string;
}
export interface ResumenReporte {
  total: number; masculino: number; femenino: number;
  por_diagnostico: { name: string; value: number }[];
  por_edad:        { rango: string; total: number }[];
  por_eps:         { name: string; value: number }[];
  asistencias:        { dia: string; total: number }[];
  asistencia_detalle: AsistenciaDetalle[];
  pacientes_nuevos:   PacienteReporte[];
  pacientes_ausentes: PacienteReporte[];
}
export const reportesApi = {
  resumen: (periodo: string) =>
    apiFetch<ResumenReporte>(`/reportes/resumen?periodo=${periodo}`),
};

// ─── AUDITORÍA ────────────────────────────────────────────────────────────────
export const auditoriaApi = {
  getAll: () => apiFetch<unknown[]>("/auditoria"),
};

// ─── USUARIOS ─────────────────────────────────────────────────────────────────
export const usuariosApi = {
  getAll: () => apiFetch<unknown[]>("/usuarios"),
  create: (data: Record<string, unknown>) =>
    apiFetch<unknown>("/usuarios", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) =>
    apiFetch<unknown>(`/usuarios/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  toggle: (id: number) =>
    apiFetch<unknown>(`/usuarios/${id}/toggle`, { method: "PATCH" }),
  actualizarPerfil: (data: Record<string, unknown>) =>
    apiFetch<{ id: number; nombre_completo: string; correo: string; rol: string; activo: boolean }>(
      "/usuarios/me", { method: "PUT", body: JSON.stringify(data) }
    ),
};
