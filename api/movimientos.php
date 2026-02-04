<?php
require_once 'config.php';
require_once 'utils/response.php';

requireAjax();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Obtener historial de movimientos
        // Filtros opcionales: ?producto_id=X, ?tipo=SALIDA, ?limit=50
        
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $where = "1=1";
        $params = [];
        $types = "";
        
        if (isset($_GET['producto_id'])) {
            $where .= " AND m.producto_id = ?";
            $params[] = $_GET['producto_id'];
            $types .= "s";
        }
        
        if (isset($_GET['tipo'])) {
            $where .= " AND m.tipo = ?";
            $params[] = $_GET['tipo'];
            $types .= "s";
        }
        
        $sql = "SELECT m.*, p.nombre as producto_nombre, u.username as usuario_nombre 
                FROM movimientos m 
                JOIN productos p ON m.producto_id = p.id 
                LEFT JOIN usuarios u ON m.usuario_id = u.id 
                WHERE $where 
                ORDER BY m.fecha DESC LIMIT ?";
        
        $params[] = $limit;
        $types .= "i";
        
        $stmt = $conn->prepare($sql);
        if ($params) {
            $stmt->bind_param($types, ...$params);
        }
        
        $stmt->execute();
        $result = $stmt->get_result();
        
        $movimientos = [];
        while ($row = $result->fetch_assoc()) {
            $movimientos[] = $row;
        }
        
        sendResponse($movimientos);
        break;

    case 'POST':
        // Registrar movimiento (ENTRADA o SALIDA)
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->items) || !is_array($data->items)) {
            sendError("No hay items para procesar", 400);
        }
        
        $tipo = isset($data->tipo) && in_array($data->tipo, ['ENTRADA', 'SALIDA']) ? $data->tipo : 'SALIDA';
        
        $conn->begin_transaction();
        
        try {
            $stmtGetStock = $conn->prepare("SELECT stock FROM productos WHERE id = ?");
            
            // Query dinámica según tipo
            if ($tipo === 'SALIDA') {
                 $stmtUpdateStock = $conn->prepare("UPDATE productos SET stock = stock - ? WHERE id = ?");
            } else {
                 $stmtUpdateStock = $conn->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?");
            }

            $stmtMov = $conn->prepare("INSERT INTO movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
            
            $errores = [];
            
            foreach ($data->items as $item) {
                // 1. Verificar existencia y stock actual
                $stmtGetStock->bind_param("s", $item->producto_id);
                $stmtGetStock->execute();
                $res = $stmtGetStock->get_result();
                if ($res->num_rows === 0) {
                    throw new Exception("Producto {$item->producto_id} no existe");
                }
                
                $stockActual = $res->fetch_assoc()['stock'];
                
                // Validación solo para SALIDA
                if ($tipo === 'SALIDA' && $stockActual < $item->cantidad) {
                    throw new Exception("Stock insuficiente para {$item->producto_id}. Disponible: $stockActual");
                }
                
                // Calcular nuevo stock
                $stockNuevo = ($tipo === 'SALIDA') ? ($stockActual - $item->cantidad) : ($stockActual + $item->cantidad);
                
                // 2. Actualizar Stock
                $stmtUpdateStock->bind_param("is", $item->cantidad, $item->producto_id);
                $stmtUpdateStock->execute();
                
                // 3. Registrar Movimiento
                $motivo = isset($data->motivo) ? $data->motivo : ($tipo === 'SALIDA' ? "Distribución General" : "Recepción Manual");
                $userId = isset($data->usuario_id) ? $data->usuario_id : "1";
                
                $stmtMov->bind_param("siiiSs", $item->producto_id, $tipo, $item->cantidad, $stockActual, $stockNuevo, $motivo, $userId);
                $stmtMov->execute();
            }
            
            $conn->commit();
            sendResponse(["message" => "Movimientos registrados correctamente"]);
            
        } catch (Exception $e) {
            $conn->rollback();
            sendError("Error: " . $e->getMessage(), 400);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
?>
