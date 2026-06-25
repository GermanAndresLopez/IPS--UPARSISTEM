import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "backups");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `ordenes_backup_${timestamp}.json`);

  try {
    const [ordenes, historial, ingresos, terapias] = await Promise.all([
      pool.query("SELECT * FROM ordenes ORDER BY id"),
      pool.query("SELECT * FROM historial_ordenes ORDER BY id"),
      pool.query("SELECT * FROM ingresos WHERE orden_id IS NOT NULL ORDER BY id"),
      pool.query(`SELECT it.* FROM ingresos_terapias it
                  JOIN ingresos i ON i.id = it.ingreso_id
                  WHERE i.orden_id IS NOT NULL ORDER BY it.id`),
    ]);

    const backup = {
      fecha: new Date().toISOString(),
      ordenes: ordenes.rows,
      historial_ordenes: historial.rows,
      ingresos_con_orden: ingresos.rows,
      ingresos_terapias: terapias.rows,
    };

    fs.writeFileSync(outFile, JSON.stringify(backup, null, 2), "utf-8");

    console.log(`Backup guardado en: ${outFile}`);
    console.log(`  ${ordenes.rowCount} órdenes`);
    console.log(`  ${historial.rowCount} registros de historial`);
    console.log(`  ${ingresos.rowCount} ingresos vinculados`);
    console.log(`  ${terapias.rowCount} terapias de esos ingresos`);
  } catch (err) {
    console.error("Error al generar backup:", err);
  } finally {
    await pool.end();
  }
}

main();
