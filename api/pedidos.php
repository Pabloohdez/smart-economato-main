<?php
require_once 'config.php';
require_once 'utils/response.php';

requireAjax();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Listar pedidos. Si trae ?id=X, muestra detalles.
        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            
            // Obtener cabecera
            $stmt = $conn->prepare("
                SELECT p.*, pr.nombre as proveedor_nombre, u.username as usuario_nombre
                FROM pedidos p
                JOIN proveedores pr ON p.proveedor_id = pr.id
                LEFT JOIN usuarios u ON p.usuario_id = u.id
                WHERE p.id = ?
            ");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $pedido = $stmt->get_result()->fetch_assoc();
            
            if (!$pedido) {
                sendError("Pedido no encontrado", 404);
            }
            
            // Obtener detalles
            $stmtDetails = $conn->prepare("
                SELECT dp.*, prod.nombre as producto_nombre 
                FROM detalles_pedido dp
                JOIN productos prod ON dp.producto_id = prod.id
                WHERE dp.pedido_id = ?
            ");
            $stmtDetails->bind_param("i", $id);
            $stmtDetails->execute();
            $resultDetails = $stmtDetails->get_result();
            
            $detalles = [];
            while ($row = $resultDetails->fetch_assoc()) {
                $detalles[] = $row;
            }
            
            $pedido['items'] = $detalles;
            sendResponse($pedido);
            
        } else {
            // Listado general simplificado
            $sql = "SELECT p.*, pr.nombre as proveedor_nombre, 
                    (SELECT COUNT(*) FROM detalles_pedido WHERE pedido_id = p.id) as items_count 
                    FROM pedidos p
                    JOIN proveedores pr ON p.proveedor_id = pr.id
                    ORDER BY p.fecha_creacion DESC LIMIT 50";
            
            $result = $conn->query($sql);
            $pedidos = [];
            while ($row = $result->fetch_assoc()) {
                $pedidos[] = $row;
            }
            sendResponse($pedidos);
        }
        break;

    case 'POST':
        // Crear nuevo pedido
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->proveedor_id) || empty($data->items) || !is_array($data->items)) {
            sendError("Datos inválidos. Se requiere proveedor e items.", 400);
        }
        
        $conn->begin_transaction();
        
        try {
            // 1. Insertar Cabecera
            $stmt = $conn->prepare("INSERT INTO pedidos (proveedor_id, usuario_id, total, estado) VALUES (?, ?, ?, 'PENDIENTE')");
            $userId = isset($data->usuario_id) ? $data->usuario_id : null; // Debería venir de sesión
            $total = 0; // Se calculará
            $stmt->bind_param("isd", $data->proveedor_id, $userId, $total);
            $stmt->execute();
            $pedidoId = $conn->insert_id;
            
            // 2. Insertar Detalles
            $stmtDetail = $conn->prepare("INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)");
            
            $totalCalculado = 0;
            
            foreach ($data->items as $item) {
                $subtotal = $item->cantidad * $item->precio;
                $totalCalculado += $subtotal;
                
                $stmtDetail->bind_param("isid", $pedidoId, $item->producto_id, $item->cantidad, $item->precio);
                $stmtDetail->execute();
            }
            
            // 3. Actualizar Total
            $stmtUpdate = $conn->prepare("UPDATE pedidos SET total = ? WHERE id = ?");
            $stmtUpdate->bind_param("di", $totalCalculado, $pedidoId);
            $stmtUpdate->execute();
            
            $conn->commit();
            sendResponse(["id" => $pedidoId, "message" => "Pedido creado con éxito"], 201);
            
        } catch (Exception $e) {
            $conn->rollback();
            sendError("Error al crear pedido: " . $e->getMessage(), 500);
        }
        break;

    case 'PUT':
        // Acciones sobre pedidos (RECIBIR o CANCELAR)
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        $data = json_decode(file_get_contents("php://input"));
        
        $conn->begin_transaction();
        try {
            // Verificar estado actual
            $stmtCheck = $conn->prepare("SELECT estado FROM pedidos WHERE id = ?");
            $stmtCheck->bind_param("i", $id);
            $stmtCheck->execute();
            $resCheck = $stmtCheck->get_result();
            if ($resCheck->num_rows === 0) throw new Exception("Pedido no encontrado");
            $estadoActual = $resCheck->fetch_assoc()['estado'];
            
            if ($estadoActual === 'RECIBIDO' || $estadoActual === 'CANCELADO') {
                throw new Exception("El pedido ya ha sido procesado (Estado: $estadoActual)");
            }

            // ACCIÓN: CANCELAR (RECHAZAR)
            if ($data->accion === 'CANCELAR') {
                $conn->query("UPDATE pedidos SET estado = 'CANCELADO' WHERE id = $id");
                $conn->commit();
                sendResponse(["message" => "Pedido rechazado/cancelado correctamente"]);
            }
            
            // ACCIÓN: RECIBIR (VERIFICAR)
            elseif ($data->accion === 'RECIBIR') {
                if (empty($data->items) || !is_array($data->items)) {
                    throw new Exception("Se requieren los items verificados");
                }

                // Preparar queries
                $stmtUpdateDetalle = $conn->prepare("UPDATE detalles_pedido SET cantidad_recibida = ? WHERE id = ? AND pedido_id = ?");
                $stmtStock = $conn->prepare("UPDATE productos SET stock = stock + ? WHERE id = ?");
                $stmtMov = $conn->prepare("INSERT INTO movimientos (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id) VALUES (?, 'ENTRADA', ?, ?, ?, ?, ?)");
                $stmtGetStock = $conn->prepare("SELECT stock FROM productos WHERE id = ?");

                $esCompleto = true;
                $hayRecepcion = false;

                foreach ($data->items as $itemRecibido) {
                    // Obtener datos originales del detalle para saber producto y cantidad esperada
                    // Asumimos que $itemRecibido trae { detalle_id, cantidad_recibida }
                    $stmtInfo = $conn->prepare("SELECT producto_id, cantidad, cantidad_recibida as rec_anterior FROM detalles_pedido WHERE id = ?");
                    $stmtInfo->bind_param("i", $itemRecibido->detalle_id);
                    $stmtInfo->execute();
                    $info = $stmtInfo->get_result()->fetch_assoc();
                    
                    if (!$info) continue;

                    $prodId = $info['producto_id'];
                    $cantPedida = $info['cantidad'];
                    $cantNueva = (int)$itemRecibido->cantidad_recibida; // Lo que entra AHORA
                    
                    // Solo procesamos si hay cantidad positiva
                    if ($cantNueva > 0) {
                        $hayRecepcion = true;
                        
                        // 1. Actualizar detalle (acumulativo o reemplazo? Asumimos reemplazo de la sesión actual o flujo único)
                        // Para simplificar V3: El usuario manda el TOTAL recibido real.
                        $stmtUpdateDetalle->bind_param("iii", $cantNueva, $itemRecibido->detalle_id, $id);
                        $stmtUpdateDetalle->execute();
                        
                        // 2. Actualizar Stock
                        $stmtGetStock->bind_param("s", $prodId);
                        $stmtGetStock->execute();
                        $stockActual = $stmtGetStock->get_result()->fetch_assoc()['stock'];
                        $stockFinal = $stockActual + $cantNueva;
                        
                        $stmtStock->bind_param("is", $cantNueva, $prodId);
                        $stmtStock->execute();
                        
                        // 3. Registrar Movimiento
                        $motivo = "Recepción Pedido #$id";
                        $userId = "1"; 
                        $stmtMov->bind_param("siiiss", $prodId, $cantNueva, $stockActual, $stockFinal, $motivo, $userId);
                        $stmtMov->execute();
                    }

                    // Verificar si está completo
                    if ($cantNueva < $cantPedida) {
                        $esCompleto = false;
                    }
                }
                
                // Determinar nuevo estado
                $nuevoEstado = $esCompleto ? 'RECIBIDO' : ($hayRecepcion ? 'INCOMPLETO' : 'PENDIENTE');
                
                $stmtEstado = $conn->prepare("UPDATE pedidos SET estado = ?, fecha_recepcion = NOW() WHERE id = ?");
                $stmtEstado->bind_param("si", $nuevoEstado, $id);
                $stmtEstado->execute();
                
                $conn->commit();
                sendResponse(["message" => "Recepción procesada. Estado: $nuevoEstado"]);
            }
            
        } catch (Exception $e) {
            $conn->rollback();
            sendError("Error al procesar pedido: " . $e->getMessage(), 500);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
?>
