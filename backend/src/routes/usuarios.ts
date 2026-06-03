/**
 * /api/usuarios — CRUD de usuarios del sistema
 * Solo ADMIN
 */
import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));

// GET /api/usuarios
router.get("/", async (_req, res: Response): Promise<void> => {
  try {
    const r = await query(
      `SELECT id, nombre_completo, correo, rol, activo,
              TO_CHAR(fecha_creacion, 'YYYY-MM-DD') AS fecha_creacion
       FROM usuarios ORDER BY fecha_creacion`
    );
    res.json(r.rows);
  } catch (err) {
    console.error("[usuarios/GET]", err);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// POST /api/usuarios
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nombre_completo, correo, rol, contrasena } = req.body;
    if (!nombre_completo || !correo || !rol || !contrasena) {
      res.status(400).json({ error: "Nombre, correo, rol y contraseña son requeridos" });
      return;
    }
    if (!["ADMIN", "COORDINADOR", "OPERATIVO"].includes(rol)) {
      res.status(400).json({ error: "Rol inválido" });
      return;
    }
    const hash = await bcrypt.hash(contrasena, 10);
    const r = await query(
      `INSERT INTO usuarios (nombre_completo, correo, contrasena_hash, rol)
       VALUES ($1,$2,$3,$4)
       RETURNING id, nombre_completo, correo, rol, activo, TO_CHAR(fecha_creacion,'YYYY-MM-DD') AS fecha_creacion`,
      [nombre_completo, correo.toLowerCase().trim(), hash, rol]
    );
    await query(
      `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, registro_id, descripcion)
       VALUES ($1,'CREAR','USUARIOS',$2,$3)`,
      [req.user!.id, r.rows[0]["id"], `Creó usuario ${nombre_completo} con rol ${rol}`]
    );
    res.status(201).json(r.rows[0]);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "23505") {
      res.status(409).json({ error: "Ya existe un usuario con ese correo" });
      return;
    }
    console.error("[usuarios/POST]", err);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// PUT /api/usuarios/:id
router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { nombre_completo, correo, rol, contrasena } = req.body;
    // Actualizar contraseña solo si se envía
    if (contrasena) {
      const hash = await bcrypt.hash(contrasena, 10);
      const r = await query(
        `UPDATE usuarios SET nombre_completo=$1, correo=$2, rol=$3, contrasena_hash=$4
         WHERE id=$5
         RETURNING id, nombre_completo, correo, rol, activo, TO_CHAR(fecha_creacion,'YYYY-MM-DD') AS fecha_creacion`,
        [nombre_completo, correo.toLowerCase().trim(), rol, hash, req.params.id]
      );
      if (!r.rows[0]) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
      res.json(r.rows[0]);
    } else {
      const r = await query(
        `UPDATE usuarios SET nombre_completo=$1, correo=$2, rol=$3
         WHERE id=$4
         RETURNING id, nombre_completo, correo, rol, activo, TO_CHAR(fecha_creacion,'YYYY-MM-DD') AS fecha_creacion`,
        [nombre_completo, correo.toLowerCase().trim(), rol, req.params.id]
      );
      if (!r.rows[0]) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
      res.json(r.rows[0]);
    }
    await query(
      `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, registro_id, descripcion)
       VALUES ($1,'EDITAR','USUARIOS',$2,$3)`,
      [req.user!.id, req.params.id, `Editó usuario ID ${req.params.id}`]
    );
  } catch (err) {
    console.error("[usuarios/PUT]", err);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// PATCH /api/usuarios/:id/toggle — activar/desactivar
router.patch("/:id/toggle", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // No permitir que el admin se desactive a sí mismo
    if (Number(req.params.id) === req.user!.id) {
      res.status(400).json({ error: "No podés desactivar tu propio usuario" });
      return;
    }
    const r = await query(
      `UPDATE usuarios SET activo = NOT activo WHERE id=$1
       RETURNING id, nombre_completo, correo, rol, activo, TO_CHAR(fecha_creacion,'YYYY-MM-DD') AS fecha_creacion`,
      [req.params.id]
    );
    if (!r.rows[0]) { res.status(404).json({ error: "Usuario no encontrado" }); return; }
    res.json(r.rows[0]);
  } catch (err) {
    console.error("[usuarios/toggle]", err);
    res.status(500).json({ error: "Error al cambiar estado" });
  }
});

export default router;
