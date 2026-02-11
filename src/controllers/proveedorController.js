import { getProveedores } from "../services/apiService.js";

const API_URL = 'http://localhost:8080/api/proveedores.php';

let listaProveedores = []; // Almacenar datos cargados para edición

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

async function cargarTablaProveedores() {
    const gridElement = document.getElementById('gridProveedores');

    if (!gridElement) return;

    if (typeof gridjs === 'undefined') {
        gridElement.innerHTML = '<p class="error">Error: GridJS no está cargado.</p>';
        return;
    }

    try {
        const response = await fetch(API_URL);
        const json = await response.json();

        gridElement.innerHTML = '';

        if (json.success) {
            listaProveedores = json.data; // Guardar datos globalmente

            new gridjs.Grid({
                columns: ['Nombre', 'Contacto', 'Teléfono', 'Email',
                    {
                        name: 'Acciones',
                        formatter: (cell, row) => {
                            // Usamos el índice de la fila para obtener el ID real o usamos row.cells si estuviera disponible
                            // Pero lo más limpio en GridJS con datos remotos es difícil sin ID en columna oculta.
                            // Aquí tenemos listaProveedores sincronizada por índice si el orden no cambia.
                            // Mejor: busquemos el proveedor por nombre (asumiendo únicos) o confiemos en el objeto.
                            // CORRECTO: row.cells[0].data es el Nombre.
                            // AUN MEJOR: GridJS data puede ser objetos.
                            // Vamos a buscar el proveedor en listaProveedores que coincida.
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
                        'results': () => 'resultados'
                    }
                }
            }).render(gridElement);
        } else {
            console.error("Error en respuesta API:", json);
            gridElement.innerHTML = '<p>Error al cargar proveedores.</p>';
        }
    } catch (error) {
        console.error("Error cargando proveedores:", error);
        gridElement.innerHTML = '<p>Error de conexión.</p>';
    }
}

async function guardarProveedor(event) {
    if (event) event.preventDefault();

    const id = document.getElementById('idProveedor').value;
    const nombre = document.getElementById('nombreProv').value;
    const contacto = document.getElementById('contactoProv').value;
    const telefono = document.getElementById('telefonoProv').value;
    const email = document.getElementById('emailProv').value;

    if (!nombre) return alert("El nombre es obligatorio");

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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const json = await res.json();

        if (json.success) {
            alert(id ? "Proveedor actualizado correctamente" : "Proveedor creado correctamente");
            cerrarModalProveedor();
            cargarTablaProveedores(); 
        } else {
            alert("Error: " + (json.error?.message || json.message || "Desconocido"));
        }
    } catch (e) {
        alert("Error de conexión");
        console.error(e);
    }
}
