<?php
/**
 * Generador de páginas de error HTML estilizadas
 * Devuelve HTML completo con estilos inline para errores HTTP
 */

function renderErrorPage($code, $title, $message, $details = null) {
    $icons = [
        400 => '⚠️',
        401 => '🔒',
        403 => '🚫',
        404 => '🔍',
        500 => '⚙️',
        503 => '🛠️'
    ];
    
    $icon = isset($icons[$code]) ? $icons[$code] : '❌';
    
    $detailsHtml = '';
    if ($details && $_SERVER['REMOTE_ADDR'] === '127.0.0.1') {
        // Solo mostrar detalles en localhost por seguridad
        $detailsHtml = "<div style='margin-top: 20px; padding: 15px; background: #f7fafc; border-left: 3px solid #cbd5e0; border-radius: 4px; font-size: 13px; color: #4a5568; font-family: monospace; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto; word-wrap: break-word;'>
            <strong>Detalles técnicos (solo visible en desarrollo):</strong><br>
            " . htmlspecialchars($details) . "
        </div>";
    }
    
    $html = <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error {$code} - Smart Economato</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .error-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 50px 40px;
            text-align: center;
            max-width: 500px;
            width: 100%;
            animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .error-icon {
            font-size: 80px;
            margin-bottom: 20px;
            animation: bounce 2s infinite;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        .error-code {
            font-size: 48px;
            font-weight: 800;
            color: #c53030;
            margin-bottom: 10px;
            letter-spacing: -1px;
        }
        
        .error-title {
            font-size: 24px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 15px;
        }
        
        .error-message {
            font-size: 16px;
            color: #718096;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        
        .btn-container {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 12px 30px;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            background: #edf2f7;
            color: #4a5568;
        }
        
        .btn-secondary:hover {
            background: #e2e8f0;
        }
        
        .logo {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
        }
        
        .logo-text {
            font-size: 14px;
            color: #a0aec0;
            font-weight: 500;
        }
        
        .logo-icon {
            color: #b33131;
            margin-right: 5px;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">{$icon}</div>
        <div class="error-code">{$code}</div>
        <h1 class="error-title">{$title}</h1>
        <p class="error-message">{$message}</p>
        
        <div class="btn-container">
            <a href="javascript:history.back()" class="btn btn-secondary">
                <i class="fa-solid fa-arrow-left"></i>
                Volver Atrás
            </a>
            <a href="/smart-economato-main-2/menu.html" class="btn btn-primary">
                <i class="fa-solid fa-home"></i>
                Ir al Inicio
            </a>
        </div>
        
        {$detailsHtml}
        
        <div class="logo">
            <p class="logo-text">
                <i class="fa-solid fa-store logo-icon"></i>
                Smart Economato
            </p>
        </div>
    </div>
</body>
</html>
HTML;
    
    return $html;
}

/**
 * Devuelve mensaje y título apropiados según código HTTP
 */
function getErrorInfo($code) {
    $errors = [
        400 => [
            'title' => 'Solicitud Incorrecta',
            'message' => 'Los datos enviados no son válidos. Por favor, revisa la información e inténtalo de nuevo.'
        ],
        401 => [
            'title' => 'No Autorizado',
            'message' => 'Necesitas iniciar sesión para acceder a este recurso.'
        ],
        403 => [
            'title' => 'Acceso Prohibido',
            'message' => 'No tienes permisos para acceder a esta página o recurso.'
        ],
        404 => [
            'title' => 'Página No Encontrada',
            'message' => 'La página que buscas no existe o ha sido movida.'
        ],
        500 => [
            'title' => 'Error Interno del Servidor',
            'message' => 'Algo salió mal en nuestros servidores. Estamos trabajando para solucionarlo.'
        ],
        503 => [
            'title' => 'Servicio No Disponible',
            'message' => 'El servidor está temporalmente fuera de servicio. Por favor, intenta más tarde.'
        ]
    ];
    
    return isset($errors[$code]) ? $errors[$code] : [
        'title' => 'Error',
        'message' => 'Ha ocurrido un error inesperado.'
    ];
}
?>
