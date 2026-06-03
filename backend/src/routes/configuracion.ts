/**
 * /api/configuracion — EPS, Diagnósticos, Terapeutas, Modalidades, TiposIngreso
 * Solo ADMIN puede crear/modificar/eliminar.
 */
import { Router, Response } from "express";
import { query } from "../db";
import { authenticate, requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// ─── EPS ──────────────────────────────────────────────────────────────────────

router.get("/eps", async (_req, res: Response): Promise<void> => {
  try {
    const r = await query("SELECT * FROM eps ORDER BY nombre");
    res.json(r.rows);
  } catch (err) {
    console.error("[eps/GET]", err);
    res.status(500).json({ error: "Error al obtener EPS" });
  }
});

router.post(
  "/eps",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { nombre, persona_cargo, telefono, correo } = req.body;
      if (!nombre) { res.status(400).json({ error: "El nombre es requerido" }); return; }
      const r = await query(
        `INSERT INTO eps (nombre, persona_cargo, telefono, correo)
         VALUES ($1,$2,$3,$4) RETURNING *`,
        [nombre, persona_cargo || null, telefono || null, correo || null]
      );
      res.status(201).json(r.rows[0]);
    } catch (err) {
      console.error("[eps/POST]", err);
      res.status(500).json({ error: "Error al crear EPS" });
    }
  }
);

router.put(
  "/eps/:id",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { nombre, persona_cargo, telefono, correo } = req.body;
      const r = await query(
        `UPDATE eps SET nombre=$1, persona_cargo=$2, telefono=$3, correo=$4
         WHERE id=$5 RETURNING *`,
        [nombre, persona_cargo || null, telefono || null, correo || null, req.params.id]
      );
      if (!r.rows[0]) { res.status(404).json({ error: "EPS no encontrada" }); return; }
      res.json(r.rows[0]);
    } catch (err) {
      console.error("[eps/PUT]", err);
      res.status(500).json({ error: "Error al actualizar EPS" });
    }
  }
);

router.patch(
  "/eps/:id/toggle",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const r = await query(
        "UPDATE eps SET activa = NOT activa WHERE id=$1 RETURNING *",
        [req.params.id]
      );
      if (!r.rows[0]) { res.status(404).json({ error: "EPS no encontrada" }); return; }
      res.json(r.rows[0]);
    } catch (err) {
      console.error("[eps/toggle]", err);
      res.status(500).json({ error: "Error al cambiar estado" });
    }
  }
);

// ─── DIAGNÓSTICOS ─────────────────────────────────────────────────────────────

router.get("/diagnosticos", async (_req, res: Response): Promise<void> => {
  try {
    const r = await query("SELECT * FROM diagnosticos ORDER BY codigo_cie10");
    res.json(r.rows);
  } catch (err) {
    console.error("[diagnosticos/GET]", err);
    res.status(500).json({ error: "Error al obtener diagnósticos" });
  }
});

router.post(
  "/diagnosticos",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { codigo_cie10, descripcion } = req.body;
      if (!codigo_cie10 || !descripcion) {
        res.status(400).json({ error: "Código CIE-10 y descripción son requeridos" });
        return;
      }
      const r = await query(
        "INSERT INTO diagnosticos (codigo_cie10, descripcion) VALUES ($1,$2) RETURNING *",
        [codigo_cie10.toUpperCase(), descripcion.toUpperCase()]
      );
      res.status(201).json(r.rows[0]);
    } catch (err) {
      console.error("[diagnosticos/POST]", err);
      res.status(500).json({ error: "Error al crear diagnóstico" });
    }
  }
);

router.put(
  "/diagnosticos/:id",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { codigo_cie10, descripcion, activo } = req.body;
      const r = await query(
        `UPDATE diagnosticos SET codigo_cie10=$1, descripcion=$2, activo=$3
         WHERE id=$4 RETURNING *`,
        [codigo_cie10?.toUpperCase(), descripcion?.toUpperCase(), activo !== false, req.params.id]
      );
      if (!r.rows[0]) { res.status(404).json({ error: "Diagnóstico no encontrado" }); return; }
      res.json(r.rows[0]);
    } catch (err) {
      console.error("[diagnosticos/PUT]", err);
      res.status(500).json({ error: "Error al actualizar diagnóstico" });
    }
  }
);

router.delete(
  "/diagnosticos/:id",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Verificar que no esté en uso
      const uso = await query(
        "SELECT 1 FROM pacientes WHERE diagnostico_id=$1 LIMIT 1",
        [req.params.id]
      );
      if (uso.rows.length > 0) {
        res.status(409).json({ error: "No se puede eliminar — hay pacientes con este diagnóstico" });
        return;
      }
      await query("DELETE FROM diagnosticos WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[diagnosticos/DELETE]", err);
      res.status(500).json({ error: "Error al eliminar diagnóstico" });
    }
  }
);

// ─── TERAPEUTAS ───────────────────────────────────────────────────────────────

router.get("/terapeutas", async (_req, res: Response): Promise<void> => {
  try {
    const r = await query("SELECT * FROM terapeutas ORDER BY nombre_completo");
    res.json(r.rows);
  } catch (err) {
    console.error("[terapeutas/GET]", err);
    res.status(500).json({ error: "Error al obtener terapeutas" });
  }
});

router.post(
  "/terapeutas",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { nombre_completo, tipo_cargo, fecha_inicio_cargo, telefono, correo } = req.body;
      if (!nombre_completo || !tipo_cargo || !fecha_inicio_cargo) {
        res.status(400).json({ error: "Nombre, cargo y fecha de inicio son requeridos" });
        return;
      }
      const r = await query(
        `INSERT INTO terapeutas (nombre_completo, tipo_cargo, fecha_inicio_cargo, telefono, correo)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [nombre_completo.toUpperCase(), tipo_cargo, fecha_inicio_cargo, telefono || null, correo || null]
      );
      res.status(201).json(r.rows[0]);
    } catch (err) {
      console.error("[terapeutas/POST]", err);
      res.status(500).json({ error: "Error al crear terapeuta" });
    }
  }
);

router.put(
  "/terapeutas/:id",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { nombre_completo, tipo_cargo, fecha_inicio_cargo, fecha_fin_cargo, telefono, correo, activo } = req.body;
      const r = await query(
        `UPDATE terapeutas
         SET nombre_completo=$1, tipo_cargo=$2, fecha_inicio_cargo=$3,
             fecha_fin_cargo=$4, telefono=$5, correo=$6, activo=$7
         WHERE id=$8 RETURNING *`,
        [
          nombre_completo?.toUpperCase(),
          tipo_cargo,
          fecha_inicio_cargo,
          fecha_fin_cargo || null,
          telefono || null,
          correo || null,
          activo !== false,
          req.params.id,
        ]
      );
      if (!r.rows[0]) { res.status(404).json({ error: "Terapeuta no encontrado" }); return; }
      res.json(r.rows[0]);
    } catch (err) {
      console.error("[terapeutas/PUT]", err);
      res.status(500).json({ error: "Error al actualizar terapeuta" });
    }
  }
);

router.delete(
  "/terapeutas/:id",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const uso = await query(
        "SELECT 1 FROM ordenes WHERE terapeuta_inicial_id=$1 LIMIT 1",
        [req.params.id]
      );
      if (uso.rows.length > 0) {
        res.status(409).json({ error: "No se puede eliminar — tiene órdenes asociadas" });
        return;
      }
      await query("DELETE FROM terapeutas WHERE id=$1", [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[terapeutas/DELETE]", err);
      res.status(500).json({ error: "Error al eliminar terapeuta" });
    }
  }
);

// ─── MODALIDADES ──────────────────────────────────────────────────────────────

router.get("/modalidades", async (_req, res: Response): Promise<void> => {
  try {
    const r = await query("SELECT * FROM modalidades ORDER BY nombre");
    res.json(r.rows);
  } catch (err) {
    console.error("[modalidades/GET]", err);
    res.status(500).json({ error: "Error al obtener modalidades" });
  }
});

router.post(
  "/modalidades",
  requireRole("ADMIN"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { nombre } = req.body;
      if (!nombre) { res.status(400).json({ error: "Nombre requerido" }); return; }
      const r = await query("INSERT INTO modalidades (nombre) VALUES ($1) RETURNING *", [nombre]);
      res.status(201).json(r.rows[0]);
    } catch (err) {
      console.error("[modalidades/POST]", err);
      res.status(500).json({ error: "Error al crear modalidad" });
    }
  }
);

// ─── TIPOS INGRESO ────────────────────────────────────────────────────────────

router.get("/tipos-ingreso", async (_req, res: Response): Promise<void> => {
  try {
    const r = await query("SELECT * FROM tipos_ingreso WHERE activo=true ORDER BY nombre");
    res.json(r.rows);
  } catch (err) {
    console.error("[tipos-ingreso/GET]", err);
    res.status(500).json({ error: "Error al obtener tipos de ingreso" });
  }
});

export default router;
