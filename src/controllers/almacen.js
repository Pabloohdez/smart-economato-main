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

// Formateador de fecha y color para la columna Caducidad
function procesarCaducidad(fechaStr) {
    if (!fechaStr || fechaStr === "NULL" || fechaStr === "Sin fecha") {
        return { texto: 'Sin fecha', clase: 'badge-fecha-normal' };
    }
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dif = Math.ceil((fecha - hoy) / (86400000));

    let clase = 'badge-fecha-normal';
    let texto = fecha.toLocaleDateString('es-ES');

    if (dif < 0) { clase = 'badge-caducado'; texto = '⚠️ CADUCADO'; }
    else if (dif <= 7) { clase = 'badge-caducado'; texto = `⚠️ ${dif}d`; }
    else if (dif <= 30) { clase = 'badge-proximo-caducar'; texto = `⏰ ${dif}d`; }

    return { texto, clase };
}

const columnasGrid = [
    { id: 'id', name: 'ID', width: '80px' },
    { id: 'nombre', name: 'Nombre' },
    { id: 'nombreCategoria', name: 'Categoría' },
    {
        id: 'precio',
        name: 'Precio',
        formatter: (cell) => window.gridjs.html(`<span style="color:#2f855a; font-weight:bold;">${Number(cell).toFixed(2)} €</span>`)
    },
    {
        id: 'stock',
        name: 'Stock',
        formatter: (cell, row) => {
            const stock = Number(cell);
            const min = Number(row.cells[5].data); // Columna stockMinimo (oculta)
            const clase = stock <= min ? 'badge-stock-bajo' : 'badge-stock-ok';
            return window.gridjs.html(`<span class="${clase}">${stock <= min ? '⚠️ ' : ''}${stock}</span>`);
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
        actualizarGrid();
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

function actualizarGrid() {
    const contenedor = document.getElementById('grid-inventario');
    if (!contenedor) return;
    contenedor.innerHTML = '';

    gridInstance = new window.gridjs.Grid({
        columns: columnasGrid,
        data: vista,
        pagination: { limit: 10, summary: true },
        sort: true,
        className: {
            // ESTO ACTIVA LA FRANJA ROJA EN LA FILA COMPLETA
            tr: (row) => {
                const stock = Number(row.cells[4].data);
                const min = Number(row.cells[5].data);
                return stock <= min ? 'fila-alerta' : '';
            }
        }
    }).render(contenedor);
}

export function inicializarEventos() {
    // Filtros de búsqueda
    document.getElementById('busqueda')?.addEventListener('keyup', (e) => {
        vista = buscarProducto(productos, e.target.value);
        actualizarGrid();
    });

    // Botón Stock Bajo
    document.getElementById('btnStock')?.addEventListener('click', () => {
        vista = comprobarStockMinimo(productos);
        actualizarGrid();
    });

    // Botón Mostrar Todos
    document.getElementById('btnMostrarTodos')?.addEventListener('click', () => {
        vista = [...productos];
        actualizarGrid();
    });
}