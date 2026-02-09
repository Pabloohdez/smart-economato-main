<?php
require_once 'config.php';
require_once 'utils/response.php';

header('Content-Type: application/json');

// Solo permitimos GET para informes
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError("Método no permitido", 405);
}

try {
    // ==========================================
    // 1. RESUMEN GENERAL (KPIs)
    // ==========================================
    // Usamos COALESCE(..., 0) para que si la tabla está vacía devuelva 0 en vez de null
    $sqlResumen = "SELECT 
        COUNT(*) as total_productos, 
        COALESCE(SUM(stock), 0) as total_items, 
        COALESCE(SUM(precio * stock), 0) as valor_inventario 
        FROM productos 
        WHERE activo = true";

    $resultResumen = pg_query($conn, $sqlResumen);
    
    if (!$resultResumen) {
        throw new Exception("Error en SQL Resumen: " . pg_last_error($conn));
    }
    
    $rowResumen = pg_fetch_assoc($resultResumen);

    // ==========================================
    // 2. ALERTAS DE BAJO STOCK
    // ==========================================
    // Cuenta cuántos productos tienen stock menor o igual al mínimo
    $sqlAlerta = "SELECT COUNT(*) as bajo_stock 
                  FROM productos 
                  WHERE stock <= stockMinimo AND activo = true";
                  
    $resultAlerta = pg_query($conn, $sqlAlerta);
    $rowAlerta = pg_fetch_assoc($resultAlerta);

    // ==========================================
    // 3. STOCK POR CATEGORÍA (Para Gráficas)
    // ==========================================
    $sqlCat = "SELECT 
            c.nombre, 
            COUNT(p.id) as cantidad_productos, 
            COALESCE(SUM(p.stock), 0) as stock_total
            FROM categorias c
            LEFT JOIN productos p ON c.id = p.categoriaId
            GROUP BY c.nombre
            ORDER BY stock_total DESC";

    $resultCat = pg_query($conn, $sqlCat);
    $categoriasData = pg_fetch_all($resultCat);

    // ==========================================
    // 4. CONSTRUIR JSON FINAL
    // ==========================================
    // Importante: PostgreSQL devuelve los números como Strings. 
    // Los forzamos a int/float para que JavaScript no se confunda.
    
    $informe = [
        "resumen" => [
            "total_productos" => (int)$rowResumen['total_productos'],
            "total_items" => (int)$rowResumen['total_items'],
            "valor_inventario" => (float)$rowResumen['valor_inventario'],
            "alertas_bajo_stock" => (int)$rowAlerta['bajo_stock']
        ],
        "categorias" => $categoriasData ? $categoriasData : [] // Si es null, array vacío
    ];

    echo json_encode([
        "success" => true, 
        "data" => $informe
    ]);

} catch (Exception $e) {
    sendError("Error al generar informes: " . $e->getMessage(), 500);
}

// Cerrar conexión
pg_close($conn);
?>