-- Tabla de Auditoría para rastrear todas las operaciones críticas del sistema
CREATE TABLE IF NOT EXISTS auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(50) NOT NULL,
    usuario_nombre VARCHAR(100),
    accion VARCHAR(50) NOT NULL,  -- 'CREAR_PRODUCTO', 'MODIFICAR_PRODUCTO', 'ELIMINAR_PRODUCTO', 'MOVIMIENTO', 'PEDIDO', 'BAJA'
    entidad VARCHAR(50) NOT NULL,  -- 'producto', 'movimiento', 'pedido', 'baja'
    entidad_id INTEGER,
    detalles JSONB,  -- Información adicional específica de la acción
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45)
);

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria(entidad, entidad_id);

-- Comentarios para documentación
COMMENT ON TABLE auditoria IS 'Registro de auditoría de todas las operaciones críticas del sistema';
COMMENT ON COLUMN auditoria.accion IS 'Tipo de acción realizada: CREAR_PRODUCTO, MODIFICAR_PRODUCTO, ELIMINAR_PRODUCTO, MOVIMIENTO, PEDIDO, BAJA';
COMMENT ON COLUMN auditoria.entidad IS 'Tipo de entidad afectada: producto, movimiento, pedido, baja';
COMMENT ON COLUMN auditoria.detalles IS 'Información adicional en formato JSON (cambios, cantidades, etc.)';
