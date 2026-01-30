<?php
/**
 * Script de prueba para generar diferentes códigos de error HTTP
 * Uso: test_error.php?code=404
 */

require_once __DIR__ . '/utils/response.php';

// Obtener código de error de la URL
$errorCode = isset($_GET['code']) ? intval($_GET['code']) : 500;

// Mensajes personalizados para cada prueba
$testMessages = [
    400 => "Datos de prueba inválidos: Este es un ejemplo de error 400",
    401 => "Autenticación fallida: Este es un ejemplo de error 401",
    403 => "Acceso denegado a este recurso: Este es un ejemplo de error 403",
    404 => "Recurso de prueba no encontrado: Este es un ejemplo de error 404",
    500 => "Error interno simulado: Este es un ejemplo de error 500",
    503 => "Servicio temporalmente no disponible: Este es un ejemplo de error 503"
];

$message = isset($testMessages[$errorCode]) 
    ? $testMessages[$errorCode] 
    : "Error de prueba genérico";

// Enviar el error usando la función sendError (que detectará si es HTML o JSON)
sendError($message, $errorCode, "Detalles técnicos: Prueba generada desde test_error.php");
?>
