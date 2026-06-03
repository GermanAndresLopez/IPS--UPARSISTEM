import { Router, Response } from "express";
import { query } from "../db";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));

router.get("/", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const r = await query(`
      SELECT
        a.id,
        TO_CHAR(a.fecha_hora, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_hora,
        a.usuario_id,
        COALESCE(u.nombre_completo, 'Sistema') AS usuario_nombre,
        COALESCE(u.rol, 'ADMIN') AS rol_usuario,
        a.tipo_accion, a.modulo, a.registro_id,
        a.descripcion, a.valor_anterior, a.valor_nuevo
      FROM auditoria a
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      ORDER BY a.fecha_hora DESC
      LIMIT 500
    `);
    res.json(r.rows);
  } catch (err) {
    console.error("[auditoria/GET]", err);
    res.status(500).json({ error: "Error al obtener registros de auditoría" });
  }
});

export default router;
