/**
 * /api/ordenes — CRUD de órdenes médicas
 */
import { Router, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { query, withTransaction } from "../db";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// Configurar multer para adjuntos de órdenes
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/ordenes");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `orden_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Query base para obtener orden completa ────────────────────────────────────
const ORDEN_SELECT = `
  SELECT
    o.id, o.paciente_id, o.tipo_limite,
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
    CASE
      WHEN o.activa = false THEN 'INACTIVO'
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
    END AS estado,
    o.modalidad_id, m.nombre AS modalidad_nombre,
    o.terapeuta_inicial_id, COALESCE(t.nombre_completo, 'Sin especificar') AS terapeuta_inicial_nombre,
    o.activa, o.archivo_adjunto,
    u.nombre_completo AS registrada_por,
    TO_CHAR(o.fecha_registro, 'YYYY-MM-DD') AS fecha_registro,
    TRIM(CONCAT_WS(' ', p.primer_apellido, p.segundo_apellido, p.primer_nombre, p.segundo_nombre)) AS paciente_nombre
  FROM ordenes o
  JOIN modalidades m ON m.id = o.modalidad_id
  LEFT JOIN terapeutas t ON t.id = o.terapeuta_inicial_id
  LEFT JOIN usuarios u ON u.id = o.registrada_por_id
  LEFT JOIN pacientes p ON p.id = o.paciente_id
`;

// GET /api/ordenes
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = ((req.query.search as string) || "").trim();
    const estado = ((req.query.estado as string) || "TODOS").trim();
    const offset = (page - 1) * limit;

    const r = await query(
      `WITH ordenes_calc AS (${ORDEN_SELECT})
       SELECT *, COUNT(*) OVER() AS total_count
       FROM ordenes_calc
       WHERE ($1 = '' OR LOWER(paciente_nombre) LIKE '%' || LOWER($1) || '%' OR id::text = $1)
         AND ($2 = 'TODOS' OR estado = $2)
       ORDER BY paciente_nombre
       LIMIT $3 OFFSET $4`,
      [search, estado, limit, offset]
    );

    const total = r.rows.length > 0 ? parseInt(String(r.rows[0]["total_count"])) : 0;
    const data  = r.rows.map(({ total_count, ...rest }) => rest);

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[ordenes/GET]", err);
    res.status(500).json({ error: "Error al obtener órdenes" });
  }
});

// GET /api/ordenes/:id
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await query(`${ORDEN_SELECT} WHERE o.id = $1`, [req.params.id]);
    if (!r.rows[0]) { res.status(404).json({ error: "Orden no encontrada" }); return; }

    const orden = r.rows[0];

    const [hist, pacR, ingR] = await Promise.all([
      query(
        `SELECT h.*, u.nombre_completo AS modificado_por,
                TO_CHAR(h.fecha_cambio, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_cambio
         FROM historial_ordenes h
         LEFT JOIN usuarios u ON u.id = h.modificado_por_id
         WHERE h.orden_id = $1 ORDER BY h.fecha_cambio DESC`,
        [req.params.id]
      ),
      query(
        `SELECT p.id, p.tipo_documento, p.documento_identidad,
                TRIM(CONCAT_WS(' ', p.primer_apellido, p.segundo_apellido, p.primer_nombre, p.segundo_nombre)) AS nombre_completo,
                TO_CHAR(p.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
                p.sexo, p.telefono_1, p.correo, p.tipo_paciente,
                e.nombre AS eps_nombre,
                d.codigo_cie10, d.descripcion AS diagnostico_nombre
         FROM pacientes p
         LEFT JOIN eps e ON e.id = p.eps_id
         JOIN diagnosticos d ON d.id = p.diagnostico_id
         WHERE p.id = $1`,
        [orden["paciente_id"]]
      ),
      query(
        `SELECT COUNT(*)::int AS total_ingresos
         FROM ingresos WHERE orden_id = $1`,
        [req.params.id]
      ),
    ]);

    res.json({
      ...orden,
      historial: hist.rows,
      paciente: pacR.rows[0] || null,
      total_ingresos: ingR.rows[0]?.["total_ingresos"] ?? 0,
    });
  } catch (err) {
    console.error("[ordenes/GET/:id]", err);
    res.status(500).json({ error: "Error al obtener orden" });
  }
});

// POST /api/ordenes  (con adjunto opcional)
router.post(
  "/",
  requireRole("ADMIN", "COORDINADOR"),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    upload.single("adjunto")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const msgs: Record<string, string> = {
          LIMIT_FILE_SIZE: "El archivo excede el tamaño máximo de 10 MB",
          LIMIT_UNEXPECTED_FILE: "Campo de archivo inesperado",
        };
        res.status(400).json({ error: msgs[err.code] || `Error de archivo: ${err.message}` });
        return;
      }
      if (err) {
        res.status(500).json({ error: "Error al procesar el archivo adjunto" });
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        paciente_id, tipo_limite, fecha_emision, fecha_inicio, fecha_fin,
        sesiones_autorizadas, modalidad_id, terapeuta_inicial_id,
      } = req.body;

      if (!paciente_id || !tipo_limite || !fecha_emision || !fecha_inicio || !modalidad_id) {
        res.status(400).json({ error: "Faltan campos requeridos" });
        return;
      }

      const archivo = req.file
        ? `/uploads/ordenes/${req.file.filename}`
        : null;

      const newId = await withTransaction(async (txQuery) => {
        // Verificar orden activa vigente dentro de la transacción (evita race condition)
        const existing = await txQuery(
          `SELECT id FROM ordenes
           WHERE paciente_id = $1 AND activa = true
             AND (
               (tipo_limite = 'FECHA' AND (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE))
               OR
               (tipo_limite = 'CANTIDAD_TERAPIAS' AND sesiones_autorizadas > sesiones_consumidas)
             )
           LIMIT 1`,
          [paciente_id]
        );
        if (existing.rows.length > 0) {
          throw Object.assign(new Error(`El paciente ya tiene una orden vigente (#${existing.rows[0]["id"]}). Cierre la orden actual antes de crear una nueva.`), { status: 409 });
        }

        // Desactivar órdenes vencidas que aún tengan activa=true
        await txQuery(
          `UPDATE ordenes SET activa = false
           WHERE paciente_id = $1 AND activa = true`,
          [paciente_id]
        );

        const r = await txQuery(
          `INSERT INTO ordenes
            (paciente_id, tipo_limite, fecha_emision, fecha_inicio, fecha_fin,
             sesiones_autorizadas, modalidad_id, terapeuta_inicial_id,
             archivo_adjunto, registrada_por_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          [
            paciente_id, tipo_limite, fecha_emision, fecha_inicio,
            tipo_limite === "FECHA" ? (fecha_fin || null) : null,
            tipo_limite === "CANTIDAD_TERAPIAS" ? (sesiones_autorizadas || null) : null,
            modalidad_id, terapeuta_inicial_id || null, archivo, req.user!.id,
          ]
        );
        const id = r.rows[0]["id"];

        await txQuery(
          `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, registro_id, descripcion)
           VALUES ($1,'CREAR','ORDENES',$2,$3)`,
          [req.user!.id, id, `Creó orden #${id} para paciente ID ${paciente_id}`]
        );

        return id;
      });

      const full = await query(`${ORDEN_SELECT} WHERE o.id = $1`, [newId]);
      res.status(201).json(full.rows[0]);
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 409) {
        res.status(409).json({ error: e.message });
        return;
      }
      console.error("[ordenes/POST]", err);
      res.status(500).json({ error: "Error al crear orden" });
    }
  }
);

// PUT /api/ordenes/:id  — Extensión de fecha o ampliación de sesiones
router.put(
  "/:id",
  requireRole("ADMIN", "COORDINADOR"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { tipo_cambio, valor_nuevo, motivo } = req.body;

      if (!tipo_cambio || !motivo) {
        res.status(400).json({ error: "tipo_cambio y motivo son requeridos" });
        return;
      }
      if (tipo_cambio !== "CIERRE" && !valor_nuevo) {
        res.status(400).json({ error: "valor_nuevo es requerido para este tipo de cambio" });
        return;
      }

      const current = await query("SELECT * FROM ordenes WHERE id=$1", [req.params.id]);
      if (!current.rows[0]) { res.status(404).json({ error: "Orden no encontrada" }); return; }
      const ord = current.rows[0];

      if (!ord["activa"]) {
        res.status(400).json({ error: "No se puede modificar una orden que ya fue cerrada" });
        return;
      }

      await withTransaction(async (txQuery) => {
        if (tipo_cambio === "EXTENSION_FECHA") {
          const valorAnterior = String(ord["fecha_fin"] ?? "sin fecha");
          await txQuery(
            "UPDATE ordenes SET fecha_fin=$1 WHERE id=$2",
            [valor_nuevo, req.params.id]
          );
          await txQuery(
            `INSERT INTO historial_ordenes (orden_id, tipo_cambio, valor_anterior, valor_nuevo, motivo, modificado_por_id)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [req.params.id, tipo_cambio, valorAnterior, valor_nuevo, motivo, req.user!.id]
          );
        } else if (tipo_cambio === "AMPLIACION_SESIONES") {
          const valorAnterior = String(ord["sesiones_autorizadas"] ?? "0");
          const nuevasCantidad = Number(ord["sesiones_autorizadas"]) + Number(valor_nuevo);
          await txQuery(
            "UPDATE ordenes SET sesiones_autorizadas=$1 WHERE id=$2",
            [nuevasCantidad, req.params.id]
          );
          await txQuery(
            `INSERT INTO historial_ordenes (orden_id, tipo_cambio, valor_anterior, valor_nuevo, motivo, modificado_por_id)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [req.params.id, tipo_cambio, valorAnterior, String(nuevasCantidad), motivo, req.user!.id]
          );
        } else if (tipo_cambio === "AJUSTE_CONSUMIDAS") {
          const valorAnterior = String(ord["sesiones_consumidas"] ?? "0");
          const nuevasConsumidas = Number(ord["sesiones_consumidas"]) + Number(valor_nuevo);
          await txQuery(
            "UPDATE ordenes SET sesiones_consumidas=$1 WHERE id=$2",
            [nuevasConsumidas, req.params.id]
          );
          await txQuery(
            `INSERT INTO historial_ordenes (orden_id, tipo_cambio, valor_anterior, valor_nuevo, motivo, modificado_por_id)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [req.params.id, tipo_cambio, valorAnterior, String(nuevasConsumidas), motivo, req.user!.id]
          );
        } else if (tipo_cambio === "CIERRE") {
          await txQuery("UPDATE ordenes SET activa=false WHERE id=$1", [req.params.id]);
          await txQuery(
            `INSERT INTO historial_ordenes (orden_id, tipo_cambio, valor_anterior, valor_nuevo, motivo, modificado_por_id)
             VALUES ($1,'CIERRE','activa','inactiva',$2,$3)`,
            [req.params.id, motivo, req.user!.id]
          );
        }

        await txQuery(
          `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, registro_id, descripcion, valor_nuevo)
           VALUES ($1,'EDITAR','ORDENES',$2,$3,$4)`,
          [req.user!.id, req.params.id, `${tipo_cambio} en orden #${req.params.id}`, tipo_cambio === "CIERRE" ? "inactiva" : valor_nuevo]
        );
      });

      const full = await query(`${ORDEN_SELECT} WHERE o.id = $1`, [req.params.id]);
      res.json(full.rows[0]);
    } catch (err) {
      console.error("[ordenes/PUT]", err);
      res.status(500).json({ error: "Error al modificar orden" });
    }
  }
);

export default router;
