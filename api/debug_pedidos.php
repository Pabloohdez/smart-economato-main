<?php
require_once 'config.php';
ini_set('display_errors', 1);

echo "<h1>Debug Pedidos</h1>";

// 1. Check table
$query = "SELECT count(*) FROM information_schema.tables WHERE table_name = 'pedido_detalles'";
$res = pg_query($conn, $query);
$exists = pg_fetch_result($res, 0, 0);
echo "Tabla <b>pedido_detalles</b> existe: " . ($exists ? 'SÍ (Count: '.$exists.')' : 'NO') . "<br>";

if (!$exists) {
    echo "<h3>INTENTANDO CREAR TABLA...</h3>";
    $sqlCreate = "
    CREATE TABLE IF NOT EXISTS pedido_detalles (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id),
        cantidad NUMERIC(10,2) NOT NULL,
        precio_unitario NUMERIC(10,2) NOT NULL
    );";
    if (pg_query($conn, $sqlCreate)) echo "Tabla creada.<br>";
    else echo "Error creando tabla: " . pg_last_error($conn) . "<br>";
}

// 2. Último pedido
$res = pg_query($conn, "SELECT * FROM pedidos ORDER BY id DESC LIMIT 1");
$pedido = pg_fetch_assoc($res);

if ($pedido) {
    echo "<h2>Último Pedido ID: " . $pedido['id'] . "</h2>";
    echo "Fecha: " . $pedido['fecha_creacion'] . "<br>";
    echo "Total: " . $pedido['total'] . "<br>";
    
    // 3. Detalles
    $id = $pedido['id'];
    $sql = "SELECT * FROM pedido_detalles WHERE pedido_id = $id";
    $resItems = pg_query($conn, $sql);
    $num = pg_num_rows($resItems);
    echo "<h3>Items encontrados en BD: " . $num . "</h3>";
    
    if ($num == 0) {
        echo "<p style='color:red'>⚠️ EL PEDIDO NO TIENE ITEMS GUARDADOS.</p>";
    } else {
        while($item = pg_fetch_assoc($resItems)) {
            echo "<div style='border:1px solid #ccc; margin:5px; padding:5px'>";
            print_r($item);
            echo "</div>";
        }
    }
} else {
    echo "No hay pedidos en la tabla 'pedidos'.";
}
?>
