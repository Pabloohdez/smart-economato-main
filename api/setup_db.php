<?php
require_once 'config.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Forzar borrado para corregir el tipo de dato mal creado
pg_query($conn, "DROP TABLE IF EXISTS pedido_detalles CASCADE");

$sql = "
CREATE TABLE pedido_detalles (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id VARCHAR(255) REFERENCES productos(id),
    cantidad NUMERIC(10,2) NOT NULL,
    precio_unitario NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
";

$res = pg_query($conn, $sql);

if ($res) {
    echo "Tabla pedido_detalles RE-CREADA correctamente.";
} else {
    echo "Error creando tabla: " . pg_last_error($conn);
}
?>
