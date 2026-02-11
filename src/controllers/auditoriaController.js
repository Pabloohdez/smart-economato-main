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
    console.log('🔍 Inicializando página de Auditoría');

    // Verificar permisos de administrador
    if (!esAdmin()) {
        showNotification('❌ Acceso denegado: se requieren permisos de administrador', 'error');
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
            showNotification(`❌ Acceso denegado: ${dataError.error || 'Se requieren permisos de administrador'}`, 'error');
            return;
        }

        if (!response.ok) {
            console.error('Error al cargar auditoría. Status:', response.status);
            showNotification('❌ Error del sistema al obtener registros', 'error');
            return;
        }

        const result = await response.json();

        // El wrapper sendResponse de PHP pone todo dentro de 'data'
        const data = result.data || result;

        if (data.registros) {
            registrosAuditoria = data.registros;
            renderizarTabla();
            showNotification(`✅ ${data.total} registros encontrados`, 'success');
        } else if (result.error) {
            showNotification(`❌ ${result.error.message || result.error}`, 'error');
        } else {
            showNotification('❌ Error al cargar auditoría', 'error');
        }
    } catch (error) {
        console.error('Error al cargar auditoría:', error);
        showNotification('❌ Error de conexión', 'error');
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
                placeholder: '🔍 Buscar...'
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
    const registro = registrosAuditoria.find(r => r.id === id);
    if (!registro) return;

    const modalBody = document.getElementById('modalDetallesBody');

    let detallesHTML = `
        <div class="detalle-item">
            <div class="detalle-label">ID de Registro</div>
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
            <div class="detalle-valor">${registro.accion}</div>
        </div>
        <div class="detalle-item">
            <div class="detalle-label">Entidad Afectada</div>
            <div class="detalle-valor">${registro.entidad}${registro.entidad_id ? ` (ID: ${registro.entidad_id})` : ''}</div>
        </div>
    `;

    if (registro.detalles) {
        detallesHTML += `
            <div class="detalle-item">
                <div class="detalle-label">Información Adicional</div>
                <div class="detalle-json">${JSON.stringify(registro.detalles, null, 2)}</div>
            </div>
        `;
    }

    if (registro.ip_address) {
        detallesHTML += `
            <div class="detalle-item">
                <div class="detalle-label">Dirección IP</div>
                <div class="detalle-valor">${registro.ip_address}</div>
            </div>
        `;
    }

    modalBody.innerHTML = detallesHTML;
    document.getElementById('modalDetalles').style.display = 'flex';
};

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
