<?php
require_once 'config.php';

header('Content-Type: application/json');

// Evitar que warnings de PHP rompan el JSON
ini_set('display_errors', 0);
error_reporting(E_ALL);

$method = $_SERVER['REQUEST_METHOD'];

function clean($conn, $var) {
    return is_null($var) ? 'NULL' : pg_escape_literal($conn, $var);
}

switch ($method) {
    case 'GET':
        // Obtener historial
        // Filtros opcionales
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        
        $sql = "SELECT * FROM rendimientos ORDER BY fecha DESC, created_at DESC LIMIT $limit";
        $result = pg_query($conn, $sql);
        
        if (!$result) {
            sendError("Error al consultar: " . pg_last_error($conn), 500);
        }
        
        $data = [];
        while ($row = pg_fetch_assoc($result)) {
            // Convertir tipos numéricos
            $row['pesoBruto'] = (float)$row['peso_bruto'];
            $row['pesoNeto'] = (float)$row['peso_neto'];
            $row['desperdicio'] = (float)$row['desperdicio'];
            $row['rendimiento'] = (float)$row['rendimiento'];
            $row['merma'] = (float)$row['merma'];
            $data[] = $row;
        }
        
        echo json_encode(["success" => true, "data" => $data]);
        break;

    case 'POST':
        // Guardar nuevo análisis (puede ser uno o varios)
        $rawInput = file_get_contents("php://input");
        $input = json_decode($rawInput);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            sendError("JSON inválido", 400);
        }
        
        // Si es un array, es inserción múltiple
        $items = is_array($input) ? $input : [$input];
        
        if (empty($items)) {
            sendError("No hay datos para guardar", 400);
        }
        
        $exitos = 0;
        $errores = 0;
        
        foreach ($items as $item) {
            $ingrediente = clean($conn, $item->ingrediente ?? '');
            $pesoBruto = (float)($item->pesoBruto ?? 0);
            $pesoNeto = (float)($item->pesoNeto ?? 0);
            $desperdicio = (float)($item->desperdicio ?? 0);
            $rendimiento = (float)($item->rendimiento ?? 0);
            $merma = (float)($item->merma ?? 0);
            $observaciones = clean($conn, $item->observaciones ?? null);
            $fecha = clean($conn, $item->fecha ?? date('Y-m-d'));
            
            // Usuario ID podría venir del token/sesión, por ahora NULL o 1 simple
            $usuarioId = 1; 
            
            $query = "INSERT INTO rendimientos 
                      (ingrediente, peso_bruto, peso_neto, desperdicio, rendimiento, merma, observaciones, fecha, usuario_id) 
                      VALUES 
                      ($ingrediente, $pesoBruto, $pesoNeto, $desperdicio, $rendimiento, $merma, $observaciones, $fecha, $usuarioId)";
            
            if (pg_query($conn, $query)) {
                $exitos++;
            } else {
                $errores++;
                error_log("Error insertando rendimiento: " . pg_last_error($conn));
            }
        }
        
        if ($exitos > 0 && $errores === 0) {
            echo json_encode(["success" => true, "message" => "$exitos registros guardados"]);
        } elseif ($exitos > 0) {
            echo json_encode(["success" => true, "message" => "Guardados $exitos, fallaron $errores"]);
        } else {
            sendError("Error al guardar registros", 500);
        }
        break;
        
    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if (!$id) sendError("Falta ID", 400);
        
        // Validar ID numérico
        if (!is_numeric($id)) sendError("ID inválido", 400);
        
        $idSafe = clean($conn, $id);
        $sql = "DELETE FROM rendimientos WHERE id = $idSafe";
        
        if (pg_query($conn, $sql)) {
            echo json_encode(["success" => true, "message" => "Registro eliminado"]);
        } else {
            sendError("Error eliminando registro: " . pg_last_error($conn), 500);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}

pg_close($conn);
?>
