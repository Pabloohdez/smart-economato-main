<?php
/**
 * Utilidad para registrar eventos de auditoría
 * Simplifica el registro desde cualquier API
 */

/**
 * Registra un evento de auditoría en la base de datos
 * 
 * @param resource $conn Conexión a PostgreSQL
 * @param string $usuario_id ID del usuario que realiza la acción
 * @param string $usuario_nombre Nombre del usuario (opcional)
 * @param string $accion Tipo de acción (CREAR_PRODUCTO, MODIFICAR_PRODUCTO, etc.)
 * @param string $entidad Tipo de entidad (producto, movimiento, pedido, baja)
 * @param int|null $entidad_id ID de la entidad afectada
 * @param array|null $detalles Información adicional en formato array
 * @return bool True si se registró exitosamente, false en caso contrario
 */
function registrarAuditoria($conn, $usuario_id, $usuario_nombre, $accion, $entidad, $entidad_id = null, $detalles = null) {
    try {
        $usuario_id = pg_escape_string($conn, $usuario_id);
        $usuario_nombre = $usuario_nombre ? pg_escape_string($conn, $usuario_nombre) : null;
        $accion = pg_escape_string($conn, $accion);
        $entidad = pg_escape_string($conn, $entidad);
        $entidad_id = $entidad_id ? intval($entidad_id) : null;
        $ip_address = $_SERVER['REMOTE_ADDR'] ?? null;
        
        // Convertir detalles a JSON
        $detalles_json = null;
        if ($detalles && is_array($detalles)) {
            $detalles_json = pg_escape_string($conn, json_encode($detalles, JSON_UNESCAPED_UNICODE));
        }

        $query = "
            INSERT INTO auditoria (
                usuario_id, 
                usuario_nombre, 
                accion, 
                entidad, 
                entidad_id, 
                detalles, 
                ip_address
            ) VALUES (
                '$usuario_id',
                " . ($usuario_nombre ? "'$usuario_nombre'" : "NULL") . ",
                '$accion',
                '$entidad',
                " . ($entidad_id ? $entidad_id : "NULL") . ",
                " . ($detalles_json ? "'$detalles_json'" : "NULL") . ",
                " . ($ip_address ? "'$ip_address'" : "NULL") . "
            )
        ";

        $result = pg_query($conn, $query);
        
        if (!$result) {
            error_log("Error al registrar auditoría: " . pg_last_error($conn));
            return false;
        }

        return true;

    } catch (Exception $e) {
        error_log("Excepción al registrar auditoría: " . $e->getMessage());
        return false;
    }
}

/**
 * Constantes para tipos de acciones
 */
define('ACCION_CREAR_PRODUCTO', 'CREAR_PRODUCTO');
define('ACCION_MODIFICAR_PRODUCTO', 'MODIFICAR_PRODUCTO');
define('ACCION_ELIMINAR_PRODUCTO', 'ELIMINAR_PRODUCTO');
define('ACCION_MOVIMIENTO', 'MOVIMIENTO');
define('ACCION_PEDIDO', 'PEDIDO');
define('ACCION_BAJA', 'BAJA');

/**
 * Constantes para tipos de entidades
 */
define('ENTIDAD_PRODUCTO', 'producto');
define('ENTIDAD_MOVIMIENTO', 'movimiento');
define('ENTIDAD_PEDIDO', 'pedido');
define('ENTIDAD_BAJA', 'baja');
