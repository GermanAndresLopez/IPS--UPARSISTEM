import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Primero los ingresos que referencian órdenes
    const ing = await client.query("DELETE FROM ingresos_terapias WHERE ingreso_id IN (SELECT id FROM ingresos WHERE orden_id IS NOT NULL)");
    console.log(`  ingresos_terapias eliminadas: ${ing.rowCount}`);

    const ingr = await client.query("DELETE FROM ingresos WHERE orden_id IS NOT NULL");
    console.log(`  ingresos con orden eliminados: ${ingr.rowCount}`);

    // Historial de órdenes
    const hist = await client.query("DELETE FROM historial_ordenes");
    console.log(`  historial_ordenes eliminado: ${hist.rowCount}`);

    // Auditoría relacionada (opcional, no bloquea)
    const aud = await client.query("DELETE FROM auditoria WHERE modulo = 'ORDENES'");
    console.log(`  auditoria de ordenes eliminada: ${aud.rowCount}`);

    // Las órdenes
    const ord = await client.query("DELETE FROM ordenes");
    console.log(`  ordenes eliminadas: ${ord.rowCount}`);

    await client.query("COMMIT");
    console.log("\nListo. Todas las órdenes y sus datos relacionados fueron eliminados.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error, se hizo rollback:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
