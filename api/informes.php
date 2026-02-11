<?php
// api/informes.php
require_once 'config.php';

header('Content-Type: application/json; charset=utf-8');

// Habilitar CORS si es necesario durante desarrollo
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(["success" => false, "message" => "Método no permitido"]);
    exit;
}

$tipo = $_GET['tipo'] ?? 'dashboard';

try {
    // Verificar conexión
    if (!$conn) {
        throw new Exception("No hay conexión a la base de datos");
    }

    switch ($tipo) {
        case 'gastos_mensuales':
            getGastosMensuales($conn);
            break;
        case 'usuarios':
            getUsuarios($conn);
            break;
        case 'dashboard':
        default:
            getDashboard($conn);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}

if ($conn) pg_close($conn);

// ==========================================
// FUNCIONES
// ==========================================

function getGastosMensuales($conn) {
    $usuario_id = isset($_GET['usuario_id']) && $_GET['usuario_id'] !== '' ? $_GET['usuario_id'] : null;
    $fecha_inicio = isset($_GET['fecha_inicio']) && $_GET['fecha_inicio'] !== '' ? $_GET['fecha_inicio'] : null;
    $fecha_fin = isset($_GET['fecha_fin']) && $_GET['fecha_fin'] !== '' ? $_GET['fecha_fin'] : null;

    // 1. Obtener gastos desglosados
    $sql = "SELECT 
                TO_CHAR(p.fecha_creacion, 'YYYY-MM') as mes,
                p.usuario_id,
                u.nombre || ' ' || COALESCE(u.apellidos, '') as nombre_usuario,
                SUM(p.total) as total_mes,
                COUNT(p.id) as num_pedidos
            FROM pedidos p
            JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.estado = 'RECIBIDO'";

    $params = [];
    $paramIndex = 1;

    if ($usuario_id) {
        $sql .= " AND p.usuario_id = $" . $paramIndex++;
        $params[] = $usuario_id;
    }

    if ($fecha_inicio) {
        // Formato esperado input type="month": YYYY-MM
        $sql .= " AND p.fecha_creacion >= $" . $paramIndex++ . "::date";
        $params[] = $fecha_inicio . '-01';
    }

    if ($fecha_fin) {
        // Sumamos 1 mes al filtro final para incluir todo ese mes
        $sql .= " AND p.fecha_creacion < ($" . $paramIndex++ . "::date + INTERVAL '1 month')";
        $params[] = $fecha_fin . '-01';
    }

    $sql .= " GROUP BY 1, 2, 3 ORDER BY 1 ASC, 3 ASC";

    $result = pg_query_params($conn, $sql, $params);
    if (!$result) throw new Exception(pg_last_error($conn));
    
    $gastos_por_mes = pg_fetch_all($result) ?: [];

    // 2. Obtener total global del curso (aplicando los mismos filtros si es necesario)
    // Normalmente 'Total del curso' implica 'todo el año académico', 
    // pero aquí aplicaremos el filtro de usuario si existe.
    
    $sqlTotal = "SELECT COALESCE(SUM(total), 0) as total_curso FROM pedidos WHERE estado = 'RECIBIDO'";
    $paramsTotal = [];
    
    if ($usuario_id) {
        $sqlTotal .= " AND usuario_id = $1";
        $paramsTotal[] = $usuario_id;
    }
    
    $resTotal = pg_query_params($conn, $sqlTotal, $paramsTotal);
    $rowTotal = pg_fetch_assoc($resTotal);

    echo json_encode([
        "success" => true,
        "data" => [
            "gastos_por_mes" => $gastos_por_mes,
            "total_curso" => (float)$rowTotal['total_curso']
        ]
    ]);
}

function getUsuarios($conn) {
    // Obtener usuarios que han hecho pedidos
    $sql = "SELECT 
                u.id,
                u.nombre || ' ' || COALESCE(u.apellidos, '') as nombre_completo,
                COALESCE(SUM(p.total), 0) as total_gastado
            FROM usuarios u
            LEFT JOIN pedidos p ON u.id = p.usuario_id AND p.estado = 'RECIBIDO'
            WHERE u.rol != 'ADMIN' 
            GROUP BY u.id, u.nombre, u.apellidos
            ORDER BY u.nombre ASC";

    $result = pg_query($conn, $sql);
    if (!$result) throw new Exception(pg_last_error($conn));

    echo json_encode([
        "success" => true,
        "data" => pg_fetch_all($result) ?: []
    ]);
}

function getDashboard($conn) {
    // 1. Gasto Mes Actual
    $sqlGasto = "SELECT COALESCE(SUM(total), 0) as gasto_mensual 
                 FROM pedidos 
                 WHERE estado = 'RECIBIDO' 
                 AND TO_CHAR(fecha_creacion, 'YYYY-MM') = TO_CHAR(CURRENT_DATE, 'YYYY-MM')";
    $resGasto = pg_query($conn, $sqlGasto);
    $gasto = pg_fetch_result($resGasto, 0, 0);

    // 2. Alertas Stock
    $sqlAlertas = "SELECT COUNT(*) FROM productos WHERE stock <= stock_minimo AND activo = true";
    $resAlertas = pg_query($conn, $sqlAlertas);
    $alertas = pg_fetch_result($resAlertas, 0, 0);

    // 3. Últimos Movimientos
    $sqlMovs = "SELECT m.fecha, p.nombre as producto, m.tipo, m.cantidad, 
                       u.nombre || ' ' || COALESCE(u.apellidos, '') as usuario_nombre
                FROM movimientos m
                JOIN productos p ON m.producto_id = p.id
                LEFT JOIN usuarios u ON m.usuario_id = u.id
                ORDER BY m.fecha DESC LIMIT 10";
    $resMovs = pg_query($conn, $sqlMovs);
    $movimientos = pg_fetch_all($resMovs) ?: [];

    // 4. Top Productos (últimos 30 días)
    $sqlTop = "SELECT p.nombre, SUM(m.cantidad) as total_salida
               FROM movimientos m
               JOIN productos p ON m.producto_id = p.id
               WHERE m.tipo = 'SALIDA' 
               AND m.fecha >= (CURRENT_DATE - INTERVAL '30 days')
               GROUP BY p.nombre
               ORDER BY total_salida DESC LIMIT 5";
    $resTop = pg_query($conn, $sqlTop);
    $top = pg_fetch_all($resTop) ?: [];

    echo json_encode([
        "success" => true,
        "data" => [
            "gasto_mensual" => $gasto,
            "alertas_stock" => $alertas,
            "ultimos_movimientos" => $movimientos,
            "top_productos" => $top
        ]
    ]);
}
?>