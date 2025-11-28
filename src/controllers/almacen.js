import {
  filtrarPorCategoria,
  filtrarPorProveedor,
  buscarProducto,
  ordenarPorPrecio,
  comprobarStockMinimo,
  renderizarTabla,
  renderizarCategorias,
  renderizarProveedores
} from '../utils/funciones.js';

import { getProductos, getCategorias, getProveedores } from '../services/apiService.js';

// Datos cargados desde la API
let productos = [];
export let categorias = [];
export let proveedores = [];

// Vista actual (lo que se ve en pantalla)
let vista = [];

export async function cargarDatos() {
  try {
    productos   = await getProductos();   
    categorias  = await getCategorias();
    proveedores = await getProveedores();

    renderizarCategorias(categorias);
    renderizarProveedores(proveedores);
    
    // Al inicio ordenamos por precio ascendente y mostramos todo
    vista = ordenarPorPrecio(productos, 'asc');  
    renderizarTabla(vista);
  } catch (error) {
    console.error("Error cargando datos iniciales:", error);
  }
}

// --- LÓGICA CENTRAL DE FILTRADO ---
// Esta función lee el estado de TODOS los inputs y aplica los filtros en orden.
function aplicarFiltrosGlobales() {
  const texto = document.querySelector('#busqueda').value;
  const categoria = document.querySelector('#categoriaSelect').value;
  const proveedor = document.querySelector('#proveedorSelect').value;
  const orden = document.querySelector('#ordenSelect').value;

  // 1. Empezamos con la lista completa original
  let resultado = [...productos];

  // 2. Filtros
  resultado = buscarProducto(resultado, texto);
  resultado = filtrarPorCategoria(resultado, categoria);
  resultado = filtrarPorProveedor(resultado, proveedor);

  // 3. Ordenamiento
  resultado = ordenarPorPrecio(resultado, orden);

  // 4. Actualizamos vista y renderizamos
  vista = resultado;
  renderizarTabla(vista);
}

// Handlers de eventos
function handleInputs() {
  aplicarFiltrosGlobales();
}

function handleStock() {
  // Filtramos solo los productos con stock bajo (sobre la vista actual o global)
  // Aquí optamos por filtrar sobre lo que el usuario ya está viendo
  vista = comprobarStockMinimo(vista);
  renderizarTabla(vista);
}

function handleMostrarTodos() {
  // Reseteamos los valores de los inputs visualmente
  const inputBusqueda = document.querySelector('#busqueda');
  const selectCat = document.querySelector('#categoriaSelect');
  const selectProv = document.querySelector('#proveedorSelect');
  const selectOrden = document.querySelector('#ordenSelect');

  if(inputBusqueda) inputBusqueda.value = '';
  if(selectCat) selectCat.value = '';
  if(selectProv) selectProv.value = '';
  if(selectOrden) selectOrden.value = 'asc';

  // Recargamos aplicando estos valores "vacíos" (es decir, mostrar todo)
  aplicarFiltrosGlobales();
}

// Mapeo de eventos
const eventMap = [
  { selector: '#btnBuscar', event: 'click', handler: handleInputs },
  { selector: '#busqueda', event: 'keyup', handler: handleInputs }, // Búsqueda en tiempo real
  { selector: '#categoriaSelect', event: 'change', handler: handleInputs },
  { selector: '#proveedorSelect', event: 'change', handler: handleInputs },
  { selector: '#ordenSelect', event: 'change', handler: handleInputs },
  { selector: '#btnStock', event: 'click', handler: handleStock },
  { selector: '#btnMostrarTodos', event: 'click', handler: handleMostrarTodos }
];

export function inicializarEventos() {
  eventMap.forEach(({ selector, event, handler }) => {
    const elemento = document.querySelector(selector);
    if (elemento) elemento.addEventListener(event, handler);
  });
}