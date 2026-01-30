<?php
require_once 'config.php';
require_once 'utils/response.php';

// Proteger endpoint: Solo permitir acceso desde AJAX
requireAjax();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $result = $conn->query("SELECT * FROM categorias");
        
        if (!$result) {
            sendError("Error al consultar categorías", 500, $conn->error);
        }
        
        $categorias = [];
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $row['id'] = (int)$row['id'];
                $categorias[] = $row;
            }
        }
        sendResponse($categorias);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->nombre)) {
            sendError("El nombre de la categoría es obligatorio", 400);
        }
        
        // ID autoincremental en DB o manual. Asumimos autoincremental o int.
        // Si db original usaba IDs manuales...
        $id = isset($data->id) ? $data->id : rand(1000, 9999); 
        
        $stmt = $conn->prepare("INSERT INTO categorias (id, nombre, descripcion) VALUES (?, ?, ?)");
        if (!$stmt) {
             sendError("Error prepare", 500, $conn->error);
        }
        
        $stmt->bind_param("iss", $id, $data->nombre, $data->descripcion);
        
        if ($stmt->execute()) {
             $data->id = $id;
             sendResponse($data, 201);
        } else {
             sendError("Error al crear categoría", 500, $stmt->error);
        }
        $stmt->close();
        break;
        
    default:
        sendError("Método no permitido", 405);
        break;
}
$conn->close();
?>
