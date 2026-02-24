<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/utils/response.php';
require_once __DIR__ . '/utils/auth.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Verificar que sea una petición AJAX
requireAjax();

$method = $_SERVER['REQUEST_METHOD'];

try {
    // Conexión a la base de datos usando las variables de config.php
    $conn = pg_connect("host=$db_host port=$db_port dbname=$db_name user=$db_user password=$db_pass");
    
    if (!$conn) {
        throw new Exception("Error de conexión a la base de datos");
    }

    // Verificar permisos de administrador para lectura de auditoría
    if ($method === 'GET') {
        $usuarioActual = isset($_GET['usuario_actual']) ? $_GET['usuario_actual'] : null;
        requireAdmin($conn, $usuarioActual);
    }

    switch ($method) {
        case 'GET':
            obtenerAuditoria($conn);
            break;
        
        case 'POST':
            registrarAuditoria($conn);
            break;
        
        default:
            sendError("Método no permitido", 405);
            break;
    }

    pg_close($conn);

} catch (Exception $e) {
    error_log("Error en auditoria.php: " . $e->getMessage());
    sendError("Error del servidor: " . $e->getMessage(), 500);
}

/**
 * Obtener registros de auditoría con filtros opcionales
 */
function obtenerAuditoria($conn) {
    // Parámetros de filtrado
    $usuario = isset($_GET['usuario']) ? pg_escape_string($conn, $_GET['usuario']) : null;
    $accion = isset($_GET['accion']) ? pg_escape_string($conn, $_GET['accion']) : null;
    $fechaDesde = isset($_GET['fecha_desde']) ? pg_escape_string($conn, $_GET['fecha_desde']) : null;
    $fechaHasta = isset($_GET['fecha_hasta']) ? pg_escape_string($conn, $_GET['fecha_hasta']) : null;
    $limite = isset($_GET['limite']) ? intval($_GET['limite']) : 100;
    $offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

    // Construir query con filtros
    $where = [];
    if ($usuario) {
        $where[] = "usuario_id = '$usuario'";
    }
    if ($accion) {
        $where[] = "accion = '$accion'";
    }
    if ($fechaDesde) {
        $where[] = "fecha >= '$fechaDesde'";
    }
    if ($fechaHasta) {
        $where[] = "fecha <= '$fechaHasta 23:59:59'";
    }

    $whereClause = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';

    $query = "
        SELECT 
            id,
            usuario_id,
            usuario_nombre,
            accion,
            entidad,
            entidad_id,
            detalles,
            fecha,
            ip_address
        FROM auditoria
        $whereClause
        ORDER BY fecha DESC
        LIMIT $limite OFFSET $offset
    ";

    $result = pg_query($conn, $query);

    if (!$result) {
        throw new Exception("Error al consultar auditoría: " . pg_last_error($conn));
    }

    $registros = [];
    while ($row = pg_fetch_assoc($result)) {
        // Decodificar JSON de detalles
        if ($row['detalles']) {
            $row['detalles'] = json_decode($row['detalles'], true);
        }
        $registros[] = $row;
    }

    // Obtener total de registros (para paginación)
    $total = 0;
    $countQuery = "SELECT COUNT(*) as total FROM auditoria $whereClause";
    $countResult = pg_query($conn, $countQuery);
    if ($countResult) {
        $total = pg_fetch_assoc($countResult)['total'];
    }

    sendResponse([
        'registros' => $registros,
        'total' => intval($total),
        'limite' => $limite,
        'offset' => $offset
    ]);
}

/**
 * Registrar una nueva entrada de auditoría
 */
function registrarAuditoria($conn) {
    $input = json_decode(file_get_contents('php://input'), true);

    // Validar campos requeridos
    if (!isset($input['usuario_id']) || !isset($input['accion']) || !isset($input['entidad'])) {
        http_response_code(400);
        sendError("Faltan campos requeridos: usuario_id, accion, entidad");
        return;
    }

    $usuario_id = pg_escape_string($conn, $input['usuario_id']);
    $usuario_nombre = isset($input['usuario_nombre']) ? pg_escape_string($conn, $input['usuario_nombre']) : null;
    $accion = pg_escape_string($conn, $input['accion']);
    $entidad = pg_escape_string($conn, $input['entidad']);
    $entidad_id = isset($input['entidad_id']) ? intval($input['entidad_id']) : null;
    $detalles = isset($input['detalles']) ? json_encode($input['detalles']) : null;
    $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;

    // Escapar JSON para PostgreSQL
    if ($detalles) {
        $detalles = pg_escape_string($conn, $detalles);
    }

    $query = "
        INSERT INTO auditoria (
            usuario_id, 
            usuario_nombre, 
            accion, 
            entidad, 
            entidad_id, 
            detalles, 
            ip_address
        ) VALUES (
            '$usuario_id',
            " . ($usuario_nombre ? "'$usuario_nombre'" : "NULL") . ",
            '$accion',
            '$entidad',
            " . ($entidad_id ? $entidad_id : "NULL") . ",
            " . ($detalles ? "'$detalles'" : "NULL") . ",
            " . ($ip_address ? "'$ip_address'" : "NULL") . "
        )
        RETURNING id, fecha
    ";

    $result = pg_query($conn, $query);

    if (!$result) {
        throw new Exception("Error al registrar auditoría: " . pg_last_error($conn));
    }

    $registro = pg_fetch_assoc($result);

    sendResponse([
        'id' => intval($registro['id']),
        'fecha' => $registro['fecha'],
        'mensaje' => 'Registro de auditoría creado exitosamente'
    ]);
}
