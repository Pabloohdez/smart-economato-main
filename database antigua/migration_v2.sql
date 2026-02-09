-- --------------------------------------------------------
-- Migración V2 (ROBUSTA): Historial y Pedidos
-- Soluciona Error 150 (Charset/Collation Mismatch)
-- --------------------------------------------------------

USE smart_economato;

SET FOREIGN_KEY_CHECKS = 0;

-- 0. NORMALIZACIÓN PREVIA (CRÍTICO)
-- Aseguramos que las tablas antiguas tengan el mismo idioma (Collation) que las nuevas
-- Esto no borra datos, solo alinea el formato de texto.
ALTER TABLE `usuarios` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `proveedores` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `productos` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Asegurar tipos de datos exactos en claves foráneas referenciadas
ALTER TABLE `usuarios` MODIFY `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL;
ALTER TABLE `proveedores` MODIFY `id` int(11) NOT NULL;
ALTER TABLE `productos` MODIFY `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL;


-- 1. Eliminar tablas si existen (para reiniciar limpio el intento)
DROP TABLE IF EXISTS `detalles_pedido`;
DROP TABLE IF EXISTS `movimientos`;
DROP TABLE IF EXISTS `pedidos`;


-- 2. Crear Tabla Pedidos
CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proveedor_id` int(11) NOT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_recepcion` datetime DEFAULT NULL,
  `estado` enum('PENDIENTE','RECIBIDO','CANCELADO','INCOMPLETO') COLLATE utf8mb4_unicode_ci DEFAULT 'PENDIENTE',
  `total` decimal(10,2) DEFAULT 0.00,
  `usuario_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 3. Crear Tabla Detalles
CREATE TABLE `detalles_pedido` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `pedido_id` int(11) NOT NULL,
  `producto_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` int(11) NOT NULL,
  `cantidad_recibida` int(11) DEFAULT 0,
  `precio_unitario` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 4. Crear Tabla Movimientos
CREATE TABLE `movimientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `producto_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` varchar(50) COLLATE utf8mb4_unicode_ci,
  `tipo` enum('ENTRADA','SALIDA','AJUSTE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cantidad` int(11) NOT NULL,
  `stock_anterior` int(11) NOT NULL,
  `stock_nuevo` int(11) NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- 5. APLICAR CLAVES FORÁNEAS (Ahora seguro que coinciden)

-- Pedidos
ALTER TABLE `pedidos` 
  ADD CONSTRAINT `fk_pedidos_proveedor` FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pedidos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

-- Detalles
ALTER TABLE `detalles_pedido` 
  ADD CONSTRAINT `fk_det_pedido` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_det_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE;

-- Movimientos
ALTER TABLE `movimientos` 
  ADD CONSTRAINT `fk_mov_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mov_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;


SET FOREIGN_KEY_CHECKS = 1;
