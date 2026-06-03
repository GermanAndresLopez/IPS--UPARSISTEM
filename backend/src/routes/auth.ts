import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { correo, contrasena } = req.body;
    if (!correo || !contrasena) {
      res.status(400).json({ error: "Correo y contraseña son requeridos" });
      return;
    }

    const result = await query(
      "SELECT * FROM usuarios WHERE correo = $1",
      [correo.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }
    if (!user["activo"]) {
      res.status(401).json({ error: "Usuario inactivo — contactá al administrador" });
      return;
    }

    const match = await bcrypt.compare(contrasena, user["contrasena_hash"] as string);
    if (!match) {
      res.status(401).json({ error: "Credenciales incorrectas" });
      return;
    }

    const payload = {
      id: user["id"],
      rol: user["rol"],
      nombre_completo: user["nombre_completo"],
      correo: user["correo"],
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "8h" });

    // Registrar login en auditoría
    await query(
      `INSERT INTO auditoria (usuario_id, tipo_accion, modulo, descripcion)
       VALUES ($1, 'LOGIN', 'USUARIOS', $2)`,
      [user["id"], `Inicio de sesión — ${user["nombre_completo"]}`]
    );

    res.json({ token, usuario: payload });
  } catch (err) {
    console.error("[auth/login]", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, (req: AuthRequest, res: Response): void => {
  res.json(req.user);
});

export default router;
