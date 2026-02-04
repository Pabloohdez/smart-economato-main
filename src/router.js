// src/router.js

// Importamos las funciones necesarias para Inventario (ya que son estáticas)
import { renderizarTabla } from "./utils/funciones.js";
import { cargarDatos, inicializarEventos } from "./controllers/almacen.js";

// --- CONFIGURACIÓN DE RUTAS ---
// Aquí definimos qué archivo HTML carga cada página y qué lógica ejecuta
const routes = {
    'inicio': {
        template: 'pages/inicio.html',
        action: () => { /* No hay lógica específica para inicio */ }
    },
    'inventario': {
        template: 'pages/Inventario.html',
        action: async () => {
            renderizarTabla([]); // Limpiar tabla visualmente
            await cargarDatos(); // Cargar datos de la API
            inicializarEventos(); // Activar filtros y botones
        }
    },
    'ingresarproductos': {
        template: 'pages/ingresarProductos.html',
        action: async () => {
            // Importación dinámica (Lazy Loading) para optimizar
            const module = await import('./controllers/ingresoController.js');
            if (module.initIngreso) module.initIngreso();
        }
    },
    'recepcion': {
        template: 'pages/recepcion.html',
        action: async () => {
             try {
                 const module = await import('./controllers/recepcionController.js');
                 if (module.initRecepcion) await module.initRecepcion();
             } catch (e) {
                 console.error("Error loading recepcionController:", e);
             }
        }
    },
    'bajas': {
        template: 'pages/bajas.html',
        action: async () => {
            const module = await import('./controllers/bajasController.js');
            if (module.initBajas) module.initBajas();
        }
    },
    'configuracion': {
        template: 'pages/configuracion.html',
        action: async () => {
            const module = await import('./controllers/configuracionController.js');
            if (module.initConfiguracion) module.initConfiguracion();
        }
    },
    // --- MÓDULOS IMPLEMENTADOS ---
    'distribucion': {
        template: 'pages/distribucion.html',
        action: () => { /* Lógica autocontenida en el HTML */ }
    },
    'proveedores': {
        template: 'pages/proveedores.html',
        action: () => { /* Lógica autocontenida en el HTML */ }
    },
    'pedidos': {
        template: 'pages/pedidos.html',
        action: async () => {
            const module = await import('./controllers/pedidosController.js');
            if (module.initPedidos) module.initPedidos();
        }
    },
    'informes': {
        template: 'pages/informes.html',
        action: () => { /* Lógica autocontenida en el HTML */ }
    },
    'usuarios': {
        template: 'pages/construccion.html',
        action: () => setupConstruction('Gestión de Usuarios')
    }
};

// Función auxiliar para configurar la página de construcción
function setupConstruction(featureName) {
    // Pequeño timeout para asegurar que el DOM se ha pintado
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
    
    // Si la ruta no existe, por defecto vamos a inicio o lanzamos error
    const route = routes[key] || routes['inicio'];

    try {
        // 1. Cargar el HTML
        const response = await fetch(`${route.template}?t=${Date.now()}`);
        if (!response.ok) throw new Error(`Error cargando ${route.template}`);
        const html = await response.text();

        // 2. Inyectar el HTML
        content.innerHTML = html;

        // 3. Ejecutar la lógica (controlador) asociada
        // 3. Ejecutar la lógica (controlador) asociada
        if (route.action) {
            await route.action();
        }

        // 4. ACCESIBILIDAD: Gestión del Foco
        // Mover el foco al contenido nuevo para que el lector de pantalla anuncie el cambio
        // Usamos setTimeout para asegurar que el DOM se ha actualizado visualmente
        setTimeout(() => {
            const headerTitulo = document.querySelector("#content h1");
            const focusTarget = headerTitulo || content;
            
            focusTarget.setAttribute("tabindex", "-1");
            focusTarget.focus({ preventScroll: false }); // Asegurar scroll al elemento
            
            console.log("📍 Foco movido a:", focusTarget);
        }, 100);
    } catch (error) {
        console.error("Error en el router:", error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #721c24;">
                <h3>Error 404</h3>
                <p>No se pudo cargar la página solicitada.</p>
            </div>`;
    }
}