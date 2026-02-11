<?php
require_once 'config.php';

header('Content-Type: application/json');

// Evitar que warnings de PHP rompan el JSON en cualquier método
ini_set('display_errors', 0);
error_reporting(E_ALL);

$method = $_SERVER['REQUEST_METHOD'];

function clean($conn, $var) {
    return is_null($var) ? 'NULL' : pg_escape_literal($conn, $var);
}

switch ($method) {
    case 'GET':
        $id = $_GET['id'] ?? null;
        
        if ($id) {
            if (!is_numeric($id)) {
                sendError("ID inválido", 400);
            }
            // GET ONE PEDIDO CON DETALLES
            // GET ONE PEDIDO CON DETALLES
            $id = clean($conn, $id);
            
            // 1. Datos cabecera
            $sqlHead = "SELECT p.*, pr.nombre as proveedor_nombre, u.username as usuario_nombre
                        FROM pedidos p
                        LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
                        LEFT JOIN usuarios u ON p.usuario_id = u.id
                        WHERE p.id = $id";
            $resHead = pg_query($conn, $sqlHead);
            
            if (!$resHead || pg_num_rows($resHead) === 0) {
                sendError("Pedido no encontrado", 404);
            }
            
            $pedido = pg_fetch_assoc($resHead);
            
            // 2. Datos detalles (items)
            $sqlItems = "SELECT pd.*, p.nombre as producto_nombre 
                         FROM pedido_detalles pd
                         LEFT JOIN productos p ON pd.producto_id = p.id
                         WHERE pd.pedido_id = $id";
            $resItems = pg_query($conn, $sqlItems);
            
            $items = [];
            if ($resItems) {
                while($row = pg_fetch_assoc($resItems)) {
                    $items[] = $row;
                }
            } else {
                // Si falla la query de detalles, no romper todo, devolver items vacios o loguear
                // error_log(pg_last_error($conn));
            }
            
            $pedido['items'] = $items;
            
            // Convert keys if needed
            $pedido['proveedorId'] = $pedido['proveedor_id'];
            
            echo json_encode(["success" => true, "data" => $pedido]);
            
        } else {
            // GET ALL LIST (Resumido)
            $sql = "SELECT p.*, 
                           pr.nombre as proveedor_nombre,
                           u.username as usuario_nombre
                    FROM pedidos p
                    LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
                    LEFT JOIN usuarios u ON p.usuario_id = u.id
                    ORDER BY p.fecha_creacion DESC";
            
            $result = pg_query($conn, $sql);
            if (!$result) sendError("Error", 500, pg_last_error($conn));

            $data = [];
            while($row = pg_fetch_assoc($result)) {
                $row['proveedorId'] = $row['proveedor_id'];
                $row['usuarioId'] = $row['usuario_id'];
                $row['fechaCreacion'] = $row['fecha_creacion'];
                $data[] = $row;
            }
            
            echo json_encode(["success" => true, "data" => $data]);
        }
        break;

    case 'POST':
        // Evitar que warnings de PHP rompan el JSON
        ini_set('display_errors', 0);
        error_reporting(E_ALL);

        $rawInput = file_get_contents("php://input");
        $input = json_decode($rawInput);

        if (json_last_error() !== JSON_ERROR_NONE) {
            sendError("JSON inválido recibido: " . json_last_error_msg(), 400);
        }
        
        if (!$input || empty($input->proveedorId)) {
            $debug = print_r($input, true);
            if (!$input) $debug = "RAW: " . $rawInput;
            sendError("Falta proveedor. Recibido: " . $debug, 400);
        }
        
        $provId = clean($conn, $input->proveedorId);
        $total = (float)($input->total ?? 0);
        $estado = clean($conn, 'PENDIENTE');
        
        $userIdReq = $input->usuarioId ?? 1;
        
        $checkUser = pg_query($conn, "SELECT id FROM usuarios WHERE id = " . clean($conn, $userIdReq));
        if (pg_num_rows($checkUser) > 0) {
            $userId = clean($conn, $userIdReq);
        } else {
            $resUser = pg_query($conn, "SELECT id FROM usuarios LIMIT 1");
            if (pg_num_rows($resUser) > 0) {
                $userId = pg_fetch_result($resUser, 0, 0);
            } else {
                pg_query($conn, "INSERT INTO usuarios (username, password, rol) VALUES ('admin', 'admin', 'ADMIN')");
                $resUser = pg_query($conn, "SELECT id FROM usuarios LIMIT 1");
                $userId = pg_fetch_result($resUser, 0, 0);
            }
        }
        $userId = clean($conn, $userId); 

        // Insertar en PEDIDOS
        $query = "INSERT INTO pedidos (proveedor_id, usuario_id, estado, total) 
                  VALUES ($provId, $userId, $estado, $total) RETURNING id";

        $result = @pg_query($conn, $query);

        if ($result) {
            $row = pg_fetch_assoc($result);
            $pedidoId = $row['id'];
            
            // INSERTAR DETALLES (ITEMS)
            if (!empty($input->items) && is_array($input->items)) {
                foreach ($input->items as $item) {
                    $prodId = clean($conn, $item->producto_id);
                    $cant = clean($conn, $item->cantidad);
                    $precio = clean($conn, $item->precio);
                    
                    // Asumiendo tabla pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario)
                    $sqlDet = "INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario) 
                               VALUES ($pedidoId, $prodId, $cant, $precio)";
                    
                    if (!pg_query($conn, $sqlDet)) {
                        // Si falla un detalle, avisar (aunque el pedido cabecera ya se creó)
                        sendError("Error al guardar item detalles: " . pg_last_error($conn), 500);
                    }
                }
            }
            
            echo json_encode(["success" => true, "data" => ["id" => $pedidoId]]);
        } else {
            sendError("Error al crear pedido en BD: " . pg_last_error($conn), 500);
        }
        break;
        
    case 'PUT':
        $id = $_GET['id'] ?? null;
        if (!$id) sendError("Falta ID", 400);
        
        $input = json_decode(file_get_contents("php://input"));
        $accion = $input->accion ?? null;
        $id_safe = clean($conn, $id);

        if ($accion === 'RECIBIR') {
            // Actualizar Stock de productos
            if (!empty($input->items) && is_array($input->items)) {
                foreach ($input->items as $item) {
                    $cant = (float)$item->cantidad_recibida;
                    if ($cant > 0) {
                        // OJO: detalle_id viene del frontend, pero necesitamos producto_id
                        // Podríamos hacer query para sacar producto_id del detalle, 
                        // pero asumiremos que el frontend manda detalle_id correcto o mejor, 
                        // hacemos update directo si el frontend mandase producto_id.
                        // El frontend manda: detalle_id y cantidad_recibida.
                        // Necesitamos saber qué producto es.
                        $detId = clean($conn, $item->detalle_id);
                        $resDet = pg_query($conn, "SELECT producto_id FROM pedido_detalles WHERE id = $detId");
                        if ($resDet && pg_num_rows($resDet) > 0) {
                            $prodId = pg_fetch_result($resDet, 0, 0);
                            // UPDATE STOCK
                            $sqlStock = "UPDATE productos SET stock = stock + $cant WHERE id = '$prodId'"; // ID es varchar ahora
                            pg_query($conn, $sqlStock);
                        }
                    }
                }
            }
            
            $newState = clean($conn, 'RECIBIDO');
            $query = "UPDATE pedidos SET estado = $newState WHERE id = $id_safe";
            
            if (pg_query($conn, $query)) {
                echo json_encode([
                    "success" => true, 
                    "data" => ["message" => "Pedido verificado y stock actualizado"]
                ]);
            } else {
                sendError("Error actualizando pedido: " . pg_last_error($conn), 500);
            }

        } elseif ($accion === 'CANCELAR') {
            $newState = clean($conn, 'CANCELADO');
            $query = "UPDATE pedidos SET estado = $newState WHERE id = $id_safe";
            if (pg_query($conn, $query)) {
                echo json_encode([
                    "success" => true,
                    "data" => ["message" => "Pedido rechazado"]
                ]);
            } else {
                sendError("Error: " . pg_last_error($conn), 500);
            }
        } else {
            // Fallback antiguo o update simple de estado
            $estado = clean($conn, $input->estado ?? 'PENDIENTE'); 
            $query = "UPDATE pedidos SET estado = $estado WHERE id = $id_safe";
            
            if (pg_query($conn, $query)) {
                echo json_encode(["success" => true, "data" => ["message" => "Estado actualizado"]]);
            } else {
                sendError("Error: " . pg_last_error($conn), 500);
            }
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
pg_close($conn);
?>