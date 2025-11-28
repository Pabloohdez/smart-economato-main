import { getCategorias, getProveedores, crearProducto } from "../services/apiService.js";

let listaProductosTemporal = []; // Aquí guardamos los datos antes de enviarlos

export async function initIngreso() {
    console.log("Iniciando módulo de ingreso...");
    
    // 1. Cargar Selects (Categorías y Proveedores)
    await cargarSelects();

    // 2. Configurar Eventos
    document.getElementById("btnAgregarLista").addEventListener("click", agregarALista);
    document.getElementById("btnLimpiarLista").addEventListener("click", limpiarLista);
    document.getElementById("btnGuardarTodo").addEventListener("click", guardarEnBaseDeDatos);
}

async function cargarSelects() {
    const catSelect = document.getElementById("selectCategoria");
    const provSelect = document.getElementById("selectProveedor");

    try {
        const [categorias, proveedores] = await Promise.all([getCategorias(), getProveedores()]);

        catSelect.innerHTML = '<option value="">Seleccionar...</option>';
        categorias.forEach(c => {
            catSelect.innerHTML += `<option value="${c.nombre}">${c.nombre}</option>`;
        });

        provSelect.innerHTML = '<option value="">Seleccionar...</option>';
        proveedores.forEach(p => {
            provSelect.innerHTML += `<option value="${p.nombre}">${p.nombre}</option>`;
        });
    } catch (error) {
        console.error("Error cargando selects:", error);
    }
}

function agregarALista() {
    // Leer valores
    const nombre = document.getElementById("inputNombre").value.trim();
    const categoria = document.getElementById("selectCategoria").value;
    const precio = parseFloat(document.getElementById("inputPrecio").value);
    const stock = parseInt(document.getElementById("inputStock").value);
    const stockMin = parseInt(document.getElementById("inputStockMin").value);
    const proveedor = document.getElementById("selectProveedor").value;

    // Validaciones simples
    if (!nombre || !categoria || !proveedor || isNaN(precio)) {
        alert("Por favor completa todos los campos obligatorios.");
        return;
    }

    // Crear objeto producto
    const nuevoProducto = {
        nombre,
        categoria: { nombre: categoria }, // Ajusta según tu estructura de DB
        precio,
        stock: isNaN(stock) ? 0 : stock,
        stockMinimo: isNaN(stockMin) ? 5 : stockMin,
        proveedor: { nombre: proveedor } // Ajusta según tu estructura de DB
    };

    // Agregar al array
    listaProductosTemporal.push(nuevoProducto);

    // Renderizar y Limpiar
    renderizarTablaTemporal();
    limpiarInputs();
}

function renderizarTablaTemporal() {
    const tbody = document.getElementById("tbodyTemporal");
    const btnGuardar = document.getElementById("btnGuardarTodo");
    const btnLimpiar = document.getElementById("btnLimpiarLista");
    const contador = document.getElementById("contadorLista");

    tbody.innerHTML = "";

    if (listaProductosTemporal.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #a0aec0;">La lista está vacía.</td></tr>';
        btnGuardar.style.display = "none";
        btnLimpiar.style.display = "none";
        contador.textContent = "0 productos";
        return;
    }

    // Botones visibles
    btnGuardar.style.display = "inline-block";
    btnLimpiar.style.display = "inline-block";
    contador.textContent = `${listaProductosTemporal.length} productos listos`;

    // Pintar filas
    listaProductosTemporal.forEach((prod, index) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod.nombre}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod.categoria.nombre}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod.precio.toFixed(2)} €</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod.stock}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod.proveedor.nombre}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                <button class="btn-borrar-fila" data-index="${index}" style="background: #feb2b2; color: #c53030; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });

    // Eventos para borrar individualmente
    document.querySelectorAll(".btn-borrar-fila").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = e.target.closest("button").dataset.index;
            listaProductosTemporal.splice(idx, 1);
            renderizarTablaTemporal();
        });
    });
}

function limpiarInputs() {
    document.getElementById("inputNombre").value = "";
    document.getElementById("inputPrecio").value = "";
    document.getElementById("inputStock").value = "";
    document.getElementById("inputNombre").focus();
}

function limpiarLista() {
    if(confirm("¿Estás seguro de descartar toda la lista?")) {
        listaProductosTemporal = [];
        renderizarTablaTemporal();
    }
}

async function guardarEnBaseDeDatos() {
    const btnGuardar = document.getElementById("btnGuardarTodo");
    const mensaje = document.getElementById("mensajeEstado");

    if(!confirm(`¿Confirmas importar ${listaProductosTemporal.length} productos al inventario?`)) return;

    btnGuardar.disabled = true;
    btnGuardar.textContent = "Guardando...";
    mensaje.textContent = "Procesando...";
    mensaje.style.color = "blue";

    let guardados = 0;
    let errores = 0;

    // Procesamos uno por uno (o podrías usar Promise.all para paralelo)
    for (const producto of listaProductosTemporal) {
        try {
            await crearProducto(producto);
            guardados++;
        } catch (error) {
            console.error(error);
            errores++;
        }
    }

    // Resultado final
    btnGuardar.disabled = false;
    btnGuardar.textContent = "CONFIRMAR E IMPORTAR";
    
    if (errores === 0) {
        mensaje.textContent = `¡Éxito! Se guardaron ${guardados} productos.`;
        mensaje.style.color = "green";
        listaProductosTemporal = []; // Limpiamos la lista al terminar
        renderizarTablaTemporal();
    } else {
        mensaje.textContent = `Se guardaron ${guardados}, pero fallaron ${errores}. Revisa la consola.`;
        mensaje.style.color = "orange";
        // Opcional: Podrías dejar en la lista solo los que fallaron
    }
}