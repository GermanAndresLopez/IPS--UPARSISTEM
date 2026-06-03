/**
 * /api/dashboard — KPIs y datos de gráficas
 */
import { Router, Response } from "express";
import { query } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// GET /api/dashboard/kpi
router.get("/kpi", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [ingresosHoy, ingresosSemana, ingresosMes, pacientesActivos, pacientesNuevosMes, ordenes] =
      await Promise.all([
        query(`SELECT COUNT(*) FROM ingresos WHERE fecha = CURRENT_DATE`),
        query(`SELECT COUNT(*) FROM ingresos WHERE fecha >= CURRENT_DATE - INTERVAL '7 days'`),
        query(`SELECT COUNT(*) FROM ingresos WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)`),
        query(`
          SELECT COUNT(DISTINCT p.id) FROM pacientes p
          JOIN ingresos i ON i.paciente_id = p.id
          WHERE i.fecha >= CURRENT_DATE - INTERVAL '30 days'
        `),
        query(`
          SELECT COUNT(*) FROM pacientes
          WHERE DATE_TRUNC('month', fecha_registro) = DATE_TRUNC('month', CURRENT_DATE)
        `),
        query(`
          SELECT
            SUM(CASE
              WHEN tipo_limite='FECHA' AND (fecha_fin - CURRENT_DATE) > 0 AND (fecha_fin - CURRENT_DATE) < 15 THEN 1
              WHEN tipo_limite='CANTIDAD_TERAPIAS' AND (sesiones_autorizadas - sesiones_consumidas) > 0 AND (sesiones_autorizadas - sesiones_consumidas) <= 5 THEN 1
              ELSE 0
            END) AS en_alerta,
            SUM(CASE
              WHEN tipo_limite='FECHA' AND fecha_fin <= CURRENT_DATE AND (fecha_fin - CURRENT_DATE) >= -90 THEN 1
              WHEN tipo_limite='CANTIDAD_TERAPIAS' AND (sesiones_autorizadas - sesiones_consumidas) <= 0 THEN 1
              ELSE 0
            END) AS vencidas
          FROM ordenes WHERE activa = true
        `),
      ]);

    // Pacientes ausentes = tienen orden activa vigente pero sin ingreso en 30+ días
    const ausentes = await query(`
      SELECT COUNT(DISTINCT p.id) FROM pacientes p
      JOIN ordenes o ON o.paciente_id = p.id AND o.activa = true
      WHERE (
        (o.tipo_limite = 'FECHA' AND o.fecha_fin > CURRENT_DATE)
        OR
        (o.tipo_limite = 'CANTIDAD_TERAPIAS' AND (o.sesiones_autorizadas - o.sesiones_consumidas) > 0)
      )
      AND NOT EXISTS (
        SELECT 1 FROM ingresos i WHERE i.paciente_id = p.id AND i.fecha >= CURRENT_DATE - INTERVAL '30 days'
      )
    `);

    res.json({
      ingresos_hoy: Number(ingresosHoy.rows[0]["count"]),
      ingresos_semana: Number(ingresosSemana.rows[0]["count"]),
      ingresos_mes: Number(ingresosMes.rows[0]["count"]),
      pacientes_activos: Number(pacientesActivos.rows[0]["count"]),
      pacientes_nuevos_mes: Number(pacientesNuevosMes.rows[0]["count"]),
      pacientes_ausentes: Number(ausentes.rows[0]["count"]),
      ordenes_en_alerta: Number(ordenes.rows[0]["en_alerta"] ?? 0),
      ordenes_vencidas: Number(ordenes.rows[0]["vencidas"] ?? 0),
    });
  } catch (err) {
    console.error("[dashboard/kpi]", err);
    res.status(500).json({ error: "Error al calcular KPIs" });
  }
});

// GET /api/dashboard/graficas
router.get("/graficas", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Asistencias últimos 6 días (lun-sáb)
    const asistencias = await query(`
      SELECT
        CASE EXTRACT(DOW FROM fecha)
          WHEN 0 THEN 'Dom'
          WHEN 1 THEN 'Lun'
          WHEN 2 THEN 'Mar'
          WHEN 3 THEN 'Mié'
          WHEN 4 THEN 'Jue'
          WHEN 5 THEN 'Vie'
          WHEN 6 THEN 'Sáb'
        END AS dia,
        COUNT(*) AS total
      FROM ingresos
      WHERE fecha >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY EXTRACT(DOW FROM fecha), dia
      ORDER BY EXTRACT(DOW FROM fecha)
    `);

    // Por EPS
    const porEps = await query(`
      SELECT e.nombre AS name, COUNT(p.id) AS value
      FROM pacientes p
      JOIN eps e ON e.id = p.eps_id
      GROUP BY e.nombre ORDER BY value DESC
    `);

    // Por diagnóstico (top 6 + Otros)
    const porDiag = await query(`
      WITH ranked AS (
        SELECT d.descripcion || ' (' || d.codigo_cie10 || ')' AS name, COUNT(p.id) AS value,
               ROW_NUMBER() OVER (ORDER BY COUNT(p.id) DESC) AS rn
        FROM pacientes p
        JOIN diagnosticos d ON d.id = p.diagnostico_id
        GROUP BY d.descripcion, d.codigo_cie10
      )
      SELECT name, value FROM ranked WHERE rn <= 6
      UNION ALL
      SELECT 'Otros', SUM(value) FROM ranked WHERE rn > 6
    `);

    // Por rango etario (intervalos de 3 años)
    const porEdad = await query(`
      SELECT
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) < 3  THEN '0-3'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) < 6  THEN '3-6'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) < 9  THEN '6-9'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) < 12 THEN '9-12'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) < 15 THEN '12-15'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) < 18 THEN '15-18'
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)) < 21 THEN '18-21'
          ELSE '+21'
        END AS rango,
        COUNT(*) AS total
      FROM pacientes
      GROUP BY rango
      ORDER BY MIN(EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nacimiento)))
    `);

    res.json({
      asistencias: asistencias.rows.map(r => ({ dia: r["dia"], total: Number(r["total"]) })),
      por_eps: porEps.rows.map(r => ({ name: r["name"], value: Number(r["value"]) })),
      por_diagnostico: porDiag.rows.map(r => ({ name: r["name"], value: Number(r["value"]) })),
      por_edad: porEdad.rows.map(r => ({ rango: r["rango"], total: Number(r["total"]) })),
    });
  } catch (err) {
    console.error("[dashboard/graficas]", err);
    res.status(500).json({ error: "Error al calcular gráficas" });
  }
});

export default router;
