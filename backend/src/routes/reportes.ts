import { Router, Response } from "express";
import { query } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

function cond(periodo: string, campo: string): string {
  if (periodo === "dia")    return `${campo} = CURRENT_DATE`;
  if (periodo === "semana") return `${campo} >= DATE_TRUNC('week', CURRENT_DATE) AND ${campo} <= CURRENT_DATE`;
  return `DATE_TRUNC('month', ${campo}) = DATE_TRUNC('month', CURRENT_DATE)`;
}

const NOMBRE_SQL = `TRIM(CONCAT_WS(' ', p.primer_apellido, p.segundo_apellido, p.primer_nombre, p.segundo_nombre))`;
const EDAD_SQL   = `ROUND((EXTRACT(YEAR  FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) +
                           EXTRACT(MONTH FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) / 12.0)::numeric, 1)`;

// GET /api/reportes/resumen?periodo=dia|semana|mes
router.get("/resumen", async (req: AuthRequest, res: Response): Promise<void> => {
  const periodo = (req.query.periodo as string) || "mes";
  const fi = cond(periodo, "i.fecha");
  const fr = cond(periodo, "p.fecha_registro");

  try {
    const [totalQ, generoQ, diagQ, edadQ, epsQ, asistQ, nuevosQ, ausentesQ] = await Promise.all([

      query(`SELECT COUNT(DISTINCT i.paciente_id) AS total FROM ingresos i WHERE ${fi}`),

      query(`
        SELECT p.sexo, COUNT(DISTINCT p.id) AS cantidad
        FROM pacientes p JOIN ingresos i ON i.paciente_id = p.id
        WHERE ${fi} GROUP BY p.sexo
      `),

      query(`
        SELECT d.descripcion AS name, COUNT(DISTINCT p.id) AS value
        FROM pacientes p
        JOIN diagnosticos d ON d.id = p.diagnostico_id
        JOIN ingresos i ON i.paciente_id = p.id
        WHERE ${fi}
        GROUP BY d.descripcion ORDER BY value DESC
      `),

      query(`
        SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) < 3  THEN '0-3'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) < 6  THEN '3-6'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) < 9  THEN '6-9'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) < 12 THEN '9-12'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) < 15 THEN '12-15'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) < 18 THEN '15-18'
            WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)) < 21 THEN '18-21'
            ELSE '+21'
          END AS rango,
          COUNT(DISTINCT p.id) AS total
        FROM pacientes p JOIN ingresos i ON i.paciente_id = p.id
        WHERE ${fi}
        GROUP BY rango
        ORDER BY MIN(EXTRACT(YEAR FROM AGE(CURRENT_DATE, p.fecha_nacimiento)))
      `),

      query(`
        SELECT e.nombre AS name, COUNT(DISTINCT p.id) AS value
        FROM pacientes p
        JOIN eps e ON e.id = p.eps_id
        JOIN ingresos i ON i.paciente_id = p.id
        WHERE ${fi}
        GROUP BY e.nombre ORDER BY value DESC
      `),

      query(`
        SELECT TO_CHAR(fecha, 'DD/MM') AS dia, COUNT(DISTINCT paciente_id) AS total
        FROM ingresos WHERE ${cond(periodo, "fecha")}
        GROUP BY fecha ORDER BY fecha
      `),

      query(`
        SELECT
          ${NOMBRE_SQL} AS nombre_completo,
          ${EDAD_SQL}   AS edad,
          e.nombre AS eps,
          d.codigo_cie10 AS cie10,
          COALESCE(p.telefono_1, '') AS telefono
        FROM pacientes p
        JOIN eps e ON e.id = p.eps_id
        JOIN diagnosticos d ON d.id = p.diagnostico_id
        WHERE ${fr}
        ORDER BY p.primer_apellido, p.primer_nombre
      `),

      query(`
        SELECT DISTINCT
          ${NOMBRE_SQL} AS nombre_completo,
          ${EDAD_SQL}   AS edad,
          e.nombre AS eps,
          d.codigo_cie10 AS cie10,
          COALESCE(p.telefono_1, '') AS telefono
        FROM pacientes p
        JOIN eps e ON e.id = p.eps_id
        JOIN diagnosticos d ON d.id = p.diagnostico_id
        JOIN ordenes o ON o.paciente_id = p.id AND o.activa = true
        WHERE (
          (o.tipo_limite = 'FECHA' AND o.fecha_fin >= CURRENT_DATE)
          OR
          (o.tipo_limite = 'CANTIDAD_TERAPIAS' AND (o.sesiones_autorizadas - o.sesiones_consumidas) > 0)
        )
        AND NOT EXISTS (
          SELECT 1 FROM ingresos i WHERE i.paciente_id = p.id AND ${fi}
        )
        ORDER BY nombre_completo
      `)
    ]);

    const generoMap: Record<string, number> = {};
    (generoQ.rows as { sexo: string; cantidad: string }[])
      .forEach(r => { generoMap[r.sexo] = Number(r.cantidad); });

    res.json({
      total:     Number(totalQ.rows[0]?.total ?? 0),
      masculino: generoMap["MASCULINO"] ?? 0,
      femenino:  generoMap["FEMENINO"]  ?? 0,
      por_diagnostico: diagQ.rows.map(r  => ({ name: String(r["name"]), value: Number(r["value"]) })),
      por_edad:        edadQ.rows.map(r  => ({ rango: String(r["rango"]), total: Number(r["total"]) })),
      por_eps:         epsQ.rows.map(r   => ({ name: String(r["name"]), value: Number(r["value"]) })),
      asistencias:     asistQ.rows.map(r => ({ dia: String(r["dia"]), total: Number(r["total"]) })),
      pacientes_nuevos:   nuevosQ.rows,
      pacientes_ausentes: ausentesQ.rows,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[reportes/resumen]", msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
