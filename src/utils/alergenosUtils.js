// Utilidades para gestionar alertas de alérgenos
import { showConfirm } from "./notifications.js";

const ICONOS_ALERGENOS = {
    'Lácteos': 'fa-cow',
    'Gluten': 'fa-wheat-awn',
    'Huevos': 'fa-egg',
    'Pescado': 'fa-fish',
    'Crustáceos': 'fa-shrimp',
    'Moluscos': 'fa-circle',
    'Frutos secos': 'fa-seedling',
    'Soja': 'fa-leaf',
    'Sulfitos': 'fa-wine-bottle',
    'Apio': 'fa-carrot',
    'Mostaza': 'fa-pepper-hot',
    'Sésamo': 'fa-circle-dot'
};

const COLORES_ALERGENOS = {
    'Lácteos': { bg: '#e3f2fd', color: '#1976d2' },
    'Gluten': { bg: '#fff8e1', color: '#f57c00' },
    'Huevos': { bg: '#fffde7', color: '#f9a825' },
    'Pescado': { bg: '#e1f5fe', color: '#0277bd' },
    'Crustáceos': { bg: '#fce4ec', color: '#c2185b' },
    'Moluscos': { bg: '#f3e5f5', color: '#7b1fa2' },
    'Frutos secos': { bg: '#efebe9', color: '#5d4037' },
    'Soja': { bg: '#f1f8e9', color: '#558b2f' },
    'Sulfitos': { bg: '#f3e5f5', color: '#8e24aa' },
    'Apio': { bg: '#e8f5e9', color: '#2e7d32' },
    'Mostaza': { bg: '#fff9c4', color: '#f9a825' },
    'Sésamo': { bg: '#ffe0b2', color: '#e65100' }
};

/**
 * Obtiene las alergias del usuario actual desde localStorage
 */
export function obtenerAlergiasUsuario() {
    const userStr = localStorage.getItem('usuarioActivo');
    if (!userStr) return [];
    
    const usuario = JSON.parse(userStr);
    const configStr = localStorage.getItem(`alergias_${usuario.id}`);
    
    if (!configStr) return [];
    
    const config = JSON.parse(configStr);
    return config.alergias || [];
}

/**
 * Verifica si un producto contiene alérgenos del usuario
 */
export function productoTieneAlergenos(producto) {
    const alergiasUsuario = obtenerAlergiasUsuario();
    
    if (alergiasUsuario.length === 0) {
        return { tiene: false, alergenos: [] };
    }
    
    const alergenosProducto = producto.alergenos || [];
    
    const alergenosEncontrados = alergiasUsuario.filter(alergia =>
        alergenosProducto.some(alergeno => 
            normalizar(alergeno).includes(normalizar(alergia)) ||
            normalizar(alergia).includes(normalizar(alergeno))
        )
    );
    
    return {
        tiene: alergenosEncontrados.length > 0,
        alergenos: alergenosEncontrados
    };
}

/**
 * Normaliza texto para comparación
 */
function normalizar(texto) {
    return texto.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Genera HTML de badge de alérgeno
 */
export function generarBadgeAlergeno(alergeno, esAlerta = false) {
    const icono = ICONOS_ALERGENOS[alergeno] || 'fa-triangle-exclamation';
    const colores = COLORES_ALERGENOS[alergeno] || { bg: '#fff5f5', color: '#c53030' };
    
    const estilo = esAlerta 
        ? `background: #fff5f5; color: #c53030; border: 2px solid #fc8181;`
        : `background: ${colores.bg}; color: ${colores.color};`;
    
    return `
        <span class="badge-alergeno ${esAlerta ? 'badge-alerta' : ''}" 
              style="${estilo} padding: 4px 10px; border-radius: 12px; 
                     font-size: 11px; font-weight: 600; display: inline-flex; 
                     align-items: center; gap: 5px; margin: 2px;">
            <i class="fa-solid ${icono}"></i>
            ${alergeno}
        </span>
    `;
}

/**
 * Genera HTML con todos los alérgenos de un producto
 */
export function generarBadgesProducto(producto) {
    if (!producto.alergenos || producto.alergenos.length === 0) {
        return '';
    }
    
    const verificacion = productoTieneAlergenos(producto);
    
    return producto.alergenos.map(alergeno => {
        const esAlerta = verificacion.alergenos.includes(alergeno);
        return generarBadgeAlergeno(alergeno, esAlerta);
    }).join('');
}

/**
 * Muestra modal de alerta para producto con alérgenos
 */
export async function mostrarAlertaAlergenos(producto) {
    const verificacion = productoTieneAlergenos(producto);
    
    if (!verificacion.tiene) return false;
    
    const alergenosTexto = verificacion.alergenos.join(', ');
    
    const confirmar = await showConfirm(
        `⚠️ ALERTA DE ALÉRGENOS ⚠️\n\n` +
        `El producto "${producto.nombre}" contiene:\n` +
        `${alergenosTexto}\n\n` +
        `Tienes alergia registrada a este/estos alérgeno(s).\n\n` +
        `¿Deseas continuar de todos modos?`
    );
    
    return !confirmar; // Retorna true si se debe bloquear la acción
}

/**
 * Muestra notificación flotante de alérgeno
 */
export function mostrarNotificacionAlergeno(mensaje, tipo = 'warning') {
    // Crear elemento de notificación
    const notif = document.createElement('div');
    notif.className = 'notificacion-alergeno';
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${tipo === 'error' ? '#fff5f5' : '#fffaf0'};
        color: ${tipo === 'error' ? '#c53030' : '#dd6b20'};
        padding: 16px 24px;
        border-radius: 12px;
        border-left: 4px solid ${tipo === 'error' ? '#e53e3e' : '#ed8936'};
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        max-width: 400px;
        font-weight: 600;
    `;
    
    notif.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 20px;"></i>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(notif);
    
    // Añadir animación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notif.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notif.remove();
            style.remove();
        }, 300);
    }, 5000);
}

/**
 * Verifica preferencias de notificación del usuario
 */
export function verificarPreferencias() {
    const userStr = localStorage.getItem('usuarioActivo');
    if (!userStr) return { alertas: true, bloqueo: true };
    
    const usuario = JSON.parse(userStr);
    const prefStr = localStorage.getItem(`notificaciones_${usuario.id}`);
    
    if (!prefStr) return { alertas: true, bloqueo: true };
    
    const pref = JSON.parse(prefStr);
    
    return {
        alertas: pref.alertasProductos !== false,
        bloqueo: pref.bloqueoDistribucion !== false,
        nuevos: pref.nuevosProductos || false
    };
}

/**
 * Añade indicador visual a un elemento HTML
 */
export function añadirIndicadorAlergeno(elemento, producto) {
    const verificacion = productoTieneAlergenos(producto);
    
    if (!verificacion.tiene) return;
    
    // Crear indicador
    const indicador = document.createElement('div');
    indicador.className = 'indicador-alergeno-peligro';
    indicador.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        width: 28px;
        height: 28px;
        background: #e53e3e;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(229, 62, 62, 0.4);
        z-index: 10;
        animation: pulse 2s infinite;
    `;
    indicador.innerHTML = '<i class="fa-solid fa-exclamation"></i>';
    indicador.title = `ALERTA: Contiene ${verificacion.alergenos.join(', ')}`;
    
    // Añadir animación de pulso
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    if (!document.querySelector('style[data-alergeno-animation]')) {
        style.dataset.alergenoAnimation = 'true';
        document.head.appendChild(style);
    }
    
    // Asegurar que el elemento padre tenga position relative
    if (getComputedStyle(elemento).position === 'static') {
        elemento.style.position = 'relative';
    }
    
    elemento.appendChild(indicador);
}