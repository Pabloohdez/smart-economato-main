import { getProductos, getCategorias, actualizarProducto } from "../services/apiService.js";

let todosLosProductos = [];
let categorias = [];
let productosBaja = []; // Lista de productos en la baja actual
let productoSeleccionado = null; // Para el modal

export async function initBajas() {
    console.log("⚠️ Iniciando módulo de bajas...");
    
    // Cargar datos
    await cargarDatos();
    
    // Mostrar fecha actual
    mostrarFechaActual();
    
    // Actualizar estadísticas
    actualizarEstadisticas();
    
    // Configurar eventos
    configurarEventos();
}

async function cargarDatos() {
    try {
        [todosLosProductos, categorias] = await Promise.all([
            getProductos(),
            getCategorias()
        ]);
        
        // Cargar filtros
        cargarFiltros();
        
        console.log("✅ Datos cargados:", {
            productos: todosLosProductos.length,
            categorias: categorias.length
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
    document.getElementById("fechaActualBajas").textContent = 
        fecha.toLocaleDateString('es-ES', opciones);
}

function actualizarEstadisticas() {
    // Estadísticas simuladas (en una app real vendrían de la BD)
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    
    // Simular roturas del mes
    const roturasMes = Math.floor(Math.random() * 15) + 5;
    document.getElementById("statRoturas").textContent = roturasMes;
    
    // Productos próximos a caducar o caducados
    const caducados = todosLosProductos.filter(p => {
        if (!p.fechaCaducidad) return false;
        const fechaCad = new Date(p.fechaCaducidad);
        return fechaCad <= hoy;
    });
    document.getElementById("statCaducados").textContent = caducados.length;
    
    // Mermas registradas (simulado)
    const mermas = Math.floor(Math.random() * 20) + 10;
    document.getElementById("statMermas").textContent = mermas;
    
    // Valor perdido total (simulado)
    const valorPerdido = (Math.random() * 500 + 200).toFixed(2);
    document.getElementById("statValorPerdido").textContent = `${valorPerdido} €`;
}

function cargarFiltros() {
    const selectCategoria = document.getElementById("selectCategoriaBaja");
    
    selectCategoria.innerHTML = '<option value="">Todas las categorías</option>';
    categorias.forEach(c => {
        selectCategoria.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
    });
}

function configurarEventos() {
    // Búsqueda
    document.getElementById("btnBuscarBaja").addEventListener("click", buscarProductos);
    document.getElementById("inputBusquedaBaja").addEventListener("keypress", (e) => {
        if (e.key === 'Enter') buscarProductos();
    });
    
    // Filtros
    document.getElementById("selectCategoriaBaja").addEventListener("change", buscarProductos);
    document.getElementById("btnProductosCaducados").addEventListener("click", mostrarProductosCaducados);
    
    // Botones principales
    document.getElementById("btnCancelarBaja").addEventListener("click", cancelarBaja);
    document.getElementById("btnConfirmarBaja").addEventListener("click", confirmarBaja);
    
    // Modal
    document.getElementById("btnModalCancelarBaja").addEventListener("click", cerrarModal);
    document.getElementById("btnModalConfirmarBaja").addEventListener("click", confirmarBajaModal);
    document.getElementById("modalInputCantidadBaja").addEventListener("input", validarCantidadModal);
}

function buscarProductos() {
    const textoBusqueda = document.getElementById("inputBusquedaBaja").value.trim().toLowerCase();
    const categoriaId = document.getElementById("selectCategoriaBaja").value;
    
    let resultados = [...todosLosProductos];
    
    // Filtrar por texto
    if (textoBusqueda) {
        resultados = resultados.filter(p => 
            p.nombre.toLowerCase().includes(textoBusqueda) ||
            p.codigoBarras?.includes(textoBusqueda)
        );
    }
    
    // Filtrar por categoría
    if (categoriaId) {
        resultados = resultados.filter(p => p.categoriaId === categoriaId);
    }
    
    mostrarResultados(resultados);
}

function mostrarProductosCaducados() {
    const hoy = new Date();
    const proximoMes = new Date(hoy);
    proximoMes.setDate(proximoMes.getDate() + 30);
    
    const productosCaducados = todosLosProductos.filter(p => {
        if (!p.fechaCaducidad) return false;
        const fechaCad = new Date(p.fechaCaducidad);
        return fechaCad <= proximoMes;
    });
    
    mostrarResultados(productosCaducados, true);
}

function mostrarResultados(productos, mostrarCaducidad = false) {
    const contenedor = document.getElementById("resultadosBusquedaBaja");
    
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
    
    const hoy = new Date();
    
    contenedor.innerHTML = productos.map(p => {
        const categoria = categorias.find(cat => cat.id === p.categoriaId);
        
        let badgeCaducidad = '';
        if (mostrarCaducidad && p.fechaCaducidad) {
            const fechaCad = new Date(p.fechaCaducidad);
            const diasRestantes = Math.ceil((fechaCad - hoy) / (1000 * 60 * 60 * 24));
            
            if (diasRestantes <= 0) {
                badgeCaducidad = `<span class="badge-caducidad caducidad-urgente">CADUCADO</span>`;
            } else if (diasRestantes <= 7) {
                badgeCaducidad = `<span class="badge-caducidad caducidad-urgente">${diasRestantes} días</span>`;
            } else if (diasRestantes <= 30) {
                badgeCaducidad = `<span class="badge-caducidad caducidad-proxima">${diasRestantes} días</span>`;
            }
        }
        
        return `
            <div class="item-resultado-baja" data-producto-id="${p.id}">
                <div class="info-producto-baja">
                    <div class="nombre-producto-baja">${p.nombre}</div>
                    <div class="detalles-producto-baja">
                        ${categoria?.nombre || 'Sin categoría'} • 
                        Stock: ${p.stock} • 
                        ${p.precio.toFixed(2)} €
                        ${badgeCaducidad}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    contenedor.classList.remove("oculto");
    
    // Eventos de clic en resultados
    contenedor.querySelectorAll(".item-resultado-baja").forEach(item => {
        item.addEventListener("click", () => {
            const productoId = item.dataset.productoId;
            seleccionarProducto(productoId);
        });
    });
}

function seleccionarProducto(productoId) {
    const producto = todosLosProductos.find(p => p.id === productoId);
    if (!producto) return;
    
    // Verificar si ya está en la baja
    const yaExiste = productosBaja.find(p => p.id === productoId);
    if (yaExiste) {
        alert("Este producto ya está en el registro de bajas. Puedes modificar los datos en la tabla.");
        return;
    }
    
    // Verificar stock disponible
    if (producto.stock <= 0) {
        alert("Este producto no tiene stock disponible para dar de baja.");
        return;
    }
    
    // Abrir modal para detalles
    productoSeleccionado = producto;
    abrirModal(producto);
}

function abrirModal(producto) {
    document.getElementById("modalNombreProductoBaja").textContent = producto.nombre;
    document.getElementById("modalSelectTipoBaja").value = "Rotura";
    document.getElementById("modalInputCantidadBaja").value = "1";
    document.getElementById("modalInputCantidadBaja").max = producto.stock;
    document.getElementById("modalStockDisponible").textContent = 
        `Stock disponible: ${producto.stock} unidades`;
    
    document.getElementById("modalDetalleBaja").classList.remove("oculto");
    document.getElementById("modalInputCantidadBaja").focus();
}

function cerrarModal() {
    document.getElementById("modalDetalleBaja").classList.add("oculto");
    productoSeleccionado = null;
}

function validarCantidadModal() {
    const input = document.getElementById("modalInputCantidadBaja");
    const cantidad = parseInt(input.value);
    const stockDisponible = productoSeleccionado.stock;
    
    if (cantidad > stockDisponible) {
        input.value = stockDisponible;
        alert(`La cantidad no puede superar el stock disponible (${stockDisponible})`);
    }
    
    if (cantidad < 1) {
        input.value = 1;
    }
}

function confirmarBajaModal() {
    const tipoBaja = document.getElementById("modalSelectTipoBaja").value;
    const cantidad = parseInt(document.getElementById("modalInputCantidadBaja").value);
    
    if (!cantidad || cantidad <= 0) {
        alert("Por favor, ingresa una cantidad válida.");
        return;
    }
    
    if (cantidad > productoSeleccionado.stock) {
        alert("La cantidad no puede superar el stock disponible.");
        return;
    }
    
    agregarProductoBaja(productoSeleccionado, tipoBaja, cantidad);
    cerrarModal();
}

function agregarProductoBaja(producto, tipoBaja, cantidad) {
    const categoria = categorias.find(c => c.id === producto.categoriaId);
    
    productosBaja.push({
        ...producto,
        tipoBaja: tipoBaja,
        cantidadBaja: cantidad,
        valorPerdido: producto.precio * cantidad,
        nombreCategoria: categoria?.nombre || "Sin categoría"
    });
    
    renderizarTablaBajas();
    limpiarBusqueda();
    mostrarBotones();
}

function renderizarTablaBajas() {
    const tbody = document.getElementById("tbodyBajas");
    const tfoot = document.getElementById("tfootBajas");
    
    if (productosBaja.length === 0) {
        tbody.innerHTML = `
            <tr class="fila-vacia">
                <td colspan="8">
                    <div class="mensaje-vacio">
                        <i class="fa-solid fa-inbox"></i>
                        <p>No hay productos registrados en esta baja</p>
                        <small>Busca y selecciona productos para comenzar</small>
                    </div>
                </td>
            </tr>
        `;
        tfoot.classList.add("oculto");
        return;
    }
    
    tbody.innerHTML = productosBaja.map((p, index) => {
        const claseTipo = {
            'Rotura': 'tipo-rotura',
            'Caducado': 'tipo-caducado',
            'Merma': 'tipo-merma',
            'Ajuste': 'tipo-ajuste',
            'Otro': 'tipo-otro'
        }[p.tipoBaja] || 'tipo-otro';
        
        return `
            <tr>
                <td><strong>${p.nombre}</strong><br><small style="color: #718096;">${p.nombreCategoria}</small></td>
                <td><span class="badge-tipo-baja ${claseTipo}">${p.tipoBaja}</span></td>
                <td>${p.stock}</td>
                <td><strong style="color: #c53030;">${p.cantidadBaja}</strong></td>
                <td class="stock-reducido">${p.stock - p.cantidadBaja}</td>
                <td>${p.precio.toFixed(2)} €</td>
                <td><strong style="color: #c53030;">${p.valorPerdido.toFixed(2)} €</strong></td>
                <td>
                    <button class="btn-eliminar-baja" data-index="${index}" aria-label="Eliminar ${p.nombre} de la lista de bajas">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    // Calcular total
    const total = productosBaja.reduce((sum, p) => sum + p.valorPerdido, 0);
    document.getElementById("totalValorBajas").textContent = `${total.toFixed(2)} €`;
    tfoot.classList.remove("oculto");
    
    // Eventos
    tbody.querySelectorAll(".btn-eliminar-baja").forEach(btn => {
        btn.addEventListener("click", (e) => {
            eliminarProductoBaja(parseInt(e.target.closest("button").dataset.index));
        });
    });
}

function eliminarProductoBaja(index) {
    if (confirm("¿Eliminar este producto del registro de bajas?")) {
        productosBaja.splice(index, 1);
        renderizarTablaBajas();
        
        if (productosBaja.length === 0) {
            ocultarBotones();
        }
    }
}

function limpiarBusqueda() {
    document.getElementById("inputBusquedaBaja").value = "";
    document.getElementById("resultadosBusquedaBaja").classList.add("oculto");
}

function mostrarBotones() {
    document.getElementById("btnCancelarBaja").classList.remove("oculto");
    document.getElementById("btnConfirmarBaja").classList.remove("oculto");
}

function ocultarBotones() {
    document.getElementById("btnCancelarBaja").classList.add("oculto");
    document.getElementById("btnConfirmarBaja").classList.add("oculto");
}

function cancelarBaja() {
    if (confirm("¿Estás seguro de cancelar este registro de bajas? Se perderán todos los datos.")) {
        productosBaja = [];
        document.getElementById("textareaMotivoBaja").value = "";
        renderizarTablaBajas();
        ocultarBotones();
        mostrarMensaje("Registro de bajas cancelado", "orange");
    }
}

async function confirmarBaja() {
    if (productosBaja.length === 0) {
        alert("No hay productos para dar de baja");
        return;
    }
    
    const motivo = document.getElementById("textareaMotivoBaja").value.trim();
    const totalValor = productosBaja.reduce((sum, p) => sum + p.valorPerdido, 0);
    
    const confirmacion = confirm(
        `¿Confirmar bajas de ${productosBaja.length} productos con un valor total de ${totalValor.toFixed(2)} €?\n\n` +
        `Esta acción reducirá el stock de los productos seleccionados.`
    );
    
    if (!confirmacion) return;
    
    // Deshabilitar botón
    const btnConfirmar = document.getElementById("btnConfirmarBaja");
    btnConfirmar.disabled = true;
    btnConfirmar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Procesando...';
    
    let exitosos = 0;
    let errores = 0;
    
    // Actualizar stock de cada producto
    for (const productoBaja of productosBaja) {
        try {
            const nuevoStock = productoBaja.stock - productoBaja.cantidadBaja;
            
            // Validación de seguridad
            if (nuevoStock < 0) {
                console.error(`❌ Stock negativo para ${productoBaja.nombre}`);
                errores++;
                continue;
            }
            
            const productoActualizado = {
                ...productoBaja,
                stock: nuevoStock,
                // Eliminar campos temporales
                tipoBaja: undefined,
                cantidadBaja: undefined,
                valorPerdido: undefined,
                nombreCategoria: undefined
            };
            
            // Limpiar propiedades undefined
            Object.keys(productoActualizado).forEach(key => 
                productoActualizado[key] === undefined && delete productoActualizado[key]
            );
            
            await actualizarProducto(productoBaja.id, productoActualizado);
            exitosos++;
            console.log(`✅ Baja registrada: ${productoBaja.nombre} (${productoBaja.cantidadBaja} unidades)`);
        } catch (error) {
            console.error(`❌ Error registrando baja de ${productoBaja.nombre}:`, error);
            errores++;
        }
    }
    
    // Restaurar botón
    btnConfirmar.disabled = false;
    btnConfirmar.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> CONFIRMAR BAJAS';
    
    // Mostrar resultado
    if (errores === 0) {
        mostrarMensaje(
            `✅ Bajas registradas correctamente: ${exitosos} productos actualizados`,
            "green"
        );
        
        // Limpiar todo
        productosBaja = [];
        document.getElementById("textareaMotivoBaja").value = "";
        renderizarTablaBajas();
        ocultarBotones();
        
        // Recargar datos y estadísticas
        await cargarDatos();
        actualizarEstadisticas();
        
        setTimeout(() => {
            alert(
                `Bajas registradas exitosamente.\n\n` +
                `• Productos afectados: ${exitosos}\n` +
                `• Valor total: ${totalValor.toFixed(2)} €\n\n` +
                `Los stocks han sido actualizados.`
            );
        }, 500);
    } else {
        mostrarMensaje(
            `⚠️ Registro parcial: ${exitosos} exitosos, ${errores} errores. Revisa la consola.`,
            "orange"
        );
    }
}

function mostrarMensaje(texto, color) {
    const mensaje = document.getElementById("mensajeEstadoBajas");
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