import { getProductos, getCategorias, getProveedores, actualizarProducto } from "../services/apiService.js";

let todosLosProductos = [];
let categorias = [];
let proveedores = [];
let productosRecepcion = []; // Lista de productos en la recepción actual
let productoSeleccionado = null; // Para el modal

export async function initRecepcion() {
    console.log("🚚 Iniciando módulo de recepción...");
    
    // Cargar datos
    await cargarDatos();
    
    // Mostrar fecha actual
    mostrarFechaActual();
    
    // Configurar eventos
    configurarEventos();
}

async function cargarDatos() {
    try {
        [todosLosProductos, categorias, proveedores] = await Promise.all([
            getProductos(),
            getCategorias(),
            getProveedores()
        ]);
        
        // Cargar filtros
        cargarFiltros();
        console.log("✅ Datos cargados:", {
            productos: todosLosProductos.length,
            categorias: categorias.length,
            proveedores: proveedores.length
        });
    } catch (error) {
        console.error("❌ Error cargando datos:", error);
    }
}

function mostrarFechaActual() {
    const fecha = new Date();
    const opciones = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById("fechaActual").textContent = 
        fecha.toLocaleDateString('es-ES', opciones);
}

function cargarFiltros() {
    const selectProveedor = document.getElementById("selectProveedorFiltro");
    const selectCategoria = document.getElementById("selectCategoriaFiltro");
    
    // Proveedores
    selectProveedor.innerHTML = '<option value="">Todos los proveedores</option>';
    proveedores.forEach(p => {
        selectProveedor.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
    });
    
    // Categorías
    selectCategoria.innerHTML = '<option value="">Todas las categorías</option>';
    categorias.forEach(c => {
        selectCategoria.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
}

function configurarEventos() {
    // Búsqueda
    document.getElementById("btnBuscarProducto").addEventListener("click", buscarProductos);
    document.getElementById("inputBusquedaProducto").addEventListener("keypress", (e) => {
        if (e.key === 'Enter') buscarProductos();
    });
    
    // Filtros
    document.getElementById("selectProveedorFiltro").addEventListener("change", buscarProductos);
    document.getElementById("selectCategoriaFiltro").addEventListener("change", buscarProductos);
    
    // Botones principales
    document.getElementById("btnCancelarRecepcion").addEventListener("click", cancelarRecepcion);
    document.getElementById("btnGuardarRecepcion").addEventListener("click", confirmarRecepcion);
    
    // Modal
    document.getElementById("btnModalCancelar").addEventListener("click", cerrarModal);
    document.getElementById("btnModalConfirmar").addEventListener("click", confirmarCantidadModal);
    document.getElementById("modalInputCantidad").addEventListener("keypress", (e) => {
        if (e.key === 'Enter') confirmarCantidadModal();
    });
}

function buscarProductos() {
    const textoBusqueda = document.getElementById("inputBusquedaProducto").value.trim().toLowerCase();
    const proveedorId = document.getElementById("selectProveedorFiltro").value;
    const categoriaId = document.getElementById("selectCategoriaFiltro").value;
    
    let resultados = [...todosLosProductos];
    
    // Filtrar por texto
    if (textoBusqueda) {
        resultados = resultados.filter(p => 
            p.nombre.toLowerCase().includes(textoBusqueda) ||
            p.codigoBarras?.includes(textoBusqueda)
        );
    }
    
    // Filtrar por proveedor
    if (proveedorId) {
        resultados = resultados.filter(p => p.proveedorId === proveedorId);
    }
    
    // Filtrar por categoría
    if (categoriaId) {
        resultados = resultados.filter(p => p.categoriaId === categoriaId);
    }
    
    mostrarResultados(resultados);
}

function mostrarResultados(productos) {
    const contenedor = document.getElementById("resultadosBusqueda");
    
    if (productos.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #a0aec0;">
                <i class="fa-solid fa-search" style="font-size: 32px; margin-bottom: 10px;"></i>
                <p>No se encontraron productos</p>
            </div>
        `;
        contenedor.classList.remove("oculto");
        return;
    }
    
    contenedor.innerHTML = productos.map(p => {
        const stockBajo = p.stock < p.stockMinimo;
        const proveedor = proveedores.find(prov => prov.id === p.proveedorId);
        const categoria = categorias.find(cat => cat.id === p.categoriaId);
        
        return `
            <div class="item-resultado" data-producto-id="${p.id}">
                <div class="info-producto-resultado">
                    <div class="nombre-producto-resultado">${p.nombre}</div>
                    <div class="detalles-producto-resultado">
                        ${categoria?.nombre || 'Sin categoría'} • 
                        ${proveedor?.nombre || 'Sin proveedor'} • 
                        ${p.precio.toFixed(2)} €
                    </div>
                </div>
                <div class="stock-producto-resultado ${stockBajo ? 'stock-bajo' : 'stock-normal'}">
                    Stock: ${p.stock}
                </div>
            </div>
        `;
    }).join('');
    
    contenedor.classList.remove("oculto");
    
    // Eventos de clic en resultados
    contenedor.querySelectorAll(".item-resultado").forEach(item => {
        item.addEventListener("click", () => {
            const productoId = item.dataset.productoId;
            seleccionarProducto(productoId);
        });
    });
}

function seleccionarProducto(productoId) {
    const producto = todosLosProductos.find(p => p.id === productoId);
    if (!producto) return;
    
    // Verificar si ya está en la recepción
    const yaExiste = productosRecepcion.find(p => p.id === productoId);
    if (yaExiste) {
        alert("Este producto ya está en la recepción. Puedes modificar la cantidad en la tabla.");
        return;
    }
    
    // Abrir modal para cantidad
    productoSeleccionado = producto;
    abrirModal(producto);
}

function abrirModal(producto) {
    document.getElementById("modalNombreProducto").textContent = producto.nombre;
    document.getElementById("modalInputCantidad").value = "1";
    document.getElementById("modalCantidad").classList.remove("oculto");
    document.getElementById("modalInputCantidad").focus();
}

function cerrarModal() {
    document.getElementById("modalCantidad").classList.add("oculto");
    productoSeleccionado = null;
}

function confirmarCantidadModal() {
    const cantidad = parseInt(document.getElementById("modalInputCantidad").value);
    
    if (!cantidad || cantidad <= 0) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }
    
    agregarProductoRecepcion(productoSeleccionado, cantidad);
    cerrarModal();
}

function agregarProductoRecepcion(producto, cantidad) {
    const proveedor = proveedores.find(p => p.id === producto.proveedorId);
    
    productosRecepcion.push({
        ...producto,
        cantidadRecibida: cantidad,
        subtotal: producto.precio * cantidad,
        nombreProveedor: proveedor?.nombre || "Sin proveedor"
    });
    
    renderizarTablaRecepcion();
    limpiarBusqueda();
    mostrarBotones();
}

function renderizarTablaRecepcion() {
    const tbody = document.getElementById("tbodyRecepcion");
    const tfoot = document.getElementById("tfootRecepcion");
    
    if (productosRecepcion.length === 0) {
        tbody.innerHTML = `
            <tr class="fila-vacia">
                <td colspan="8">
                    <div class="mensaje-vacio">
                        <i class="fa-solid fa-inbox"></i>
                        <p>No hay productos en la recepción actual</p>
                        <small>Busca y selecciona productos para comenzar</small>
                    </div>
                </td>
            </tr>
        `;
        tfoot.classList.add("oculto");
        return;
    }
    
    tbody.innerHTML = productosRecepcion.map((p, index) => `
        <tr>
            <td><strong>${p.nombre}</strong></td>
            <td>${p.nombreProveedor}</td>
            <td>${p.stock}</td>
            <td>
                <input 
                    type="number" 
                    class="input-cantidad-recepcion" 
                    value="${p.cantidadRecibida}" 
                    min="1"
                    data-index="${index}"
                >
            </td>
            <td class="stock-nuevo">${p.stock + p.cantidadRecibida}</td>
            <td>${p.precio.toFixed(2)} €</td>
            <td><strong>${p.subtotal.toFixed(2)} €</strong></td>
            <td>
                <button class="btn-eliminar-item" data-index="${index}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // Calcular total
    const total = productosRecepcion.reduce((sum, p) => sum + p.subtotal, 0);
    document.getElementById("totalRecepcion").textContent = `${total.toFixed(2)} €`;
    tfoot.classList.remove("oculto");
    
    // Eventos
    tbody.querySelectorAll(".input-cantidad-recepcion").forEach(input => {
        input.addEventListener("change", (e) => {
            actualizarCantidad(parseInt(e.target.dataset.index), parseInt(e.target.value));
        });
    });
    
    tbody.querySelectorAll(".btn-eliminar-item").forEach(btn => {
        btn.addEventListener("click", (e) => {
            eliminarProductoRecepcion(parseInt(e.target.closest("button").dataset.index));
        });
    });
    
    // Actualizar info de proveedor
    actualizarInfoProveedor();
}

function actualizarCantidad(index, nuevaCantidad) {
    if (nuevaCantidad <= 0) {
        alert("La cantidad debe ser mayor a 0");
        renderizarTablaRecepcion();
        return;
    }
    
    productosRecepcion[index].cantidadRecibida = nuevaCantidad;
    productosRecepcion[index].subtotal = productosRecepcion[index].precio * nuevaCantidad;
    renderizarTablaRecepcion();
}

function eliminarProductoRecepcion(index) {
    if (confirm("¿Eliminar este producto de la recepción?")) {
        productosRecepcion.splice(index, 1);
        renderizarTablaRecepcion();
        
        if (productosRecepcion.length === 0) {
            ocultarBotones();
        }
    }
}

function actualizarInfoProveedor() {
    const proveedoresUnicos = [...new Set(productosRecepcion.map(p => p.nombreProveedor))];
    const nombreProveedor = document.getElementById("nombreProveedorActual");
    
    if (proveedoresUnicos.length === 1) {
        nombreProveedor.textContent = proveedoresUnicos[0];
    } else if (proveedoresUnicos.length > 1) {
        nombreProveedor.textContent = "Múltiples proveedores";
    } else {
        nombreProveedor.textContent = "Sin seleccionar";
    }
}

function limpiarBusqueda() {
    document.getElementById("inputBusquedaProducto").value = "";
    document.getElementById("resultadosBusqueda").classList.add("oculto");
}

function mostrarBotones() {
    document.getElementById("btnCancelarRecepcion").classList.remove("oculto");
    document.getElementById("btnGuardarRecepcion").classList.remove("oculto");
}

function ocultarBotones() {
    document.getElementById("btnCancelarRecepcion").classList.add("oculto");
    document.getElementById("btnGuardarRecepcion").classList.add("oculto");
}

function cancelarRecepcion() {
    if (confirm("¿Estás seguro de cancelar esta recepción? Se perderán todos los datos.")) {
        productosRecepcion = [];
        document.getElementById("textareaObservaciones").value = "";
        renderizarTablaRecepcion();
        ocultarBotones();
        mostrarMensaje("Recepción cancelada", "orange");
    }
}

async function confirmarRecepcion() {
    if (productosRecepcion.length === 0) {
        alert("No hay productos para recepcionar");
        return;
    }
    
    const observaciones = document.getElementById("textareaObservaciones").value.trim();
    const total = productosRecepcion.reduce((sum, p) => sum + p.subtotal, 0);
    
    const confirmacion = confirm(
        `¿Confirmar recepción de ${productosRecepcion.length} productos por un total de ${total.toFixed(2)} €?`
    );
    
    if (!confirmacion) return;
    
    // Deshabilitar botón
    const btnGuardar = document.getElementById("btnGuardarRecepcion");
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    
    let exitosos = 0;
    let errores = 0;
    
    // Actualizar stock de cada producto
    for (const productoRecepcion of productosRecepcion) {
        try {
            const productoActualizado = {
                ...productoRecepcion,
                stock: productoRecepcion.stock + productoRecepcion.cantidadRecibida,
                // Eliminar campos temporales
                cantidadRecibida: undefined,
                subtotal: undefined,
                nombreProveedor: undefined
            };
            
            // Limpiar propiedades undefined
            Object.keys(productoActualizado).forEach(key => 
                productoActualizado[key] === undefined && delete productoActualizado[key]
            );
            
            await actualizarProducto(productoRecepcion.id, productoActualizado);
            exitosos++;
            console.log(`✅ Stock actualizado: ${productoRecepcion.nombre}`);
        } catch (error) {
            console.error(`❌ Error actualizando ${productoRecepcion.nombre}:`, error);
            errores++;
        }
    }
    
    // Restaurar botón
    btnGuardar.disabled = false;
    btnGuardar.innerHTML = '<i class="fa-solid fa-check-circle"></i> CONFIRMAR RECEPCIÓN';
    
    // Mostrar resultado
    if (errores === 0) {
        mostrarMensaje(`✅ Recepción completada: ${exitosos} productos actualizados`, "green");
        
        // Limpiar todo
        productosRecepcion = [];
        document.getElementById("textareaObservaciones").value = "";
        renderizarTablaRecepcion();
        ocultarBotones();
        
        // Recargar datos
        await cargarDatos();
        
        setTimeout(() => {
            alert("Recepción completada exitosamente. Los stocks han sido actualizados.");
        }, 500);
    } else {
        mostrarMensaje(
            `⚠️ Recepción parcial: ${exitosos} exitosos, ${errores} errores. Revisa la consola.`,
            "orange"
        );
    }
}

function mostrarMensaje(texto, color) {
    const mensaje = document.getElementById("mensajeEstadoRecepcion");
    mensaje.textContent = texto;
    mensaje.style.background = 
        color === "green" ? "#f0fff4" : 
        color === "orange" ? "#fffaf0" : "#fff5f5";
    mensaje.style.color = 
        color === "green" ? "#2f855a" : 
        color === "orange" ? "#c05621" : "#c53030";
    mensaje.style.border = `2px solid ${
        color === "green" ? "#9ae6b4" : 
        color === "orange" ? "#fbd38d" : "#fc8181"
    }`;
    
    setTimeout(() => {
        mensaje.textContent = "";
        mensaje.style.background = "transparent";
        mensaje.style.border = "none";
    }, 5000);
}