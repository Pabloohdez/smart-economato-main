-- Crear tabla de bajas si no existe
CREATE TABLE IF NOT EXISTS bajas (
    id VARCHAR(50) PRIMARY KEY,
    producto_id VARCHAR(50) NOT NULL,
    usuario_id VARCHAR(50) NOT NULL,
    tipo_baja VARCHAR(50) NOT NULL,
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    fecha_baja TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Crear índices para mejorar el performance de las consultas
CREATE INDEX IF NOT EXISTS idx_bajas_fecha ON bajas(fecha_baja);
CREATE INDEX IF NOT EXISTS idx_bajas_producto ON bajas(producto_id);
CREATE INDEX IF NOT EXISTS idx_bajas_tipo ON bajas(tipo_baja);

-- Comentarios sobre la tabla
COMMENT ON TABLE bajas IS 'Registro de bajas de productos (roturas, caducados, mermas, etc.)';
COMMENT ON COLUMN bajas.tipo_baja IS 'Tipo de baja: Rotura, Caducado, Merma, Ajuste, Otro';
