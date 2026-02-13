<?php
require_once 'api/config.php';

header('Content-Type: text/plain');

$sql = "
CREATE TABLE IF NOT EXISTS rendimientos (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    ingrediente TEXT NOT NULL,
    peso_bruto DECIMAL(10,3) NOT NULL,
    peso_neto DECIMAL(10,3) NOT NULL,
    desperdicio DECIMAL(10,3) NOT NULL,
    rendimiento DECIMAL(5,2) NOT NULL,
    merma DECIMAL(5,2) NOT NULL,
    observaciones TEXT,
    usuario_id INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
";

$result = pg_query($conn, $sql);

if ($result) {
    echo "✅ Tabla 'rendimientos' creada o verificada correctamente.";
} else {
    echo "❌ Error creando tabla: " . pg_last_error($conn);
}

pg_close($conn);
?>
