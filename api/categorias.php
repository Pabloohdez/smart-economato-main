<?php
require_once 'config.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Listar Categorías
        $result = pg_query($conn, "SELECT * FROM categorias ORDER BY nombre ASC");
        
        if (!$result) {
            sendError("Error al obtener categorías", 500, pg_last_error($conn));
        }

        $data = pg_fetch_all($result);
        if (!$data) $data = []; // Si no hay datos, array vacío

        echo json_encode(["success" => true, "data" => $data]);
        break;

    case 'POST':
        // Crear Categoría
        $input = json_decode(file_get_contents("php://input"));
        if (!$input || empty($input->nombre)) {
            sendError("Nombre obligatorio", 400);
        }

        $nombre = pg_escape_literal($conn, $input->nombre);
        $desc = isset($input->descripcion) ? pg_escape_literal($conn, $input->descripcion) : 'NULL';

        $query = "INSERT INTO categorias (nombre, descripcion) VALUES ($nombre, $desc)";
        
        if (pg_query($conn, $query)) {
            echo json_encode(["success" => true, "message" => "Categoría creada"]);
        } else {
            sendError("Error al crear: " . pg_last_error($conn), 500);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
pg_close($conn);
?>