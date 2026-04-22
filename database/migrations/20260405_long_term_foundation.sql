CREATE TABLE IF NOT EXISTS alergenos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    icono VARCHAR(80),
    color_bg VARCHAR(20),
    color_texto VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS producto_alergenos (
    producto_id VARCHAR(50) NOT NULL,
    alergeno_id INTEGER NOT NULL,
    PRIMARY KEY (producto_id, alergeno_id),
    CONSTRAINT fk_producto_alergenos_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    CONSTRAINT fk_producto_alergenos_alergeno FOREIGN KEY (alergeno_id) REFERENCES alergenos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usuario_alergenos (
    usuario_id VARCHAR(50) NOT NULL,
    alergeno_id INTEGER NOT NULL,
    PRIMARY KEY (usuario_id, alergeno_id),
    CONSTRAINT fk_usuario_alergenos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_usuario_alergenos_alergeno FOREIGN KEY (alergeno_id) REFERENCES alergenos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS escandallos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    autor VARCHAR(100),
    coste NUMERIC(10,2) DEFAULT 0,
    pvp NUMERIC(10,2) DEFAULT 0,
    elaboracion TEXT,
    usuario_id VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_escandallos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

ALTER TABLE escandallos ADD COLUMN IF NOT EXISTS autor VARCHAR(100);
ALTER TABLE escandallos ADD COLUMN IF NOT EXISTS coste NUMERIC(10,2) DEFAULT 0;
ALTER TABLE escandallos ADD COLUMN IF NOT EXISTS usuario_id VARCHAR(50);
ALTER TABLE escandallos ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'escandallos'
          AND column_name = 'coste_total'
    ) THEN
        UPDATE escandallos
        SET coste = COALESCE(coste, coste_total)
        WHERE coste IS NULL OR coste = 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'escandallos'
          AND constraint_name = 'fk_escandallos_usuario'
    ) THEN
        ALTER TABLE escandallos
        ADD CONSTRAINT fk_escandallos_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS escandallo_items (
    id SERIAL PRIMARY KEY,
    escandallo_id INTEGER NOT NULL,
    producto_id VARCHAR(50) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    cantidad NUMERIC(10,3) NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    CONSTRAINT fk_escandallo_items_escandallo FOREIGN KEY (escandallo_id) REFERENCES escandallos(id) ON DELETE CASCADE,
    CONSTRAINT fk_escandallo_items_producto FOREIGN KEY (producto_id) REFERENCES productos(id)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'escandallos'
          AND column_name = 'ingredientes'
    ) AND NOT EXISTS (SELECT 1 FROM escandallo_items LIMIT 1) THEN
        INSERT INTO escandallo_items (escandallo_id, producto_id, nombre, cantidad, precio)
        SELECT
            e.id,
            COALESCE(item ->> 'producto_id', item ->> 'productoId', item ->> 'id', 'legacy-' || e.id::text),
            COALESCE(item ->> 'nombre', 'Ingrediente sin nombre'),
            COALESCE(NULLIF(item ->> 'cantidad', ''), '0')::numeric,
            COALESCE(NULLIF(item ->> 'precio', ''), '0')::numeric
        FROM escandallos e,
             LATERAL jsonb_array_elements(COALESCE(e.ingredientes, '[]'::jsonb)) AS item;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(64) PRIMARY KEY,
    usuario_id VARCHAR(50) NOT NULL,
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP,
    revoked_at TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_escandallos_actualizacion ON escandallos(fecha_actualizacion DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens(expires_at);