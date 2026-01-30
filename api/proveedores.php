<?php
require_once 'config.php';
require_once 'utils/response.php';

// Proteger endpoint: Solo permitir acceso desde AJAX
requireAjax();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $result = $conn->query("SELECT * FROM proveedores");
        
        if (!$result) {
            sendError("Error al consultar proveedores", 500, $conn->error);
        }
        
        $proveedores = [];
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $row['id'] = (int)$row['id'];
                $proveedores[] = $row;
            }
        }
        sendResponse($proveedores);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->nombre)) {
            sendError("El nombre del proveedor es obligatorio", 400);
        }
        
        $id = isset($data->id) ? $data->id : rand(1000, 9999); 
        
        $stmt = $conn->prepare("INSERT INTO proveedores (id, nombre, contacto, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$stmt) {
             sendError("Error prepare", 500, $conn->error);
        }
        
        $stmt->bind_param("isssss", $id, $data->nombre, $data->contacto, $data->telefono, $data->email, $data->direccion);
        
        if ($stmt->execute()) {
             $data->id = $id;
             sendResponse($data, 201);
        } else {
             sendError("Error al crear proveedor", 500, $stmt->error);
        }
        $stmt->close();
        break;
        
    default:
        sendError("Método no permitido", 405);
        break;
}
$conn->close();
?>
