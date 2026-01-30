<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// Configuración de la base de datos
$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'smart_economato';

// Incluir utilidades de respuesta para manejar errores uniformemente
// Usamos dirname(__FILE__) para asegurar que la ruta sea relativa a este archivo
require_once dirname(__FILE__) . '/utils/response.php';

// Habilitar reporte estricto de mysqli para usar try-catch
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
    $conn->set_charset("utf8");
} catch (mysqli_sql_exception $e) {
    // Si falla la conexión, devolvemos un JSON válido con error 500
    // No mostramos el error real en producción por seguridad, pero aquí lo incluimos para debug si es necesario
    sendError("Error crítico: No se pudo conectar a la base de datos.", 500, $e->getMessage());
}
?>
