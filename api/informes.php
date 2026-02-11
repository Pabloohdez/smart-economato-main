<?php
require_once 'config.php';

header('Content-Type: application/json');

// Solo permitimos GET para informes
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError("Método no permitido", 405);
}

$tipo = $_GET['tipo'] ?? 'dashboard';

try {
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
    sendError("Error al generar informes: " . $e->getMessage(), 500);
}

pg_close($conn);

// ==========================================
// GASTOS MENSUALES POR PROFESOR
// ==========================================
function getGastosMensuales($conn) {
    $usuario_id = $_GET['usuario_id'] ?? null;
    $fecha_inicio = $_GET['fecha_inicio'] ?? null;
    $fecha_fin = $_GET['fecha_fin'] ?? null;

    // Query base - gastos por mes y usuario
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
    $paramCount = 1;

    // Filtro por usuario
    if ($usuario_id) {
        $sql .= " AND p.usuario_id = $" . $paramCount++;
        $params[] = $usuario_id;
    }

    // Filtro por fecha inicio
    if ($fecha_inicio) {
        $sql .= " AND p.fecha_creacion >= $" . $paramCount++ . "::date";
        $params[] = $fecha_inicio . '-01';
    }

    // Filtro por fecha fin  
    if ($fecha_fin) {
        $sql .= " AND p.fecha_creacion < ($" . $paramCount++ . "::date + INTERVAL '1 month')";
        $params[] = $fecha_fin . '-01';
    }

    $sql .= " GROUP BY mes, p.usuario_id, nombre_usuario
    ORDER BY mes, nombre_usuario";

    $result = pg_query_params($conn, $sql, $params);
    
    if (!$result) {
        throw new Exception("Error en query gastos mensuales: " . pg_last_error($conn));
    }

    $gastos_por_mes = pg_fetch_all($result) ?: [];

    // Convertir strings a números
    foreach ($gastos_por_mes as &$item) {
        $item['total_mes'] = (float)$item['total_mes'];
        $item['num_pedidos'] = (int)$item['num_pedidos'];
    }

    // Total general del curso
    $sqlTotal = "SELECT COALESCE(SUM(total), 0) as total_curso 
                 FROM pedidos 
                 WHERE estado = 'RECIBIDO'";
    
    if ($usuario_id) {
        $sqlTotal .= " AND usuario_id = $1";
        $resultTotal = pg_query_params($conn, $sqlTotal, [$usuario_id]);
    } else {
        $resultTotal = pg_query($conn, $sqlTotal);
    }
    
    $rowTotal = pg_fetch_assoc($resultTotal);

    echo json_encode([
        "success" => true,
        "data" => [
            "gastos_por_mes" => $gastos_por_mes,
            "total_curso" => (float)$rowTotal['total_curso']
        ]
    ]);
}

// ==========================================
// LISTA DE USUARIOS (PARA FILTRO)
// ==========================================
function getUsuarios($conn) {
    $sql = "SELECT 
        u.id,
        u.username,
        u.nombre || ' ' || COALESCE(u.apellidos, '') as nombre_completo,
        COUNT(p.id) as num_pedidos,
        COALESCE(SUM(p.total), 0) as total_gastado
    FROM usuarios u
    LEFT JOIN pedidos p ON u.id = p.usuario_id AND p.estado = 'RECIBIDO'
    GROUP BY u.id, u.username, nombre_completo
    ORDER BY total_gastado DESC";

    $result = pg_query($conn, $sql);
    
    if (!$result) {
        throw new Exception("Error en query usuarios: " . pg_last_error($conn));
    }

    $usuarios = pg_fetch_all($result) ?: [];

    // Convertir a números
    foreach ($usuarios as &$user) {
        $user['num_pedidos'] = (int)$user['num_pedidos'];
        $user['total_gastado'] = (float)$user['total_gastado'];
    }

    echo json_encode([
        "success" => true,
        "data" => $usuarios
    ]);
}

// ==========================================
// DASHBOARD ORIGINAL
// ==========================================
function getDashboard($conn) {
    // Gasto mensual (mes actual)
    $sqlGastoMes = "SELECT COALESCE(SUM(total), 0) as gasto_mensual
                    FROM pedidos
                    WHERE estado = 'RECIBIDO'
                    AND EXTRACT(YEAR FROM fecha_creacion) = EXTRACT(YEAR FROM CURRENT_DATE)
                    AND EXTRACT(MONTH FROM fecha_creacion) = EXTRACT(MONTH FROM CURRENT_DATE)";
    
    $resultGasto = pg_query($conn, $sqlGastoMes);
    $rowGasto = pg_fetch_assoc($resultGasto);

    // Alertas de stock
    $sqlAlerta = "SELECT COUNT(*) as alertas_stock
                  FROM productos
                  WHERE stock <= stockMinimo AND activo = true";
    
    $resultAlerta = pg_query($conn, $sqlAlerta);
    $rowAlerta = pg_fetch_assoc($resultAlerta);

    // Top productos distribuidos (últimos 30 días)
    $sqlTop = "SELECT 
        p.nombre,
        SUM(m.cantidad) as total_salida
    FROM movimientos m
    JOIN productos p ON m.producto_id = p.id
    WHERE m.tipo = 'SALIDA'
    AND m.fecha >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY p.nombre
    ORDER BY total_salida DESC
    LIMIT 5";

    $resultTop = pg_query($conn, $sqlTop);
    $topProductos = pg_fetch_all($resultTop) ?: [];

    foreach ($topProductos as &$item) {
        $item['total_salida'] = (int)$item['total_salida'];
    }

    // Últimos movimientos
    $sqlMovimientos = "SELECT 
        m.fecha,
        p.nombre as producto,
        m.tipo,
        m.cantidad,
        u.nombre || ' ' || COALESCE(u.apellidos, '') as usuario_nombre
    FROM movimientos m
    JOIN productos p ON m.producto_id = p.id
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    ORDER BY m.fecha DESC
    LIMIT 10";

    $resultMov = pg_query($conn, $sqlMovimientos);
    $ultimos_movimientos = pg_fetch_all($resultMov) ?: [];

    foreach ($ultimos_movimientos as &$mov) {
        $mov['cantidad'] = (int)$mov['cantidad'];
    }

    echo json_encode([
        "success" => true,
        "data" => [
            "gasto_mensual" => (float)$rowGasto['gasto_mensual'],
            "alertas_stock" => (int)$rowAlerta['alertas_stock'],
            "top_productos" => $topProductos,
            "ultimos_movimientos" => $ultimos_movimientos
        ]
    ]);
}
?>
