/**
 * /api/alertas — Alertas calculadas dinámicamente desde la DB
 */
import { Router, Response } from "express";
import { query } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

router.get("/", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alertas: Record<string, unknown>[] = [];
    let idCounter = 1;

    // 1. PROXIMA_VENCER — órdenes por fecha con 0 < dias_restantes < 15
    const proximasVencer = await query(`
      SELECT
        o.id AS orden_id, o.paciente_id,
        p.nombre_completo AS paciente_nombre,
        (o.fecha_fin - CURRENT_DATE)::int AS dias_restantes,
        TO_CHAR(o.fecha_fin, 'DD-Mon-YYYY') AS fecha_fin_fmt,
        (SELECT MAX(fecha) FROM ingresos i WHERE i.paciente_id = o.paciente_id) AS ultimo_ingreso
      FROM ordenes o
      JOIN pacientes p ON p.id = o.paciente_id
      WHERE o.activa = true
        AND o.tipo_limite = 'FECHA'
        AND o.fecha_fin IS NOT NULL
        AND (o.fecha_fin - CURRENT_DATE) > 0
        AND (o.fecha_fin - CURRENT_DATE) < 15
      ORDER BY dias_restantes
    `);

    for (const row of proximasVencer.rows) {
      alertas.push({
        id: idCounter++,
        tipo: "PROXIMA_VENCER",
        prioridad: (row["dias_restantes"] as number) < 7 ? "ALTA" : "MEDIA",
        paciente_id: row["paciente_id"],
        paciente_nombre: row["paciente_nombre"],
        orden_id: row["orden_id"],
        descripcion: `La orden vence en ${row["dias_restantes"]} días (${row["fecha_fin_fmt"]})`,
        dias_restantes: row["dias_restantes"],
        ultimo_ingreso: row["ultimo_ingreso"] ? String(row["ultimo_ingreso"]).slice(0, 10) : undefined,
      });
    }

    // 2. POCAS_SESIONES — órdenes por cantidad con 0 < sesiones_restantes <= 5
    const pocasSesiones = await query(`
      SELECT
        o.id AS orden_id, o.paciente_id,
        p.nombre_completo AS paciente_nombre,
        (o.sesiones_autorizadas - o.sesiones_consumidas) AS sesiones_restantes,
        o.sesiones_autorizadas,
        (SELECT MAX(fecha) FROM ingresos i WHERE i.paciente_id = o.paciente_id) AS ultimo_ingreso
      FROM ordenes o
      JOIN pacientes p ON p.id = o.paciente_id
      WHERE o.activa = true
        AND o.tipo_limite = 'CANTIDAD_TERAPIAS'
        AND (o.sesiones_autorizadas - o.sesiones_consumidas) > 0
        AND (o.sesiones_autorizadas - o.sesiones_consumidas) <= 5
      ORDER BY sesiones_restantes
    `);

    for (const row of pocasSesiones.rows) {
      alertas.push({
        id: idCounter++,
        tipo: "POCAS_SESIONES",
        prioridad: (row["sesiones_restantes"] as number) <= 2 ? "ALTA" : "MEDIA",
        paciente_id: row["paciente_id"],
        paciente_nombre: row["paciente_nombre"],
        orden_id: row["orden_id"],
        descripcion: `Quedan solo ${row["sesiones_restantes"]} sesiones de ${row["sesiones_autorizadas"]} autorizadas`,
        sesiones_restantes: row["sesiones_restantes"],
        ultimo_ingreso: row["ultimo_ingreso"] ? String(row["ultimo_ingreso"]).slice(0, 10) : undefined,
      });
    }

    // 3. AUSENTE — pacientes con orden activa vigente y sin ingreso en últimos 30 días
    const ausentes = await query(`
      SELECT
        p.id AS paciente_id,
        p.nombre_completo AS paciente_nombre,
        o.id AS orden_id,
        MAX(i.fecha) AS ultimo_ingreso,
        (CURRENT_DATE - MAX(i.fecha))::int AS dias_sin_asistir
      FROM pacientes p
      JOIN ordenes o ON o.paciente_id = p.id AND o.activa = true
      LEFT JOIN ingresos i ON i.paciente_id = p.id
      WHERE (
        (o.tipo_limite = 'FECHA' AND o.fecha_fin > CURRENT_DATE)
        OR
        (o.tipo_limite = 'CANTIDAD_TERAPIAS' AND (o.sesiones_autorizadas - o.sesiones_consumidas) > 0)
      )
      GROUP BY p.id, p.nombre_completo, o.id
      HAVING MAX(i.fecha) IS NULL OR (CURRENT_DATE - MAX(i.fecha)) > 30
      ORDER BY dias_sin_asistir DESC NULLS LAST
    `);

    for (const row of ausentes.rows) {
      alertas.push({
        id: idCounter++,
        tipo: "AUSENTE",
        prioridad: "BAJA",
        paciente_id: row["paciente_id"],
        paciente_nombre: row["paciente_nombre"],
        orden_id: row["orden_id"],
        descripcion: row["ultimo_ingreso"]
          ? `Sin asistencia hace más de 30 días — orden aún vigente`
          : `Paciente con orden vigente sin ingresos registrados`,
        ultimo_ingreso: row["ultimo_ingreso"] ? String(row["ultimo_ingreso"]).slice(0, 10) : undefined,
      });
    }

    res.json(alertas);
  } catch (err) {
    console.error("[alertas/GET]", err);
    res.status(500).json({ error: "Error al calcular alertas" });
  }
});

export default router;
