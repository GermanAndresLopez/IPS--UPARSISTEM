/**
 * MIGRACIÓN — Aplica cambios al esquema existente
 * Ejecutar una sola vez: npm run migrate
 */
import { Pool } from "pg";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("🔄 Iniciando migración...\n");

    // 1. Tabla auditoria
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
        id             SERIAL        PRIMARY KEY,
        fecha_hora     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        usuario_id     INTEGER       REFERENCES usuarios(id),
        tipo_accion    VARCHAR(20)   NOT NULL CHECK (tipo_accion IN ('CREAR','EDITAR','ELIMINAR','LOGIN','EXPORTAR')),
        modulo         VARCHAR(30)   NOT NULL CHECK (modulo IN ('PACIENTES','ORDENES','INGRESOS','USUARIOS','REPORTES','CONFIGURACION')),
        registro_id    INTEGER,
        descripcion    TEXT          NOT NULL,
        valor_anterior TEXT,
        valor_nuevo    TEXT
      )
    `);
    console.log("✅ Tabla auditoria OK");

    // 2. terapeuta_id nullable en ingresos_terapias
    await client.query(`
      ALTER TABLE ingresos_terapias ALTER COLUMN terapeuta_id DROP NOT NULL
    `).catch(() => console.log("   (terapeuta_id ya era nullable)"));
    console.log("✅ ingresos_terapias.terapeuta_id nullable OK");

    // 3. Nuevas columnas en pacientes
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10) DEFAULT 'CC'`);
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS correo VARCHAR(200)`);
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS primer_apellido VARCHAR(100)`);
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS segundo_apellido VARCHAR(100)`);
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS primer_nombre VARCHAR(100)`);
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS segundo_nombre VARCHAR(100)`);
    console.log("✅ Nuevas columnas en pacientes OK");

    // 4. Migrar nombre_completo → 4 campos (solo si nombre_completo existe)
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'pacientes' AND column_name = 'nombre_completo'
    `);

    if (colCheck.rows.length > 0) {
      const updated = await client.query(`
        UPDATE pacientes SET
          primer_apellido  = split_part(TRIM(nombre_completo), ' ', 1),
          segundo_apellido = NULLIF(
            CASE WHEN array_length(string_to_array(TRIM(nombre_completo), ' '), 1) >= 4
                 THEN split_part(TRIM(nombre_completo), ' ', 2) ELSE NULL END, ''),
          primer_nombre    = CASE
            WHEN array_length(string_to_array(TRIM(nombre_completo), ' '), 1) >= 4
                 THEN split_part(TRIM(nombre_completo), ' ', 3)
            ELSE split_part(TRIM(nombre_completo), ' ', 2) END,
          segundo_nombre   = NULLIF(
            CASE WHEN array_length(string_to_array(TRIM(nombre_completo), ' '), 1) >= 4
                 THEN split_part(TRIM(nombre_completo), ' ', 4) ELSE NULL END, '')
        WHERE primer_apellido IS NULL AND nombre_completo IS NOT NULL
      `);
      console.log(`✅ Migración nombre_completo → 4 campos (${updated.rowCount} filas)`);

      await client.query(`ALTER TABLE pacientes DROP COLUMN IF EXISTS nombre_completo`);
      console.log("✅ Columna nombre_completo eliminada");
    } else {
      console.log("   (nombre_completo ya no existe, nada que migrar)");
    }

    // 5. Campo activo en pacientes
    await client.query(`ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true`);
    console.log("✅ pacientes.activo OK");

    // 6b. Permitir terapeuta_inicial_id nulo en ordenes (orden sin terapeuta especificado)
    await client.query(`ALTER TABLE ordenes ALTER COLUMN terapeuta_inicial_id DROP NOT NULL`)
      .catch(() => console.log("   (terapeuta_inicial_id ya era nullable)"));
    console.log("✅ ordenes.terapeuta_inicial_id nullable OK");

    // 6. Ampliar CHECK de historial_ordenes para AJUSTE_CONSUMIDAS
    await client.query(`ALTER TABLE historial_ordenes DROP CONSTRAINT IF EXISTS historial_ordenes_tipo_cambio_check`);
    await client.query(`
      ALTER TABLE historial_ordenes ADD CONSTRAINT historial_ordenes_tipo_cambio_check
        CHECK (tipo_cambio IN ('EXTENSION_FECHA','AMPLIACION_SESIONES','CIERRE','AJUSTE_CONSUMIDAS'))
    `);
    console.log("✅ historial_ordenes CHECK ampliado OK");

    // 7. Índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ordenes_activa  ON ordenes(activa)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_hora)`);
    console.log("✅ Índices OK");

    console.log("\n🎉 Migración completada exitosamente.");
  } catch (err) {
    console.error("\n❌ Error en migración:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
