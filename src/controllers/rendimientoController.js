// src/controllers/rendimientoController.js

import { getProductos, getCategorias } from '../services/apiService.js';
import { showNotification } from '../utils/notifications.js';

// Estado local
let registrosRendimiento = [];
let historialRendimiento = [];
let productosDisponibles = [];
let categoriasDisponibles = [];

export async function initRendimiento() {
    console.log('📊 Iniciando módulo de Rendimiento...');

    // Fecha actual
    const fechaEl = document.getElementById('fechaActualRendimiento');
    if (fechaEl) {
        fechaEl.textContent = new Date().toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // Cargar datos
    await cargarDatos();

    // Cargar datos locales (persistencia)
    cargarDatosLocales();

    // Configurar eventos
    configurarEventos();

    // Renderizar estado inicial
    renderizarTabla();
    actualizarEstadisticas();
    renderizarHistorial();

    console.log('✅ Módulo de Rendimiento iniciado correctamente');
}

async function cargarDatos() {
    try {
        const [prods, cats] = await Promise.all([
            getProductos(),
            getCategorias()
        ]);
        productosDisponibles = prods || [];
        categoriasDisponibles = cats || [];

        // Llenar filtro de categorías
        const selectCat = document.getElementById('selectCategoriaRend');
        if (selectCat && categoriasDisponibles.length > 0) {
            categoriasDisponibles.forEach(cat => {
                selectCat.innerHTML += `<option value="${cat.nombre}">${cat.nombre}</option>`;
            });
        }
    } catch (error) {
        console.warn('⚠️ No se pudieron cargar productos de la API:', error);
        productosDisponibles = [];
    }
}

const API_ENDPOINT = 'api/rendimientos.php';

async function cargarDatosLocales() {
    try {
        console.log('📡 Cargando historial de rendimientos desde API...');
        const res = await fetch(`${API_ENDPOINT}?limit=50`);
        const json = await res.json();

        if (json.success) {
            historialRendimiento = json.data;
            console.log('✅ Historial cargado:', historialRendimiento.length, 'registros');
            renderizarHistorial();
            actualizarEstadisticas();
        } else {
            console.error('❌ Error API:', json.error);
            showNotification('Error cargando historial', 'error');
        }
    } catch (e) {
        console.error('❌ Error de red:', e);
        showNotification('Error de conexión al cargar historial', 'error');
    }
}

async function guardarDatosBackend(nuevosRegistros) {
    try {
        console.log('💾 Guardando en Supabase...', nuevosRegistros);
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevosRegistros)
        });

        const json = await res.json();

        if (!json.success) {
            throw new Error(json.error || 'Error desconocido');
        }
        return true;
    } catch (e) {
        console.error('❌ Error guardando:', e);
        showNotification('Error al guardar en base de datos: ' + e.message, 'error');
        return false;
    }
}

async function eliminarRegistroHistorial(id) {
    if (!confirm('¿Estás seguro de eliminar este registro del historial?')) return;

    try {
        const res = await fetch(`${API_ENDPOINT}?id=${id}`, { method: 'DELETE' });
        const json = await res.json();

        if (json.success) {
            showNotification('Registro eliminado', 'success');
            // Recargar
            cargarDatosLocales();
        } else {
            showNotification('Error al eliminar: ' + json.error, 'error');
        }
    } catch (e) {
        console.error(e);
        showNotification('Error de red al eliminar', 'error');
    }
}

// Sobrescribir la función cargarHistorialMock para que no haga nada o sea un fallback
function cargarHistorialMock() {
    // Ya no usamos mocks si hay API, o solo si falla la API
    console.log('ℹ️ Modo API activado, mocks desactivados.');
}

function configurarEventos() {
    // Botón Nuevo Análisis
    document.getElementById('btnNuevoRendimiento')?.addEventListener('click', abrirModal);

    // Modal: Cancelar
    document.getElementById('btnModalCancelarRend')?.addEventListener('click', cerrarModal);

    // Modal: Confirmar
    document.getElementById('btnModalConfirmarRend')?.addEventListener('click', confirmarRegistro);

    // Modal: Calcular automáticamente al cambiar pesos
    document.getElementById('modalInputPesoBruto')?.addEventListener('input', calcularEnModal);
    document.getElementById('modalInputPesoNeto')?.addEventListener('input', calcularEnModal);

    // Buscar y Autocomplete
    const inputBusqueda = document.getElementById('inputBusquedaRendimiento');
    inputBusqueda?.addEventListener('input', (e) => {
        const texto = e.target.value.toLowerCase().trim();

        // 1. Filtrar historial (la parte de abajo)
        filtrarHistorial();

        // 2. Mostrar sugerencias del maestro de productos
        buscarSugerenciasMaster(texto);
    });

    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.panel-registro-rend')) {
            document.getElementById('resultadosBusquedaRend')?.classList.add('oculto');
        }
    });

    // Filtro categoría
    document.getElementById('selectCategoriaRend')?.addEventListener('change', () => {
        filtrarHistorial();
    });
    document.getElementById('selectFiltroCategoria')?.addEventListener('change', () => {
        filtrarHistorial();
    });

    // Limpiar todo
    document.getElementById('btnLimpiarRendimiento')?.addEventListener('click', () => {
        registrosRendimiento = [];
        renderizarTabla();
        actualizarEstadisticas();
        showNotification('Registros limpiados', 'success');
    });

    // Guardar análisis
    document.getElementById('btnGuardarRendimiento')?.addEventListener('click', guardarAnalisis);

    // Imprimir
    document.getElementById('btnImprimirRendimiento')?.addEventListener('click', () => {
        window.print();
    });

    // Cerrar modal haciendo clic fuera
    document.getElementById('modalRendimiento')?.addEventListener('click', (e) => {
        if (e.target.id === 'modalRendimiento') cerrarModal();
    });
}

// --- MODAL ---

function abrirModal() {
    const modal = document.getElementById('modalRendimiento');
    if (!modal) return;

    // Limpiar campos
    document.getElementById('modalInputIngrediente').value = '';
    document.getElementById('modalInputPesoBruto').value = '';
    document.getElementById('modalInputPesoNeto').value = '';
    document.getElementById('modalDesperdicio').textContent = '0.000 kg';
    document.getElementById('modalPorcRendimiento').textContent = '0%';
    document.getElementById('modalPorcMerma').textContent = '0%';

    modal.classList.remove('oculto');

    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('modalInputIngrediente')?.focus();
    }, 100);
}

function cerrarModal() {
    document.getElementById('modalRendimiento')?.classList.add('oculto');
}

function calcularEnModal() {
    const pesoBruto = parseFloat(document.getElementById('modalInputPesoBruto').value) || 0;
    const pesoNeto = parseFloat(document.getElementById('modalInputPesoNeto').value) || 0;

    const desperdicio = Math.max(0, pesoBruto - pesoNeto);
    const rendimiento = pesoBruto > 0 ? (pesoNeto / pesoBruto) * 100 : 0;
    const merma = pesoBruto > 0 ? (desperdicio / pesoBruto) * 100 : 0;

    document.getElementById('modalDesperdicio').textContent = desperdicio.toFixed(3) + ' kg';

    const rendEl = document.getElementById('modalPorcRendimiento');
    rendEl.textContent = rendimiento.toFixed(1) + '%';
    rendEl.className = 'resultado-valor ' + getClaseRendimiento(rendimiento);

    const mermaEl = document.getElementById('modalPorcMerma');
    mermaEl.textContent = merma.toFixed(1) + '%';
    mermaEl.className = 'resultado-valor resultado-merma';
}

function confirmarRegistro() {
    const ingrediente = document.getElementById('modalInputIngrediente').value.trim();
    const pesoBruto = parseFloat(document.getElementById('modalInputPesoBruto').value);
    const pesoNeto = parseFloat(document.getElementById('modalInputPesoNeto').value);

    // Validaciones
    if (!ingrediente) {
        showNotification('Introduce el nombre del ingrediente', 'warning');
        return;
    }
    if (isNaN(pesoBruto) || pesoBruto <= 0) {
        showNotification('Introduce un peso bruto válido', 'warning');
        return;
    }
    if (isNaN(pesoNeto) || pesoNeto < 0) {
        showNotification('Introduce un peso neto válido', 'warning');
        return;
    }
    if (pesoNeto > pesoBruto) {
        showNotification('El peso neto no puede ser mayor que el peso bruto', 'warning');
        return;
    }

    const desperdicio = pesoBruto - pesoNeto;
    const rendimiento = (pesoNeto / pesoBruto) * 100;
    const merma = (desperdicio / pesoBruto) * 100;

    registrosRendimiento.push({
        id: Date.now(),
        ingrediente,
        pesoBruto,
        pesoNeto,
        desperdicio,
        rendimiento,
        merma
    });

    cerrarModal();
    renderizarTabla();
    actualizarEstadisticas();
    mostrarBotonesAccion();

    showNotification(`${ingrediente} añadido — Rendimiento: ${rendimiento.toFixed(1)}%`, 'success');
}

// --- TABLA ---

function renderizarTabla() {
    const tbody = document.getElementById('tbodyRendimiento');
    const tfoot = document.getElementById('tfootRendimiento');
    if (!tbody) return;

    if (registrosRendimiento.length === 0) {
        tbody.innerHTML = `
            <tr class="fila-vacia-rend">
                <td colspan="8">
                    <div class="mensaje-vacio-rend">
                        <i class="fa-solid fa-inbox"></i>
                        <p>No hay registros de rendimiento</p>
                        <small>Haz clic en "Nuevo Análisis" para comenzar</small>
                    </div>
                </td>
            </tr>`;
        if (tfoot) tfoot.classList.add('oculto');
        return;
    }

    // Calcular el peso bruto total para % Total
    const totalPesoBruto = registrosRendimiento.reduce((sum, r) => sum + r.pesoBruto, 0);

    tbody.innerHTML = registrosRendimiento.map((reg, index) => {
        const porcTotal = totalPesoBruto > 0 ? (reg.pesoBruto / totalPesoBruto) * 100 : 0;
        const claseRend = getClaseRendimiento(reg.rendimiento);
        const claseMerma = getClaseMerma(reg.merma);

        return `
            <tr>
                <td><strong>${reg.ingrediente}</strong></td>
                <td>${reg.pesoBruto.toFixed(3)}</td>
                <td>${reg.pesoNeto.toFixed(3)}</td>
                <td>${reg.desperdicio.toFixed(3)}</td>
                <td>${porcTotal.toFixed(1)}%</td>
                <td class="${claseRend}">${reg.rendimiento.toFixed(1)}%</td>
                <td class="${claseMerma}">${reg.merma.toFixed(1)}%</td>
                <td>
                    <button class="btn-eliminar-rend" onclick="window.eliminarRegistroRend(${index})" title="Eliminar registro">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');

    // Actualizar footer de totales
    if (tfoot) {
        tfoot.classList.remove('oculto');
        const totales = calcularTotales();
        document.getElementById('totalPesoBruto').textContent = totales.pesoBruto.toFixed(3);
        document.getElementById('totalPesoNeto').textContent = totales.pesoNeto.toFixed(3);
        document.getElementById('totalDesperdicio').textContent = totales.desperdicio.toFixed(3);
        document.getElementById('totalPorcTotal').textContent = '100%';
        document.getElementById('totalRendimiento').textContent = totales.rendimiento.toFixed(1) + '%';
        document.getElementById('totalMerma').textContent = totales.merma.toFixed(1) + '%';
    }
}

function calcularTotales() {
    const pesoBruto = registrosRendimiento.reduce((sum, r) => sum + r.pesoBruto, 0);
    const pesoNeto = registrosRendimiento.reduce((sum, r) => sum + r.pesoNeto, 0);
    const desperdicio = registrosRendimiento.reduce((sum, r) => sum + r.desperdicio, 0);
    const rendimiento = pesoBruto > 0 ? (pesoNeto / pesoBruto) * 100 : 0;
    const merma = pesoBruto > 0 ? (desperdicio / pesoBruto) * 100 : 0;

    return { pesoBruto, pesoNeto, desperdicio, rendimiento, merma };
}

// Eliminar registro (global para onclick)
window.eliminarRegistroRend = (index) => {
    const reg = registrosRendimiento[index];
    if (reg) {
        registrosRendimiento.splice(index, 1);
        renderizarTabla();
        actualizarEstadisticas();
        if (registrosRendimiento.length === 0) ocultarBotonesAccion();
        showNotification(`${reg.ingrediente} eliminado`, 'success');
    }
};

// --- ESTADÍSTICAS ---

function actualizarEstadisticas() {
    const total = registrosRendimiento.length + historialRendimiento.length;
    const todos = [...registrosRendimiento, ...historialRendimiento];

    const rendimientoMedio = todos.length > 0
        ? todos.reduce((sum, r) => sum + r.rendimiento, 0) / todos.length
        : 0;

    const mermaMedio = todos.length > 0
        ? todos.reduce((sum, r) => sum + r.merma, 0) / todos.length
        : 0;

    const desperdicioTotal = todos.reduce((sum, r) => sum + r.desperdicio, 0);

    document.getElementById('statIngredientes').textContent = total;
    document.getElementById('statRendimientoMedio').textContent = rendimientoMedio.toFixed(1) + '%';
    document.getElementById('statMermaMedia').textContent = mermaMedio.toFixed(1) + '%';
    document.getElementById('statDesperdicioTotal').textContent = desperdicioTotal.toFixed(2) + ' kg';
}

// --- HISTORIAL ---

function renderizarHistorial(lista = historialRendimiento) {
    const contenedor = document.getElementById('contenedorHistorialRend');
    if (!contenedor) return;

    if (lista.length === 0) {
        contenedor.innerHTML = '<p style="text-align: center; color: #718096; padding: 20px;">No hay registros en el historial</p>';
        return;
    }

    contenedor.innerHTML = lista.map(item => {
        const claseRend = item.rendimiento >= 75 ? 'badge-rendimiento' : '';
        const claseMerma = item.merma >= 30 ? 'badge-merma' : '';

        return `
            <div class="historial-item-rend">
                <div class="historial-info-rend">
                    <span class="historial-nombre-rend">${item.ingrediente}</span>
                    <span class="historial-detalle-rend">
                        ${item.fecha} · Bruto: ${item.pesoBruto.toFixed(3)} kg → Neto: ${item.pesoNeto.toFixed(3)} kg
                        ${item.observaciones ? ' · ' + item.observaciones : ''}
                    </span>
                </div>
                <div class="historial-valores-rend">
                    <span class="historial-badge-rend ${claseRend}">
                        <i class="fa-solid fa-arrow-up"></i> ${item.rendimiento.toFixed(1)}%
                    </span>
                    <span class="historial-badge-rend ${claseMerma}">
                        <i class="fa-solid fa-arrow-down"></i> ${item.merma.toFixed(1)}%
                    </span>
                    <button class="btn-eliminar-historial" onclick="eliminarRegistroHistorial(${item.id})" title="Eliminar del historial">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </div>`;
    }).join('');
}

function filtrarHistorial() {
    const texto = document.getElementById('inputBusquedaRendimiento')?.value.toLowerCase().trim() || '';
    const cat = document.getElementById('selectFiltroCategoria')?.value || '';

    let filtrados = [...historialRendimiento];

    if (texto) {
        filtrados = filtrados.filter(item =>
            item.ingrediente.toLowerCase().includes(texto)
        );
    }

    if (cat) {
        // Asumiendo que item tiene categoría o que podemos sacarla
        // Por ahora filtramos por ingrediente que es lo principal
    }

    renderizarHistorial(filtrados);
}

function buscarSugerenciasMaster(texto) {
    const contenedor = document.getElementById('resultadosBusquedaRend');
    if (!contenedor) return;

    if (!texto || texto.length < 2) {
        contenedor.innerHTML = '';
        contenedor.classList.add('oculto');
        return;
    }

    // Filtrar en productosDisponibles
    const sugerencias = productosDisponibles.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(texto))
    ).slice(0, 8); // Limitar a 8

    if (sugerencias.length === 0) {
        contenedor.innerHTML = '';
        contenedor.classList.add('oculto');
        return;
    }

    contenedor.innerHTML = `
        <div style="padding: 10px 15px; background: #f8fafc; font-size: 11px; font-weight: 700; color: #718096; border-bottom: 2px solid #edf2f7; text-transform: uppercase; letter-spacing: 0.5px;">
            Sugerencias del Maestro de Productos
        </div>
        ${sugerencias.map(p => `
            <div class="resultado-sugerencia-rend" onclick="window.seleccionarProductoMaster('${p.nombre.replace(/'/g, "\\'")}')">
                <div class="prod-nombre">
                    <i class="fa-solid fa-plus-circle" style="color: #38a169; margin-right: 8px;"></i>${p.nombre}
                </div>
                <div class="prod-meta">
                    <span class="prod-tag">${p.categoria_nombre || 'General'}</span>
                </div>
            </div>
        `).join('')}
    `;

    contenedor.classList.remove('oculto');
}

window.seleccionarProductoMaster = (nombre) => {
    // 1. Limpiar e hidratar modal
    abrirModal();
    document.getElementById('modalInputIngrediente').value = nombre;

    // 2. Limpiar búsqueda
    document.getElementById('resultadosBusquedaRend').classList.add('oculto');
    document.getElementById('inputBusquedaRendimiento').value = '';
    filtrarHistorial(); // Restaurar lista completa
};

// --- GUARDAR ---

async function guardarAnalisis() {
    if (registrosRendimiento.length === 0) {
        showNotification('No hay registros para guardar', 'warning');
        return;
    }

    const observaciones = document.getElementById('textareaObservacionesRend')?.value || '';
    const fechaHoy = new Date().toISOString().split('T')[0];

    // Preparar payload
    const payload = registrosRendimiento.map(reg => ({
        ...reg,
        fecha: fechaHoy,
        observaciones: observaciones
    }));

    // Guardar en Backend
    const exito = await guardarDatosBackend(payload);

    if (exito) {
        showNotification('✅ Análisis guardado en la nube correctamente', 'success');

        // Limpiar UI
        registrosRendimiento = [];
        document.getElementById('textareaObservacionesRend').value = '';
        renderizarTabla();
        ocultarBotonesAccion();

        // Recargar historial real
        await cargarDatosLocales();
    }
}

// --- UTILIDADES ---

function getClaseRendimiento(valor) {
    if (valor >= 75) return 'rendimiento-alto';
    if (valor >= 50) return 'rendimiento-medio';
    return 'rendimiento-bajo';
}

function getClaseMerma(valor) {
    if (valor >= 40) return 'rendimiento-bajo';
    if (valor >= 25) return 'rendimiento-medio';
    return 'rendimiento-alto';
}

function mostrarBotonesAccion() {
    document.getElementById('btnLimpiarRendimiento')?.classList.remove('oculto');
    document.getElementById('btnGuardarRendimiento')?.classList.remove('oculto');
}

function ocultarBotonesAccion() {
    document.getElementById('btnLimpiarRendimiento')?.classList.add('oculto');
    document.getElementById('btnGuardarRendimiento')?.classList.add('oculto');
}
