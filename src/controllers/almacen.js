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

// Configuración de columnas
const columnasGrid = [
    { id: 'id', name: 'ID', width: '50px' },
    { id: 'nombre', name: 'Nombre' },
    { 
        id: 'nombreCategoria', // Usamos el nombre procesado
        name: 'Categoría' 
    },
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
            // celda 5 es la columna stockMin 
            const stockMin = Number(row.cells[5].data); 
            
            if (stock <= stockMin) {
                return window.gridjs.html(`<span class="badge-stock-bajo">${stock}</span>`);
            }
            return window.gridjs.html(`<span class="badge-stock-ok">${stock}</span>`);
        }
    },
    { id: 'stockMinimo', name: 'Min', hidden: true }, 
    { 
        id: 'fechaCaducidad',
        name: 'Caducidad',
        formatter: (cell) => {
            if (!cell) return 'Sin fecha';
            return window.gridjs.html(`<span class="fecha-badge">${cell}</span>`);
        }
    },
    { 
        id: 'nombreProveedor', // Usamos el nombre procesado
        name: 'Proveedor' 
    }
];

// ESTA FUNCIÓN ES LA CLAVE: Normaliza los datos para arreglar la inconsistencia de IDs
function normalizarProductos(listaProductos) {
    return listaProductos.map(prod => {
        // 1. Averiguar el ID de categoría (puede venir en categoriaId o dentro de un objeto categoria)
        // Usamos '==' para que "1" sea igual a 1
        const catId = prod.categoriaId || (prod.categoria ? prod.categoria.id : null);
        const provId = prod.proveedorId || (prod.proveedor ? prod.proveedor.id : null);

        // 2. Buscar en los arrays maestros
        const catObj = categorias.find(c => c.id == catId);
        const provObj = proveedores.find(p => p.id == provId);

        // 3. Devolver un objeto enriquecido
        return {
            ...prod, // Mantiene datos originales
            // AÑADIMOS los objetos que faltan para que funcionen tus filtros de funciones.js
            categoria: catObj || { nombre: 'Desconocido' },
            proveedor: provObj || { nombre: 'Desconocido' },
            // AÑADIMOS los nombres planos para Grid.js
            nombreCategoria: catObj ? catObj.nombre : 'Desconocido',
            nombreProveedor: provObj ? provObj.nombre : 'Desconocido'
        };
    });
}

export async function cargarDatos() {
    try {
        // 1. Cargar todo
        productos = await getProductos();   
        categorias = await getCategorias();
        proveedores = await getProveedores();

        // 2. Normalizar (Esto arregla tus datos mezclados)
        // Sobreescribimos la variable 'productos' con la versión arreglada
        productos = normalizarProductos(productos);

        renderizarCategorias(categorias);
        renderizarProveedores(proveedores);
        
        // 3. Crear vista inicial ordenada
        vista = ordenarPorPrecio(productos, 'asc');

        // 4. Iniciar Grid
        const contenedor = document.getElementById('grid-inventario');
        if (contenedor && window.gridjs) {
            contenedor.innerHTML = '';
            
            gridInstance = new window.gridjs.Grid({
                columns: columnasGrid,
                data: vista, // Grid.js leerá 'nombreCategoria' y 'nombreProveedor' de aquí
                pagination: { limit: 20, summary: true },
                search: false,
                sort: false,
                language: { 
                    'pagination': { 
                        'previous': 'Anterior', 
                        'next': 'Siguiente', 
                        'showing': 'Mostrando', 
                        'results': () => 'resultados' 
                    } 
                },
                style: { 
                    table: { 'width': '100%' },
                    th: { 'background-color': '#b33131', 'color': 'white' }
                }
            });
            
            gridInstance.render(contenedor);

            // Fix accessibility: remove redundant title from pagination buttons
            const observer = new MutationObserver(() => {
                const buttons = contenedor.querySelectorAll('.gridjs-pagination button');
                buttons.forEach(btn => {
                    if (btn.title) btn.removeAttribute('title');
                });
            });
            observer.observe(contenedor, { childList: true, subtree: true });
        }

    } catch (error) {
        console.error("Error cargando datos:", error);

        // UI Error Handling
        const contenedor = document.getElementById('grid-inventario');
        const catSelect = document.querySelector('#categoriaSelect');
        const provSelect = document.querySelector('#proveedorSelect');

        if (contenedor) {
            contenedor.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: #fff5f5; border: 1px solid #c53030; border-radius: 8px; color: #c53030;">
                    <i class="fa-solid fa-server" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3 style="margin: 0; font-size: 20px;">Error de Conexión con el Servidor</h3>
                    <p style="margin: 10px 0;">No se pudo conectar con la base de datos. Asegúrate de que XAMPP (Apache/MySQL) está iniciado.</p>
                    <button onclick="location.reload()" style="padding: 8px 16px; background: #c53030; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                        <i class="fa-solid fa-rotate-right"></i> Reintentar
                    </button>
                    <div style="margin-top: 10px; font-size: 12px; color: #718096; white-space: pre-wrap;">Detalles: ${error.message}</div>
                </div>
            `;
        }

        if (catSelect) {
            catSelect.innerHTML = '<option>⚠️ Error de conexión</option>';
            catSelect.disabled = true;
        }

        if (provSelect) {
            provSelect.innerHTML = '<option>⚠️ Error de conexión</option>';
            provSelect.disabled = true;
        }
    }
}

function actualizarGrid() {
    if (gridInstance) {
        gridInstance.updateConfig({
            data: vista
        }).forceRender();
    }
}


function aplicarFiltrosGlobales() {
    const texto = document.querySelector('#busqueda')?.value || '';
    const catNombre = document.querySelector('#categoriaSelect')?.value || '';
    const provNombre = document.querySelector('#proveedorSelect')?.value || '';
    const orden = document.querySelector('#ordenSelect')?.value || 'asc';

    // 1. Empezamos con los productos normalizados
    let resultado = [...productos];

    // 2. Filtramos 'funciones.js' buscan p.categoria.nombre
    resultado = buscarProducto(resultado, texto);
    resultado = filtrarPorCategoria(resultado, catNombre);
    resultado = filtrarPorProveedor(resultado, provNombre);
    
    // 3. Ordenamos
    resultado = ordenarPorPrecio(resultado, orden);

    // 4. Actualizamos
    vista = resultado;
    actualizarGrid();
}

function handleStock() {
    vista = comprobarStockMinimo(vista);
    actualizarGrid();
}

function handleMostrarTodos() {
    const els = ['#busqueda', '#categoriaSelect', '#proveedorSelect', '#ordenSelect'];
    els.forEach(sel => {
        const el = document.querySelector(sel);
        if(el) el.value = (sel === '#ordenSelect') ? 'asc' : '';
    });
    aplicarFiltrosGlobales();
}

// Eventos
const eventMap = [
    { selector: '#btnBuscar', event: 'click', handler: aplicarFiltrosGlobales },
    { selector: '#busqueda', event: 'keyup', handler: aplicarFiltrosGlobales },
    { selector: '#categoriaSelect', event: 'change', handler: aplicarFiltrosGlobales },
    { selector: '#proveedorSelect', event: 'change', handler: aplicarFiltrosGlobales },
    { selector: '#ordenSelect', event: 'change', handler: aplicarFiltrosGlobales },
    { selector: '#btnStock', event: 'click', handler: handleStock },
    { selector: '#btnMostrarTodos', event: 'click', handler: handleMostrarTodos }
];

export function inicializarEventos() {
    setTimeout(() => {
        eventMap.forEach(({ selector, event, handler }) => {
            const el = document.querySelector(selector);
            if (el) {
                const clone = el.cloneNode(true);
                el.parentNode.replaceChild(clone, el);
                clone.addEventListener(event, handler);
            }
        });
    }, 100);
}