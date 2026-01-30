<?php

function sendResponse($data = null, $code = 200) {
    http_response_code($code);
    header("Content-Type: application/json; charset=UTF-8");
    
    $response = [
        "success" => true,
        "data" => $data
    ];
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function sendError($message, $code = 400, $details = null) {
    http_response_code($code);
    
    // Detectar si la petición espera HTML (desde navegador) o JSON (desde AJAX)
    $acceptsHtml = false;
    if (isset($_SERVER['HTTP_ACCEPT'])) {
        $acceptsHtml = strpos($_SERVER['HTTP_ACCEPT'], 'text/html') !== false;
    }
    
    // Si la petición es desde navegador, devolver página HTML bonita
    if ($acceptsHtml && !isAjaxRequest()) {
        require_once __DIR__ . '/error_page.php';
        $errorInfo = getErrorInfo($code);
        echo renderErrorPage($code, $errorInfo['title'], $message, $details);
        exit;
    }
    
    // Para peticiones AJAX, devolver JSON como siempre
    header("Content-Type: application/json; charset=UTF-8");
    
    $response = [
        "success" => false,
        "error" => [
            "message" => $message,
            "code" => $code
        ]
    ];
    
    if ($details) {
        $response["error"]["details"] = $details;
    }
    
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Detecta si la petición es AJAX
 */
function isAjaxRequest() {
    return !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 
           strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
}

/**
 * Requiere que la petición sea AJAX, de lo contrario bloquea con error 403
 * Úsala al inicio de endpoints que solo deben ser accesibles desde JavaScript
 */
function requireAjax() {
    // Permitir peticiones AJAX
    if (isAjaxRequest()) {
        return true;
    }
    
    // Permitir peticiones que explícitamente aceptan JSON (para herramientas como Postman)
    if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        return true;
    }
    
    // Bloquear acceso directo desde navegador
    sendError(
        "Este endpoint solo acepta peticiones AJAX desde la aplicación.", 
        403,
        "Acceso directo bloqueado. Use la aplicación web o envíe X-Requested-With: XMLHttpRequest"
    );
}
?>
