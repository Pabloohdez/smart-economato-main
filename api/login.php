<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = file_get_contents("php://input");
    $data = json_decode($input);

    if (!$data || !isset($data->username) || !isset($data->password)) {
        sendError("Faltan datos", 400);
        exit;
    }

    // --- CAMBIO IMPORTANTE PARA PUERTO 6543 ---
    // Como el Transaction Pooler no soporta "Prepare", limpiamos las variables manualmente
    $user_safe = pg_escape_literal($conn, $data->username);
    $pass_safe = pg_escape_literal($conn, $data->password);

    // Consulta directa (sin $1 y $2)
    $query = "SELECT * FROM usuarios WHERE username = $user_safe AND password = $pass_safe";
    
    $result = pg_query($conn, $query);

    if (!$result) {
        sendError("Error en SQL: " . pg_last_error($conn), 500);
        exit;
    }

    if (pg_num_rows($result) > 0) {
        $user = pg_fetch_assoc($result);
        unset($user['password']); // Quitamos la contraseña
        
        echo json_encode([
            "success" => true,
            "data" => $user
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            "success" => false,
            "error" => ["message" => "Usuario o contraseña incorrectos"]
        ]);
    }
    pg_free_result($result);

} else {
    sendError("Método no permitido", 405);
}
pg_close($conn);
?>