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
            catSelect.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });

        provSelect.innerHTML = '<option value="">Seleccionar...</option>';
        proveedores.forEach(p => {
            provSelect.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
    } catch (error) {
        console.error("Error cargando selects:", error);
    }
}

function agregarALista() {
    // Leer valores
    const nombre = document.getElementById("inputNombre").value.trim();
    const categoriaId = document.getElementById("selectCategoria").value;
    const precio = parseFloat(document.getElementById("inputPrecio").value);
    const stock = parseInt(document.getElementById("inputStock").value);
    const stockMin = parseInt(document.getElementById("inputStockMin").value);
    const proveedorId = document.getElementById("selectProveedor").value;

    // Validaciones simples
    if (!nombre || !categoriaId || !proveedorId || isNaN(precio)) {
        alert("Por favor completa todos los campos obligatorios.");
        return;
    }

    // Obtener el nombre de la categoría y proveedor para mostrar en la tabla
    const categoriaNombre = document.getElementById("selectCategoria").selectedOptions[0].text;
    const proveedorNombre = document.getElementById("selectProveedor").selectedOptions[0].text;

    // Crear objeto producto CON EL FORMATO EXACTO DEL db.json
    const nuevoProducto = {
        nombre: nombre,
        precio: precio,
        precioUnitario: "unidad", // Puedes añadir un campo para esto si quieres
        stock: isNaN(stock) ? 0 : stock,
        stockMinimo: isNaN(stockMin) ? 5 : stockMin,
        categoriaId: categoriaId,
        proveedorId: proveedorId,
        unidadMedida: "unidad", // Por defecto
        marca: "Sin marca", // Por defecto
        codigoBarras: generarCodigoBarras(),
        fechaCaducidad: "2024-12-31", // Por defecto
        alergenos: [],
        descripcion: "",
        imagen: "producto-generico.jpg",
        activo: true,
        // Datos temporales para mostrar en la tabla
        _tempCategoriaNombre: categoriaNombre,
        _tempProveedorNombre: proveedorNombre
    };

    // Agregar al array
    listaProductosTemporal.push(nuevoProducto);

    // Renderizar y Limpiar
    renderizarTablaTemporal();
    limpiarInputs();
}

function generarCodigoBarras() {
    // Genera un código de barras simple (8410001 + 6 dígitos aleatorios)
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `8410001${random}`;
}

function renderizarTablaTemporal() {
    const tbody = document.getElementById("tbodyTemporal");
    const btnGuardar = document.getElementById("btnGuardarTodo");
    const btnLimpiar = document.getElementById("btnLimpiarLista");
    const contador = document.getElementById("contadorLista");

    tbody.innerHTML = "";

    if (listaProductosTemporal.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #a0aec0;">La lista está vacía.</td></tr>';
        btnGuardar.classList.add("oculto");
        btnLimpiar.classList.add("oculto");
        contador.textContent = "0 productos";
        return;
    }

    // Botones visibles
    btnGuardar.classList.remove("oculto");
    btnLimpiar.classList.remove("oculto");
    contador.textContent = `${listaProductosTemporal.length} productos listos`;

    // Pintar filas
    listaProductosTemporal.forEach((prod, index) => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod.nombre}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod._tempCategoriaNombre}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod.precio.toFixed(2)} €</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod.stock}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${prod._tempProveedorNombre}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                <button class="btn-borrar-fila" data-index="${index}">
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
    document.getElementById("inputStockMin").value = "";
    document.getElementById("selectCategoria").value = "";
    document.getElementById("selectProveedor").value = "";
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

    // Procesamos uno por uno
    for (const producto of listaProductosTemporal) {
        try {
            // Eliminar los campos temporales antes de enviar
            const productoLimpio = {
                nombre: producto.nombre,
                precio: producto.precio,
                precioUnitario: producto.precioUnitario,
                stock: producto.stock,
                stockMinimo: producto.stockMinimo,
                categoriaId: producto.categoriaId,
                proveedorId: producto.proveedorId,
                unidadMedida: producto.unidadMedida,
                marca: producto.marca,
                codigoBarras: producto.codigoBarras,
                fechaCaducidad: producto.fechaCaducidad,
                alergenos: producto.alergenos,
                descripcion: producto.descripcion,
                imagen: producto.imagen,
                activo: producto.activo
            };

            await crearProducto(productoLimpio);
            guardados++;
            console.log(`✅ Producto guardado: ${producto.nombre}`);
        } catch (error) {
            console.error(`❌ Error guardando ${producto.nombre}:`, error);
            errores++;
        }
    }

    // Resultado final
    btnGuardar.disabled = false;
    btnGuardar.textContent = "CONFIRMAR E IMPORTAR";
    
    if (errores === 0) {
        mensaje.textContent = `¡Éxito! Se guardaron ${guardados} productos correctamente.`;
        mensaje.style.color = "green";
        listaProductosTemporal = []; // Limpiamos la lista al terminar
        renderizarTablaTemporal();
        
        // Mensaje adicional
        setTimeout(() => {
            alert("Productos importados exitosamente. Puedes volver al inventario para verlos.");
        }, 500);
    } else {
        mensaje.textContent = `Se guardaron ${guardados}, pero fallaron ${errores}. Revisa la consola.`;
        mensaje.style.color = "orange";
    }
}