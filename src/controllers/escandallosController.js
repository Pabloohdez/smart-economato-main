// src/controllers/escandallosController.js

import { getProductos } from "../services/apiService.js";
import { showNotification, showConfirm } from "../utils/notifications.js";

// Estado local
let escandallos = []; // Lista de recetas
let ingredientesReceta = []; // Ingredientes de la receta en edición
let todosLosProductos = []; // Para el selector de ingredientes

export async function initEscandallos() {
    console.log("👨‍🍳 Iniciando módulo de Escandallos...");

    // Cargar datos iniciales
    await cargarDatos();

    // Configurar eventos
    configurarEventos();

    // Renderizar tabla inicial
    renderizarTablaEscandallos();
}

async function cargarDatos() {
    // 1. Cargar productos (intentar)
    try {
        todosLosProductos = await getProductos();
        llenarSelectorIngredientes();
    } catch (error) {
        console.warn("No se pudieron cargar productos de la API, usando lista vacía.", error);
        showNotification("No se pudieron cargar productos de la API", 'warning');
        todosLosProductos = [];
    }

    // Asegurar que existe la SAL para los ejemplos
    if (!todosLosProductos.find(p => p.nombre === "Sal")) {
        todosLosProductos.push({ id: 999, nombre: "Sal", precio: 0.60, unidad: "kg" });
    }
    // Refrescar selector por si acaso se añadió la sal
    llenarSelectorIngredientes();

    // 2. Cargar escandallos (MOCK) - Siempre cargar para que se vea algo
    escandallos = [
        {
            id: 1,
            nombre: "Tortilla de Patatas",
            autor: "Admin",
            coste: 1.50,
            pvp: 8.00,
            items: [
                { producto_id: 101, nombre: "Huevos", cantidad: 4, precio: 0.20 },
                { producto_id: 102, nombre: "Patatas", cantidad: 1, precio: 0.50 },
                { producto_id: 103, nombre: "Aceite", cantidad: 0.1, precio: 2.00 },
                { producto_id: 999, nombre: "Sal", cantidad: 0.01, precio: 0.60 }
            ],
            elaboracion: "1. Pelar y cortar las patatas.\n2. Freír las patatas en abundante aceite.\n3. Batir los huevos con sal.\n4. Mezclar patatas con huevos.\n5. Cuajar la tortilla en la sartén."
        },
        {
            id: 2,
            nombre: "Ensalada Mixta",
            autor: "Admin",
            coste: 2.10,
            pvp: 9.50,
            items: [
                { producto_id: 201, nombre: "Lechuga", cantidad: 1, precio: 0.80 },
                { producto_id: 202, nombre: "Tomate", cantidad: 2, precio: 0.40 },
                { producto_id: 203, nombre: "Atún", cantidad: 1, precio: 0.90 },
                { producto_id: 999, nombre: "Sal", cantidad: 0.01, precio: 0.60 }
            ],
            elaboracion: "1. Lavar y trocear la lechuga.\n2. Cortar el tomate en gajos.\n3. Añadir el atún desmenuzado.\n4. Aliñar con aceite, vinagre y sal al gusto."
        },
        {
            id: 3,
            nombre: "Salmorejo Cordobés",
            autor: "Admin",
            coste: 1.85,
            pvp: 9.00,
            items: [
                { producto_id: 202, nombre: "Tomate", cantidad: 2, precio: 0.40 },
                { producto_id: 103, nombre: "Aceite", cantidad: 0.15, precio: 2.00 },
                { producto_id: 401, nombre: "Pan Duro", cantidad: 0.3, precio: 0.80 },
                { producto_id: 402, nombre: "Ajo", cantidad: 0.01, precio: 4.00 },
                { producto_id: 999, nombre: "Sal", cantidad: 0.02, precio: 0.60 }
            ],
            elaboracion: "1. Triturar los tomates con el ajo.\n2. Añadir el pan troceado y triturar más.\n3. Emulsionar con el aceite poco a poco.\n4. Corregir de sal y servir muy frío."
        },
        {
            id: 4,
            nombre: "Croquetas de Jamón",
            autor: "Admin",
            coste: 3.20,
            pvp: 12.00,
            items: [
                { producto_id: 501, nombre: "Leche", cantidad: 1, precio: 0.90 },
                { producto_id: 502, nombre: "Harina", cantidad: 0.15, precio: 0.70 },
                { producto_id: 503, nombre: "Mantequilla", cantidad: 0.1, precio: 6.00 },
                { producto_id: 504, nombre: "Jamón Serrano", cantidad: 0.2, precio: 15.00 },
                { producto_id: 999, nombre: "Sal", cantidad: 0.01, precio: 0.60 }
            ],
            elaboracion: "1. Tostar la harina en la mantequilla (roux).\n2. Añadir leche caliente poco a poco.\n3. Incorporar el jamón picado.\n4. Poner a punto de sal y nuez moscada.\n5. Enfriar, bolear, empanar y freír."
        }
    ];
}

function llenarSelectorIngredientes() {
    const select = document.getElementById("selectProductoIngrediente");
    if (!select) return;

    select.innerHTML = '<option value="">Buscar ingrediente...</option>';
    todosLosProductos.forEach(prod => {
        select.innerHTML += `<option value="${prod.id}" data-precio="${prod.precio}">${prod.nombre} (${prod.precio}€)</option>`;
    });
}

function configurarEventos() {
    // Botón Nueva Receta
    document.getElementById("btnNuevoEscandallo")?.addEventListener("click", () => cerrarAbrirModal());

    // Cerrar Modal
    document.getElementById("closeModalEscandallo")?.addEventListener("click", cerrarModal);
    document.getElementById("btnCancelarEscandallo")?.addEventListener("click", cerrarModal);

    // Añadir Ingrediente
    document.getElementById("btnAddIngrediente")?.addEventListener("click", agregarIngrediente);

    // Guardar Receta
    document.getElementById("formEscandallo")?.addEventListener("submit", guardarEscandallo);

    // Recalcular al cambiar PVP
    document.getElementById("pvpPlato")?.addEventListener("input", calcularTotales);

    // Buscador Receta
    document.getElementById("btnBuscarEscandallo")?.addEventListener("click", filtrarEscandallos);
    document.getElementById("busquedaEscandallos")?.addEventListener("keyup", (e) => {
        if (e.key === "Enter") filtrarEscandallos();
    });

    // Buscador Ingrediente
    document.getElementById("btnBuscarIngrediente")?.addEventListener("click", filtrarEscandallos);
    document.getElementById("busquedaIngrediente")?.addEventListener("keyup", (e) => {
        if (e.key === "Enter") filtrarEscandallos();
    });

    // Botón Mostrar Todo
    document.getElementById("btnMostrarTodo")?.addEventListener("click", () => {
        document.getElementById("busquedaEscandallos").value = "";
        document.getElementById("busquedaIngrediente").value = "";
        renderizarTablaEscandallos();
    });
}

// --- GESTIÓN DEL MODAL ---

function cerrarAbrirModal(escandallo = null, readonly = false) {
    const modal = document.getElementById("modalEscandallo");
    if (!modal) return;

    limpiarFormulario();

    const inputs = ["nombrePlato", "pvpPlato", "elaboracionPlato"];
    inputs.forEach(id => {
        document.getElementById(id).disabled = readonly;
    });

    const btnSave = document.querySelector(".btn-save");
    const panelIngredientes = document.querySelector(".calculadora-controls");

    if (readonly) {
        if (btnSave) btnSave.style.display = "none";
        if (panelIngredientes) panelIngredientes.style.display = "none";
        document.getElementById("tituloModalEscandallo").innerText = "Ver Receta";
    } else {
        if (btnSave) btnSave.style.display = "inline-flex";
        if (panelIngredientes) panelIngredientes.style.display = "flex";
        document.getElementById("tituloModalEscandallo").innerText = escandallo ? "Editar Receta" : "Nueva Receta";
    }

    if (escandallo) {
        // Modo Edición / Ver
        document.getElementById("editEscandalloId").value = escandallo.id;
        document.getElementById("nombrePlato").value = escandallo.nombre;
        document.getElementById("pvpPlato").value = escandallo.pvp;

        const elab = document.getElementById("elaboracionPlato");
        if (elab) elab.value = escandallo.elaboracion || "";

        ingredientesReceta = [...(escandallo.items || [])];
    }

    renderizarTablaIngredientes(readonly);
    calcularTotales();

    modal.style.display = "flex";
}

function cerrarModal() {
    const modal = document.getElementById("modalEscandallo");
    if (modal) modal.style.display = "none";
}

function limpiarFormulario() {
    document.getElementById("formEscandallo").reset();
    document.getElementById("editEscandalloId").value = "";
    ingredientesReceta = [];
    renderizarTablaIngredientes();
    calcularTotales();
}

// --- GESTIÓN DE INGREDIENTES ---

function agregarIngrediente() {
    const select = document.getElementById("selectProductoIngrediente");
    const inputCant = document.getElementById("cantidadIngrediente");

    const prodId = select.value;
    const cantidad = parseFloat(inputCant.value);

    if (!prodId || isNaN(cantidad) || cantidad <= 0) {
        showNotification("Selecciona un producto y una cantidad válida.", 'warning');
        return;
    }

    const producto = todosLosProductos.find(p => p.id == prodId);
    if (!producto) return;

    // Verificar si ya existe
    const existente = ingredientesReceta.find(i => i.producto_id == prodId);

    if (existente) {
        existente.cantidad += cantidad;
    } else {
        ingredientesReceta.push({
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: parseFloat(producto.precio),
            cantidad: cantidad
        });
    }

    // Resetear inputs pequeños
    select.value = "";
    inputCant.value = "";

    renderizarTablaIngredientes();
    calcularTotales();
}

function renderizarTablaIngredientes(readonly = false) {
    const tbody = document.getElementById("listaIngredientes");
    tbody.innerHTML = "";

    ingredientesReceta.forEach((ing, index) => {
        const costeTotal = ing.cantidad * ing.precio;

        const deleteBtn = readonly ? '' : `
            <button type="button" class="btn-eliminar-item" onclick="window.eliminarIngrediente(${index})">
                <i class="fa-solid fa-trash" style="color: #dc3545;"></i>
            </button>
        `;

        tbody.innerHTML += `
            <tr>
                <td>${ing.nombre}</td>
                <td>${ing.cantidad}</td>
                <td>${ing.precio.toFixed(2)} €</td>
                <td>${costeTotal.toFixed(2)} €</td>
                <td class="action-cell">
                    ${deleteBtn}
                </td>
            </tr>
        `;
    });
}

// Hacer global para acceder desde HTML onclick
window.eliminarIngrediente = (index) => {
    ingredientesReceta.splice(index, 1);
    renderizarTablaIngredientes();
    calcularTotales();
};

// --- CÁLCULOS ---

function calcularTotales() {
    // 1. Coste Total Ingredientes
    const costeTotal = ingredientesReceta.reduce((sum, ing) => sum + (ing.cantidad * ing.precio), 0);
    document.getElementById("costeTotalReceta").innerText = costeTotal.toFixed(2) + " €";

    // 2. Beneficios
    const pvp = parseFloat(document.getElementById("pvpPlato").value) || 0;

    let margen = 0;
    let beneficio = 0;

    if (pvp > 0) {
        beneficio = pvp - costeTotal;
        margen = ((beneficio / pvp) * 100);
    }

    document.getElementById("beneficioNeto").innerText = beneficio.toFixed(2) + " €";
    document.getElementById("margenBeneficio").innerText = margen.toFixed(1) + "%";

    // Colores semánticos
    const elMargen = document.getElementById("margenBeneficio");
    elMargen.className = "resumen-value"; // Reset base class
    if (margen < 20) elMargen.classList.add("text-danger");
    else if (margen < 50) elMargen.classList.add("text-warning");
    else elMargen.classList.add("text-success");
}

// --- GESTIÓN DE ESCANDALLOS (CRUD) ---

async function guardarEscandallo(e) {
    e.preventDefault();

    if (ingredientesReceta.length === 0) {
        showNotification("La receta debe tener al menos un ingrediente.", 'warning');
        return;
    }

    const id = document.getElementById("editEscandalloId").value;
    const nuevoEscandallo = {
        id: id ? parseInt(id) : Date.now(), // ID temporal
        nombre: document.getElementById("nombrePlato").value,
        pvp: parseFloat(document.getElementById("pvpPlato").value),
        coste: parseFloat(document.getElementById("costeTotalReceta").innerText),
        elaboracion: document.getElementById("elaboracionPlato")?.value || "",
        items: [...ingredientesReceta],
        autor: "Admin"
    };

    if (id) {
        const idx = escandallos.findIndex(x => x.id == id);
        if (idx !== -1) escandallos[idx] = nuevoEscandallo;
    } else {
        escandallos.push(nuevoEscandallo);
    }

    console.log("💾 Guardando receta:", nuevoEscandallo);

    // TODO: Enviar a API aquí
    // await fetch(API_URL + '/escandallos.php', { method: 'POST', body: ... })

    cerrarModal();
    renderizarTablaEscandallos();
    showNotification("Receta guardada correctamente (Local)", 'success');
}

function renderizarTablaEscandallos(lista = escandallos) {
    const tbody = document.getElementById("tabla-escandallos-cuerpo");
    if (!tbody) return;

    if (lista.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron recetas.</td></tr>';
        return;
    }

    tbody.innerHTML = lista.map(esc => {
        const margen = esc.pvp > 0 ? ((esc.pvp - esc.coste) / esc.pvp) * 100 : 0;

        return `
        <tr>
            <td class="font-bold text-primary clickable-name" onclick="window.verReceta(${esc.id})">
                ${esc.nombre}
            </td>
            <td>${esc.autor || 'Admin'}</td>
            <td>${esc.items ? esc.items.length : 0} ingredientes</td>
            <td>${esc.coste.toFixed(2)} €</td>
            <td>${esc.pvp.toFixed(2)} €</td>
            <td class="font-bold ${margen > 30 ? 'text-success' : 'text-danger'}">${margen.toFixed(1)}%</td>
            <td class="action-cell">
                <button class="btn-sm btn-primary" onclick="window.editarEscandallo(${esc.id})" title="Editar">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-sm btn-danger" onclick="window.eliminarEscandallo(${esc.id})" title="Eliminar">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        </tr>
        `;
    }).join('');
}

// Global para editar
window.editarEscandallo = (id) => {
    const esc = escandallos.find(x => x.id == id);
    if (esc) cerrarAbrirModal(esc, false);
};

// Global para ver (Solo lectura)
window.verReceta = (id) => {
    const esc = escandallos.find(x => x.id == id);
    if (esc) cerrarAbrirModal(esc, true);
};

// Global para eliminar
window.eliminarEscandallo = async (id) => {
    const esc = escandallos.find(x => x.id == id);
    if (!esc) {
        showNotification("Error: Receta no encontrada", 'error');
        return;
    }

    const confirmado = await showConfirm(`¿Eliminar la receta "${esc.nombre}"?\n\nEsta acción no se puede deshacer.`);
    if (!confirmado) return;

    const index = escandallos.findIndex(x => x.id == id);
    if (index !== -1) {
        escandallos.splice(index, 1);
        renderizarTablaEscandallos();
        showNotification("Receta eliminada correctamente", 'success');
    }
};

function filtrarEscandallos() {
    const textoReceta = document.getElementById("busquedaEscandallos").value.toLowerCase().trim();
    const textoIngrediente = document.getElementById("busquedaIngrediente").value.toLowerCase().trim();

    const filtrados = escandallos.filter(esc => {
        // Filtro por Nombre de Receta
        const coincideNombre = esc.nombre.toLowerCase().includes(textoReceta);

        // Filtro por Ingrediente
        let coincideIngrediente = true;
        if (textoIngrediente) {
            coincideIngrediente = esc.items.some(item => item.nombre.toLowerCase().includes(textoIngrediente));
        }

        return coincideNombre && coincideIngrediente;
    });

    renderizarTablaEscandallos(filtrados);
}

function mostrarError(msg) {
    showNotification(msg, 'error');
}
