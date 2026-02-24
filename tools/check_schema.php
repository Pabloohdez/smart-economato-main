<?php
require_once 'api/config.php';

function getTableSchema($conn, $tableName) {
    $sql = "SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '$tableName' 
            ORDER BY ordinal_position";
    $result = pg_query($conn, $sql);
    $schema = [];
    while ($row = pg_fetch_assoc($result)) {
        $schema[] = $row;
    }
    return $schema;
}

$tables = ['usuarios', 'pedidos', 'pedido_detalles', 'productos'];
$report = [];

foreach ($tables as $table) {
    $report[$table] = getTableSchema($conn, $table);
}

header('Content-Type: application/json');
echo json_encode($report, JSON_PRETTY_PRINT);
?>
