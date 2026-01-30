<?php
require_once 'config.php';
require_once 'utils/response.php';

// Proteger endpoint: Solo permitir acceso desde AJAX
requireAjax();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Obtener productos (con relaciones)
        $sql = "SELECT p.*, 
                c.nombre as categoria_nombre, 
                pr.nombre as proveedor_nombre 
                FROM productos p 
                LEFT JOIN categorias c ON p.categoriaId = c.id 
                LEFT JOIN proveedores pr ON p.proveedorId = pr.id";
        
        $result = $conn->query($sql);
        
        if (!$result) {
            sendError("Error al consultar productos", 500, $conn->error);
        }
        
        $productos = [];
        
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                // Reconstruir estructura anidada
                $row['categoria'] = [
                    'id' => $row['categoriaId'],
                    'nombre' => $row['categoria_nombre']
                ];
                $row['proveedor'] = [
                    'id' => $row['proveedorId'],
                    'nombre' => $row['proveedor_nombre']
                ];
                
                // Casteo de tipos
                $row['precio'] = (float)$row['precio'];
                $row['stock'] = (int)$row['stock'];
                $row['stockMinimo'] = (int)$row['stockMinimo'];
                $row['activo'] = (bool)$row['activo'];
                
                unset($row['categoria_nombre']);
                unset($row['proveedor_nombre']);
                
                $productos[] = $row;
            }
        }
        
        sendResponse($productos);
        break;

    case 'POST':
        // Crear producto
        $data = json_decode(file_get_contents("php://input"));
        
        if (!$data) {
            sendError("Datos inválidos o JSON malformado", 400);
        }
        
        // Validación básica
        if (empty($data->nombre) || !isset($data->precio)) {
            sendError("Nombre y precio son obligatorios", 400);
        }
        
        $id = isset($data->id) ? $data->id : substr(md5(uniqid(rand(), true)), 0, 8);
        $activo = isset($data->activo) && $data->activo ? 1 : 0;
        
        // SENTENCIA PREPARADA
        $stmt = $conn->prepare("INSERT INTO productos (id, nombre, precio, precioUnitario, stock, stockMinimo, categoriaId, proveedorId, unidadMedida, marca, codigoBarras, fechaCaducidad, descripcion, imagen, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        
        if (!$stmt) {
            sendError("Error en la preparación SQL insert", 500, $conn->error);
        }

        // 'sdssiiiissssssi' -> string, double, string, string, int...
        // Nota: Asumimos tipos. precio=double(d), stock=int(i).
        $stmt->bind_param("ssdsiiiissssssi", 
            $id, 
            $data->nombre, 
            $data->precio, 
            $data->precioUnitario, 
            $data->stock, 
            $data->stockMinimo, 
            $data->categoriaId, 
            $data->proveedorId, 
            $data->unidadMedida, 
            $data->marca, 
            $data->codigoBarras, 
            $data->fechaCaducidad, 
            $data->descripcion, 
            $data->imagen, 
            $activo
        );

        if ($stmt->execute()) {
            $data->id = $id;
            sendResponse($data, 201);
        } else {
            sendError("Error al crear producto", 500, $stmt->error);
        }
        $stmt->close();
        break;

    case 'PUT':
        // Actualizar producto
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        
        if (!$id) {
            // Intentar extraer de PATH_INFO o REQUEST_URI si no está en query
            $path_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
            $end = end($path_parts);
            if ($end !== 'productos.php' && $end !== '') {
                $id = $end;
            }
        }
        
        if (!$id) {
            sendError("ID no proporcionado", 400);
        }

        $data = json_decode(file_get_contents("php://input"));
        if (!$data) {
            sendError("Datos inválidos", 400);
        }
        
        $activo = isset($data->activo) && $data->activo ? 1 : 0;

        // SENTENCIA PREPARADA
        $stmt = $conn->prepare("UPDATE productos SET nombre=?, precio=?, precioUnitario=?, stock=?, stockMinimo=?, categoriaId=?, proveedorId=?, unidadMedida=?, marca=?, codigoBarras=?, fechaCaducidad=?, descripcion=?, imagen=?, activo=? WHERE id=?");
        
        if (!$stmt) {
            sendError("Error en la preparación SQL update", 500, $conn->error);
        }

        // parametros + id al final
        $stmt->bind_param("sdsiiiissssssis", 
            $data->nombre, 
            $data->precio, 
            $data->precioUnitario, 
            $data->stock, 
            $data->stockMinimo, 
            $data->categoriaId, 
            $data->proveedorId, 
            $data->unidadMedida, 
            $data->marca, 
            $data->codigoBarras, 
            $data->fechaCaducidad, 
            $data->descripcion, 
            $data->imagen, 
            $activo,
            $id
        );

        if ($stmt->execute()) {
            sendResponse($data);
        } else {
            sendError("Error al actualizar producto", 500, $stmt->error);
        }
        $stmt->close();
        break;
        
    default:
        sendError("Método no permitido", 405);
        break;
}
$conn->close();
?>
