-- =============================================
-- TERAPIA APP — SCHEMA PostgreSQL
-- =============================================
-- Ejecutar una vez al crear la base de datos en Railway

-- Usuarios del sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id               SERIAL        PRIMARY KEY,
  nombre_completo  VARCHAR(200)  NOT NULL,
  correo           VARCHAR(200)  NOT NULL UNIQUE,
  contrasena_hash  VARCHAR(300)  NOT NULL,
  rol              VARCHAR(20)   NOT NULL CHECK (rol IN ('ADMIN','COORDINADOR','OPERATIVO')),
  activo           BOOLEAN       NOT NULL DEFAULT true,
  fecha_creacion   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- EPS / Aseguradoras
CREATE TABLE IF NOT EXISTS eps (
  id            SERIAL        PRIMARY KEY,
  nombre        VARCHAR(200)  NOT NULL,
  activa        BOOLEAN       NOT NULL DEFAULT true,
  persona_cargo VARCHAR(200),
  telefono      VARCHAR(50),
  correo        VARCHAR(200)
);

-- Diagnósticos CIE-10
CREATE TABLE IF NOT EXISTS diagnosticos (
  id           SERIAL        PRIMARY KEY,
  codigo_cie10 VARCHAR(20)   NOT NULL,
  descripcion  VARCHAR(500)  NOT NULL,
  activo       BOOLEAN       NOT NULL DEFAULT true
);

-- Terapeutas
CREATE TABLE IF NOT EXISTS terapeutas (
  id                  SERIAL        PRIMARY KEY,
  nombre_completo     VARCHAR(200)  NOT NULL,
  tipo_cargo          VARCHAR(100)  NOT NULL,
  fecha_inicio_cargo  DATE          NOT NULL,
  fecha_fin_cargo     DATE,
  telefono            VARCHAR(50),
  correo              VARCHAR(200),
  activo              BOOLEAN       NOT NULL DEFAULT true
);

-- Modalidades de atención
CREATE TABLE IF NOT EXISTS modalidades (
  id     SERIAL        PRIMARY KEY,
  nombre VARCHAR(100)  NOT NULL,
  activa BOOLEAN       NOT NULL DEFAULT true
);

-- Tipos de ingreso
CREATE TABLE IF NOT EXISTS tipos_ingreso (
  id     SERIAL        PRIMARY KEY,
  nombre VARCHAR(100)  NOT NULL,
  activo BOOLEAN       NOT NULL DEFAULT true
);

-- Pacientes
CREATE TABLE IF NOT EXISTS pacientes (
  id                   SERIAL        PRIMARY KEY,
  nombre_completo      VARCHAR(200)  NOT NULL,
  documento_identidad  VARCHAR(50)   NOT NULL UNIQUE,
  fecha_nacimiento     DATE          NOT NULL,
  sexo                 VARCHAR(10)   NOT NULL CHECK (sexo IN ('MASCULINO','FEMENINO')),
  telefono_1           VARCHAR(50)   NOT NULL,
  telefono_2           VARCHAR(50),
  eps_id               INTEGER       REFERENCES eps(id),
  tipo_paciente        VARCHAR(20)   NOT NULL CHECK (tipo_paciente IN ('ORDEN','PARTICULAR')),
  diagnostico_id       INTEGER       NOT NULL REFERENCES diagnosticos(id),
  novedad              VARCHAR(30)   NOT NULL DEFAULT 'SIN_NOVEDAD'
                       CHECK (novedad IN ('SIN_NOVEDAD','DE_ALTA','SUSPENDIDO','CAMBIO_CIUDAD','CAMBIO_DE_IPS','PARTICULAR')),
  fecha_registro       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  registrado_por_id    INTEGER       REFERENCES usuarios(id)
);

-- Órdenes médicas
CREATE TABLE IF NOT EXISTS ordenes (
  id                    SERIAL        PRIMARY KEY,
  paciente_id           INTEGER       NOT NULL REFERENCES pacientes(id),
  tipo_limite           VARCHAR(25)   NOT NULL CHECK (tipo_limite IN ('FECHA','CANTIDAD_TERAPIAS')),
  fecha_emision         DATE          NOT NULL,
  fecha_inicio          DATE          NOT NULL,
  fecha_fin             DATE,
  sesiones_autorizadas  INTEGER,
  sesiones_consumidas   INTEGER       NOT NULL DEFAULT 0,
  modalidad_id          INTEGER       NOT NULL REFERENCES modalidades(id),
  terapeuta_inicial_id  INTEGER       NOT NULL REFERENCES terapeutas(id),
  activa                BOOLEAN       NOT NULL DEFAULT true,
  archivo_adjunto       VARCHAR(500),
  registrada_por_id     INTEGER       REFERENCES usuarios(id),
  fecha_registro        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Historial de cambios en órdenes
CREATE TABLE IF NOT EXISTS historial_ordenes (
  id                 SERIAL        PRIMARY KEY,
  orden_id           INTEGER       NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  tipo_cambio        VARCHAR(30)   NOT NULL CHECK (tipo_cambio IN ('EXTENSION_FECHA','AMPLIACION_SESIONES','CIERRE')),
  valor_anterior     TEXT          NOT NULL,
  valor_nuevo        TEXT          NOT NULL,
  motivo             TEXT          NOT NULL,
  modificado_por_id  INTEGER       REFERENCES usuarios(id),
  fecha_cambio       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Ingresos / Asistencias
CREATE TABLE IF NOT EXISTS ingresos (
  id                SERIAL        PRIMARY KEY,
  fecha             DATE          NOT NULL,
  hora              TIME          NOT NULL,
  paciente_id       INTEGER       NOT NULL REFERENCES pacientes(id),
  orden_id          INTEGER       REFERENCES ordenes(id),
  tipo_ingreso_id   INTEGER       NOT NULL REFERENCES tipos_ingreso(id),
  observaciones     TEXT,
  registrado_por_id INTEGER       REFERENCES usuarios(id),
  fecha_registro    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Terapias por ingreso
CREATE TABLE IF NOT EXISTS ingresos_terapias (
  id           SERIAL        PRIMARY KEY,
  ingreso_id   INTEGER       NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
  tipo_terapia VARCHAR(100)  NOT NULL,
  terapeuta_id INTEGER       REFERENCES terapeutas(id)
);

-- Auditoría del sistema
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
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pacientes_documento ON pacientes(documento_identidad);
CREATE INDEX IF NOT EXISTS idx_ordenes_paciente ON ordenes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_activa ON ordenes(activa);
CREATE INDEX IF NOT EXISTS idx_ingresos_paciente ON ingresos(paciente_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fecha);
CREATE INDEX IF NOT EXISTS idx_ingresos_orden ON ingresos(orden_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha_hora);
