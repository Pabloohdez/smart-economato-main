<?php
require_once 'config.php';

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

    case 'PUT':
        // Actualizar Proveedor
        $id = $_GET['id'] ?? null;
        if (!$id) {
            sendError("ID obligatorio para actualizar", 400);
        }

        $input = json_decode(file_get_contents("php://input"));
        if (!$input || empty($input->nombre)) {
            sendError("Nombre obligatorio", 400);
        }

        $nombre = pg_escape_literal($conn, $input->nombre);
        $contacto = isset($input->contacto) ? pg_escape_literal($conn, $input->contacto) : 'NULL';
        $telefono = isset($input->telefono) ? pg_escape_literal($conn, $input->telefono) : 'NULL';
        $email = isset($input->email) ? pg_escape_literal($conn, $input->email) : 'NULL';
        // direccion is not in the form but good to keep if schema has it, though HTML doesn't send it.
        // The original POST had it, so I'll keep it.
        $direccion = isset($input->direccion) ? pg_escape_literal($conn, $input->direccion) : 'NULL';

        $query = "UPDATE proveedores SET 
                  nombre = $nombre, 
                  contacto = $contacto, 
                  telefono = $telefono, 
                  email = $email, 
                  direccion = $direccion
                  WHERE id = $id";
        
        if (pg_query($conn, $query)) {
            echo json_encode(["success" => true, "message" => "Proveedor actualizado"]);
        } else {
            sendError("Error al actualizar: " . pg_last_error($conn), 500);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
pg_close($conn);
?>