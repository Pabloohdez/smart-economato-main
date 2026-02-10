import { getProductos, getCategorias, getProveedores, actualizarProducto } from "../services/apiService.js";
import { navigateTo } from "../router.js";

let todosLosProductos = [];
let categorias = [];
let proveedores = [];
let productosRecepcion = [];
let productoSeleccionado = null;
let pedidosPendientes = [];

const API_URL = './api';

export async function initRecepcion() {
    console.log("🚚 Iniciando módulo de recepción...");

    await cargarDatos();
    mostrarFechaActual();
    configurarEventos();
}

async function cargarDatos() {
    try {
        [todosLosProductos, categorias, proveedores] = await Promise.all([
            getProductos(),
            getCategorias(),
            getProveedores()
        ]);
        cargarFiltros();
    } catch (error) {
        console.error("❌ Error cargando datos:", error);
    }
}

function mostrarFechaActual() {
    const fecha = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById("fechaActual").textContent = fecha.toLocaleDateString('es-ES', opciones);
}

function cargarFiltros() {
    const selectProveedor = document.getElementById("selectProveedorFiltro");
    const selectCategoria = document.getElementById("selectCategoriaFiltro");

    selectProveedor.innerHTML = '<option value="">Todos los proveedores</option>';
    proveedores.forEach(p => selectProveedor.innerHTML += `<option value="${p.id}">${p.nombre}</option>`);

    selectCategoria.innerHTML = '<option value="">Todas las categorías</option>';
    categorias.forEach(c => selectCategoria.innerHTML += `<option value="${c.id}">${c.nombre}</option>`);
}

// ...
function configurarEventos() {
    const btnBuscar = document.getElementById("btnBuscarProducto");
    if (btnBuscar) btnBuscar.onclick = buscarProductos;

    document.getElementById("inputBusquedaProducto").onkeypress = (e) => { if (e.key === 'Enter') buscarProductos(); };

    document.getElementById("selectProveedorFiltro").onchange = buscarProductos;
    document.getElementById("selectCategoriaFiltro").onchange = buscarProductos;

    document.getElementById("btnCancelarRecepcion").onclick = cancelarRecepcion;
    document.getElementById("btnGuardarRecepcion").onclick = confirmarRecepcionManual;

    document.getElementById("btnModalCancelar").onclick = cerrarModal;
    document.getElementById("btnModalConfirmar").onclick = confirmarCantidadModal;
    document.getElementById("modalInputCantidad").onkeypress = (e) => { if (e.key === 'Enter') confirmarCantidadModal(); };

    // IMPORTAR PEDIDOS
    const btnImport = document.getElementById('btnImportarPedido');
    if (btnImport) {
        console.log("✅ Botón Importar encontrado, asignando evento...");
        btnImport.onclick = abrirModalPedidos;
    } else {
        console.error("❌ Botón Importar NO encontrado");
    }
}

// --- LOGICA IMPORTACION PEDIDOS (WORKFLOW V3) ---
async function abrirModalPedidos() {
    console.log("🔘 Click en Importar Pedidos");

    const modal = document.getElementById('modalPedidosPendientes');
    if (!modal) {
        console.error("ERROR CRÍTICO: Modal no encontrado en HTML");
        return;
    }



    // Forzar visibilidad
    modal.classList.remove('oculto');
    modal.style.display = 'flex';  // Forzar display
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';

    const div = document.getElementById('listaPedidosPendientes');
    div.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cargando...';

    try {
        const res = await fetch(`${API_URL}/pedidos.php`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!res.ok) throw new Error("Error HTTP " + res.status);

        const json = await res.json();

        if (!json.success || !json.data) {
            div.innerHTML = 'Error: Respuesta inesperada de API';
            return;
        }

        // Filtramos pendientes o incompletos
        pedidosPendientes = json.data.filter(p => p.estado === 'PENDIENTE' || p.estado === 'INCOMPLETO');

        if (!pedidosPendientes.length) {
            div.innerHTML = '<div style="padding:10px">No hay pedidos pendientes de recepción.</div>';
            return;
        }

        renderTablaPedidos(pedidosPendientes, div);

    } catch (e) {
        console.error(e);
        div.innerHTML = 'Error cargando pedidos: ' + e.message;
    }
}
// ...

function renderTablaPedidos(lista, container) {
    container.innerHTML = '<table class="tabla-recepcion" style="width:100%"><thead style="font-size:0.8em"><tr><th>ID</th><th>Proveedor</th><th>Estado</th><th>Total</th><th>Acción</th></tr></thead><tbody></tbody></table>';
    const tbody = container.querySelector('tbody');

    lista.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>#${p.id}</td>
            <td>${p.proveedor_nombre}</td>
            <td><span class="badge ${p.estado === 'INCOMPLETO' ? 'badge-warning' : 'badge-primary'}">${p.estado}</span></td>
            <td>${parseFloat(p.total).toFixed(2)} €</td>
            <td>
                <button class="btn-primary btn-sm" onclick="window.verificarPedido(${p.id})">
                    <i class="fa-solid fa-clipboard-check"></i> Verificar
                </button>
            </td>
         `;
        tbody.appendChild(tr);
    });
}

// Global para acceder desde onclick
window.verificarPedido = async (id) => {
    // Obtener detalles del pedido
    try {
        const res = await fetch(`${API_URL}/pedidos.php?id=${id}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const json = await res.json();

        if (!json.success) return alert("Error cargando detalles");

        const pedido = json.data;
        mostrarModalVerificacion(pedido);

    } catch (e) {
        alert("Error de red");
    }
};

function mostrarModalVerificacion(pedido) {
    const div = document.getElementById('listaPedidosPendientes');

    let html = `
        <div class="verificacion-header">
            <h4>Verificando Pedido #${pedido.id} - ${pedido.proveedor_nombre}</h4>
            <button class="btn-sm btn-secondary" onclick="window.initRecepcion ? window.initRecepcion().then(abrirModalPedidos) : location.reload()">Volver</button>
        </div>
        <table class="tabla-recepcion" style="width:100%; margin-top:10px">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Solicitado</th>
                    <th>Recibido</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
    `;

    pedido.items.forEach((item, idx) => {
        html += `
            <tr class="fila-verificacion">
                <td>${item.producto_nombre}</td>
                <td>${item.cantidad}</td>
                <td>
                    <input type="number" 
                           id="rec_qty_${item.id}" 
                           value="${item.cantidad}" 
                           min="0" 
                           max="${item.cantidad}" 
                           class="form-control-sm" 
                           style="width:80px">
                </td>
                <td id="status_row_${item.id}">
                    <i class="fa-solid fa-check text-success"></i>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
        
        <div class="acciones-verificacion" style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end">
             <button class="btn-danger" onclick="window.rechazarPedido(${pedido.id})">Rechazar Todo</button>
             <button class="btn-success" onclick="window.confirmarVerificacion(${pedido.id})">Confirmar Recepción</button>
        </div>
    `;

    div.innerHTML = html;
}

window.confirmarVerificacion = async (pedidoId) => {
    // Recolectar datos
    const inputs = document.querySelectorAll('input[id^="rec_qty_"]');
    const items = [];

    inputs.forEach(inp => {
        const detalleId = inp.id.split('_')[2];
        items.push({
            detalle_id: detalleId,
            cantidad_recibida: parseInt(inp.value) || 0
        });
    });

    if (!confirm("¿Confirmar entrada de stock y actualizar pedido?")) return;

    try {
        const res = await fetch(`${API_URL}/pedidos.php?id=${pedidoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                accion: 'RECIBIR',
                items: items
            })
        });

        const json = await res.json();

        if (res.ok) {
            // Cerrar modal
            document.getElementById('modalPedidosPendientes').classList.add('oculto');

            // Obtener info completa del pedido para agregar a la tabla
            try {
                const pedidoRes = await fetch(`${API_URL}/pedidos.php?id=${pedidoId}`, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
                const pedidoData = await pedidoRes.json();

                if (pedidoData.success) {
                    const pedido = pedidoData.data;

                    // Agregar cada producto recibido a la tabla de recepción
                    pedido.items.forEach(item => {
                        if (item.cantidad_recibida > 0) {
                            // Buscar el producto en todosLosProductos para obtener info completa
                            const prod = todosLosProductos.find(p => p.id == item.producto_id);
                            if (prod) {
                                const prov = proveedores.find(x => x.id == prod.proveedorId);

                                productosRecepcion.push({
                                    producto_id: prod.id,
                                    nombre: item.producto_nombre || prod.nombre,
                                    proveedor: prov ? prov.nombre : pedido.proveedor_nombre,
                                    stock: prod.stock - item.cantidad_recibida, // Stock anterior antes de la recepción
                                    cantidadRecibida: item.cantidad_recibida,
                                    precio: item.precio_unitario || prod.precio,
                                    subtotal: (item.precio_unitario || prod.precio) * item.cantidad_recibida
                                });
                            }
                        }
                    });

                    // Renderizar la tabla actualizada
                    renderizarTablaRecepcion();
                }
            } catch (err) {
                console.error("Error al obtener detalles del pedido:", err);
            }

            // Actualizar datos globales
            await cargarDatos();

            alert(json.data.message || "Recepción procesada y agregada a la tabla");
        } else {
            alert("Error: " + (json.error?.message || "Desconocido"));
        }
    } catch (e) {
        console.error("Error en confirmarVerificacion:", e);
        alert("Error de conexión: " + e.message);
    }
};

window.rechazarPedido = async (id) => {
    if (!confirm("¿Seguro que quieres RECHAZAR/CANCELAR este pedido completo?")) return;

    try {
        const res = await fetch(`${API_URL}/pedidos.php?id=${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ accion: 'CANCELAR' })
        });

        if (res.ok) {
            alert("Pedido rechazado");
            abrirModalPedidos(); // Volver a lista
        }
    } catch (e) { alert("Error"); }
};


// --- LOGICA MANUAL (ORIGINAL) ---

function buscarProductos() {
    const term = document.getElementById("inputBusquedaProducto").value.trim().toLowerCase();
    const provId = document.getElementById("selectProveedorFiltro").value;
    const catId = document.getElementById("selectCategoriaFiltro").value;

    let res = todosLosProductos.filter(p => {
        const matchText = !term || p.nombre.toLowerCase().includes(term);
        const matchProv = !provId || p.proveedorId == provId;
        const matchCat = !catId || p.categoriaId == catId;
        return matchText && matchProv && matchCat;
    });
    mostrarResultados(res);
}

function mostrarResultados(productos) {
    const div = document.getElementById("resultadosBusqueda");
    if (!productos.length) {
        div.innerHTML = `<div style="text-align: center; padding: 20px;">No se encontraron productos. <button id="btnCrearNuevo" class="btn-link">Crear Nuevo</button></div>`;
        document.getElementById('btnCrearNuevo')?.addEventListener('click', () => navigateTo('ingresarproductos'));
        div.classList.remove('oculto');
        return;
    }

    div.innerHTML = productos.map(p => `
        <div class="item-resultado" onclick="window.selProdManual('${p.id}')">
            <div class="info-producto-resultado">
                <div class="nombre-producto-resultado">${p.nombre}</div>
                <div class="detalles-producto-resultado">Stock: ${p.stock} | ${parseFloat(p.precio).toFixed(2)} €</div>
            </div>
        </div>
    `).join('');
    div.classList.remove('oculto');

    window.selProdManual = (id) => {
        const p = todosLosProductos.find(x => x.id == id);
        if (p) abrirModal(p);
    };
}

function abrirModal(p) {
    productoSeleccionado = p;
    document.getElementById("modalNombreProducto").innerText = p.nombre;
    document.getElementById("modalInputCantidad").value = 1;
    document.getElementById("modalCantidad").classList.remove("oculto");
    document.getElementById("modalInputCantidad").focus();
}

function cerrarModal() {
    document.getElementById("modalCantidad").classList.add("oculto");
    productoSeleccionado = null;
}

function confirmarCantidadModal() {
    const cant = parseInt(document.getElementById("modalInputCantidad").value);
    if (cant > 0 && productoSeleccionado) {
        agregarProductoRecepcion(productoSeleccionado, cant);
        cerrarModal();
    }
}

function agregarProductoRecepcion(p, cant) {
    const prov = proveedores.find(x => x.id == p.proveedorId);
    productosRecepcion.push({
        producto_id: p.id,
        nombre: p.nombre,
        proveedor: prov ? prov.nombre : 'N/A',
        stock: p.stock,
        cantidadRecibida: cant,
        precio: p.precio,
        subtotal: p.precio * cant
    });
    renderizarTablaRecepcion();
    document.getElementById("inputBusquedaProducto").value = '';
    document.getElementById("resultadosBusqueda").classList.add("oculto");
}

function renderizarTablaRecepcion() {
    const tbody = document.getElementById("tbodyRecepcion");
    const tfoot = document.getElementById("tfootRecepcion");

    if (!productosRecepcion.length) {
        tbody.innerHTML = '<tr class="fila-vacia"><td colspan="8"><div class="mensaje-vacio">Lista vacía</div></td></tr>';
        document.getElementById("btnGuardarRecepcion").classList.add("oculto");
        document.getElementById("btnCancelarRecepcion").classList.add("oculto");
        tfoot.classList.add("oculto");
        return;
    }

    document.getElementById("btnGuardarRecepcion").classList.remove("oculto");
    document.getElementById("btnCancelarRecepcion").classList.remove("oculto");

    tbody.innerHTML = productosRecepcion.map((p, idx) => `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.proveedor}</td>
            <td>${p.stock}</td>
            <td>${p.cantidadRecibida}</td>
            <td style="color:var(--success-color); font-weight:bold">${p.stock + p.cantidadRecibida}</td>
            <td>${p.precio} €</td>
            <td>${p.subtotal.toFixed(2)} €</td>
            <td><button class="btn-eliminar-item" onclick="window.delItemManual(${idx})"><i class="fa-solid fa-trash"></i></button></td>
        </tr>
    `).join('');

    window.delItemManual = (idx) => {
        productosRecepcion.splice(idx, 1);
        renderizarTablaRecepcion();
    };

    const total = productosRecepcion.reduce((sum, p) => sum + p.subtotal, 0);
    document.getElementById("totalRecepcion").innerText = total.toFixed(2) + ' €';
    tfoot.classList.remove("oculto");
}

function cancelarRecepcion() {
    productosRecepcion = [];
    renderizarTablaRecepcion();
}

async function confirmarRecepcionManual() {
    if (!productosRecepcion.length) return;
    if (!confirm("¿Confirmar esta recepción manual?")) return;

    const obs = document.getElementById("textareaObservaciones").value;
    const payload = {
        tipo: 'ENTRADA',
        motivo: obs || 'Recepción Manual',
        usuario_id: 1,
        items: productosRecepcion.map(p => ({
            producto_id: p.producto_id,
            cantidad: p.cantidadRecibida
        }))
    };

    try {
        const res = await fetch(`${API_URL}/movimientos.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Recepción Exitosa ✅");
            productosRecepcion = [];
            renderizarTablaRecepcion();
            cargarDatos();
        } else {
            alert("Error al guardar");
        }
    } catch (e) { alert("Error red"); }
}