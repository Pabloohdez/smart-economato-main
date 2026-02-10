<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

function clean($conn, $var) {
    return is_null($var) ? 'NULL' : pg_escape_literal($conn, $var);
}

switch ($method) {
    case 'GET':
        // Obtener parámetros de filtro
        $mes = isset($_GET['mes']) ? (int)$_GET['mes'] : date('n');
        $anio = isset($_GET['anio']) ? (int)$_GET['anio'] : date('Y');
        
        // Query con filtro de mes y año
        $sql = "SELECT 
                b.id,
                b.fecha_baja as \"fechaBaja\",
                b.tipo_baja as \"tipoBaja\",
                b.cantidad,
                b.motivo,
                b.usuario_id as \"usuarioId\",
                b.producto_id as \"productoId\",
                p.nombre as producto_nombre,
                p.precio as producto_precio,
                u.username as usuario_nombre
            FROM bajas b
            LEFT JOIN productos p ON b.producto_id = p.id
            LEFT JOIN usuarios u ON b.usuario_id = u.id";
        
        // Agregar filtro WHERE si se especifica mes/año
        if (isset($_GET['mes']) || isset($_GET['anio'])) {
            $sql .= " WHERE EXTRACT(MONTH FROM b.fecha_baja) = $mes 
                      AND EXTRACT(YEAR FROM b.fecha_baja) = $anio";
        }
        
        $sql .= " ORDER BY b.fecha_baja DESC LIMIT 100";
        
        $result = pg_query($conn, $sql);
        
        if (!$result) {
            sendError("Error al consultar bajas", 500, pg_last_error($conn));
        }
        
        $bajas = [];
        
        while ($row = pg_fetch_assoc($result)) {
            // Castear tipos
            $row['cantidad'] = (int)$row['cantidad'];
            $row['producto_precio'] = (float)$row['producto_precio'];
            
            $bajas[] = $row;
        }
        
        echo json_encode([
            "success" => true,
            "data" => $bajas
        ]);
        break;
    
    case 'POST':
        // Crear nueva baja
        $input = json_decode(file_get_contents("php://input"));
        
        if (!$input || empty($input->productoId) || empty($input->cantidad) || empty($input->tipoBaja)) {
            sendError("Faltan datos obligatorios (productoId, cantidad, tipoBaja)", 400);
        }
        
        $prodId = clean($conn, $input->productoId);
        $cantidad = (int)$input->cantidad;
        $tipoBaja = clean($conn, $input->tipoBaja);
        $motivo = clean($conn, $input->motivo ?? 'Sin especificar');
        $usuarioId = clean($conn, $input->usuarioId ?? 'admin1');
        $fecha = isset($input->fechaBaja) ? clean($conn, $input->fechaBaja) : 'NOW()';
        
        // Generar ID para la baja
        $bajaId = substr(md5(uniqid(rand(), true)), 0, 8);
        $bajaIdSafe = clean($conn, $bajaId);
        
        // Verificar que el producto existe y obtener su stock
        $checkProd = pg_query($conn, "SELECT stock, precio FROM productos WHERE id = $prodId");
        
        if (!$checkProd || pg_num_rows($checkProd) === 0) {
            sendError("Producto no encontrado", 404);
        }
        
        $producto = pg_fetch_assoc($checkProd);
        $stockActual = (int)$producto['stock'];
        $precio = (float)$producto['precio'];
        
        if ($stockActual < $cantidad) {
            sendError("Stock insuficiente (disponible: $stockActual, solicitado: $cantidad)", 400);
        }
        
        // Insertar la baja
        $queryBaja = "INSERT INTO bajas 
                      (id, producto_id, usuario_id, tipo_baja, cantidad, motivo, fecha_baja) 
                      VALUES 
                      ($bajaIdSafe, $prodId, $usuarioId, $tipoBaja, $cantidad, $motivo, $fecha)";
        
        if (pg_query($conn, $queryBaja)) {
            // Actualizar stock del producto
            $nuevoStock = $stockActual - $cantidad;
            $queryUpdate = "UPDATE productos SET stock = $nuevoStock WHERE id = $prodId";
            pg_query($conn, $queryUpdate);
            
            echo json_encode([
                "success" => true,
                "message" => "Baja registrada correctamente",
                "data" => [
                    "id" => $bajaId,
                    "stockNuevo" => $nuevoStock
                ]
            ]);
        } else {
            sendError("Error al registrar baja: " . pg_last_error($conn), 500);
        }
        break;
    
    default:
        sendError("Método no permitido", 405);
}

pg_close($conn);
?>
