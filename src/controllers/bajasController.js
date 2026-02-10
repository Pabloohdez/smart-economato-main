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
    
    // Actualizar estadísticas e historial
    actualizarEstadisticas();
    cargarHistorialBajas();
    
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
        
        const contenedor = document.getElementById("contenedorResultadosBaja");
        const selectCategoria = document.getElementById("selectCategoriaBaja");

        if (contenedor) {
            contenedor.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; background: #fff5f5; border: 1px solid #c53030; border-radius: 8px; color: #c53030; grid-column: 1 / -1;">
                    <i class="fa-solid fa-server" style="font-size: 32px; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0; font-size: 18px;">Error de Conexión</h3>
                    <p style="margin: 5px 0; font-size: 14px;">No se pueden cargar los productos.</p>
                </div>
            `;
        }

        if (selectCategoria) {
            selectCategoria.innerHTML = '<option>⚠️ Error de conexión</option>';
            selectCategoria.disabled = true;
        }
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

async function actualizarEstadisticas() {
    // Cargar estadísticas reales del mes
    await cargarEstadisticasMes();
}

async function cargarEstadisticasMes() {
    try {
        const hoy = new Date();
        const mes = hoy.getMonth() + 1;
        const anio = hoy.getFullYear();
        
        console.log(`📊 Cargando estadísticas de bajas para ${mes}/${anio}...`);
        
        // Fetch bajas del mes actual
        const res = await fetch(`http://localhost:8080/api/bajas.php?mes=${mes}&anio=${anio}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        
        if (!json.success || !json.data) {
            console.warn('⚠️ No se pudieron cargar las bajas del mes');
            // Mostrar 0 en todas las estadísticas
            document.getElementById("statRoturas").textContent = '0';
            document.getElementById("statCaducados").textContent = '0';
            document.getElementById("statMermas").textContent = '0';
            document.getElementById("statValorPerdido").textContent = '0.00 €';
            return;
        }
        
        const bajasDelMes = json.data;
        
        // Calcular estadísticas reales basadas en las bajas
        const stats = {
            roturas: bajasDelMes.filter(b => b.tipoBaja === 'Rotura').length,
            caducados: bajasDelMes.filter(b => b.tipoBaja === 'Caducado').length,
            mermas: bajasDelMes.filter(b => b.tipoBaja === 'Merma').length,
            otros: bajasDelMes.filter(b => !['Rotura', 'Caducado', 'Merma'].includes(b.tipoBaja)).length,
            valorPerdido: bajasDelMes.reduce((sum, b) => {
                const precio = parseFloat(b.producto_precio) || 0;
                const cantidad = parseInt(b.cantidad) || 0;
                return sum + (precio * cantidad);
            }, 0)
        };
        
        // Actualizar DOM con estadísticas reales
        document.getElementById("statRoturas").textContent = stats.roturas;
        document.getElementById("statCaducados").textContent = stats.caducados;
        document.getElementById("statMermas").textContent = stats.mermas;
        document.getElementById("statValorPerdido").textContent = `${stats.valorPerdido.toFixed(2)} €`;
        
        console.log(`✅ Estadísticas del mes cargadas:`, stats);
        console.log(`📈 Total de bajas en ${mes}/${anio}: ${bajasDelMes.length}`);
        
   } catch (error) {
        console.error('❌ Error cargando estadísticas del mes:', error);
        // Mostrar 0 en caso de error
        document.getElementById("statRoturas").textContent = '0';
        document.getElementById("statCaducados").textContent = '0';
        document.getElementById("statMermas").textContent = '0';
        document.getElementById("statValorPerdido").textContent = '0.00 €';
    }
}

async function cargarHistorialBajas() {
    try {
        const hoy = new Date();
        const mes = hoy.getMonth() + 1;
        const anio = hoy.getFullYear();
        
        console.log(`📜 Cargando historial de bajas para ${mes}/${anio}...`);
        
        // Fetch bajas del mes actual
        const res = await fetch(`http://localhost:8080/api/bajas.php?mes=${mes}&anio=${anio}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        console.log('✅ Historial recibido:', json);
        
        const contenedor = document.getElementById('contenedorHistorial');
        
        if (!json.success || !json.data || json.data.length === 0) {
            contenedor.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No hay bajas registradas este mes</p>';
            return;
        }
        
        const bajas = json.data;
        
        // Crear HTML para cada baja
        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        
        bajas.forEach(baja => {
            const fecha = new Date(baja.fechaBaja);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric' 
            });
            const horaFormateada = fecha.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            // Clase CSS según el tipo de baja
            const claseTipo = {
                'Rotura': 'badge-tipo-baja tipo-rotura',
                'Caducado': 'badge-tipo-baja tipo-caducado',
                'Merma': 'badge-tipo-baja tipo-merma',
                'Ajuste': 'badge-tipo-baja tipo-ajuste',
                'Otro': 'badge-tipo-baja tipo-otro'
            }[baja.tipoBaja] || 'badge-tipo-baja tipo-otro';
            
            html += `
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <div>
                            <strong style="font-size: 16px;">${baja.producto_nombre || 'Producto desconocido'}</strong>
                            <div style="margin-top: 5px;">
                                <span class="${claseTipo}">${baja.tipoBaja}</span>
                            </div>
                        </div>
                        <div style="text-align: right; color: #718096; font-size: 14px;">
                            <div>${fechaFormateada}</div>
                            <div>${horaFormateada}</div>
                        </div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: #4a5568;">
                        <div><strong>Cantidad:</strong> ${baja.cantidad}</div>
                        <div><strong>Usuario:</strong> ${baja.usuario_nombre || 'Desconocido'}</div>
                        <div><strong>Precio Ud.:</strong> ${parseFloat(baja.producto_precio).toFixed(2)} €</div>
                        <div><strong>Total:</strong> ${(baja.cantidad * parseFloat(baja.producto_precio)).toFixed(2)} €</div>
                        <div style="grid-column: 1 / -1;"><strong>Motivo:</strong> ${baja.motivo || 'Sin especificar'}</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        contenedor.innerHTML = html;
        
        console.log(`✅ ${bajas.length} bajas mostradas en el historial`);
    } catch (error) {
        console.error('❌ Error cargando historial de bajas:', error);
        const contenedor = document.getElementById('contenedorHistorial');
        contenedor.innerHTML = '<p style="text-align: center; color: red; padding: 20px;">Error al cargar el historial</p>';
    }
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
            <div class="item-resultado-baja" data-producto-id="${p.id}" role="button" tabindex="0" aria-label="Seleccionar ${p.nombre}">
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
    
    // Eventos de clic y teclado en resultados (ACCESIBILIDAD)
    contenedor.querySelectorAll(".item-resultado-baja").forEach(item => {
        const seleccion = () => {
            const productoId = item.dataset.productoId;
            seleccionarProducto(productoId);
        };

        item.addEventListener("click", seleccion);
        
        item.addEventListener("keydown", (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                seleccion();
            }
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

// Variables para gestión de foco
let elementoPrevioFoco = null;

function abrirModal(producto) {
    // Guardar elemento que tenía el foco
    elementoPrevioFoco = document.activeElement;
    
    document.getElementById("modalNombreProductoBaja").textContent = producto.nombre;
    document.getElementById("modalSelectTipoBaja").value = "Rotura";
    document.getElementById("modalInputCantidadBaja").value = "1";
    document.getElementById("modalInputCantidadBaja").max = producto.stock;
    document.getElementById("modalStockDisponible").textContent = 
        `Stock disponible: ${producto.stock} unidades`;
    
    const modal = document.getElementById("modalDetalleBaja");
    modal.classList.remove("oculto");
    
    // Mover foco al primer elemento interactivo del modal
    document.getElementById("modalInputCantidadBaja").focus();
    
    // Añadir listener para trampa de foco
    modal.addEventListener('keydown', manejarFocoModal);
}

function cerrarModal() {
    const modal = document.getElementById("modalDetalleBaja");
    modal.classList.add("oculto");
    
    // Remover listener
    modal.removeEventListener('keydown', manejarFocoModal);
    
    productoSeleccionado = null;
    
    // Restaurar foco
    if (elementoPrevioFoco) {
        elementoPrevioFoco.focus();
        elementoPrevioFoco = null;
    }
}

function manejarFocoModal(e) {
    const modal = document.getElementById("modalDetalleBaja");
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.key === 'Tab') {
        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    if (e.key === 'Escape') {
        cerrarModal();
    }
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
                    <button class="btn-eliminar-baja" data-index="${index}">
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
    let errores = [];
    
    // Registrar cada baja usando el nuevo endpoint
    for (const productoBaja of productosBaja) {
        try {
            const payload = {
                productoId: productoBaja.id,
                cantidad: productoBaja.cantidadBaja,
                tipoBaja: productoBaja.tipoBaja,
                motivo: motivo || 'Sin especificar',
                usuarioId: 'admin1'
            };
            
            console.log('📤 Enviando baja:', payload);
            
            const res = await fetch('http://localhost:8080/api/bajas.php', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            
            if (data.success) {
                exitosos++;
                console.log(`✅ Baja registrada: ${productoBaja.nombre} (${productoBaja.cantidadBaja} unidades)`);
            } else {
                errores.push(`${productoBaja.nombre}: ${data.error || 'Error desconocido'}`);
                console.error(`❌ Error con ${productoBaja.nombre}:`, data.error);
            }
        } catch (error) {
            errores.push(`${productoBaja.nombre}: Error de red`);
            console.error(`❌ Error de red con ${productoBaja.nombre}:`, error);
        }
    }
    
    // Restaurar botón
    btnConfirmar.disabled = false;
    btnConfirmar.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> CONFIRMAR BAJAS';
    
    // Mostrar resultado
    if (errores.length === 0) {
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
        await actualizarEstadisticas();
        await cargarHistorialBajas(); // Actualizar historial
        
        setTimeout(() => {
            alert(
                `Bajas registradas exitosamente.\n\n` +
                `• Productos afectados: ${exitosos}\n` +
                `• Valor total: ${totalValor.toFixed(2)} €\n\n` +
                `Los stocks han sido actualizados.`
            );
        }, 500);
    } else if (exitosos > 0) {
        mostrarMensaje(
            `⚠️ Bajas parcialmente completadas: ${exitosos} exitosos, ${errores.length} errores`,
            "orange"
        );
        
        // Limpiar todo igualmente
        productosBaja = [];
        document.getElementById("textareaMotivoBaja").value = "";
        renderizarTablaBajas();
        ocultarBotones();
        
        await cargarDatos();
        await actualizarEstadisticas();
        
        alert(`⚠️ Resultado mixto:\n\n` +
              `Exitosos: ${exitosos}\n` +
              `Errores: ${errores.length}\n\n` +
              `Detalles:\n${errores.join('\n')}`);
    } else {
        mostrarMensaje(
            `❌ Error al registrar bajas: ${errores.length} errores`,
            "red"
        );
        
        alert(`❌ Error al registrar bajas:\n\n${errores.join('\n')}`);
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