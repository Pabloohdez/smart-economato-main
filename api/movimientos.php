<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

function clean($conn, $var) {
    return is_null($var) ? 'NULL' : pg_escape_literal($conn, $var);
}

switch ($method) {
    case 'GET':
        // OJO: Postgres convierte nombres sin comillas a minúsculas. 
        // Usamos alias (AS "...") para que el JSON salga bonito pal frontend.
        $sql = "SELECT 
                    m.id,
                    m.fecha,
                    m.tipo,
                    m.cantidad,
                    m.motivo,
                    m.stock_anterior as \"stockAnterior\",
                    m.stock_nuevo as \"stockNuevo\",
                    p.nombre as producto_nombre,
                    u.username as usuario_nombre
                FROM movimientos m
                LEFT JOIN productos p ON m.producto_id = p.id
                LEFT JOIN usuarios u ON m.usuario_id = u.id
                ORDER BY m.fecha DESC LIMIT 50";
        
        $result = pg_query($conn, $sql);
        if (!$result) sendError("Error al leer movimientos", 500, pg_last_error($conn));

        $data = [];
        while ($row = pg_fetch_assoc($result)) {
            $row['cantidad'] = (int)$row['cantidad'];
            $data[] = $row;
        }

        echo json_encode(["success" => true, "data" => $data]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"));
        
        if (!$input || empty($input->productoId) || empty($input->cantidad)) {
            sendError("Faltan datos (productoId o cantidad)", 400);
        }

        $prodIdRaw = $input->productoId;
        $cantidad = (int)$input->cantidad;
        $tipoRaw = $input->tipo; // 'ENTRADA' o 'SALIDA'
        $motivoRaw = $input->motivo ?? 'Ajuste manual';
        
        // 1. Obtener Stock Actual del producto (Necesario para tu tabla)
        $prodIdClean = clean($conn, $prodIdRaw);
        $resStock = pg_query($conn, "SELECT stock FROM productos WHERE id = $prodIdClean");
        
        if (!$resStock || pg_num_rows($resStock) === 0) {
            sendError("Producto no encontrado", 404);
        }
        
        $rowStock = pg_fetch_assoc($resStock);
        $stockActual = (int)$rowStock['stock'];

        // 2. Calcular Stock Nuevo
        if ($tipoRaw === 'ENTRADA') {
            $stockNuevo = $stockActual + $cantidad;
        } else {
            $stockNuevo = $stockActual - $cantidad;
        }

        // 3. Preparar datos para INSERT
        // IMPORTANTE: Tu tabla pide usuario_id. Usamos 'admin1' por defecto si no viene en el JSON.
        $userIdRaw = isset($input->usuarioId) ? $input->usuarioId : 'admin1'; 
        
        $prodId = clean($conn, $prodIdRaw);
        $userId = clean($conn, $userIdRaw);
        $tipo = clean($conn, $tipoRaw);
        $motivo = clean($conn, $motivoRaw);
        
        // 4. Insertar en MOVIMIENTOS (Usando tus nombres de columna: snake_case)
        $queryMov = "INSERT INTO movimientos 
                    (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo) 
                    VALUES 
                    ($prodId, $userId, $tipo, $cantidad, $stockActual, $stockNuevo, $motivo)";

        if (pg_query($conn, $queryMov)) {
            // 5. Actualizar la tabla PRODUCTOS
            $queryUpd = "UPDATE productos SET stock = $stockNuevo WHERE id = $prodId";
            pg_query($conn, $queryUpd);

            echo json_encode([
                "success" => true, 
                "data" => [
                    "message" => "Movimiento registrado",
                    "stock_nuevo" => $stockNuevo
                ]
            ]);
        } else {
            sendError("Error al registrar: " . pg_last_error($conn), 500);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
pg_close($conn);
?>