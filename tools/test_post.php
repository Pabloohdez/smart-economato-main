<?php
require_once 'api/config.php';

$payload = [
    'proveedorId' => '2',
    'total' => 25.299999999999997,
    'usuarioId' => 'admin1',
    'items' => [
        [
            'producto_id' => 'prod-test-123',
            'cantidad' => 10,
            'precio' => 2.53,
            'nombre' => 'Test Product'
        ]
    ]
];

// We need a dummy product if it doesn't exist to avoid detail insert failure if FK exists
// But for now let's just run and see what pg_last_error says

$_SERVER['REQUEST_METHOD'] = 'POST';
$input_raw = json_encode($payload);

// We can catch the output by mocking php://input
// Since we can't easily mock php://input in a running script, 
// I'll just manually run the POST logic from pedidos.php in this script.

$conn = pg_connect("host=$db_host port=$db_port dbname=$db_name user=$db_user password=$db_pass");

function clean_local($conn, $var) {
    return is_null($var) ? 'NULL' : pg_escape_literal($conn, $var);
}

$input = json_decode($input_raw);
$provId = clean_local($conn, $input->proveedorId);
$total = (float)($input->total ?? 0);
$estado = clean_local($conn, 'PENDIENTE');
$userIdValue = $input->usuarioId; // Simulated fixed logic
$userId = clean_local($conn, $userIdValue);

$query = "INSERT INTO pedidos (proveedor_id, usuario_id, estado, total) 
          VALUES ($provId, $userId, $estado, $total) RETURNING id";

echo "QUERY 1: $query\n";
$result = pg_query($conn, $query);
if (!$result) {
    echo "ERROR 1: " . pg_last_error($conn) . "\n";
} else {
    $row = pg_fetch_assoc($result);
    $pedidoId = $row['id'];
    echo "SUCCESS 1: Pedido ID $pedidoId\n";
}
?>
