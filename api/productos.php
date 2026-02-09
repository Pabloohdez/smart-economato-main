<?php
require_once 'config.php';
require_once 'utils/response.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

function clean($conn, $var) {
    return is_null($var) ? 'NULL' : pg_escape_literal($conn, $var);
}

switch ($method) {
    case 'GET':
        // ==========================================
        // 1. LISTAR PRODUCTOS
        // ==========================================
        // TRUCO: Usamos AS "Nombre" para recuperar las mayúsculas (CamelCase)
        // que PostgreSQL pone en minúsculas por defecto.
        $sql = "SELECT 
                p.id, 
                p.nombre, 
                p.precio, 
                p.stock, 
                p.activo, 
                p.imagen, 
                p.descripcion, 
                p.marca,
                -- Alias para corregir nombres de columnas
                p.preciounitario as \"precioUnitario\",
                p.stockminimo as \"stockMinimo\",
                p.categoriaid as \"categoriaId\",
                p.proveedorid as \"proveedorId\",
                p.unidadmedida as \"unidadMedida\",
                p.codigobarras as \"codigoBarras\",
                p.fechacaducidad as \"fechaCaducidad\",
                -- Joins
                c.nombre as categoria_nombre, 
                pr.nombre as proveedor_nombre 
                FROM productos p 
                LEFT JOIN categorias c ON p.categoriaid = c.id 
                LEFT JOIN proveedores pr ON p.proveedorid = pr.id
                ORDER BY p.nombre ASC";
        
        $result = pg_query($conn, $sql);
        
        if (!$result) {
            sendError("Error al consultar productos", 500, pg_last_error($conn));
        }
        
        $productos = [];
        
        while($row = pg_fetch_assoc($result)) {
            // Reconstruir objetos anidados para el frontend
            $row['categoria'] = [
                'id' => $row['categoriaId'], // Ahora sí funciona gracias al alias
                'nombre' => $row['categoria_nombre']
            ];
            $row['proveedor'] = [
                'id' => $row['proveedorId'],
                'nombre' => $row['proveedor_nombre']
            ];
            
            // Casteo de tipos para evitar errores de JS
            $row['precio'] = (float)$row['precio'];
            $row['stock'] = (int)$row['stock'];
            $row['stockMinimo'] = (int)$row['stockMinimo'];
            
            // Postgres devuelve 't' o 'f' para booleanos. Lo convertimos a true/false real.
            $activoVal = $row['activo'];
            $row['activo'] = ($activoVal === 't' || $activoVal === true || $activoVal === 1 || $activoVal === '1');
            
            // Limpieza de campos auxiliares
            unset($row['categoria_nombre']);
            unset($row['proveedor_nombre']);
            
            $productos[] = $row;
        }
        
        echo json_encode([
            "success" => true,
            "data" => $productos
        ]);
        break;

    case 'POST':
        // ==========================================
        // 2. CREAR PRODUCTO
        // ==========================================
        $input = file_get_contents("php://input");
        $data = json_decode($input);
        
        if (!$data || empty($data->nombre) || !isset($data->precio)) {
            sendError("Datos incompletos", 400);
        }
        
        // Generar ID
        $id = isset($data->id) ? $data->id : substr(md5(uniqid(rand(), true)), 0, 8);
        
        // Convertir booleano a string para Postgres ('true'/'false')
        $activo = (isset($data->activo) && $data->activo) ? 'true' : 'false';

        // Limpiar datos
        $id_safe = clean($conn, $id);
        $nombre_safe = clean($conn, $data->nombre);
        $precio_safe = (float)$data->precio;
        $precioUnit_safe = clean($conn, $data->precioUnitario ?? null);
        $stock_safe = (int)($data->stock ?? 0);
        $stockMin_safe = (int)($data->stockMinimo ?? 0);
        $catId_safe = (int)($data->categoriaId ?? 0);
        $provId_safe = (int)($data->proveedorId ?? 0);
        $unidad_safe = clean($conn, $data->unidadMedida ?? null);
        $marca_safe = clean($conn, $data->marca ?? null);
        $codigo_safe = clean($conn, $data->codigoBarras ?? null);
        $desc_safe = clean($conn, $data->descripcion ?? null);
        $img_safe = clean($conn, $data->imagen ?? null);
        
        $fecha_safe = (!empty($data->fechaCaducidad)) ? clean($conn, $data->fechaCaducidad) : 'NULL';

        // INSERT (Postgres es listo y reconoce las columnas aunque no pongamos mayúsculas en el SQL)
        $query = "INSERT INTO productos (
            id, nombre, precio, preciounitario, stock, stockminimo, 
            categoriaid, proveedorid, unidadmedida, marca, codigobarras, 
            fechacaducidad, descripcion, imagen, activo
        ) VALUES (
            $id_safe, $nombre_safe, $precio_safe, $precioUnit_safe, $stock_safe, $stockMin_safe,
            $catId_safe, $provId_safe, $unidad_safe, $marca_safe, $codigo_safe,
            $fecha_safe, $desc_safe, $img_safe, $activo
        )";

        if (pg_query($conn, $query)) {
            $data->id = $id;
            echo json_encode(["success" => true, "data" => $data]);
        } else {
            sendError("Error al crear: " . pg_last_error($conn), 500);
        }
        break;

    case 'PUT':
        // ==========================================
        // 3. ACTUALIZAR PRODUCTO
        // ==========================================
        $id = $_GET['id'] ?? null;
        if (!$id) sendError("Falta ID", 400);

        $input = file_get_contents("php://input");
        $data = json_decode($input);
        
        $activo = (isset($data->activo) && $data->activo) ? 'true' : 'false';

        $id_safe = clean($conn, $id);
        $nombre_safe = clean($conn, $data->nombre);
        $precio_safe = (float)$data->precio;
        $precioUnit_safe = clean($conn, $data->precioUnitario ?? null);
        $stock_safe = (int)($data->stock ?? 0);
        $stockMin_safe = (int)($data->stockMinimo ?? 0);
        $catId_safe = (int)($data->categoriaId ?? 0);
        $provId_safe = (int)($data->proveedorId ?? 0);
        $unidad_safe = clean($conn, $data->unidadMedida ?? null);
        $marca_safe = clean($conn, $data->marca ?? null);
        $codigo_safe = clean($conn, $data->codigoBarras ?? null);
        $desc_safe = clean($conn, $data->descripcion ?? null);
        $img_safe = clean($conn, $data->imagen ?? null);
        $fecha_safe = (!empty($data->fechaCaducidad)) ? clean($conn, $data->fechaCaducidad) : 'NULL';

        $query = "UPDATE productos SET 
            nombre = $nombre_safe, 
            precio = $precio_safe, 
            preciounitario = $precioUnit_safe, 
            stock = $stock_safe, 
            stockminimo = $stockMin_safe, 
            categoriaid = $catId_safe, 
            proveedorid = $provId_safe, 
            unidadmedida = $unidad_safe, 
            marca = $marca_safe, 
            codigobarras = $codigo_safe, 
            fechacaducidad = $fecha_safe, 
            descripcion = $desc_safe, 
            imagen = $img_safe, 
            activo = $activo 
            WHERE id = $id_safe";

        if (pg_query($conn, $query)) {
            echo json_encode(["success" => true]);
        } else {
            sendError("Error update: " . pg_last_error($conn), 500);
        }
        break;

    default:
        sendError("Método no permitido", 405);
}
pg_close($conn);
?>