<?php
require_once 'config.php';
require_once 'utils/response.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Listar Proveedores
        $result = pg_query($conn, "SELECT * FROM proveedores ORDER BY nombre ASC");
        
        if (!$result) {
            sendError("Error al obtener proveedores", 500, pg_last_error($conn));
        }

        $data = pg_fetch_all($result);
        if (!$data) $data = [];

        echo json_encode(["success" => true, "data" => $data]);
        break;

    case 'POST':
        // Crear Proveedor
        $input = json_decode(file_get_contents("php://input"));
        if (!$input || empty($input->nombre)) {
            sendError("Nombre obligatorio", 400);
        }

        // Limpiar datos
        $nombre = pg_escape_literal($conn, $input->nombre);
        $contacto = isset($input->contacto) ? pg_escape_literal($conn, $input->contacto) : 'NULL';
        $telefono = isset($input->telefono) ? pg_escape_literal($conn, $input->telefono) : 'NULL';
        $email = isset($input->email) ? pg_escape_literal($conn, $input->email) : 'NULL';
        $direccion = isset($input->direccion) ? pg_escape_literal($conn, $input->direccion) : 'NULL';

        $query = "INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) 
                  VALUES ($nombre, $contacto, $telefono, $email, $direccion)";
        
        if (pg_query($conn, $query)) {
            echo json_encode(["success" => true, "message" => "Proveedor creado"]);
        } else {
            sendError("Error al crear: " . pg_last_error($conn), 500);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
pg_close($conn);
?>