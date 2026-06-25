import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const backupDir = path.join(__dirname, "backups");
  const archivos = fs.readdirSync(backupDir).filter(f => f.startsWith("ordenes_backup_") && f.endsWith(".json")).sort();

  if (archivos.length === 0) {
    console.error("No se encontraron backups en", backupDir);
    process.exit(1);
  }

  const archivoParam = process.argv[2];
  let archivoFinal: string;

  if (archivoParam) {
    const match = archivos.find(f => f.includes(archivoParam));
    if (!match) {
      console.error(`No se encontró un backup que coincida con "${archivoParam}".`);
      console.log("Backups disponibles:", archivos.join(", "));
      process.exit(1);
    }
    archivoFinal = match;
  } else {
    archivoFinal = archivos[archivos.length - 1];
  }

  console.log(`Restaurando desde: ${archivoFinal}`);
  const backup = JSON.parse(fs.readFileSync(path.join(backupDir, archivoFinal), "utf-8"));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Limpiar datos actuales
    await client.query("DELETE FROM ingresos_terapias WHERE ingreso_id IN (SELECT id FROM ingresos WHERE orden_id IS NOT NULL)");
    await client.query("DELETE FROM ingresos WHERE orden_id IS NOT NULL");
    await client.query("DELETE FROM historial_ordenes");
    await client.query("DELETE FROM ordenes");

    // Restaurar órdenes
    for (const o of backup.ordenes) {
      await client.query(
        `INSERT INTO ordenes (id, paciente_id, tipo_limite, fecha_emision, fecha_inicio, fecha_fin,
         sesiones_autorizadas, sesiones_consumidas, modalidad_id, terapeuta_inicial_id,
         activa, archivo_adjunto, registrada_por_id, fecha_registro)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [o.id, o.paciente_id, o.tipo_limite, o.fecha_emision, o.fecha_inicio, o.fecha_fin,
         o.sesiones_autorizadas, o.sesiones_consumidas, o.modalidad_id, o.terapeuta_inicial_id,
         o.activa, o.archivo_adjunto, o.registrada_por_id, o.fecha_registro]
      );
    }

    // Restaurar historial
    for (const h of backup.historial_ordenes) {
      await client.query(
        `INSERT INTO historial_ordenes (id, orden_id, tipo_cambio, valor_anterior, valor_nuevo, motivo, modificado_por_id, fecha_cambio)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [h.id, h.orden_id, h.tipo_cambio, h.valor_anterior, h.valor_nuevo, h.motivo, h.modificado_por_id, h.fecha_cambio]
      );
    }

    // Restaurar ingresos
    for (const i of backup.ingresos_con_orden) {
      await client.query(
        `INSERT INTO ingresos (id, fecha, hora, paciente_id, orden_id, tipo_ingreso_id, observaciones, registrado_por_id, fecha_registro)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [i.id, i.fecha, i.hora, i.paciente_id, i.orden_id, i.tipo_ingreso_id, i.observaciones, i.registrado_por_id, i.fecha_registro]
      );
    }

    // Restaurar terapias de ingresos
    for (const t of backup.ingresos_terapias) {
      await client.query(
        `INSERT INTO ingresos_terapias (id, ingreso_id, tipo_terapia, terapeuta_id)
         VALUES ($1,$2,$3,$4)`,
        [t.id, t.ingreso_id, t.tipo_terapia, t.terapeuta_id]
      );
    }

    // Resetear secuencias
    await client.query("SELECT setval('ordenes_id_seq', COALESCE((SELECT MAX(id) FROM ordenes), 0) + 1, false)");
    await client.query("SELECT setval('historial_ordenes_id_seq', COALESCE((SELECT MAX(id) FROM historial_ordenes), 0) + 1, false)");
    await client.query("SELECT setval('ingresos_id_seq', COALESCE((SELECT MAX(id) FROM ingresos), 0) + 1, false)");
    await client.query("SELECT setval('ingresos_terapias_id_seq', COALESCE((SELECT MAX(id) FROM ingresos_terapias), 0) + 1, false)");

    await client.query("COMMIT");

    console.log(`Restaurados:`);
    console.log(`  ${backup.ordenes.length} órdenes`);
    console.log(`  ${backup.historial_ordenes.length} registros de historial`);
    console.log(`  ${backup.ingresos_con_orden.length} ingresos`);
    console.log(`  ${backup.ingresos_terapias.length} terapias`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error, se hizo rollback:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
