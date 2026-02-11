import { getProveedores } from "../services/apiService.js";
import { showNotification } from "../utils/notifications.js";

const API_URL = 'http://localhost:8080/api/proveedores.php';

let listaProveedores = []; // Almacenar datos cargados para edición
let gridInstance = null; // Almacenar instancia de GridJS para poder destruirla

export async function initProveedores() {
    console.log("Iniciando módulo de Proveedores...");

    // 1. Cargar la lista inicial
    await cargarTablaProveedores();

    // 2. Hacer las funciones globales para que el HTML (onclick) las encuentre
    window.abrirModalProveedor = abrirModalProveedor;
    window.cerrarModalProveedor = cerrarModalProveedor;
    window.guardarProveedor = guardarProveedor;
    window.editarProveedor = editarProveedor;

    // 3. Event Listener del Formulario
    const form = document.getElementById('formProveedor');
    if (form) {
        form.removeEventListener('submit', guardarProveedor);
        form.addEventListener('submit', guardarProveedor);
    }
}

// --- FUNCIONES DEL MODAL ---

function abrirModalProveedor() {
    const modal = document.getElementById('modalProveedor');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error("No se encuentra el modal con id='modalProveedor'");
        showNotification("Error: No se encuentra el modal de proveedores", 'error');
    }
}

function cerrarModalProveedor() {
    const modal = document.getElementById('modalProveedor');
    if (modal) modal.style.display = 'none';

    // Resetear formulario y título al cerrar
    document.getElementById('formProveedor').reset();
    document.getElementById('idProveedor').value = '';
    document.getElementById('modalTitle').textContent = "Nuevo Proveedor";
}

function editarProveedor(id) {
    const proveedor = listaProveedores.find(p => p.id == id);
    if (!proveedor) {
        console.error("Proveedor no encontrado:", id);
        showNotification("Error: Proveedor no encontrado", 'error');
        return;
    }

    // Rellenar formulario
    document.getElementById('idProveedor').value = proveedor.id;
    document.getElementById('nombreProv').value = proveedor.nombre;
    document.getElementById('contactoProv').value = proveedor.contacto || '';
    document.getElementById('telefonoProv').value = proveedor.telefono || '';
    document.getElementById('emailProv').value = proveedor.email || '';

    // Cambiar título del modal
    document.getElementById('modalTitle').textContent = "Editar Proveedor";

    // Abrir modal
    abrirModalProveedor();
}

// --- LOGICA DE DATOS ---

async function cargarTablaProveedores(forceReload = false) {
    const gridElement = document.getElementById('gridProveedores');

    if (!gridElement) return;

    if (typeof gridjs === 'undefined') {
        gridElement.innerHTML = '<p class="error">Error: GridJS no está cargado.</p>';
        return;
    }

    try {
        // Forzar recarga si se solicita
        const data = await getProveedores(forceReload);
        console.log('📊 Proveedores cargados:', data.length, 'items');
        const gridElement = document.getElementById('gridProveedores');

        if (gridElement) {
            // Destruir grid anterior si existe
            if (gridInstance) {
                try {
                    gridInstance.destroy();
                } catch (e) {
                    console.log('No se pudo destruir grid anterior:', e);
                }
            }

            gridElement.innerHTML = '';
            listaProveedores = data; // Guardar datos globalmente

            gridInstance = new gridjs.Grid({
                columns: ['Nombre', 'Contacto', 'Teléfono', 'Email',
                    {
                        name: 'Acciones',
                        formatter: (cell, row) => {
                            const p = listaProveedores.find(item => item.nombre === row.cells[0].data);
                            if (p) {
                                return gridjs.html(`<button class="btn-editar" onclick="editarProveedor('${p.id}')"><i class="fa-solid fa-pen"></i></button>`);
                            }
                            return null;
                        }
                    }
                ],
                data: listaProveedores.map(p => [
                    p.nombre,
                    p.contacto || '-',
                    p.telefono || '-',
                    p.email || '-',
                    null
                ]),
                search: true,
                pagination: { limit: 10 },
                language: {
                    'search': { 'placeholder': 'Buscar proveedor...' },
                    'pagination': {
                        'previous': 'Anterior',
                        'next': 'Siguiente',
                        'showing': 'Mostrando',
                        'of': 'de',
                        'to': 'a',
                        'results': () => 'resultados'
                    }
                }
            }).render(gridElement);
        }
    } catch (error) {
        console.error("Error cargando proveedores:", error);
        if (document.getElementById('gridProveedores')) document.getElementById('gridProveedores').innerHTML = '<p>Error de conexión.</p>';
        showNotification("Error cargando la lista de proveedores", 'error');
    }
}

async function guardarProveedor(event) {
    if (event) event.preventDefault();

    const id = document.getElementById('idProveedor').value;
    const nombre = document.getElementById('nombreProv').value;
    const contacto = document.getElementById('contactoProv').value;
    const telefono = document.getElementById('telefonoProv').value;
    const email = document.getElementById('emailProv').value;

    if (!nombre) return showNotification("El nombre del proveedor es obligatorio", 'warning');

    const datos = { nombre, contacto, telefono, email };
    let url = API_URL;
    let method = 'POST';

    // Si hay ID, es una edición (PUT)
    if (id) {
        url += `?id=${id}`;
        method = 'PUT';
    }

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(datos)
        });
        const json = await res.json();

        if (json.success) {
            showNotification(id ? "Proveedor actualizado correctamente" : "Proveedor creado correctamente", 'success');
            cerrarModalProveedor();

            // INVALIDAR CACHÉ y recargar tabla con datos frescos
            await cargarTablaProveedores(true);
        } else {
            showNotification("Error: " + (json.error?.message || json.message || "Desconocido"), 'error');
        }
    } catch (e) {
        showNotification("Error de conexión al guardar proveedor", 'error');
        console.error(e);
    }
}
