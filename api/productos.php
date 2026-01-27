<?php
require_once 'config.php';

header("Content-Type: application/json");

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
        $productos = [];
        
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                // Reconstruir la estructura anidada que espera el frontend
                $row['categoria'] = [
                    'id' => $row['categoriaId'],
                    'nombre' => $row['categoria_nombre']
                ];
                $row['proveedor'] = [
                    'id' => $row['proveedorId'],
                    'nombre' => $row['proveedor_nombre']
                ];
                // Tipos de datos correctos
                $row['precio'] = (float)$row['precio'];
                $row['stock'] = (int)$row['stock'];
                $row['stockMinimo'] = (int)$row['stockMinimo'];
                $row['activo'] = (bool)$row['activo'];
                
                unset($row['categoria_nombre']);
                unset($row['proveedor_nombre']);
                
                $productos[] = $row;
            }
        }
        echo json_encode($productos);
        break;

    case 'POST':
        // Crear producto
        $data = json_decode(file_get_contents("php://input"));
        
        // Generar un ID simple si no viene (aunque db.json usaba strings, MySQL puede manejarlo)
        // Intentaremos usar el ID recibido o generar uno random hex
        $id = isset($data->id) ? $data->id : substr(md5(uniqid(rand(), true)), 0, 8);
        
        $nombre = $conn->real_escape_string($data->nombre);
        $precio = $data->precio;
        $precioUnitario = $conn->real_escape_string($data->precioUnitario);
        $stock = $data->stock;
        $stockMinimo = $data->stockMinimo;
        $categoriaId = $data->categoriaId;
        $proveedorId = $data->proveedorId;
        $unidadMedida = $conn->real_escape_string($data->unidadMedida);
        $marca = $conn->real_escape_string($data->marca);
        $codigoBarras = $conn->real_escape_string($data->codigoBarras);
        $fechaCaducidad = $data->fechaCaducidad; // Asumimos formato YYYY-MM-DD correcto
        $descripcion = $conn->real_escape_string($data->descripcion);
        $imagen = $conn->real_escape_string($data->imagen);
        $activo = isset($data->activo) && $data->activo ? 1 : 0;

        $sql = "INSERT INTO productos (id, nombre, precio, precioUnitario, stock, stockMinimo, categoriaId, proveedorId, unidadMedida, marca, codigoBarras, fechaCaducidad, descripcion, imagen, activo)
                VALUES ('$id', '$nombre', $precio, '$precioUnitario', $stock, $stockMinimo, $categoriaId, $proveedorId, '$unidadMedida', '$marca', '$codigoBarras', '$fechaCaducidad', '$descripcion', '$imagen', $activo)";

        if ($conn->query($sql) === TRUE) {
            $data->id = $id;
            echo json_encode($data);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Error al crear producto: " . $conn->error]);
        }
        break;

    case 'PUT':
        // Actualizar producto
        // Obtener ID de la URL
        // La URL viene como /api/productos.php?id=123 o via path info si configurado .htaccess
        // Asumimos que podemos obtener el ID via query param
        $id = isset($_GET['id']) ? $_GET['id'] : null;
        
        // Si no está en query param, intentar parsear REQUEST_URI para /api/productos.php/ID
        if (!$id) {
            $path_parts = explode('/', trim($_SERVER['REQUEST_URI'], '/'));
            $end = end($path_parts);
            // Si el último segmento no es 'productos.php' ni está vacío, asumimos que es el ID
            if ($end !== 'productos.php' && $end !== '') {
                $id = $end;
            }
        }
        
        if (!$id) {
            http_response_code(400);
            echo json_encode(["error" => "ID no proporcionado"]);
            exit;
        }

        $data = json_decode(file_get_contents("php://input"));
        
        $nombre = $conn->real_escape_string($data->nombre);
        $precio = $data->precio;
        $precioUnitario = $conn->real_escape_string($data->precioUnitario);
        $stock = $data->stock;
        $stockMinimo = $data->stockMinimo;
        $categoriaId = $data->categoriaId;
        $proveedorId = $data->proveedorId;
        $unidadMedida = $conn->real_escape_string($data->unidadMedida);
        $marca = $conn->real_escape_string($data->marca);
        $codigoBarras = $conn->real_escape_string($data->codigoBarras);
        $fechaCaducidad = $data->fechaCaducidad;
        $descripcion = $conn->real_escape_string($data->descripcion);
        $imagen = $conn->real_escape_string($data->imagen);
        $activo = isset($data->activo) && $data->activo ? 1 : 0;

        $sql = "UPDATE productos SET 
                nombre='$nombre', precio=$precio, precioUnitario='$precioUnitario', 
                stock=$stock, stockMinimo=$stockMinimo, categoriaId=$categoriaId, 
                proveedorId=$proveedorId, unidadMedida='$unidadMedida', marca='$marca', 
                codigoBarras='$codigoBarras', fechaCaducidad='$fechaCaducidad', 
                descripcion='$descripcion', imagen='$imagen', activo=$activo 
                WHERE id='$id'";

        if ($conn->query($sql) === TRUE) {
            echo json_encode($data);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Error al actualizar producto: " . $conn->error]);
        }
        break;
}
$conn->close();
?>
