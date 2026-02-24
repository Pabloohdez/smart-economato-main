/**
 * Muestra una notificación personalizada en pantalla (Toast)
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - 'success', 'error', 'warning', 'info'
 */
export function showNotification(message, type = 'info') {
    // Buscar o crear contenedor
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    // Crear elemento notificación
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    
    // Iconos (FontAwesome)
    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    notif.innerHTML = `
        <div class="notification-icon">${icons[type] || icons.info}</div>
        <div class="notification-content">${message}</div>
        <button class="notification-close" aria-label="Cerrar">&times;</button>
    `;

    // Botón cerrar
    const closeBtn = notif.querySelector('.notification-close');
    closeBtn.onclick = () => removeNotification(notif);

    // Añadir al contenedor
    container.appendChild(notif);

    // Auto eliminar a los 4 segundos
    setTimeout(() => {
        if (document.body.contains(notif)) {
            removeNotification(notif);
        }
    }, 4500);
}

function removeNotification(element) {
    element.classList.add('hide');
    // Esperar a que termine la animación css (400ms)
    setTimeout(() => {
        if (element.parentNode) {
            element.parentNode.removeChild(element);
        }
        // Limpiar contenedor si está vacío
        const container = document.getElementById('notification-container');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }, 400);
}

// Opcional: Hacerla global
window.showNotification = showNotification;

/**
 * Muestra un modal de confirmación personalizado (Promesa)
 * @param {string} message - Mensaje a mostrar
 * @returns {Promise<boolean>} - true si confirma, false si cancela
 */
export function showConfirm(message) {
    return new Promise((resolve) => {
        // ID único para el overlay
        const overlayId = 'confirm-overlay-' + Date.now();
        
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 20000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // HTML del modal
        overlay.innerHTML = `
            <div style="
                background: white;
                width: 90%;
                max-width: 400px;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                transform: scale(0.95);
                transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                text-align: center;
            ">
                <div style="font-size: 48px; color: #b33131; margin-bottom: 16px;">
                    <i class="fa-solid fa-circle-question"></i>
                </div>
                <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #2d3748;">¿Estás seguro?</h3>
                <p style="margin: 0 0 24px 0; color: #50596D; font-size: 15px; line-height: 1.5;">${message.replace(/\n/g, '<br>')}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn-cancel" style="
                        border: none; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer;
                        background: #e2e8f0; color: #2d3748;
                    ">Cancelar</button>
                    <button class="btn-ok" style="
                        border: none; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer;
                        background: #b33131; color: white;
                    ">Confirmar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Activar animación
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.firstElementChild.style.transform = 'scale(1)';
        });

        // Referencias botones
        const btnCancel = overlay.querySelector('.btn-cancel');
        const btnOk = overlay.querySelector('.btn-ok');
        
        btnCancel.focus();

        // Función de cierre
        const close = (result) => {
            overlay.style.opacity = '0';
            overlay.firstElementChild.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 300);
            resolve(result);
        };

        btnCancel.onclick = () => close(false);
        btnOk.onclick = () => close(true);

        // Escape para cancelar
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                document.removeEventListener('keydown', handleKey);
                close(false);
            }
        };
        document.addEventListener('keydown', handleKey);
    });
}
window.showConfirm = showConfirm;
