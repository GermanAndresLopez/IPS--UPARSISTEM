/**
 * /api/pacientes — CRUD completo
 * Categoria y orden_activa se calculan en la query
 */
import { Router, Response } from "express";
import { query } from "../db";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// ─── Query base que construye el objeto Paciente completo ──────────────────────
const PACIENTE_SELECT = `
  WITH ultima_asistencia AS (
    SELECT paciente_id, MAX(fecha) AS ultimo_ingreso
    FROM ingresos GROUP BY paciente_id
  ),
  orden_activa_cte AS (
    SELECT DISTINCT ON (paciente_id)
      o.id, o.paciente_id, o.tipo_limite, o.fecha_emision, o.fecha_inicio,
      o.fecha_fin, o.sesiones_autorizadas, o.sesiones_consumidas,
      o.modalidad_id, o.terapeuta_inicial_id, o.activa,
      o.archivo_adjunto, o.fecha_registro,
      m.nombre AS modalidad_nombre,
      t.nombre_completo AS terapeuta_inicial_nombre,
      ur.nombre_completo AS registrada_por,
      CASE WHEN o.tipo_limite = 'CANTIDAD_TERAPIAS'
        THEN o.sesiones_autorizadas - o.sesiones_consumidas ELSE NULL
      END AS sesiones_restantes,
      CASE WHEN o.tipo_limite = 'FECHA' AND o.fecha_fin IS NOT NULL
        THEN (o.fecha_fin - CURRENT_DATE)::int ELSE NULL
      END AS dias_restantes,
      CASE
        WHEN o.tipo_limite = 'FECHA' THEN
          CASE
            WHEN o.fecha_fin IS NULL THEN 'NORMAL'
            WHEN (o.fecha_fin - CURRENT_DATE) < -90 THEN 'INACTIVO'
            WHEN (o.fecha_fin - CURRENT_DATE) <= 0   THEN 'VENCIDA'
            ELSE 'NORMAL'
          END
        WHEN o.tipo_limite = 'CANTIDAD_TERAPIAS' THEN
          CASE WHEN (o.sesiones_autorizadas - o.sesiones_consumidas) <= 0 THEN 'VENCIDA' ELSE 'NORMAL' END
        ELSE 'NORMAL'
      END AS estado
    FROM ordenes o
    JOIN modalidades m ON m.id = o.modalidad_id
    JOIN terapeutas t ON t.id = o.terapeuta_inicial_id
    LEFT JOIN usuarios ur ON ur.id = o.registrada_por_id
    WHERE o.activa = true
    ORDER BY o.paciente_id, o.fecha_registro DESC
  )
  SELECT
    p.id, p.nombre_completo, p.documento_identidad,
    TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
    p.sexo, p.telefono_1, p.telefono_2,
    p.eps_id, e.nombre AS eps_nombre,
    p.tipo_paciente,
    p.diagnostico_id, d.codigo_cie10, d.descripcion AS diagnostico_nombre,
    p.novedad,
    TO_CHAR(p.fecha_registro, 'YYYY-MM-DD') AS fecha_registro,
    ru.nombre_completo AS registrado_por,
    TO_CHAR(ua.ultimo_ingreso, 'YYYY-MM-DD') AS ultimo_ingreso,
    CASE
      WHEN ua.ultimo_ingreso IS NULL THEN 'NUEVO'
      WHEN (CURRENT_DATE - ua.ultimo_ingreso) <= 30 THEN 'ACTIVO'
      WHEN oa.paciente_id IS NOT NULL THEN 'AUSENTE'
      ELSE 'ANTIGUO'
    END AS categoria,
    CASE WHEN oa.id IS NOT NULL THEN
      json_build_object(
        'id', oa.id,
        'paciente_id', oa.paciente_id,
        'tipo_limite', oa.tipo_limite,
        'fecha_emision', TO_CHAR(oa.fecha_emision, 'YYYY-MM-DD'),
        'fecha_inicio', TO_CHAR(oa.fecha_inicio, 'YYYY-MM-DD'),
        'fecha_fin', TO_CHAR(oa.fecha_fin, 'YYYY-MM-DD'),
        'sesiones_autorizadas', oa.sesiones_autorizadas,
        'sesiones_consumidas', oa.sesiones_consumidas,
        'sesiones_restantes', oa.sesiones_restantes,
        'dias_restantes', oa.dias_restantes,
        'estado', oa.estado,
        'modalidad_id', oa.modalidad_id,
        'modalidad_nombre', oa.modalidad_nombre,
        'terapeuta_inicial_id', oa.terapeuta_inicial_id,
        'terapeuta_inicial_nombre', oa.terapeuta_inicial_nombre,
        'activa', oa.activa,
        'registrada_por', oa.registrada_por,
        'fecha_registro', TO_CHAR(oa.fecha_registro, 'YYYY-MM-DD')
      )
    ELSE NULL END AS orden_activa
  FROM pacientes p
  LEFT JOIN eps e ON e.id = p.eps_id
  JOIN diagnosticos d ON d.id = p.diagnostico_id
  LEFT JOIN ultima_asistencia ua ON ua.paciente_id = p.id
  LEFT JOIN orden_activa_cte oa ON oa.paciente_id = p.id
  LEFT JOIN usuarios ru ON ru.id = p.registrado_por_id
`;

// GET /api/pacientes
router.get("/", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await query(`${PACIENTE_SELECT} ORDER BY p.nombre_completo`);
    res.json(r.rows);
  } catch (err) {
    console.error("[pacientes/GET]", err);
    res.status(500).json({ error: "Error al obtener pacientes" });
  }
});

// GET /api/pacientes/buscar?q=texto  (para autocomplete en nueva orden)
router.get("/buscar", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const q = `%${req.query.q || ""}%`;
    const r = await query(
      `SELECT id, nombre_completo, documento_identidad, tipo_paciente
       FROM pacientes
       WHERE nombre_completo ILIKE $1 OR documento_identidad ILIKE $1
       ORDER BY nombre_completo LIMIT 10`,
      [q]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("[pacientes/buscar]", err);
    res.status(500).json({ error: "Error al buscar pacientes" });
  }
});

// GET /api/pacientes/:id
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await query(`${PACIENTE_SELECT} WHERE p.id = $1`, [req.params.id]);
    if (!r.rows[0]) { res.status(404).json({ error: "Paciente no encontrado" }); return; }
    res.json(r.rows[0]);
  } catch (err) {
    console.error("[pacientes/GET/:id]", err);
    res.status(500).json({ error: "Error al obtener paciente" });
  }
});

// POST /api/pacientes
router.post(
  "/",
  requireRole("ADMIN", "COORDINADOR", "OPERATIVO"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        nombre_completo, documento_identidad, fecha_nacimiento, sexo,
        telefono_1, telefono_2, eps_id, tipo_paciente, diagnostico_id, novedad,
      } = req.body;

      if (!nombre_completo || !documento_identidad || !fecha_nacimiento || !sexo || !telefono_1 || !tipo_paciente || !diagnostico_id) {
        res.status(400).json({ error: "Faltan campos requeridos" });
        return;
      }

      const r = await query(
        `INSERT INTO pacientes
          (nombre_completo, documento_identidad, fecha_nacimiento, sexo,
           telefono_1, telefono_2, eps_id, tipo_paciente, diagnostico_id,
           novedad, registrado_por_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          nombre_completo.toUpperCase(), documento_identidad, fecha_nacimiento,
          sexo, telefono_1, telefono_2 || null, eps_id || null, tipo_paciente,
          diagnostico_id, novedad || "SIN_NOVEDAD", req.user!.id,
        ]
      );
      const newId = r.rows[0]["id"];

      await query(
        `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, registro_id, descripcion)
         VALUES ($1,'CREAR','PACIENTES',$2,$3)`,
        [req.user!.id, newId, `Registró nuevo paciente ${nombre_completo}`]
      );

      const full = await query(`${PACIENTE_SELECT} WHERE p.id = $1`, [newId]);
      res.status(201).json(full.rows[0]);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === "23505") {
        res.status(409).json({ error: "Ya existe un paciente con ese documento" });
        return;
      }
      console.error("[pacientes/POST]", err);
      res.status(500).json({ error: "Error al crear paciente" });
    }
  }
);

// PUT /api/pacientes/:id
router.put(
  "/:id",
  requireRole("ADMIN", "COORDINADOR"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        nombre_completo, documento_identidad, fecha_nacimiento, sexo,
        telefono_1, telefono_2, eps_id, tipo_paciente, diagnostico_id, novedad,
      } = req.body;

      const r = await query(
        `UPDATE pacientes SET
          nombre_completo=$1, documento_identidad=$2, fecha_nacimiento=$3, sexo=$4,
          telefono_1=$5, telefono_2=$6, eps_id=$7, tipo_paciente=$8,
          diagnostico_id=$9, novedad=$10
         WHERE id=$11 RETURNING id`,
        [
          nombre_completo?.toUpperCase(), documento_identidad, fecha_nacimiento, sexo,
          telefono_1, telefono_2 || null, eps_id || null, tipo_paciente,
          diagnostico_id, novedad || "SIN_NOVEDAD", req.params.id,
        ]
      );
      if (!r.rows[0]) { res.status(404).json({ error: "Paciente no encontrado" }); return; }

      await query(
        `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, registro_id, descripcion)
         VALUES ($1,'EDITAR','PACIENTES',$2,$3)`,
        [req.user!.id, req.params.id, `Editó paciente ID ${req.params.id}`]
      );

      const full = await query(`${PACIENTE_SELECT} WHERE p.id = $1`, [req.params.id]);
      res.json(full.rows[0]);
    } catch (err) {
      console.error("[pacientes/PUT]", err);
      res.status(500).json({ error: "Error al actualizar paciente" });
    }
  }
);

export default router;
