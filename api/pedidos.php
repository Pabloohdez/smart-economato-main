<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

function clean($conn, $var) {
    return is_null($var) ? 'NULL' : pg_escape_literal($conn, $var);
}

switch ($method) {
    case 'GET':
        // SELECT con JOIN a proveedores y usuarios
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
            // Convertir tus columnas snake_case a CamelCase si el frontend lo necesita
            $row['proveedorId'] = $row['proveedor_id'];
            $row['usuarioId'] = $row['usuario_id'];
            $row['fechaCreacion'] = $row['fecha_creacion'];
            $data[] = $row;
        }
        
        echo json_encode(["success" => true, "data" => $data]);
        break;

    case 'POST':
        $input = json_decode(file_get_contents("php://input"));
        
        if (empty($input->proveedorId)) {
            sendError("Falta proveedor", 400);
        }
        
        // Mapeo de datos (Frontend CamelCase -> Backend snake_case)
        $provId = clean($conn, $input->proveedorId);
        $total = (float)($input->total ?? 0);
        $estado = clean($conn, 'PENDIENTE');
        
        // ID de usuario obligatorio (Usamos 'admin1' si no hay sesión real implementada en frontend)
        $userId = clean($conn, $input->usuarioId ?? 'admin1'); 

        // Insertar en PEDIDOS
        $query = "INSERT INTO pedidos (proveedor_id, usuario_id, estado, total) 
                  VALUES ($provId, $userId, $estado, $total) RETURNING id";

        $result = pg_query($conn, $query);

        if ($result) {
            $row = pg_fetch_assoc($result);
            echo json_encode(["success" => true, "data" => ["id" => $row['id']]]);
        } else {
            sendError("Error al crear pedido: " . pg_last_error($conn), 500);
        }
        break;
        
    case 'PUT':
        $id = $_GET['id'] ?? null;
        if (!$id) sendError("Falta ID", 400);
        
        $input = json_decode(file_get_contents("php://input"));
        $estado = clean($conn, $input->estado); 
        $id_safe = clean($conn, $id);

        $query = "UPDATE pedidos SET estado = $estado WHERE id = $id_safe";
        
        if (pg_query($conn, $query)) {
            echo json_encode(["success" => true]);
        } else {
            sendError("Error: " . pg_last_error($conn), 500);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
pg_close($conn);
?>