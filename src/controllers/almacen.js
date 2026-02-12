import {
    filtrarPorCategoria,
    filtrarPorProveedor,
    buscarProducto,
    ordenarPorPrecio,
    comprobarStockMinimo,
    renderizarCategorias,
    renderizarProveedores
} from '../utils/funciones.js';

import { getProductos, getCategorias, getProveedores } from '../services/apiService.js';
import { showNotification } from '../utils/notifications.js';
import {
    productoTieneAlergenos,
    verificarPreferencias,
    filtrarListaPorAlergenos
} from '../utils/alergenosUtils.js';

let productos = [];
let categorias = [];
let proveedores = [];
let vista = [];
let gridInstance = null;

// Helper para normalizar datos (clonar array para no mutar el original en filtros)
function normalizarDatos(data) {
    return data.map(item => ({ ...item }));
}

// Formateador de caducidad (sin emojis, estilo profesional)
function procesarCaducidad(fechaStr) {
    if (!fechaStr || fechaStr === "NULL" || fechaStr === "Sin fecha") {
        return { texto: '-', clase: 'text-muted', dot: '' };
    }
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dif = Math.ceil((fecha - hoy) / (86400000));
    const fechaTexto = fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    if (dif < 0) {
        return {
            texto: 'Caducado',
            clase: 'text-status-danger',
            dot: '<span class="status-dot status-dot--danger"></span>'
        };
    } else if (dif <= 30) {
        return {
            texto: fechaTexto,
            clase: 'text-status-warning',
            dot: '<span class="status-dot status-dot--warning"></span>'
        };
    }
    return { texto: fechaTexto, clase: 'text-muted', dot: '' };
}

const columnasGrid = [
    {
        id: 'id',
        name: 'ID',
        width: '80px',
        formatter: (cell) => window.gridjs.html(`<span class="col-id">${cell}</span>`)
    },
    {
        id: 'nombre',
        name: 'Producto',
        formatter: (cell, row) => {
            const id = row.cells[0].data;
            // Necesitamos el objeto producto completo para la verificación
            // Como Grid.js trabaja con datos ya normalizados, podemos buscarlo
            const p = productos.find(prod => prod.id == id) || {};
            const verificacion = productoTieneAlergenos(p);

            if (verificacion.tiene) {
                return window.gridjs.html(`
                    <div class="col-name" title="Contiene: ${verificacion.alergenos.join(', ')}">
                        <i class="fa-solid fa-triangle-exclamation" style="color: #e53e3e; margin-right: 5px;"></i>
                        ${cell}
                    </div>
                `);
            }
            return window.gridjs.html(`<span class="col-name">${cell}</span>`);
        }
    },
    { id: 'nombreCategoria', name: 'Categoria' },
    {
        id: 'precio',
        name: 'Precio',
        formatter: (cell) => window.gridjs.html(`<span class="col-price">${Number(cell).toFixed(2)} &euro;</span>`)
    },
    {
        id: 'stock',
        name: 'Stock',
        formatter: (cell, row) => {
            const stock = Number(cell);
            const min = Number(row.cells[5].data);

            if (stock <= min) {
                return window.gridjs.html(
                    `<span class="col-stock text-status-warning"><span class="status-dot status-dot--warning"></span>${stock}</span>`
                );
            }
            return window.gridjs.html(`<span class="col-stock text-status-ok">${stock}</span>`);
        }
    },
    { id: 'stockMinimo', name: 'Min', hidden: true },
    {
        id: 'fechaCaducidad',
        name: 'Caducidad',
        formatter: (cell) => {
            const info = procesarCaducidad(cell);
            return window.gridjs.html(`<span class="${info.clase}">${info.dot}${info.texto}</span>`);
        }
    },
    { id: 'nombreProveedor', name: 'Proveedor' }
];

export async function cargarDatos() {
    try {
        const [resProd, resCat, resProv] = await Promise.all([
            getProductos(), getCategorias(), getProveedores()
        ]);
        categorias = resCat;
        proveedores = resProv;

        // Normalización para Supabase (unifica nombres de campos)
        productos = resProd.map(p => ({
            ...p,
            nombreCategoria: categorias.find(c => c.id == (p.categoriaid || p.categoriaId))?.nombre || 'General',
            nombreProveedor: proveedores.find(pr => pr.id == (p.proveedorid || p.proveedorId))?.nombre || 'N/A',
            fechaCaducidad: p.fechacaducidad || p.fechaCaducidad || null,
            stockMinimo: p.stockminimo || p.stockMinimo || 0,
            stock: p.stock || 0
        }));

        renderizarCategorias(categorias);
        renderizarProveedores(proveedores);
        vista = [...productos];
        renderizarTabla();
        actualizarResumen();
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

async function renderizarTabla() {
    const contenedor = document.getElementById('grid-inventario');
    if (!contenedor) return;

    console.log('🔄 Actualizando grid con', vista.length, 'productos');

    // Si ya existe instancia, actualizar datos o destruir
    if (gridInstance) {
        try {
            gridInstance.updateConfig({
                data: vista
            }).forceRender();
            console.log('🔄 Grid actualizado con', vista.length, 'productos');
            return;
        } catch (e) {
            console.warn('⚠️ Error al actualizar grid existente, intentando destruir y recrear:', e);
            gridInstance.destroy();
            gridInstance = null; // Reset instance
        }
    }

    // Limpiar el contenedor completamente
    contenedor.innerHTML = '';

    // Crear nueva instancia de Grid.js
    gridInstance = new window.gridjs.Grid({
        columns: columnasGrid,
        data: vista,
        pagination: { limit: 10, summary: true },
        sort: true,
        className: {
            tr: (row) => {
                const stock = Number(row.cells[4].data);
                const min = Number(row.cells[5].data);
                const fechaStr = row.cells[6].data;

                // Prioridad 1: Caducado
                if (fechaStr && fechaStr !== 'NULL' && fechaStr !== 'Sin fecha') {
                    const fecha = new Date(fechaStr);
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    if (fecha < hoy) return 'row-danger';
                }

                // Prioridad 2: Stock bajo
                if (stock <= min) return 'row-warning';

                return '';
            },
            table: 'tabla-grid-custom',
            td: 'celda-grid'
        },
        language: {
            'search': { 'placeholder': 'Buscar...' },
            'pagination': {
                'previous': 'Anterior',
                'next': 'Siguiente',
                'showing': 'Mostrando',
                'of': 'de',
                'to': 'a',
                'results': () => 'resultados'
            },
            'noRecordsFound': 'No hay productos que coincidan'
        }
    });

    gridInstance.render(contenedor);
    console.log('✅ Grid actualizado y renderizado con', vista.length, 'productos');
}

function actualizarResumen() {
    const resumenDiv = document.getElementById('resumenInventario');
    if (!resumenDiv) return;

    const total = vista.length;
    const bajos = vista.filter(p => Number(p.stock) <= (Number(p.stockMinimo))).length;
    const valor = vista.reduce((acc, p) => acc + (Number(p.precio) * Number(p.stock)), 0);

    resumenDiv.innerHTML = `
        <div class="resumen-item">📦 Total: <span class="resumen-valor">${total}</span></div>
        <div class="resumen-item" style="color: ${bajos > 0 ? '#e53e3e' : 'inherit'}">⚠️ Stock Bajo: <span class="resumen-valor">${bajos}</span></div>
        <div class="resumen-item">💰 Valor: <span class="resumen-valor">${valor.toFixed(2)} €</span></div>
    `;
}

// --- FILTROS Y EVENTOS ---

function aplicarFiltros() {
    console.log('🔧 Aplicando filtros...');

    const busq = document.getElementById('busqueda')?.value || '';
    const cat = document.getElementById('categoriaSelect')?.value || '';
    const prov = document.getElementById('proveedorSelect')?.value || '';
    const orden = document.getElementById('ordenSelect')?.value || 'asc';

    console.log('📋 Filtros activos:', { busqueda: busq, categoria: cat, proveedor: prov, orden: orden });
    console.log(`📦 Productos iniciales: ${productos.length}`);

    let filtrados = normalizarDatos(productos);

    // Aplicar filtrado estricto por alérgenos si está activo
    filtrados = filtrarListaPorAlergenos(filtrados);

    if (busq) {
        filtrados = buscarProducto(filtrados, busq);
        console.log(`🔍 Después de buscar "${busq}": ${filtrados.length} productos`);
    }
    if (cat) {
        filtrados = filtrarPorCategoria(filtrados, cat);
        console.log(`🏷️ Después de filtrar por categoría "${cat}": ${filtrados.length} productos`);
    }
    if (prov) {
        filtrados = filtrarPorProveedor(filtrados, prov);
        console.log(`🚚 Después de filtrar por proveedor "${prov}": ${filtrados.length} productos`);
    }

    filtrados = ordenarPorPrecio(filtrados, orden);
    console.log(`📊 Después de ordenar por precio (${orden}): ${filtrados.length} productos`);

    vista = filtrados;
    renderizarTabla();
    actualizarResumen();

    console.log(`✅ Filtros aplicados. Total mostrado: ${vista.length} productos`);
}

export async function inicializarEventos() {
    console.log('🎯 Iniciando eventos de inventario...');

    // Esperar a que el DOM esté completamente listo
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        // Escuchar cambios en todos los controles
        const controles = ['#busqueda', '#categoriaSelect', '#proveedorSelect', '#ordenSelect'];
        let controlesConectados = 0;

        controles.forEach(id => {
            const el = document.querySelector(id);
            if (el) {
                const ev = (id === '#busqueda') ? 'keyup' : 'change';
                el.addEventListener(ev, aplicarFiltros);
                console.log(`✅ Event listener agregado a ${id}`);
                controlesConectados++;
            } else {
                console.warn(`⚠️ Elemento ${id} no encontrado en el DOM`);
            }
        });

        // Botón de Stock Bajo
        const btnStock = document.getElementById('btnStock');
        if (btnStock) {
            btnStock.addEventListener('click', function () {
                console.log('🔍 Filtrando productos con stock bajo...');
                try {
                    vista = normalizarDatos(productos).filter(p => Number(p.stock) <= Number(p.stockMinimo));
                    renderizarTabla();
                    actualizarResumen();
                    console.log(`✅ Filtro aplicado: ${vista.length} productos con stock bajo`);
                } catch (error) {
                    console.error('❌ Error al filtrar stock bajo:', error);
                }
            });
            console.log('✅ Event listener agregado a btnStock');
        } else {
            console.error('❌ Botón btnStock NO encontrado en el DOM');
            console.log('ℹ️ Todos los botones en el DOM:',
                Array.from(document.querySelectorAll('button')).map(b => b.id || b.textContent.trim()));
        }

        // Botón de Próximo a Caducar
        const btnProximo = document.getElementById('btnProximoCaducar');
        if (btnProximo) {
            btnProximo.addEventListener('click', function () {
                console.log('📅 Filtrando productos próximos a caducar...');
                try {
                    const hoy = new Date();
                    hoy.setHours(0, 0, 0, 0);
                    const treintaDias = new Date(hoy);
                    treintaDias.setDate(treintaDias.getDate() + 30);

                    vista = normalizarDatos(productos).filter(p => {
                        if (!p.fechaCaducidad || p.fechaCaducidad === "NULL") return false;
                        const fechaCad = new Date(p.fechaCaducidad);
                        return fechaCad > hoy && fechaCad <= treintaDias;
                    });

                    renderizarTabla();
                    actualizarResumen();
                    console.log(`✅ Filtro aplicado: ${vista.length} productos próximos a caducar`);
                } catch (error) {
                    console.error('❌ Error al filtrar próximos a caducar:', error);
                }
            });
            console.log('✅ Event listener agregado a btnProximoCaducar');
        } else {
            console.error('❌ Botón btnProximoCaducar NO encontrado en el DOM');
        }

        // Botón Mostrar Todos
        const btnMostrarTodos = document.getElementById('btnMostrarTodos');
        if (btnMostrarTodos) {
            btnMostrarTodos.addEventListener('click', function () {
                console.log('🔄 Limpiando filtros y mostrando todos los productos...');
                try {
                    // Reset de selects
                    document.querySelectorAll('.controles-filtros select').forEach(s => s.selectedIndex = 0);
                    const busquedaInput = document.getElementById('busqueda');
                    if (busquedaInput) busquedaInput.value = '';
                    vista = normalizarDatos(productos);
                    renderizarTabla();
                    actualizarResumen();
                    console.log(`✅ Filtros limpiados: ${vista.length} productos totales`);
                } catch (error) {
                    console.error('❌ Error al limpiar filtros:', error);
                }
            });
            console.log('✅ Event listener agregado a btnMostrarTodos');
        } else {
            console.error('❌ Botón btnMostrarTodos NO encontrado en el DOM');
        }

        console.log(`✅ Eventos inicializados correctamente`);
        console.log(`📊 Resumen: ${controlesConectados}/4 controles conectados`);

        // Verificar si tenemos productos cargados
        if (productos && productos.length > 0) {
            console.log(`📦 ${productos.length} productos disponibles para filtrar`);
        } else {
            console.warn('⚠️ No hay productos cargados aún');
        }

    } catch (error) {
        console.error('❌ Error crítico al inicializar eventos:', error);
        console.error('Stack:', error.stack);
        showNotification('Error al inicializar los controles de inventario', 'error');
    }
}
