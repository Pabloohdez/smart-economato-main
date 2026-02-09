<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Configuración de PostgreSQL (MODO TRANSACTION POOLER)
// CORREGIDO: Puesto aws-1-eu-west-1 según tu captura de pantalla
$db_host = 'aws-1-eu-west-1.pooler.supabase.com';
$db_port = '6543'; 
$db_name = 'postgres';
$db_user = 'postgres.tolmfuusklacewxcvwqj'; 
$db_pass = 'dfbZGsDR0LVppIPZ'; 

require_once dirname(__FILE__) . '/utils/response.php';

try {
    $conn_string = "host=$db_host port=$db_port dbname=$db_name user=$db_user password=$db_pass";
    $conn = pg_connect($conn_string);

    if (!$conn) {
        throw new Exception("No se pudo conectar a PostgreSQL.");
    }
    pg_set_client_encoding($conn, "UTF8");

} catch (Exception $e) {
    sendError("Error de conexión: " . $e->getMessage(), 500);
}
?>