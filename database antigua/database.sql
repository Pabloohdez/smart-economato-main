CREATE DATABASE IF NOT EXISTS smart_economato;
USE smart_economato;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Table structure for table `usuarios`
--

CREATE TABLE `usuarios` (
  `id` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(20) DEFAULT 'user',
  `nombre` varchar(100),
  `apellidos` varchar(100),
  `email` varchar(100),
  `telefono` varchar(20),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `proveedores`
--

CREATE TABLE `proveedores` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `contacto` varchar(100),
  `telefono` varchar(20),
  `email` varchar(100),
  `direccion` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Table structure for table `productos`
--

CREATE TABLE `productos` (
  `id` varchar(50) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `precio` decimal(10,2) NOT NULL,
  `precioUnitario` varchar(20),
  `stock` int(11) DEFAULT 0,
  `stockMinimo` int(11) DEFAULT 0,
  `categoriaId` int(11),
  `proveedorId` int(11),
  `unidadMedida` varchar(20),
  `marca` varchar(50),
  `codigoBarras` varchar(50),
  `fechaCaducidad` date,
  `descripcion` text,
  `imagen` varchar(255),
  `activo` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`categoriaId`) REFERENCES `categorias` (`id`),
  FOREIGN KEY (`proveedorId`) REFERENCES `proveedores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('1', 'tcasest', 'secret', 'admin', 'Tanausú', 'Castrillo Estévez', 'tcasest@gobiernodecanarias.org', '+34 91 123 45 67');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('c8d2', 'Pablohdez_', 'Aryypau199304.', 'user', 'Pablo', 'Hernandez Guillermo', 'pablohdez.545@gmail.com', '628796348');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('c9ac', 'tcaset', '1234', 'user', 'manzana', 'Hernandez Guillermo', 'pablohdez.545@gmail.com', '45544554');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('f247', 'tcaset', '1234', 'user', 'manzana', 'Hernandez Guillermo', 'pablohdez.545@gmail.com', '45544554');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('82fb', 'tcaset', '1234', 'user', 'manzana', 'Hernandez Guillermo', 'pablohdez.545@gmail.com', '45544554');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('5ae3', 'tcaset', '1234', 'user', 'manzana', 'Hernandez Guillermo', 'pablohdez.545@gmail.com', '45544554');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('682e', 'Pablohdez_', 'qwe', 'user', 'qwe', 'qwe', 'pablohdez.545@gmail.com', '54455445');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('d100', 'Pablohdez_', 'Aryypau199304.', 'usuario', 'manzana', 'Hernandez Guillermo', 'pablohdez.545@gmail.com', '45544554');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('9334', 'Pablohdez_', 'Aryypau199304..', 'usuario', 'qwe', 'asd', 'ase@gmail.com', '54455445');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('1bde', 'Pablohdez_', 'Aryypau199304.', 'usuario', 'qwe', 'asd', 'ase@gmail.com', '45544554');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('c040', 'Pablohdez_', 'Aryypau199304.', 'usuario', 'Pablo', 'Hernandez Guillermo', 'pablohdez.545@gmail.com', '45544554');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('7427', 'nml', 'nml', 'usuario', 'nml', 'nml', 'nml@gmail.com', '852741963');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('c4b0', 'Pablohdez_', 'Aryypau199304.', 'usuario', 'fgh', 'asd', 'pablohdez.545@gmail.com', '54455445');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('ca2b', 'Pablohdez_', 'Aryypau199304.', 'usuario', 'manzana', 'nml', 'asq@gmail.com', '54455445');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('d3ca', 'Pablohdez_', 'Aryypau199304.', 'usuario', 'manzana', 'nml', 'asq@gmail.com', '54455445');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('6977', 'Pablohdez_', 'Aryypau199304.', 'usuario', 'manzana', 'asd', 'ase@gmail.com', '54455445');
INSERT INTO `usuarios` (`id`, `username`, `password`, `role`, `nombre`, `apellidos`, `email`, `telefono`) VALUES ('b1a8', 'LOLO', '1234', 'usuario', 'LOL', 'Hernandez Guillermo', 'asq@gmail.com', '45544554');
INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`) VALUES (1, 'Distribuciones Alimentarias Mediterráneo', 'Carlos Mendoza', '+34 91 123 45 67', 'ventas@mediterraneo-alimentos.es', 'Polígono Industrial Sur, 45, Madrid');
INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`) VALUES (2, 'Frutas y Verduras Frescas SL', 'María López', '+34 93 234 56 78', 'pedidos@frutasfrescas.es', 'Mercabarna, Nave 23, Barcelona');
INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`) VALUES (3, 'Carnicerías Selectas del Norte', 'Roberto García', '+34 94 345 67 89', 'info@carniciaselectas.es', 'Polígono Industrial Norte, 8, Bilbao');
INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`) VALUES (4, 'Pescados y Mariscos Atlántico', 'Ana Martínez', '+34 98 456 78 90', 'comercial@pescadosatlantico.es', 'Puerto Pesquero, 23, Vigo');
INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`) VALUES (5, 'Lácteos Valle Natural', 'Pedro Sánchez', '+34 95 567 89 01', 'cliente@vallenatural.es', 'Carretera Nacional IV, km 12, Sevilla');
INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`) VALUES (6, 'Distribuidora de Aceites Oro Verde', 'Isabel Ramírez', '+34 96 678 90 12', 'ventas@oroverde.es', 'Ctra. Jaén, 34, Córdoba');
INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`) VALUES (7, 'Especias y Condimentos del Mundo', 'Ahmed Al-Farsi', '+34 97 789 01 23', 'info@especiasdelmundo.es', 'Calle Especias, 12, Valencia');
INSERT INTO `proveedores` (`id`, `nombre`, `contacto`, `telefono`, `email`, `direccion`) VALUES (8, 'Bebidas y Vinos Peninsulares', 'Laura Fernández', '+34 98 890 12 34', 'comercial@vinospeninsulares.es', 'Bodegas Rioja, 56, Logroño');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (1, 'Frutas Frescas', 'Frutas de temporada y tropicales');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (2, 'Verduras y Hortalizas', 'Verduras frescas y de temporada');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (3, 'Carnes Rojas', 'Cortes selectos de carne de vacuno, cerdo y cordero');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (4, 'Aves y Caza', 'Pollo, pavo, codorniz y carnes de caza');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (5, 'Pescados Frescos', 'Pescado fresco de mar y río');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (6, 'Mariscos y Crustáceos', 'Mariscos frescos y congelados');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (7, 'Lácteos', 'Leche, yogures y natas');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (8, 'Quesos', 'Quesos nacionales e internacionales');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (9, 'Huevos', 'Huevos de gallina campera y ecológicos');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (10, 'Panadería', 'Pan fresco y productos de panadería');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (11, 'Aceites y Vinagres', 'Aceites de oliva y vinagres selectos');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (12, 'Especias y Condimentos', 'Especias, hierbas y condimentos');
INSERT INTO `categorias` (`id`, `nombre`, `descripcion`) VALUES (13, 'Bebidas', 'Vinos, aguas y refrescos');
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('1', 'Tomate Raf', 4.2, 'kg', 1, 30, 1, 2, 'kg', 'Huerta Natural', '8410001000015', '2024-03-20', 'Tomate Raf de la Vega de Almería', 'tomate-raf.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('2', 'Lechuga Iceberg', 1.15, 'unidad', 120, 40, 2, 2, 'unidad', 'Verde Fresco', '8410001000022', '2024-03-15', 'Lechuga iceberg extra fresca', 'lechuga-iceberg.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('3', 'Solomillo de Ternera', 24.9, 'kg', 35, 12, 3, 3, 'kg', 'Carnes Premium', '8410001000039', '2024-03-12', 'Solomillo de ternera gallega', 'solomillo-ternera.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('4', 'Pechuga de Pollo', 7.85, 'kg', 65, 25, 4, 3, 'kg', 'Avícola Selecta', '8410001000046', '2024-03-14', 'Pechuga de pollo sin piel', 'pechuga-pollo.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('5', 'Salmón Fresco', 18.5, 'kg', 28, 10, 5, 4, 'kg', 'Atlántico Fresco', '8410001000053', '2024-03-11', 'Salmón del Atlántico noruego', 'salmon-fresco.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('6', 'Gambas Blancas', 26.4, 'kg', 18, 8, 6, 4, 'kg', 'Mariscos Selectos', '8410001000060', '2024-03-10', 'Gambas blancas de Huelva', 'gambas-blancas.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('7', 'Leche Entera', 0.95, 'litro', 150, 50, 7, 5, 'litro', 'Lácteos Naturales', '8410001000077', '2024-03-25', 'Leche entera pasteurizada', 'leche-entera.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('8', 'Queso Manchego', 16.8, 'kg', 42, 15, 8, 5, 'kg', 'Quesos Tradicionales', '8410001000084', '2024-04-20', 'Queso manchego curado DOP', 'queso-manchego.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('9', 'Huevos Camperos', 2.95, 'docena', 80, 30, 9, 5, 'docena', 'Granja Natural', '8410001000091', '2024-03-28', 'Huevos camperos tamaño L', 'huevos-camperos.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('10', 'Pan de Barra', 1.1, 'unidad', 95, 35, 10, 1, 'unidad', 'Panadería Artesana', '8410001000107', '2024-03-08', 'Pan de barra tradicional', 'pan-barra.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('11', 'Aceite de Oliva Virgen Extra', 8.9, 'litro', 60, 20, 11, 6, 'litro', 'Oro del Mediterráneo', '8410001000114', '2025-12-15', 'Aceite de oliva virgen extra arbequina', 'aceite-oliva.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('12', 'Vinagre de Jerez', 6.4, 'litro', 35, 12, 11, 6, 'litro', 'Bodegas Tradicionales', '8410001000121', '2026-06-30', 'Vinagre de Jerez reserva', 'vinagre-jerez.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('13', 'Pimentón de la Vera', 4.95, '100g', 45, 15, 12, 7, '100g', 'Especias Selectas', '8410001000138', '2025-08-20', 'Pimentón de la Vera dulce DOP', 'pimenton-vera.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('14', 'Azafrán en hebras', 13.2, '1g', 25, 8, 12, 7, '1g', 'Azafrán Manchego', '8410001000145', '2025-10-15', 'Azafrán en hebras calidad superior', 'azafran-hebras.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('15', 'Vino Tinto Reserva', 14.8, 'botella', 48, 18, 13, 8, 'botella', 'Bodegas Riojanas', '8410001000152', '2027-12-31', 'Vino tinto reserva Rioja DOCa', 'vino-tinto.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('16', 'Agua Mineral', 0.65, 'botella', 200, 80, 13, 8, 'botella', 'Fuente Pura', '8410001000169', '2025-05-20', 'Agua mineral natural 1.5L', 'agua-mineral.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('17', 'Plátanos de Canarias', 1.95, 'kg', 75, 25, 1, 2, 'kg', 'Plátano Canario', '8410001000176', '2024-03-18', 'Plátanos de Canarias IGP', 'platanos-canarias.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('18', 'Naranjas Valencia', 1.45, 'kg', 110, 40, 1, 2, 'kg', 'Cítricos del Mediterráneo', '8410001000183', '2024-03-22', 'Naranjas de mesa Valencia late', 'naranjas-valencia.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('19', 'Zanahorias', 0.85, 'kg', 90, 30, 2, 2, 'kg', 'Huerta Natural', '8410001000190', '2024-03-17', 'Zanahorias frescas lavadas', 'zanahorias.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('20', 'Cebollas', 0.75, 'kg', 130, 45, 2, 2, 'kg', 'Verde Fresco', '8410001000206', '2024-04-05', 'Cebollas amarillas españolas', 'cebollas.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('21', 'Lomo de Cerdo', 11.9, 'kg', 38, 15, 3, 3, 'kg', 'Cárnicas Premium', '8410001000213', '2024-03-13', 'Lomo de cerdo ibérico', 'lomo-cerdo.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('22', 'Chuletas de Cordero', 16.75, 'kg', 22, 8, 3, 3, 'kg', 'Carnes Selectas', '8410001000220', '2024-03-11', 'Chuletas de cordero lechal', 'chuletas-cordero.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('23', 'Muslos de Pollo', 5.45, 'kg', 55, 20, 4, 3, 'kg', 'Avícola Selecta', '8410001000237', '2024-03-15', 'Muslos de pollo con piel', 'muslos-pollo.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('24', 'Pavo Pechuga', 9.2, 'kg', 32, 12, 4, 3, 'kg', 'Avícola Premium', '8410001000244', '2024-03-14', 'Pechuga de pavo fresca', 'pechuga-pavo.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('25', 'Merluza Fresca', 12.8, 'kg', 26, 10, 5, 4, 'kg', 'Pescados Frescos', '8410001000251', '2024-03-10', 'Merluza del Cantábrico', 'merluza-fresca.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('26', 'Lubina Fresca', 15.9, 'kg', 7, 8, 5, 4, 'kg', 'Pescados Mediterráneos', '8410001000268', '2024-03-09', 'Lubina de acuicultura', 'lubina-fresca.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('27', 'Mejillones', 8.5, 'kg', 11, 12, 6, 4, 'kg', 'Mariscos Gallegos', '8410001000275', '2024-03-12', 'Mejillones de roca gallegos', 'mejillones.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('28', 'Almejas Finas', 18.75, 'kg', 15, 6, 6, 4, 'kg', 'Mariscos Selectos', '8410001000282', '2024-03-08', 'Almejas finas de Huelva', 'almejas-finas.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('29', 'Yogur Natural', 0.45, 'unidad', 180, 60, 7, 5, 'unidad', 'Lácteos Naturales', '8410001000299', '2024-03-22', 'Yogur natural sin azúcar', 'yogur-natural.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('30', 'Mantequilla', 2.85, '250g', 65, 20, 7, 5, '250g', 'Lácteos Puros', '8410001000305', '2024-04-10', 'Mantequilla con sal', 'mantequilla.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('31', 'Queso Brie', 12.4, 'kg', 28, 10, 8, 5, 'kg', 'Quesos Europeos', '8410001000312', '2024-04-05', 'Queso brie francés', 'queso-brie.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('32', 'Queso Cabrales', 19.8, 'kg', 18, 6, 8, 5, 'kg', 'Quesos Tradicionales', '8410001000329', '2024-04-15', 'Queso cabrales asturiano DOP', 'queso-cabrales.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('33', 'Huevos Ecológicos', 3.45, 'docena', 45, 15, 9, 5, 'docena', 'Granja Ecológica', '8410001000336', '2024-03-30', 'Huevos ecológicos camperos', 'huevos-ecologicos.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('34', 'Pan Integral', 1.35, 'unidad', 70, 25, 10, 1, 'unidad', 'Panadería Salud', '8410001000343', '2024-03-09', 'Pan integral de centeno', 'pan-integral.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('35', 'Baguette', 0.95, 'unidad', 85, 30, 10, 1, 'unidad', 'Panadería Francesa', '8410001000350', '2024-03-08', 'Baguette tradicional francesa', 'baguette.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('36', 'Aceite de Oliva Virgen', 6.75, 'litro', 55, 18, 11, 6, 'litro', 'Aceites del Sur', '8410001000367', '2025-10-20', 'Aceite de oliva virgen andaluz', 'aceite-virgen.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('37', 'Vinagre de Módena', 5.2, '500ml', 40, 12, 11, 6, '500ml', 'Vinagres Italianos', '8410001000374', '2026-03-15', 'Vinagre balsámico de Módena IGP', 'vinagre-modena.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('38', 'Orégano', 2.15, '50g', 60, 20, 12, 7, '50g', 'Especias Mediterráneas', '8410001000381', '2025-07-30', 'Orégano seco molido', 'oregano.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('39', 'Pimienta Negra', 3.45, '50g', 50, 15, 12, 7, '50g', 'Especias del Mundo', '8410001000398', '2025-09-20', 'Pimienta negra en grano', 'pimienta-negra.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('40', 'Vino Blanco', 8.9, 'botella', 52, 18, 13, 8, 'botella', 'Bodegas Rueda', '8410001000404', '2026-08-15', 'Vino blanco verdejo DOP Rueda', 'vino-blanco.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('41', 'Cerveza Rubia', 1.2, 'botella', 160, 50, 13, 8, 'botella', 'Cervezas Artesanas', '8410001000411', '2024-09-30', 'Cerveza rubia artesanal', 'cerveza-rubia.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('42', 'Refresco de Cola', 0.85, 'lata', 220, 80, 13, 8, 'lata', 'Refrescos Nacionales', '8410001000428', '2024-12-15', 'Refresco de cola 33cl', 'refresco-cola.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('43', 'Manzanas Golden', 1.75, 'kg', 95, 30, 1, 2, 'kg', 'Frutas del Valle', '8410001000435', '2024-03-25', 'Manzanas golden delicious', 'manzanas-golden.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('44', 'Peras Conferencia', 2.1, 'kg', 70, 25, 1, 2, 'kg', 'Frutas Selectas', '8410001000442', '2024-03-22', 'Peras conferencia extra', 'peras-conferencia.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('45', 'Pimientos Rojos', 2.45, 'kg', 65, 20, 2, 2, 'kg', 'Huerta Natural', '8410001000459', '2024-03-19', 'Pimientos rojos asar', 'pimientos-rojos.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('46', 'Patatas', 0.65, 'kg', 180, 60, 2, 2, 'kg', 'Tubérculos Frescos', '8410001000466', '2024-04-10', 'Patatas gallegas extra', 'patatas.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('47', 'Filetes de Ternera', 19.5, 'kg', 30, 10, 3, 3, 'kg', 'Carnes Premium', '8410001000473', '2024-03-13', 'Filetes de ternera añojo', 'filetes-ternera.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('48', 'Costillas de Cerdo', 8.95, 'kg', 42, 15, 3, 3, 'kg', 'Cárnicas Selectas', '8410001000480', '2024-03-14', 'Costillas de cerdo ibérico', 'costillas-cerdo.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('49', 'Alitas de Pollo', 4.25, 'kg', 58, 20, 4, 3, 'kg', 'Avícola Express', '8410001000497', '2024-03-16', 'Alitas de pollo para barbacoa', 'alitas-pollo.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('50', 'Codornices', 14.2, 'kg', 16, 6, 4, 3, 'kg', 'Aves de Caza', '8410001000503', '2024-03-12', 'Codornices limpias listas para cocinar', 'codornices.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('4cb6', 'qw', 1, 'unidad', 1, 2, 2, 1, 'unidad', 'Sin marca', '8410001805098', '2024-12-31', '', 'producto-generico.jpg', 1);
INSERT INTO `productos` (`id`, `nombre`, `precio`, `precioUnitario`, `stock`, `stockMinimo`, `categoriaId`, `proveedorId`, `unidadMedida`, `marca`, `codigoBarras`, `fechaCaducidad`, `descripcion`, `imagen`, `activo`) VALUES ('6fe9', 'gamba', 3, 'unidad', 45, 40, 6, 4, 'unidad', 'Sin marca', '8410001957936', '2024-12-31', '', 'producto-generico.jpg', 1);
COMMIT;