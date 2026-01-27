<?php
require_once 'config.php';

header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"));

    if (!isset($data->username) || !isset($data->password)) {
        echo json_encode(["error" => "Faltan datos"]);
        exit;
    }

    $username = $conn->real_escape_string($data->username);
    $password = $conn->real_escape_string($data->password);

    // En un entorno real, las contraseñas deberían estar hasheadas.
    // Como venimos de un JSON plano, asumimos que están en texto plano por ahora.
    $sql = "SELECT * FROM usuarios WHERE username = '$username' AND password = '$password'";
    
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        echo json_encode($user);
    } else {
        http_response_code(401);
        echo json_encode(["error" => "Credenciales incorrectas"]);
    }
} else {
    http_response_code(405);
    echo json_encode(["error" => "Método no permitido"]);
}

$conn->close();
?>
