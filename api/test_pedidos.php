<?php
// Simular petición GET id=4
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['id'] = '4';

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Capturar salida
ob_start();
include 'pedidos.php';
$output = ob_get_clean();

echo "--- START OUTPUT ---\n";
echo $output;
echo "\n--- END OUTPUT ---\n";
?>
