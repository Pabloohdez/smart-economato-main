import { getProveedores } from "../services/apiService.js";

const API_URL = 'api/proveedores.php';

export async function initProveedores() {
    console.log("Iniciando módulo de Proveedores...");

    // 1. Cargar la lista inicial
    await cargarTablaProveedores();

    // 2. Hacer las funciones globales para que el HTML (onclick) las encuentre
    window.abrirModalProveedor = abrirModalProveedor;
    window.cerrarModalProveedor = cerrarModalProveedor;
    window.guardarProveedor = guardarProveedor;

    // 3. Event Listener del Formulario
    const form = document.getElementById('formProveedor');
    if (form) {
        form.removeEventListener('submit', guardarProveedor); // Prevenir duplicados si se recarga el módulo
        form.addEventListener('submit', guardarProveedor);
    }
}

// --- FUNCIONES DEL MODAL ---

function abrirModalProveedor() {
    const modal = document.getElementById('modalProveedor');
    if (modal) {
        modal.style.display = 'flex'; // Changed to flex for centering if css supports it, or match html
        document.getElementById('formProveedor').reset();
    } else {
        console.error("No se encuentra el modal con id='modalProveedor'");
    }
}

function cerrarModalProveedor() {
    const modal = document.getElementById('modalProveedor');
    if (modal) modal.style.display = 'none';
}

// --- LOGICA DE DATOS ---

async function cargarTablaProveedores() {
    const gridElement = document.getElementById('gridProveedores');

    if (!gridElement) {
        console.error("No se encuentra el elemento #gridProveedores");
        return;
    }

    // Verificar si GridJS está cargado
    if (typeof gridjs === 'undefined') {
        console.error("❌ GridJS no está cargado.");
        gridElement.innerHTML = '<p class="error">Error: GridJS no está cargado.</p>';
        return;
    }

    try {
        const response = await fetch(API_URL);
        const json = await response.json();

        gridElement.innerHTML = '';

        if (json.success) {
            new gridjs.Grid({
                columns: ['Nombre', 'Contacto', 'Teléfono', 'Email',
                    {
                        name: 'Acciones',
                        formatter: (cell, row) => {
                            return gridjs.html(`<button class="btn-editar" onclick="alert('Editar no implementado')"><i class="fa-solid fa-pen"></i></button>`);
                        }
                    }
                ],
                data: json.data.map(p => [
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
    // Si se llama desde el form submit
    if (event) event.preventDefault();

    const nombre = document.getElementById('nombreProv').value; // Match IDs in HTML
    const contacto = document.getElementById('contactoProv').value;
    const telefono = document.getElementById('telefonoProv').value;
    const email = document.getElementById('emailProv').value;
    // Direccion no está en el form HTML visible que vi, pero lo dejo por si acaso o lo ajusto
    // En el HTML user vi inputs con ids: nombreProv, contactoProv, telefonoProv, emailProv.
    // En el controller anterior usaban ids diferentes (nombreProveedor vs nombreProv). Ajustaré a lo que vi en HTML.

    if (!nombre) return alert("El nombre es obligatorio");

    const datos = { nombre, contacto, telefono, email };

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        const json = await res.json();

        if (json.success) {
            alert("Proveedor guardado correctamente");
            cerrarModalProveedor();
            cargarTablaProveedores(); // Recargar la lista
        } else {
            alert("Error: " + (json.error?.message || json.message || "Desconocido"));
        }
    } catch (e) {
        alert("Error de conexión");
        console.error(e);
    }
}