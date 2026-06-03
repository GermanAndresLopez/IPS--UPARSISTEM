import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import authRouter from "./routes/auth";
import pacientesRouter from "./routes/pacientes";
import ordenesRouter from "./routes/ordenes";
import ingresosRouter from "./routes/ingresos";
import usuariosRouter from "./routes/usuarios";
import configuracionRouter from "./routes/configuracion";
import alertasRouter from "./routes/alertas";
import dashboardRouter from "./routes/dashboard";
import auditoriaRouter from "./routes/auditoria";

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Seguridad y parsers ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Archivos estáticos (adjuntos de órdenes)
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use("/api/auth",           authRouter);
app.use("/api/pacientes",      pacientesRouter);
app.use("/api/ordenes",        ordenesRouter);
app.use("/api/ingresos",       ingresosRouter);
app.use("/api/usuarios",       usuariosRouter);
app.use("/api/configuracion",  configuracionRouter);
app.use("/api/alertas",        alertasRouter);
app.use("/api/dashboard",      dashboardRouter);
app.use("/api/auditoria",      auditoriaRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ─── Error handler global ─────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[ERROR GLOBAL]", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
);

app.listen(PORT, () => {
  console.log(`\n🚀 TerapiaApp Backend corriendo en http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});

export default app;
