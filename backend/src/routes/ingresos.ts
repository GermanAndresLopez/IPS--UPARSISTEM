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

    const ingreso = r.rows[0];

    // Datos del paciente
    const pacR = await query(
      `SELECT p.id, p.tipo_documento, p.documento_identidad,
              TRIM(CONCAT_WS(' ', p.primer_apellido, p.segundo_apellido, p.primer_nombre, p.segundo_nombre)) AS nombre_completo,
              TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
              p.sexo, p.telefono_1, p.telefono_2, p.correo,
              p.tipo_paciente, e.nombre AS eps_nombre,
              d.codigo_cie10, d.descripcion AS diagnostico_nombre
       FROM pacientes p
       LEFT JOIN eps e ON e.id = p.eps_id
       JOIN diagnosticos d ON d.id = p.diagnostico_id
       WHERE p.id = $1`,
      [ingreso["paciente_id"]]
    );

    // Datos de la orden (si existe)
    let orden = null;
    if (ingreso["orden_id"]) {
      const ordR = await query(
        `SELECT o.id, o.tipo_limite,
                TO_CHAR(o.fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
                TO_CHAR(o.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                TO_CHAR(o.fecha_fin, 'YYYY-MM-DD') AS fecha_fin,
                o.sesiones_autorizadas, o.sesiones_consumidas,
                CASE WHEN o.tipo_limite = 'CANTIDAD_TERAPIAS'
                  THEN o.sesiones_autorizadas - o.sesiones_consumidas ELSE NULL
                END AS sesiones_restantes,
                CASE WHEN o.tipo_limite = 'FECHA' AND o.fecha_fin IS NOT NULL
                  THEN (o.fecha_fin - CURRENT_DATE)::int ELSE NULL
                END AS dias_restantes,
                m.nombre AS modalidad_nombre,
                COALESCE(t.nombre_completo, 'Sin especificar') AS terapeuta_inicial_nombre
         FROM ordenes o
         JOIN modalidades m ON m.id = o.modalidad_id
         LEFT JOIN terapeutas t ON t.id = o.terapeuta_inicial_id
         WHERE o.id = $1`,
        [ingreso["orden_id"]]
      );
      orden = ordR.rows[0] || null;
    }

    res.json({ ...ingreso, paciente: pacR.rows[0] || null, orden });
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

      if (orden_id) {
        const ordCheck = await query(
          `SELECT id, paciente_id, activa, tipo_limite, sesiones_autorizadas, sesiones_consumidas,
                  CASE WHEN tipo_limite = 'FECHA' AND fecha_fin IS NOT NULL
                    THEN (fecha_fin - CURRENT_DATE)::int ELSE NULL END AS dias_restantes
           FROM ordenes WHERE id = $1`,
          [orden_id]
        );
        if (!ordCheck.rows[0]) {
          res.status(404).json({ error: "Orden no encontrada" });
          return;
        }
        const ord = ordCheck.rows[0];
        if (ord["paciente_id"] !== Number(paciente_id)) {
          res.status(400).json({ error: "La orden no pertenece a este paciente" });
          return;
        }
        if (!ord["activa"]) {
          res.status(400).json({ error: "La orden está cerrada. No se pueden registrar ingresos." });
          return;
        }
        if (ord["tipo_limite"] === "CANTIDAD_TERAPIAS") {
          const restantes = Number(ord["sesiones_autorizadas"]) - Number(ord["sesiones_consumidas"]);
          if (restantes <= 0) {
            res.status(400).json({ error: "La orden no tiene sesiones disponibles." });
            return;
          }
          if (terapias.length > restantes) {
            res.status(400).json({ error: `La orden solo tiene ${restantes} sesión(es) disponible(s), pero se intentan registrar ${terapias.length} terapia(s).` });
            return;
          }
        }
        if (ord["tipo_limite"] === "FECHA" && ord["dias_restantes"] != null && Number(ord["dias_restantes"]) < 0) {
          res.status(400).json({ error: "La orden está vencida por fecha." });
          return;
        }
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

        // Incrementar sesiones_consumidas si hay orden (cada terapia = 1 sesión)
        if (orden_id) {
          await txQuery(
            "UPDATE ordenes SET sesiones_consumidas = sesiones_consumidas + $1 WHERE id = $2",
            [terapias.length, orden_id]
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
        // Obtener orden_id y cantidad de terapias para revertir sesiones
        const ir = await txQuery("SELECT orden_id FROM ingresos WHERE id=$1", [req.params.id]);
        if (!ir.rows[0]) throw new Error("not_found");
        const ordenId = ir.rows[0]["orden_id"];

        const tc = await txQuery("SELECT COUNT(*)::int AS cnt FROM ingresos_terapias WHERE ingreso_id=$1", [req.params.id]);
        const numTerapias = tc.rows[0]["cnt"] as number;

        // Eliminar terapias (CASCADE, pero explícito para legibilidad)
        await txQuery("DELETE FROM ingresos_terapias WHERE ingreso_id=$1", [req.params.id]);
        await txQuery("DELETE FROM ingresos WHERE id=$1", [req.params.id]);

        // Revertir sesiones consumidas (cada terapia = 1 sesión)
        if (ordenId && numTerapias > 0) {
          await txQuery(
            "UPDATE ordenes SET sesiones_consumidas = GREATEST(sesiones_consumidas - $1, 0) WHERE id=$2",
            [numTerapias, ordenId]
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
