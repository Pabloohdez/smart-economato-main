<?php
require_once 'config.php';
require_once 'utils/response.php';

requireAjax();

// Estadísticas simples para el dashboard
$tipo = isset($_GET['tipo']) ? $_GET['tipo'] : 'dashboard';

switch ($tipo) {
    case 'dashboard':
        // 1. Total Gastado este mes
        $sqlGasto = "SELECT SUM(total) as total FROM pedidos WHERE estado = 'RECIBIDO' AND MONTH(fecha_creacion) = MONTH(CURRENT_DATE())";
        $gastoMes = $conn->query($sqlGasto)->fetch_assoc()['total'] ?? 0;
        
        // 2. Top 5 Productos Distribuidos (Salidas)
        $sqlTop = "SELECT p.nombre, SUM(m.cantidad) as total_salida 
                   FROM movimientos m 
                   JOIN productos p ON m.producto_id = p.id 
                   WHERE m.tipo = 'SALIDA' 
                   GROUP BY m.producto_id 
                   ORDER BY total_salida DESC 
                   LIMIT 5";
        $resTop = $conn->query($sqlTop);
        $topProductos = [];
        while($row = $resTop->fetch_assoc()) $topProductos[] = $row;
        
        // 3. Stock Bajo (Alertas)
        $sqlBajo = "SELECT COUNT(*) as cuenta FROM productos WHERE stock <= stockMinimo AND activo = 1";
        $alertas = $conn->query($sqlBajo)->fetch_assoc()['cuenta'];
        
        // 4. Últimos Movimientos
        $sqlMov = "SELECT m.*, p.nombre as producto FROM movimientos m JOIN productos p ON m.producto_id = p.id ORDER BY fecha DESC LIMIT 5";
        $resMov = $conn->query($sqlMov);
        $ultimosMovimientos = [];
        while($row = $resMov->fetch_assoc()) $ultimosMovimientos[] = $row;
        
        sendResponse([
            'gasto_mensual' => (float)$gastoMes,
            'top_productos' => $topProductos,
            'alertas_stock' => (int)$alertas,
            'ultimos_movimientos' => $ultimosMovimientos
        ]);
        break;
        
    default:
        sendError("Tipo de informe no válido", 400);
}
?>
