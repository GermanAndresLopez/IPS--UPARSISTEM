/**
 * SEED — Inicializa el esquema y carga datos de ejemplo en PostgreSQL
 * Ejecutar: npm run seed
 *
 * Contraseña inicial para todos los usuarios: terapia2026 
 */
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";
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
    console.log("📦 Conectado a PostgreSQL");

    // 1. Ejecutar schema.sql
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    await client.query(schema);
    console.log("✅ Schema creado");

    await client.query("BEGIN");

    // 2. Modalidades
    await client.query(`
      INSERT INTO modalidades (id, nombre) VALUES
        (1, 'Individual'), (2, 'Grupal'), (3, 'Domiciliaria'), (4, 'Hospitalaria')
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('modalidades_id_seq', 10)");

    // 3. Tipos de ingreso
    await client.query(`
      INSERT INTO tipos_ingreso (id, nombre) VALUES
        (1, 'TERAPIAS'), (2, 'VALORACIÓN'), (3, 'CONTROL')
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('tipos_ingreso_id_seq', 10)");

    // 4. EPS
    await client.query(`
      INSERT INTO eps (id, nombre, activa, persona_cargo, telefono, correo) VALUES
        (1, 'SALUD TOTAL',     true,  'Andrea Morales', '6017001234', 'autorizaciones@saludtotal.com.co'),
        (2, 'SANITAS',         true,  'Carlos Pérez',   '6014005678', 'autorizaciones@sanitas.com.co'),
        (3, 'NUEVA EPS',       true,  'Luisa Ramírez',  '6013009012', 'autorizaciones@nuevaeps.gov.co'),
        (4, 'SANIDAD POLICIA', true,  'Mayor Torres',   '6013453456', 'sanidad@policia.gov.co'),
        (5, 'COOSALUD',        true,  'Diana Gómez',    '6057007890', 'autorizaciones@coosalud.com.co'),
        (6, 'DUSAKAWI EPSI',   true,  'José Ariza',     '6055001234', 'info@dusakawi.com.co'),
        (7, 'ALLIANZ',         false, 'Sandra López',   '6016005678', 'autorizaciones@allianz.com.co'),
        (8, 'PARTICULAR',      true,  NULL,             NULL,         NULL)
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('eps_id_seq', 20)");

    // 5. Diagnósticos
    await client.query(`
      INSERT INTO diagnosticos (id, codigo_cie10, descripcion) VALUES
        (1,  'F840', 'AUTISMO'),
        (2,  'F900', 'PERTURBACION DE LA ACTIVIDAD Y DE LA ATENCION'),
        (3,  'F800', 'TRASTORNO ESPECIFICO DE LA PRONUNCIACION'),
        (4,  'F845', 'SINDROME DE ASPERGER'),
        (5,  'G800', 'PARALISIS CEREBRAL'),
        (6,  'F700', 'DISCAPACIDAD INTELECTUAL LEVE'),
        (7,  'Q909', 'SINDROME DE DOWN'),
        (8,  'F413', 'TRASTORNO DE ANSIEDAD'),
        (9,  'R620', 'RETARDO DEL DESARROLLO'),
        (10, 'F809', 'TRASTORNO DEL DESARROLLO DEL HABLA Y LENGUAJE')
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('diagnosticos_id_seq', 20)");

    // 6. Terapeutas
    await client.query(`
      INSERT INTO terapeutas (id, nombre_completo, tipo_cargo, fecha_inicio_cargo, telefono, correo) VALUES
        (1,  'ADALBA CAMARGO',   'Fonoaudiología',     '2022-01-10', '3012345671', 'adalba.camargo@terapia.com'),
        (2,  'ADRIANA SANJUAN',  'Psicología',         '2021-03-15', '3012345672', 'adriana.sanjuan@terapia.com'),
        (3,  'ANDREA ORTIZ',     'Terapia Ocupacional','2023-05-01', '3012345673', 'andrea.ortiz@terapia.com'),
        (4,  'CARLOS MORENO',    'Fisioterapia',       '2020-08-20', '3012345674', 'carlos.moreno@terapia.com'),
        (5,  'DAYANA DAZA',      'Psicología',         '2022-06-01', '3012345675', 'dayana.daza@terapia.com'),
        (6,  'DAYANA HERNANDEZ', 'Fonoaudiología',     '2023-01-10', '3012345676', 'dayana.hernandez@terapia.com'),
        (7,  'DUNNIA CHAATELI',  'Neuropsicología',    '2021-11-05', '3012345677', 'dunnia.chaateli@terapia.com'),
        (8,  'ELMIS PINTO',      'Terapia Ocupacional','2022-09-12', '3012345678', 'elmis.pinto@terapia.com'),
        (9,  'SARA ALARCON',     'Fisioterapia',       '2023-03-01', '3012345679', 'sara.alarcon@terapia.com'),
        (10, 'VIVIANA RAMIREZ',  'Fonoaudiología',     '2020-02-14', '3012345670', 'viviana.ramirez@terapia.com')
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('terapeutas_id_seq', 20)");

    // 7. Usuarios (con contraseña hasheada)
    const hash = await bcrypt.hash("terapia2026", 10);
    console.log("🔐 Contraseña hasheada para todos los usuarios: terapia2026");

    await client.query(`
      INSERT INTO usuarios (id, nombre_completo, correo, contrasena_hash, rol, activo, fecha_creacion) VALUES
        (1, 'Carlos Administrador', 'admin@terapia.com', $1, 'ADMIN',       true,  '2024-01-01'),
        (2, 'Laura Coordinadora',   'laura@terapia.com', $1, 'COORDINADOR', true,  '2024-01-05'),
        (3, 'María Operativa',      'maria@terapia.com', $1, 'OPERATIVO',   true,  '2024-01-10'),
        (4, 'Pedro Operativo',      'pedro@terapia.com', $1, 'OPERATIVO',   false, '2024-02-01')
      ON CONFLICT (id) DO NOTHING
    `, [hash]);
    await client.query("SELECT setval('usuarios_id_seq', 10)");

    // 8. Pacientes
    await client.query(`
      INSERT INTO pacientes (id, nombre_completo, documento_identidad, fecha_nacimiento, sexo, telefono_1, telefono_2, eps_id, tipo_paciente, diagnostico_id, novedad, fecha_registro, registrado_por_id) VALUES
        (1, 'ABBRUZZESE LOBO ANTHONY',       '1066305293', '2020-07-14', 'MASCULINO', '3013122548', NULL,         1, 'ORDEN',      1,  'SIN_NOVEDAD', '2024-01-15', 3),
        (2, 'ACEVEDO CASTILLA PAULA HELENA', '1241088153', '2018-09-04', 'FEMENINO',  '3046765938', '3243745966', 1, 'ORDEN',      2,  'SIN_NOVEDAD', '2025-10-02', 3),
        (3, 'TORRES GUTIERREZ SAMUEL DAVID', '1065874123', '2019-03-22', 'MASCULINO', '3125678901', NULL,         2, 'ORDEN',      4,  'SIN_NOVEDAD', '2025-11-01', 3),
        (4, 'MENDEZ PEREZ VALENTINA',        '1067891234', '2017-06-10', 'FEMENINO',  '3209871234', NULL,         4, 'ORDEN',      6,  'SIN_NOVEDAD', '2025-08-10', 3),
        (5, 'GARCIA ROJAS MIGUEL ANGEL',     '1066412345', '2021-11-05', 'MASCULINO', '3143456789', NULL,         3, 'ORDEN',      5,  'SIN_NOVEDAD', '2026-05-20', 3),
        (6, 'LOPEZ VARGAS ISABELLA',         '1067345678', '2016-08-30', 'FEMENINO',  '3176543210', NULL,         1, 'ORDEN',      10, 'SIN_NOVEDAD', '2026-01-05', 3),
        (7, 'RAMIREZ SILVA JUAN ESTEBAN',    '1065123456', '2015-04-18', 'MASCULINO', '3001234567', NULL,         5, 'PARTICULAR', 8,  'SIN_NOVEDAD', '2026-02-14', 3),
        (8, 'CASTRO MORENO ANA SOFIA',       '1067654321', '2013-12-01', 'FEMENINO',  '3119876543', NULL,         2, 'ORDEN',      7,  'DE_ALTA',     '2023-06-01', 3)
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('pacientes_id_seq', 20)");

    // 9. Órdenes
    await client.query(`
      INSERT INTO ordenes (id, paciente_id, tipo_limite, fecha_emision, fecha_inicio, fecha_fin, sesiones_autorizadas, sesiones_consumidas, modalidad_id, terapeuta_inicial_id, activa, fecha_registro, registrada_por_id) VALUES
        (1, 1, 'FECHA',             '2024-01-20', '2024-02-01', '2024-04-30', NULL, 24, 1, 1, false, '2024-01-20', 2),
        (2, 2, 'FECHA',             '2025-09-25', '2025-10-02', '2026-08-30', NULL, 18, 1, 5, true,  '2025-09-25', 2),
        (3, 3, 'CANTIDAD_TERAPIAS', '2025-10-15', '2025-11-01', NULL,         40,   35, 1, 2, true,  '2025-10-15', 2),
        (4, 4, 'FECHA',             '2025-08-01', '2025-08-10', '2026-06-02', NULL, 20, 1, 8, true,  '2025-08-01', 2),
        (5, 5, 'FECHA',             '2026-05-15', '2026-05-20', '2026-11-20', NULL, 2,  2, 4, true,  '2026-05-15', 2),
        (6, 6, 'CANTIDAD_TERAPIAS', '2025-12-20', '2026-01-05', NULL,         30,   28, 1, 1, true,  '2025-12-20', 2)
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('ordenes_id_seq', 20)");

    // 10. Ingresos
    await client.query(`
      INSERT INTO ingresos (id, fecha, hora, paciente_id, orden_id, tipo_ingreso_id, registrado_por_id, fecha_registro) VALUES
        (1, '2026-05-25', '10:30', 2, 2,    1, 3, '2026-05-25T10:35:00'),
        (2, '2026-05-25', '09:00', 6, 6,    1, 3, '2026-05-25T09:05:00'),
        (3, '2026-05-24', '08:30', 3, 3,    1, 3, '2026-05-24T08:35:00'),
        (4, '2026-05-22', '11:00', 7, NULL, 1, 3, '2026-05-22T11:05:00'),
        (5, '2026-05-20', '14:00', 5, 5,    2, 3, '2026-05-20T14:05:00')
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('ingresos_id_seq', 20)");

    // 11. Ingresos — terapias asociadas
    await client.query(`
      INSERT INTO ingresos_terapias (id, ingreso_id, tipo_terapia, terapeuta_id) VALUES
        (1, 1, 'Fonoaudiología',     1),
        (2, 1, 'Psicología',         2),
        (3, 2, 'Fonoaudiología',     1),
        (4, 3, 'Psicología',         2),
        (5, 3, 'Terapia Ocupacional',3),
        (6, 4, 'Psicología',         5),
        (7, 5, 'Fisioterapia',       4)
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query("SELECT setval('ingresos_terapias_id_seq', 20)");

    // 12. Auditoría inicial
    await client.query(`
      INSERT INTO auditoria (fecha_hora, usuario_id, tipo_accion, modulo, registro_id, descripcion) VALUES
        ('2026-05-25T10:35:00', 3, 'CREAR',    'INGRESOS',  1, 'Registró ingreso para ACEVEDO CASTILLA PAULA HELENA — 2 terapias'),
        ('2026-05-24T15:20:00', 2, 'EDITAR',   'ORDENES',   4, 'Modificó fecha fin de orden #4 — MENDEZ PEREZ VALENTINA'),
        ('2026-05-20T08:00:00', 3, 'CREAR',    'PACIENTES', 5, 'Registró nuevo paciente GARCIA ROJAS MIGUEL ANGEL'),
        ('2026-05-15T14:10:00', 1, 'EXPORTAR', 'REPORTES',  NULL, 'Exportó PDF — Reporte de asistencias Mayo 2026'),
        ('2026-05-10T09:00:00', 1, 'CREAR',    'USUARIOS',  4, 'Creó usuario Pedro Operativo con rol OPERATIVO')
      ON CONFLICT DO NOTHING
    `);

    await client.query("COMMIT");
    console.log("✅ Datos de ejemplo insertados correctamente");
    console.log("\n📋 Usuarios de prueba:");
    console.log("   admin@terapia.com  → ADMIN");
    console.log("   laura@terapia.com  → COORDINADOR");
    console.log("   maria@terapia.com  → OPERATIVO");
    console.log("\n   🔑 Contraseña para todos: terapia2026\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error durante el seed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
