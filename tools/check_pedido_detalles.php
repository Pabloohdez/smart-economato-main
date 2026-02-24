<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
require_once 'api/config.php';
$table = 'pedido_detalles';
$query = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '$table'";
$res = pg_query($conn, $query);
while($row = pg_fetch_assoc($res)) {
    echo $row['column_name'] . " (" . $row['data_type'] . ")\n";
}
?>
