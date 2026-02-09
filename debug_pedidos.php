<?php
// Script de depuración simple para verificar pedidos en la base de datos
header('Content-Type: text/html; charset=utf-8');

$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'smart_economato';

try {
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
    $conn->set_charset("utf8");
    
    echo "<h1>🔍 Debug: Pedidos en la Base de Datos</h1>";
    
    // 1. Verificar si la tabla existe
    $result = $conn->query("SHOW TABLES LIKE 'pedidos'");
    if ($result->num_rows === 0) {
        echo "<p style='color: red;'>❌ La tabla 'pedidos' NO EXISTE</p>";
        echo "<p>Necesitas crear las tablas de la base de datos.</p>";
        exit;
    }
    
    echo "<p style='color: green;'>✅ La tabla 'pedidos' existe</p>";
    
    // 2. Contar pedidos
    $result = $conn->query("SELECT COUNT(*) as total FROM pedidos");
    $total = $result->fetch_assoc()['total'];
    echo "<p><strong>Total de pedidos:</strong> $total</p>";
    
    // 3. Mostrar todos los pedidos
    $result = $conn->query("
        SELECT p.*, pr.nombre as proveedor_nombre 
        FROM pedidos p
        JOIN proveedores pr ON p.proveedor_id = pr.id
        ORDER BY p.fecha_creacion DESC
        LIMIT 10
    ");
    
    if ($result->num_rows > 0) {
        echo "<table border='1' cellpadding='10' style='border-collapse: collapse;'>";
        echo "<tr>
                <th>ID</th>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Fecha Creación</th>
                <th>Fecha Recepción</th>
              </tr>";
        
        while ($row = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td>{$row['id']}</td>";
            echo "<td>{$row['proveedor_nombre']}</td>";
            echo "<td><strong>{$row['estado']}</strong></td>";
            echo "<td>{$row['total']} €</td>";
            echo "<td>{$row['fecha_creacion']}</td>";
            echo "<td>" . ($row['fecha_recepcion'] ?? '-') . "</td>";
            echo "</tr>";
        }
        echo "</table>";
        
        // Mostrar detalles del primer pedido
        $result2 = $conn->query("SELECT * FROM pedidos LIMIT 1");
        if ($result2->num_rows > 0) {
            $pedido = $result2->fetch_assoc();
            $pedido_id = $pedido['id'];
            
            echo "<h2>Detalles del Pedido #{$pedido_id}</h2>";
            
            $result3 = $conn->query("
                SELECT dp.*, prod.nombre as producto_nombre
                FROM detalles_pedido dp
                JOIN productos prod ON dp.producto_id = prod.id
                WHERE dp.pedido_id = $pedido_id
            ");
            
            if ($result3->num_rows > 0) {
                echo "<table border='1' cellpadding='10' style='border-collapse: collapse;'>";
                echo "<tr>
                        <th>Producto</th>
                        <th>Cantidad Pedida</th>
                        <th>Precio Unitario</th>
                        <th>Cantidad Recibida</th>
                      </tr>";
                
                while ($detalle = $result3->fetch_assoc()) {
                    echo "<tr>";
                    echo "<td>{$detalle['producto_nombre']}</td>";
                    echo "<td>{$detalle['cantidad']}</td>";
                    echo "<td>{$detalle['precio_unitario']} €</td>";
                    echo "<td>" . ($detalle['cantidad_recibida'] ?? 0) . "</td>";
                    echo "</tr>";
                }
                echo "</table>";
            }
        }
    } else {
        echo "<p><strong>No hay pedidos en la base de datos.</strong></p>";
        echo "<p>Tip: Crea un pedido desde el módulo de Pedidos primero.</p>";
    }
    
    $conn->close();
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error de conexión: " . $e->getMessage() . "</p>";
}
?>
