/**
 * /api/ingresos — Registro de asistencias/terapias
 */
import { Router, Response } from "express";
import { query, withTransaction } from "../db";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// ─── Query base para ingreso completo con terapias ─────────────────────────────
const INGRESO_SELECT = `
  SELECT
    i.id, i.fecha, i.hora::text, i.paciente_id,
    TRIM(CONCAT_WS(' ', p.primer_apellido, p.segundo_apellido, p.primer_nombre, p.segundo_nombre)) AS paciente_nombre,
    i.orden_id, i.tipo_ingreso_id,
    ti.nombre AS tipo_ingreso_nombre,
    i.observaciones,
    u.nombre_completo AS registrado_por,
    TO_CHAR(i.fecha_registro, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_registro,
    CASE EXTRACT(DOW FROM i.fecha)
      WHEN 0 THEN 'domingo'
      WHEN 1 THEN 'lunes'
      WHEN 2 THEN 'martes'
      WHEN 3 THEN 'miércoles'
      WHEN 4 THEN 'jueves'
      WHEN 5 THEN 'viernes'
      WHEN 6 THEN 'sábado'
    END AS dia_semana,
    COALESCE(
      json_agg(
        json_build_object(
          'id', it.id,
          'ingreso_id', it.ingreso_id,
          'tipo_terapia', it.tipo_terapia,
          'terapeuta_id', it.terapeuta_id,
          'terapeuta_nombre', COALESCE(t.nombre_completo, 'Sin especificar')
        ) ORDER BY it.id
      ) FILTER (WHERE it.id IS NOT NULL),
      '[]'::json
    ) AS terapias,
    COUNT(it.id) AS total_terapias_dia
  FROM ingresos i
  JOIN pacientes p ON p.id = i.paciente_id
  JOIN tipos_ingreso ti ON ti.id = i.tipo_ingreso_id
  LEFT JOIN usuarios u ON u.id = i.registrado_por_id
  LEFT JOIN ingresos_terapias it ON it.ingreso_id = i.id
  LEFT JOIN terapeutas t ON t.id = it.terapeuta_id
`;
const INGRESO_GROUP = `
  GROUP BY i.id, p.primer_apellido, p.segundo_apellido, p.primer_nombre, p.segundo_nombre, ti.nombre, u.nombre_completo
`;

// GET /api/ingresos
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fecha, paciente_id } = req.query;
    let where = "WHERE 1=1";
    const params: unknown[] = [];
    if (fecha) { params.push(fecha); where += ` AND i.fecha = $${params.length}`; }
    if (paciente_id) { params.push(paciente_id); where += ` AND i.paciente_id = $${params.length}`; }

    const r = await query(
      `${INGRESO_SELECT} ${where} ${INGRESO_GROUP} ORDER BY i.fecha DESC, i.hora DESC`,
      params
    );
    res.json(r.rows);
  } catch (err) {
    console.error("[ingresos/GET]", err);
    res.status(500).json({ error: "Error al obtener ingresos" });
  }
});

// GET /api/ingresos/:id
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await query(
      `${INGRESO_SELECT} WHERE i.id = $1 ${INGRESO_GROUP}`,
      [req.params.id]
    );
    if (!r.rows[0]) { res.status(404).json({ error: "Ingreso no encontrado" }); return; }
    res.json(r.rows[0]);
  } catch (err) {
    console.error("[ingresos/GET/:id]", err);
    res.status(500).json({ error: "Error al obtener ingreso" });
  }
});

// POST /api/ingresos  — crea ingreso + terapias + actualiza sesiones consumidas
router.post(
  "/",
  requireRole("ADMIN", "COORDINADOR", "OPERATIVO"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        fecha, hora, paciente_id, orden_id, tipo_ingreso_id,
        observaciones, terapias,
      } = req.body;

      if (!fecha || !hora || !paciente_id || !tipo_ingreso_id || !Array.isArray(terapias) || terapias.length === 0) {
        res.status(400).json({ error: "Fecha, hora, paciente, tipo y al menos una terapia son requeridos" });
        return;
      }

      // Validar que pacientes ORDEN tengan una orden activa
      const pacCheck = await query(
        `SELECT tipo_paciente FROM pacientes WHERE id = $1`, [paciente_id]
      );
      if (!pacCheck.rows[0]) {
        res.status(404).json({ error: "Paciente no encontrado" });
        return;
      }
      if (pacCheck.rows[0]["tipo_paciente"] === "ORDEN" && !orden_id) {
        res.status(400).json({ error: "Este paciente requiere una orden activa para registrar un ingreso. Cree una orden primero." });
        return;
      }

      const newId = await withTransaction(async (txQuery) => {
        // Crear ingreso
        const ir = await txQuery(
          `INSERT INTO ingresos (fecha, hora, paciente_id, orden_id, tipo_ingreso_id, observaciones, registrado_por_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [fecha, hora, paciente_id, orden_id || null, tipo_ingreso_id, observaciones || null, req.user!.id]
        );
        const ingresoId = ir.rows[0]["id"] as number;

        // Crear terapias
        for (const t of terapias as { tipo_terapia: string; terapeuta_id: number }[]) {
          await txQuery(
            `INSERT INTO ingresos_terapias (ingreso_id, tipo_terapia, terapeuta_id) VALUES ($1,$2,$3)`,
            [ingresoId, t.tipo_terapia, t.terapeuta_id || null]
          );
        }

        // Incrementar sesiones_consumidas si hay orden
        if (orden_id) {
          await txQuery(
            "UPDATE ordenes SET sesiones_consumidas = sesiones_consumidas + 1 WHERE id = $1",
            [orden_id]
          );
        }

        // Auditoría
        const pacR = await txQuery(
          `SELECT TRIM(CONCAT_WS(' ', primer_apellido, segundo_apellido, primer_nombre, segundo_nombre)) AS nombre_completo
           FROM pacientes WHERE id=$1`, [paciente_id]
        );
        const nombre = pacR.rows[0]?.["nombre_completo"] ?? `ID ${paciente_id}`;
        await txQuery(
          `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, registro_id, descripcion)
           VALUES ($1,'CREAR','INGRESOS',$2,$3)`,
          [req.user!.id, ingresoId, `Registró ingreso para ${nombre} — ${terapias.length} terapia(s)`]
        );

        return ingresoId;
      });

      const full = await query(
        `${INGRESO_SELECT} WHERE i.id = $1 ${INGRESO_GROUP}`,
        [newId]
      );
      res.status(201).json(full.rows[0]);
    } catch (err) {
      console.error("[ingresos/POST]", err);
      res.status(500).json({ error: "Error al registrar ingreso" });
    }
  }
);

// DELETE /api/ingresos/:id  — solo ADMIN
router.delete(
  "/:id",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await withTransaction(async (txQuery) => {
        // Obtener orden_id para revertir sesiones
        const ir = await txQuery("SELECT orden_id FROM ingresos WHERE id=$1", [req.params.id]);
        if (!ir.rows[0]) throw new Error("not_found");
        const ordenId = ir.rows[0]["orden_id"];

        // Eliminar terapias (CASCADE, pero explícito para legibilidad)
        await txQuery("DELETE FROM ingresos_terapias WHERE ingreso_id=$1", [req.params.id]);
        await txQuery("DELETE FROM ingresos WHERE id=$1", [req.params.id]);

        // Revertir sesión consumida
        if (ordenId) {
          await txQuery(
            "UPDATE ordenes SET sesiones_consumidas = GREATEST(sesiones_consumidas - 1, 0) WHERE id=$1",
            [ordenId]
          );
        }

        await txQuery(
          `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, registro_id, descripcion)
           VALUES ($1,'ELIMINAR','INGRESOS',$2,$3)`,
          [req.user!.id, req.params.id, `Eliminó ingreso #${req.params.id}`]
        );
      });
      res.json({ ok: true });
    } catch (err: unknown) {
      if ((err as Error).message === "not_found") {
        res.status(404).json({ error: "Ingreso no encontrado" });
        return;
      }
      console.error("[ingresos/DELETE]", err);
      res.status(500).json({ error: "Error al eliminar ingreso" });
    }
  }
);

export default router;
