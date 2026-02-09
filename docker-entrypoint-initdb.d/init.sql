-- 1. Limpieza inicial (opcional, para evitar conflictos)
DROP TABLE IF EXISTS movimientos CASCADE;
DROP TABLE IF EXISTS detalles_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 2. Tabla USUARIOS
CREATE TABLE usuarios (
    id VARCHAR(50) PRIMARY KEY, -- El proyecto usa IDs de texto (ej: 'c8d2')
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    nombre VARCHAR(100),
    apellidos VARCHAR(100),
    email VARCHAR(100),
    telefono VARCHAR(20)
);

-- 3. Tabla PROVEEDORES
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY, -- Serial es el auto_increment de Postgres
    nombre VARCHAR(100) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT
);

-- 4. Tabla CATEGORIAS
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

-- 5. Tabla PRODUCTOS
-- Nota: Adaptado de MySQL (TINYINT -> BOOLEAN, DECIMAL -> NUMERIC)
CREATE TABLE productos (
    id VARCHAR(50) PRIMARY KEY, -- El proyecto usa IDs de texto para productos
    nombre VARCHAR(100) NOT NULL,
    precio NUMERIC(10,2) NOT NULL,
    precioUnitario VARCHAR(20), -- En el código original esto parece ser texto (ej: 'kg', 'unidad')
    stock INTEGER DEFAULT 0,
    stockMinimo INTEGER DEFAULT 0,
    categoriaId INTEGER,
    proveedorId INTEGER,
    unidadMedida VARCHAR(20),
    marca VARCHAR(50),
    codigoBarras VARCHAR(50),
    fechaCaducidad DATE,
    descripcion TEXT,
    imagen VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    
    -- Claves foráneas
    CONSTRAINT fk_productos_categorias FOREIGN KEY (categoriaId) REFERENCES categorias (id),
    CONSTRAINT fk_productos_proveedores FOREIGN KEY (proveedorId) REFERENCES proveedores (id)
);

-- 6. Tabla PEDIDOS (De la migración V2)
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    proveedor_id INTEGER NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion TIMESTAMP DEFAULT NULL,
    -- En Postgres usamos CHECK para emular ENUM
    estado VARCHAR(20) CHECK (estado IN ('PENDIENTE','RECIBIDO','CANCELADO','INCOMPLETO')) DEFAULT 'PENDIENTE',
    total NUMERIC(10,2) DEFAULT 0.00,
    usuario_id VARCHAR(50) NOT NULL,
    
    CONSTRAINT fk_pedidos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id) ON DELETE CASCADE,
    CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);

-- 7. Tabla DETALLES_PEDIDO
CREATE TABLE detalles_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL,
    producto_id VARCHAR(50) NOT NULL,
    cantidad INTEGER NOT NULL,
    cantidad_recibida INTEGER DEFAULT 0,
    precio_unitario NUMERIC(10,2) NOT NULL,
    
    CONSTRAINT fk_det_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
    CONSTRAINT fk_det_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE
);

-- 8. Tabla MOVIMIENTOS
CREATE TABLE movimientos (
    id SERIAL PRIMARY KEY,
    producto_id VARCHAR(50) NOT NULL,
    usuario_id VARCHAR(50),
    tipo VARCHAR(20) CHECK (tipo IN ('ENTRADA','SALIDA','AJUSTE')) NOT NULL,
    cantidad INTEGER NOT NULL,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    motivo VARCHAR(255),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_mov_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
    CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
);