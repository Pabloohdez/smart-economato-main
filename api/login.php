<?php
require_once 'config.php';
require_once 'utils/response.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->username) || !isset($data->password)) {
        sendError("Faltan datos (usuario o contraseña)", 400);
    }

    // SENTENCIA PREPARADA para evitar Inyección SQL
    $stmt = $conn->prepare("SELECT * FROM usuarios WHERE username = ? AND password = ?");
    
    if (!$stmt) {
        sendError("Error interno del servidor", 500, $conn->error);
    }

    $stmt->bind_param("ss", $data->username, $data->password);
    
    if (!$stmt->execute()) {
        sendError("Error al ejecutar consulta", 500, $stmt->error);
    }

    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        
        // NO devolver la contraseña en la respuesta
        unset($user['password']);
        
        sendResponse($user);
    } else {
        http_response_code(401);
        sendError("Credenciales incorrectas", 401);
    }
    
    $stmt->close();
} else {
    sendError("Método no permitido", 405);
}

$conn->close();
?>
