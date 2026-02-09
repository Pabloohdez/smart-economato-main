// src/controllers/almacen.js

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

let productos = [];
let categorias = [];
let proveedores = [];
let vista = [];
let gridInstance = null;

/**
 * Procesa la fecha de caducidad para devolver el texto y la clase CSS correcta
 */
function procesarCaducidad(fechaStr) {
    if (!fechaStr || fechaStr === "NULL" || fechaStr === "Sin fecha") {
        return { texto: 'Sin fecha', clase: 'badge-fecha-normal' };
    }

    const fecha = new Date(fechaStr);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dif = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

    if (dif < 0) return { texto: '⚠️ CADUCADO', clase: 'badge-caducado' };
    if (dif <= 7) return { texto: `⚠️ ${dif}d`, clase: 'badge-caducado' };
    if (dif <= 30) return { texto: `⏰ ${dif}d`, clase: 'badge-proximo-caducar' };

    return {
        texto: fecha.toLocaleDateString('es-ES'),
        clase: 'badge-fecha-normal'
    };
}

/**
 * Configuración de las columnas para Grid.js
 */
const columnasGrid = [
    { id: 'id', name: 'ID', width: '80px' },
    { id: 'nombre', name: 'Nombre' },
    { id: 'nombreCategoria', name: 'Categoría' },
    {
        id: 'precio',
        name: 'Precio',
        formatter: (cell) => window.gridjs.html(`<span style="color: #2f855a; font-weight: bold;">${Number(cell).toFixed(2)} €</span>`)
    },
    {
        id: 'stock',
        name: 'Stock',
        width: '100px',
        formatter: (cell, row) => {
            const stock = Number(cell);
            const stockMin = Number(row.cells[5].data); // Columna stockMinimo (oculta)
            const clase = stock <= stockMin ? 'badge-stock-bajo' : 'badge-stock-ok';
            const icono = stock <= stockMin ? '⚠️ ' : '✓ ';
            return window.gridjs.html(`<span class="${clase}">${icono}${stock}</span>`);
        }
    },
    { id: 'stockMinimo', name: 'Min', hidden: true },
    {
        id: 'fechaCaducidad',
        name: 'Caducidad',
        formatter: (cell) => {
            const info = procesarCaducidad(cell);
            return window.gridjs.html(`<span class="${info.clase}">${info.texto}</span>`);
        }
    },
    { id: 'nombreProveedor', name: 'Proveedor' }
];

/**
 * Normaliza los datos que vienen de Supabase (minúsculas) y hace los JOINS manuales
 */
function normalizarDatos(lista) {
    if (!Array.isArray(lista)) return [];
    return lista.map(p => {
        const cat = categorias.find(c => c.id == (p.categoriaid || p.categoriaId)) || {};
        const prov = proveedores.find(pr => pr.id == (p.proveedorid || p.proveedorId)) || {};

        return {
            ...p,
            nombreCategoria: cat.nombre || p.categoria_nombre || 'General',
            nombreProveedor: prov.nombre || p.proveedor_nombre || 'N/A',
            // Corregimos nombres para Grid.js
            fechaCaducidad: p.fechacaducidad || p.fechaCaducidad || null,
            stockMinimo: p.stockminimo || p.stockMinimo || 0,
            stock: p.stock || 0
        };
    });
}

export async function cargarDatos() {
    const contenedor = document.getElementById('grid-inventario');
    if (contenedor) contenedor.innerHTML = '<div style="text-align:center; padding:20px;">Cargando inventario de Supabase...</div>';

    try {
        // Carga en paralelo
        const [resProd, resCat, resProv] = await Promise.all([
            getProductos(),
            getCategorias(),
            getProveedores()
        ]);

        productos = resProd;
        categorias = resCat;
        proveedores = resProv;

        vista = normalizarDatos(productos);

        renderizarCategorias(categorias);
        renderizarProveedores(proveedores);

        actualizarGrid();
        actualizarResumen();

    } catch (error) {
        console.error("❌ Error cargando datos:", error);
        if (contenedor) contenedor.innerHTML = '<div style="color:red; text-align:center;">Error de conexión con la API</div>';
    }
}

function actualizarGrid() {
    const contenedor = document.getElementById('grid-inventario');
    if (!contenedor || !window.gridjs) return;

    contenedor.innerHTML = '';

    gridInstance = new window.gridjs.Grid({
        columns: columnasGrid,
        data: vista,
        pagination: { limit: 10, summary: true },
        sort: true,
        className: {
            table: 'tabla-grid-custom',
            td: 'celda-grid'
        },
        language: {
            'search': { 'placeholder': 'Buscar...' },
            'pagination': { 'previous': 'Anterior', 'next': 'Siguiente' },
            'noRecordsFound': 'No hay productos que coincidan'
        }
    });

    gridInstance.render(contenedor);
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
    const busq = document.getElementById('busqueda')?.value || '';
    const cat = document.getElementById('categoriaSelect')?.value || '';
    const prov = document.getElementById('proveedorSelect')?.value || '';
    const orden = document.getElementById('ordenSelect')?.value || 'asc';

    let filtrados = normalizarDatos(productos);

    if (busq) filtrados = buscarProducto(filtrados, busq);
    if (cat) filtrados = filtrarPorCategoria(filtrados, cat);
    if (prov) filtrados = filtrarPorProveedor(filtrados, prov);

    filtrados = ordenarPorPrecio(filtrados, orden);

    vista = filtrados;
    actualizarGrid();
    actualizarResumen();
}

export function inicializarEventos() {
    // Escuchar cambios en todos los controles
    const controles = ['#busqueda', '#categoriaSelect', '#proveedorSelect', '#ordenSelect'];
    controles.forEach(id => {
        const el = document.querySelector(id);
        if (el) {
            const ev = (id === '#busqueda') ? 'keyup' : 'change';
            el.addEventListener(ev, aplicarFiltros);
        }
    });

    // Botón de Stock Bajo rápido
    document.getElementById('btnStock')?.addEventListener('click', () => {
        vista = normalizarDatos(productos).filter(p => Number(p.stock) <= Number(p.stockMinimo));
        actualizarGrid();
        actualizarResumen();
    });

    // Botón Mostrar Todos
    document.getElementById('btnMostrarTodos')?.addEventListener('click', () => {
        // Reset de selects
        document.querySelectorAll('.controless select').forEach(s => s.selectedIndex = 0);
        document.getElementById('busqueda').value = '';
        vista = normalizarDatos(productos);
        actualizarGrid();
        actualizarResumen();
    });
}