<?php
require_once 'api/config.php';

$tables = ['usuarios', 'pedidos', 'pedido_detalles'];
foreach ($tables as $table) {
    echo "\nTABLE: $table\n";
    $sql = "SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '$table' 
            ORDER BY ordinal_position";
    $result = pg_query($conn, $sql);
    while ($row = pg_fetch_assoc($result)) {
        echo "- " . $row['column_name'] . ": " . $row['data_type'] . "\n";
    }
}
?>
