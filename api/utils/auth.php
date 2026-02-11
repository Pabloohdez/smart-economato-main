<?php
/**
 * Utilidad de autenticación y control de acceso
 * Verifica roles de usuario para funciones administrativas
 */

/**
 * Verifica si un usuario tiene el rol requerido
 * Si la columna 'role' no existe o hay error, retorna true (acceso permisivo)
 */
function verificarRol($conn, $usuarioId, $rolRequerido = 'admin') {
    if (!$usuarioId) return false;
    
    $usuarioId = pg_escape_string($conn, $usuarioId);
    
    // Intentar buscar por id O por username
    $result = @pg_query($conn, "SELECT role FROM usuarios WHERE id = '$usuarioId' OR username = '$usuarioId' LIMIT 1");
    
    // Si la query falla (ej: columna 'role' no existe), permitir acceso
    if (!$result) {
        error_log("RBAC Warning: No se pudo verificar rol para '$usuarioId'. Permitiendo acceso.");
        return true;
    }
    
    // Si no se encontró el usuario
    if (pg_num_rows($result) === 0) {
        error_log("RBAC Warning: Usuario '$usuarioId' no encontrado. Denegando acceso.");
        return false;
    }
    
    $usuario = pg_fetch_assoc($result);
    $rolActual = $usuario['role'] ?? null;
    
    // Si el campo role es NULL o vacío, permitir acceso (columna existe pero sin valor)
    if ($rolActual === null || $rolActual === '') {
        error_log("RBAC Warning: Usuario '$usuarioId' no tiene rol asignado. Permitiendo acceso temporalmente.");
        return true;
    }
    
    return $rolActual === $rolRequerido;
}

/**
 * Requiere rol de administrador o termina con error 403
 */
function requireAdmin($conn, $usuarioId) {
    if (!verificarRol($conn, $usuarioId, 'admin')) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Acceso denegado: se requieren permisos de administrador',
            'hint' => "Ejecuta en Supabase: UPDATE usuarios SET role = 'admin' WHERE username = '" . pg_escape_string($conn, $usuarioId ?? '') . "';"
        ]);
        exit;
    }
}

/**
 * Obtiene el rol de un usuario
 */
function obtenerRol($conn, $usuarioId) {
    if (!$usuarioId) return null;
    
    $usuarioId = pg_escape_string($conn, $usuarioId);
    $result = @pg_query($conn, "SELECT role FROM usuarios WHERE id = '$usuarioId' OR username = '$usuarioId' LIMIT 1");
    
    if (!$result || pg_num_rows($result) === 0) {
        return null;
    }
    
    $usuario = pg_fetch_assoc($result);
    return $usuario['role'] ?? null;
}
