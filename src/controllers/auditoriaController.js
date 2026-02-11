/**
 * Controlador para la página de Auditoría
 * Gestiona la visualización del historial de actividades del sistema
 */

import { showNotification } from '../utils/notifications.js';
import { esAdmin, obtenerUsuarioActual, obtenerUsuarioId } from '../utils/auth.js';

const API_URL = 'http://localhost:8080/api';

let gridAuditoria;
let registrosAuditoria = [];

/**
 * Inicializar la página
 */
export async function init() {
    console.log('Inicializando página de Auditoría');

    // Verificar permisos de administrador
    if (!esAdmin()) {
        showNotification('Acceso denegado: se requieren permisos de administrador', 'error');
        return;
    }

    // Configurar event listeners
    document.getElementById('btnAplicarFiltros').addEventListener('click', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);

    // Cargar datos iniciales
    await cargarAuditoria();
}

/**
 * Cargar registros de auditoría desde la API
 */
async function cargarAuditoria(filtros = {}) {
    try {
        // Construir query string con filtros
        const params = new URLSearchParams();
        if (filtros.accion) params.append('accion', filtros.accion);
        if (filtros.usuario) params.append('usuario', filtros.usuario);
        if (filtros.fechaDesde) params.append('fecha_desde', filtros.fechaDesde);
        if (filtros.fechaHasta) params.append('fecha_hasta', filtros.fechaHasta);
        params.append('limite', '200');
        params.append('usuario_actual', obtenerUsuarioId());

        const url = `${API_URL}/auditoria.php?${params.toString()}`;
        const response = await fetch(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        // Manejar error 403 (no es admin)
        if (response.status === 403) {
            const dataError = await response.json();
            showNotification(`Acceso denegado: ${dataError.error || 'Se requieren permisos de administrador'}`, 'error');
            return;
        }

        if (!response.ok) {
            console.error('Error al cargar auditoría. Status:', response.status);
            showNotification('Error del sistema al obtener registros', 'error');
            return;
        }

        const result = await response.json();

        // El wrapper sendResponse de PHP pone todo dentro de 'data'
        const data = result.data || result;

        if (data.registros) {
            registrosAuditoria = data.registros;
            renderizarTabla();
            actualizarBarraResumen(data.total, data.registros);
        } else if (result.error) {
            showNotification(`${result.error.message || result.error}`, 'error');
        } else {
            showNotification('Error al cargar auditoría', 'error');
        }
    } catch (error) {
        console.error('Error al cargar auditoría:', error);
        showNotification('Error de conexión', 'error');
    }
}

/**
 * Renderizar tabla con Grid.js
 */
function renderizarTabla() {
    const container = document.getElementById('grid-auditoria');
    container.innerHTML = '';

    const datos = registrosAuditoria.map(reg => [
        formatearFecha(reg.fecha),
        reg.usuario_nombre || reg.usuario_id,
        generarBadgeAccion(reg.accion),
        reg.entidad,
        generarBotonDetalles(reg)
    ]);

    gridAuditoria = new window.gridjs.Grid({
        columns: [
            { name: 'Fecha/Hora', width: '180px' },
            { name: 'Usuario', width: '150px' },
            { name: 'Acción', width: '200px' },
            { name: 'Entidad', width: '120px' },
            { name: 'Detalles', width: '120px' }
        ],
        data: datos,
        sort: true,
        search: {
            enabled: true,
            placeholder: 'Buscar en registros...'
        },
        pagination: {
            enabled: true,
            limit: 20,
            summary: true
        },
        language: {
            search: {
                placeholder: 'Buscar...'
            },
            pagination: {
                previous: 'Anterior',
                next: 'Siguiente',
                showing: 'Mostrando',
                results: () => 'registros',
                of: 'de',
                to: 'a'
            }
        },
        style: {
            table: {
                'white-space': 'nowrap'
            }
        }
    }).render(container);
}

/**
 * Actualizar barra de resumen con estadísticas
 */
function actualizarBarraResumen(total, registros) {
    let barraEl = document.getElementById('barra-resumen');
    if (!barraEl) {
        barraEl = document.createElement('div');
        barraEl.id = 'barra-resumen';
        barraEl.className = 'barra-resumen';
        const panelTabla = document.querySelector('.panel-tabla');
        if (panelTabla) {
            panelTabla.parentNode.insertBefore(barraEl, panelTabla);
        }
    }

    const usuariosUnicos = new Set(registros.map(r => r.usuario_nombre || r.usuario_id)).size;

    let rangoFechas = '';
    if (registros.length > 0) {
        const fechas = registros.map(r => new Date(r.fecha)).sort((a, b) => a - b);
        const formatoCorto = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const desde = fechas[0].toLocaleDateString('es-ES', formatoCorto);
        const hasta = fechas[fechas.length - 1].toLocaleDateString('es-ES', formatoCorto);
        rangoFechas = desde === hasta ? desde : `${desde} — ${hasta}`;
    }

    barraEl.innerHTML = `
        <div class="resumen-item">
            <i class="fa-solid fa-list-ol"></i>
            <span><strong>${total}</strong> registros</span>
        </div>
        <div class="resumen-item">
            <i class="fa-solid fa-calendar-days"></i>
            <span>${rangoFechas || 'Sin datos'}</span>
        </div>
        <div class="resumen-item">
            <i class="fa-solid fa-users"></i>
            <span><strong>${usuariosUnicos}</strong> usuario${usuariosUnicos !== 1 ? 's' : ''}</span>
        </div>
    `;
}

/**
 * Formatear fecha a formato legible
 */
function formatearFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    const opciones = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    return fecha.toLocaleString('es-ES', opciones);
}

/**
 * Generar badge HTML para tipo de acción
 */
function generarBadgeAccion(accion) {
    const badges = {
        'MOVIMIENTO': { clase: 'badge-movimiento', icono: 'fa-arrows-rotate', texto: 'Movimiento' },
        'PEDIDO': { clase: 'badge-pedido', icono: 'fa-shopping-cart', texto: 'Pedido' },
        'BAJA': { clase: 'badge-baja', icono: 'fa-trash', texto: 'Baja' },
        'CREAR_PRODUCTO': { clase: 'badge-crear', icono: 'fa-plus', texto: 'Crear Producto' },
        'MODIFICAR_PRODUCTO': { clase: 'badge-modificar', icono: 'fa-edit', texto: 'Modificar Producto' },
        'ELIMINAR_PRODUCTO': { clase: 'badge-eliminar', icono: 'fa-times', texto: 'Eliminar Producto' }
    };

    const badge = badges[accion] || { clase: 'badge-movimiento', icono: 'fa-question', texto: accion };

    return window.gridjs.html(`
        <span class="badge-accion ${badge.clase}">
            <i class="fa-solid ${badge.icono}"></i>
            ${badge.texto}
        </span>
    `);
}

/**
 * Generar botón para ver detalles
 */
function generarBotonDetalles(registro) {
    return window.gridjs.html(`
        <button 
            class="btn-ver-detalles" 
            onclick="window.verDetallesAuditoria(${registro.id})"
            style="
                padding: 6px 12px;
                background: #f7fafc;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                color: #4a5568;
                transition: all 0.3s ease;
            "
            onmouseover="this.style.background='#edf2f7'; this.style.borderColor='#cbd5e0';"
            onmouseout="this.style.background='#f7fafc'; this.style.borderColor='#e2e8f0';"
        >
            <i class="fa-solid fa-eye"></i> Ver
        </button>
    `);
}

/**
 * Ver detalles de un registro
 */
window.verDetallesAuditoria = function (id) {
    const registro = registrosAuditoria.find(r => String(r.id) === String(id));
    if (!registro) return;

    const modalBody = document.getElementById('modalDetallesBody');
    const detalles = registro.detalles || {};

    // -- Sección: Información General --
    let html = `
        <div class="detalle-seccion">
            <div class="detalle-seccion-titulo">
                <i class="fa-solid fa-circle-info"></i> Información General
            </div>
            <div class="detalle-grid">
                <div class="detalle-item">
                    <div class="detalle-label">Registro</div>
                    <div class="detalle-valor">#${registro.id}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">Fecha y Hora</div>
                    <div class="detalle-valor">${formatearFecha(registro.fecha)}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">Usuario</div>
                    <div class="detalle-valor">${registro.usuario_nombre || registro.usuario_id}</div>
                </div>
                <div class="detalle-item">
                    <div class="detalle-label">Acción</div>
                    <div class="detalle-valor">${obtenerTextoAccion(registro.accion)}</div>
                </div>
            </div>
        </div>
    `;

    // -- Sección: Detalles específicos según acción --
    if (Object.keys(detalles).length > 0) {
        html += `
            <div class="detalle-seccion">
                <div class="detalle-seccion-titulo">
                    <i class="fa-solid ${obtenerIconoAccion(registro.accion)}"></i> Datos de la Operación
                </div>
                <div class="detalle-grid">
        `;

        // Producto (común a casi todas las acciones)
        if (detalles.producto) {
            html += crearItemDetalle('Producto', detalles.producto);
        }

        // Cantidad
        if (detalles.cantidad !== undefined) {
            html += crearItemDetalle('Cantidad', `${detalles.cantidad} uds.`);
        }

        // Campos específicos por tipo de acción
        switch (registro.accion) {
            case 'BAJA':
                if (detalles.tipo) html += crearItemDetalle('Tipo de Baja', detalles.tipo);
                if (detalles.motivo) html += crearItemDetalle('Motivo', detalles.motivo);
                break;

            case 'MOVIMIENTO':
                if (detalles.tipo) html += crearItemDetalle('Tipo', detalles.tipo === 'ENTRADA' ? 'Entrada de stock' : 'Salida de stock');
                if (detalles.motivo) html += crearItemDetalle('Motivo', detalles.motivo);
                if (detalles.stock_anterior !== undefined && detalles.stock_nuevo !== undefined) {
                    html += crearItemDetalle('Stock', `${detalles.stock_anterior} → ${detalles.stock_nuevo}`);
                }
                break;

            case 'PEDIDO':
                if (detalles.proveedor) html += crearItemDetalle('Proveedor', detalles.proveedor);
                if (detalles.estado) html += crearItemDetalle('Estado', detalles.estado);
                if (detalles.motivo) html += crearItemDetalle('Motivo', detalles.motivo);
                break;

            default:
                // Para CREAR/MODIFICAR/ELIMINAR producto u otros
                if (detalles.motivo) html += crearItemDetalle('Motivo', detalles.motivo);
                if (detalles.precio) html += crearItemDetalle('Precio', `${parseFloat(detalles.precio).toFixed(2)} €`);
                if (detalles.categoria) html += crearItemDetalle('Categoría', detalles.categoria);
                break;
        }

        html += `
                </div>
            </div>
        `;
    }

    // -- Sección: Entidad --
    if (registro.entidad) {
        const entidadTexto = registro.entidad_id
            ? `${capitalizar(registro.entidad)} #${registro.entidad_id}`
            : capitalizar(registro.entidad);

        html += `
            <div class="detalle-pie">
                <i class="fa-solid fa-tag"></i>
                <span>Entidad afectada: <strong>${entidadTexto}</strong></span>
            </div>
        `;
    }

    modalBody.innerHTML = html;
    document.getElementById('modalDetalles').style.display = 'flex';
};

/**
 * Helpers para el modal de detalles
 */
function crearItemDetalle(label, valor) {
    return `
        <div class="detalle-item">
            <div class="detalle-label">${label}</div>
            <div class="detalle-valor">${valor}</div>
        </div>
    `;
}

function obtenerTextoAccion(accion) {
    const textos = {
        'MOVIMIENTO': 'Movimiento de Stock',
        'PEDIDO': 'Pedido',
        'BAJA': 'Baja de Producto',
        'CREAR_PRODUCTO': 'Creación de Producto',
        'MODIFICAR_PRODUCTO': 'Modificación de Producto',
        'ELIMINAR_PRODUCTO': 'Eliminación de Producto'
    };
    return textos[accion] || accion;
}

function obtenerIconoAccion(accion) {
    const iconos = {
        'MOVIMIENTO': 'fa-arrows-rotate',
        'PEDIDO': 'fa-shopping-cart',
        'BAJA': 'fa-box-archive',
        'CREAR_PRODUCTO': 'fa-plus-circle',
        'MODIFICAR_PRODUCTO': 'fa-pen-to-square',
        'ELIMINAR_PRODUCTO': 'fa-trash-can'
    };
    return iconos[accion] || 'fa-file-lines';
}

function capitalizar(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Cerrar modal de detalles
 */
function cerrarModal() {
    document.getElementById('modalDetalles').style.display = 'none';
}

/**
 * Aplicar filtros
 */
async function aplicarFiltros() {
    const filtros = {
        accion: document.getElementById('filtroAccion').value,
        usuario: document.getElementById('filtroUsuario').value,
        fechaDesde: document.getElementById('filtroFechaDesde').value,
        fechaHasta: document.getElementById('filtroFechaHasta').value
    };

    await cargarAuditoria(filtros);
}

/**
 * Limpiar filtros
 */
async function limpiarFiltros() {
    document.getElementById('filtroAccion').value = '';
    document.getElementById('filtroUsuario').value = '';
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';

    await cargarAuditoria();
}

// Cerrar modal al hacer clic fuera
window.addEventListener('click', (e) => {
    const modal = document.getElementById('modalDetalles');
    if (e.target === modal) {
        cerrarModal();
    }
});
