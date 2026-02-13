// src/router.js

// Version for cache busting - increment when deploying code changes
const APP_VERSION = '1.0.3';

// --- CONFIGURACIÓN DE RUTAS ---

const routes = {
    'inicio': {
        template: 'pages/inicio.html',
        action: () => { /* No hay lógica específica para inicio */ }
    },
    'avisos': {
        template: 'pages/avisos.html',
        action: async () => {
            try {
                const module = await import(`./controllers/avisosController.js?v=${APP_VERSION}`);
                if (module.initAvisos) await module.initAvisos();
            } catch (e) {
                console.error('Error loading avisosController:', e);
                const content = document.getElementById('content');
                if (content) {
                    content.innerHTML += `<div style="background:#fee; border:2px solid #c00; padding:20px; margin:20px; border-radius:8px;">
                        <h3 style="color:#c00; margin:0 0 10px 0;">❌ Error al cargar el controlador</h3>
                        <p><strong>Mensaje:</strong> ${e.message}</p>
                        <pre style="background:#fff; padding:10px; overflow:auto; font-size:11px;">${e.stack}</pre>
                    </div>`;
                }
            }
        }
    },
    'inventario': {
        template: 'pages/Inventario.html',
        action: async () => {
            try {
                const module = await import(`./controllers/almacen.js?v=${APP_VERSION}`);
                if (module.cargarDatos) await module.cargarDatos();
                if (module.inicializarEventos) await module.inicializarEventos();
            } catch (e) {
                console.error('Error loading almacen:', e);
            }
        }
    },
    'ingresarproductos': {
        template: 'pages/ingresarProductos.html',
        action: async () => {
            try {
                const module = await import(`./controllers/ingresoController.js?v=${APP_VERSION}`);
                if (module.initIngreso) module.initIngreso();
            } catch (e) {
                console.error('Error loading ingresoController:', e);
            }
        }
    },
    'recepcion': {
        template: 'pages/recepcion.html',
        action: async () => {
            try {
                // Truco del timestamp para evitar caché en desarrollo
                const module = await import(`./controllers/recepcionController.js?v=${APP_VERSION}`);
                if (module.initRecepcion) await module.initRecepcion();
            } catch (e) {
                console.error("Error loading recepcionController:", e);
            }
        }
    },
    'bajas': {
        template: 'pages/bajas.html',
        action: async () => {
            try {
                // Truco del timestamp para evitar caché en desarrollo
                const module = await import(`./controllers/bajasController.js?v=${APP_VERSION}`);
                if (module.initBajas) await module.initBajas();
            } catch (e) {
                console.error("Error loading bajasController:", e);
            }
        }
    },
    'configuracion': {
        template: 'pages/configuracion.html',
        action: async () => {
            try {
                const module = await import(`./controllers/configuracionController.js?v=${APP_VERSION}`);
                if (module.initConfiguracion) module.initConfiguracion();
            } catch (e) {
                console.error('Error loading configuracionController:', e);
            }
        }
    },
    'distribucion': {
        template: 'pages/distribucion.html',
        action: async () => {
            try {
                const module = await import(`./controllers/distribucionController.js?v=${APP_VERSION}`);
                if (module.initDistribucion) module.initDistribucion();
            } catch (e) {
                console.error('Error loading distribucionController:', e);
            }
        }
    },

    // --- AQUÍ ESTÁ EL CAMBIO IMPORTANTE ---
    'proveedores': {
        template: 'pages/proveedores.html',
        action: async () => {
            // Carga dinámica del nuevo controlador
            try {
                const module = await import(`./controllers/proveedorController.js?v=${APP_VERSION}`);
                if (module.initProveedores) module.initProveedores();
            } catch (error) {
                console.error("Error cargando el controlador de proveedores:", error);
            }
        }
    },
    // --------------------------------------

    'pedidos': {
        template: 'pages/pedidos.html',
        action: async () => {
            try {
                const module = await import(`./controllers/pedidosController.js?v=${APP_VERSION}`);
                if (module.initPedidos) module.initPedidos();
            } catch (e) {
                console.error('Error loading pedidosController:', e);
            }
        }
    },
    'escandallos': {
        template: 'pages/escandallos.html',
        action: async () => {
            try {
                const module = await import(`./controllers/escandallosController.js?v=${APP_VERSION}`);
                if (module.initEscandallos) module.initEscandallos();
            } catch (e) {
                console.error('Error loading escandallosController:', e);
            }
        }
    },
    'rendimiento': {
        template: 'pages/rendimiento.html',
        action: async () => {
            try {
                const module = await import(`./controllers/rendimientoController.js?v=${APP_VERSION}`);
                if (module.initRendimiento) module.initRendimiento();
            } catch (e) {
                console.error('Error loading rendimientoController:', e);
            }
        }
    },
    'auditoria': {
        template: 'pages/auditoria.html',
        action: async () => {
            // Verificar permisos antes de cargar
            const authModule = await import(`./utils/auth.js?t=${Date.now()}`);
            if (!authModule.esAdmin()) {
                const notifModule = await import(`./utils/notifications.js?t=${Date.now()}`);
                notifModule.showNotification('Acceso restringido: se requieren permisos de administrador', 'error');
                navigateTo('inicio');
                return;
            }
            const module = await import(`./controllers/auditoriaController.js?t=${Date.now()}`);
            if (module.init) module.init();
        }
    },
    'usuarios': {
        template: 'pages/construccion.html',
        action: () => setupConstruction('Gestión de Usuarios')
    }
};

// Función auxiliar para configurar la página de construcción
function setupConstruction(featureName) {
    setTimeout(() => {
        const title = document.getElementById('constructionTitle');
        const feature = document.getElementById('constructionFeature');

        if (title) title.textContent = featureName || 'En Construcción';
        if (feature) feature.textContent = featureName ? `el módulo de ${featureName}` : 'esta sección';
    }, 50);
}

// --- FUNCIÓN PRINCIPAL DEL ROUTER ---
export async function navigateTo(pageName) {
    const content = document.getElementById("content");
    const key = pageName.toLowerCase();

    const route = routes[key] || routes['inicio'];

    try {
        // 1. Cargar el HTML
        const response = await fetch(`${route.template}?v=${APP_VERSION}`);
        if (!response.ok) throw new Error(`Error cargando ${route.template}`);
        const html = await response.text();

        // 2. Inyectar el HTML
        content.innerHTML = html;

        // 3. Ejecutar la lógica (controlador) asociada
        if (route.action) {
            await route.action();
        }

        // 4. ACCESIBILIDAD: Gestión del Foco
        setTimeout(() => {
            const headerTitulo = document.querySelector("#content h1");
            const focusTarget = headerTitulo || content;

            focusTarget.setAttribute("tabindex", "-1");
            focusTarget.focus({ preventScroll: false });
        }, 100);

    } catch (error) {
        console.error("Error en el router:", error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #721c24;">
                <h3>Error 404</h3>
                <p>No se pudo cargar la página solicitada.</p>
                <p><small>${error.message}</small></p>
            </div>`;
    }
}