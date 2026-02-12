import { getProductos, getProveedores } from "../services/apiService.js";
import { navigateTo } from "../router.js";
import { showNotification, showConfirm } from "../utils/notifications.js";

const API_URL = 'http://localhost:8080/api';
let itemsPedido = [];
let productosCache = [];
let gridInstance = null; // Almacenar instancia de GridJS para poder destruirla

export async function initPedidos() {
    console.log("🛒 Iniciando módulo de Pedidos...");

    // Set Date in JS
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('fechaPedido');
    if (dateInput) dateInput.value = today;

    // Attach global window functions if gridjs needs them
    window.irARecepcion = irARecepcion;

    // Load initial data
    await cargarPedidos();

    // Event Listeners
    // Navigation
    const btnNuevo = document.getElementById("btnNuevoPedido");
    if (btnNuevo) btnNuevo.onclick = () => mostrarSeccion('nuevo');

    const btnListar = document.getElementById("btnListarPedidos");
    if (btnListar) btnListar.onclick = () => mostrarSeccion('lista');

    // Actions
    const selProv = document.getElementById("selectProveedor");
    if (selProv) selProv.addEventListener("change", actualizarProductosDeProveedor);

    const btnGuardar = document.getElementById("btnGuardarPedido");
    if (btnGuardar) btnGuardar.onclick = guardarPedido;
}

function mostrarSeccion(sec) {
    document.getElementById('seccionLista').style.display = sec === 'lista' ? 'block' : 'none';
    document.getElementById('seccionNuevo').style.display = sec === 'nuevo' ? 'block' : 'none';
    if (sec === 'nuevo') cargarProveedores();
}

async function cargarPedidos() {
    console.log("🔄 Cargando lista de pedidos...");

    // Verificar si GridJS está cargado
    if (typeof gridjs === 'undefined') {
        console.error("❌ GridJS no está cargado.");
        showNotification("Error crítico: Librería GridJS no encontrada.", 'error');
        return;
    }

    try {
        // AÑADIDO: Cache buster ?t=... para evitar caché del navegador
        const res = await fetch(`${API_URL}/pedidos.php?t=${Date.now()}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        console.log("📡 Respuesta API status:", res.status);

        if (!res.ok) {
            const text = await res.text();
            console.error("❌ Error API:", text);
            throw new Error(`Error API: ${res.status}`);
        }

        const json = await res.json();
        console.log("📦 Datos recibidos:", json);

        if (json.success) {
            const gridElement = document.getElementById("gridPedidos");
            if (!gridElement) {
                console.error("❌ Elemento #gridPedidos no encontrado en el DOM");
                return;
            }

            // Destruir grid anterior si existe
            if (gridInstance) {
                try {
                    gridInstance.destroy();
                } catch (e) {
                    console.log('No se pudo destruir grid anterior:', e);
                }
            }

            // Limpiar contenido previo para evitar duplicados
            gridElement.innerHTML = '';

            const data = Array.isArray(json.data) ? json.data : [];

            if (data.length === 0) {
                gridElement.innerHTML = '<div style="padding:20px; text-align:center; color:#666">No hay pedidos registrados todavía.</div>';
                return;
            }

            gridInstance = new gridjs.Grid({
                columns: [
                    'ID',
                    'Proveedor',
                    'Estado',
                    'Total',
                    {
                        name: 'Acciones',
                        formatter: (cell, row) => {
                            const id = row.cells[0].data;
                            const estado = row.cells[2].data;
                            if (estado === 'PENDIENTE' || estado === 'INCOMPLETO') {
                                return gridjs.html(`<button class='btn-secondary btn-sm' onclick='irARecepcion(${id})'>Ir a Recepción</button>`);
                            }
                            return gridjs.html(`<span class='badge-success'>Completado</span>`);
                        }
                    }
                ],
                data: data.map(p => [p.id, p.proveedor_nombre, p.estado, parseFloat(p.total).toFixed(2) + ' €', null]),
                pagination: { limit: 5 },
                language: {
                    search: { placeholder: 'Buscar...' },
                    pagination: {
                        previous: 'Ant', next: 'Sig', showing: 'Mostrando', results: () => 'resultados'
                    }
                }
            }).render(gridElement);
        } else {
            console.error("❌ Error lógico:", json);
            showNotification("Error cargando pedidos: " + (json.error?.message || "Desconocido"), 'error');
        }
    } catch (e) {
        console.error("❌ Excepción en cargarPedidos:", e);
        const el = document.getElementById("gridPedidos");
        if (el) el.innerHTML = '<div style="padding:20px; text-align:center; color:#666">No hay ningún pedido actualmente.</div>';
    }
}

async function cargarProveedores() {
    try {
        // Usar servicio con caché
        const data = await getProveedores();
        const sel = document.getElementById('selectProveedor');
        sel.innerHTML = '<option value="">-- Seleccionar --</option>';
        if (Array.isArray(data)) {
            data.forEach(p => {
                sel.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
            });
        }
    } catch (e) {
        console.error(e);
        showNotification("Error cargando proveedores", 'error');
    }
}

async function actualizarProductosDeProveedor() {
    const provId = document.getElementById('selectProveedor').value;

    if (!productosCache.length) {
        try {
            // Usar servicio con caché
            productosCache = await getProductos();
        } catch (e) { console.error(e); }
    }

    // Filter logic: provider mismatch fallback (some items have nested provider, some flat)
    const filtrados = productosCache.filter(p => p.proveedorId == provId || (p.proveedor && p.proveedor.id == provId));

    const div = document.getElementById('listaProductosProv');
    div.innerHTML = '';

    if (filtrados.length === 0) {
        div.innerHTML = '<p>No hay productos asociados a este proveedor</p>';
        return;
    }
    renderProductos(filtrados, div);
}

function renderProductos(lista, container) {
    lista.forEach(p => {
        const el = document.createElement('div');
        el.className = 'item-prov';
        el.innerHTML = `
            <span>${p.nombre}</span> 
            <strong>${parseFloat(p.precio).toFixed(2)} €</strong> 
            <button class="btn-add-item">+</button>
        `;
        el.querySelector('.btn-add-item').onclick = () => agregarItem(p);
        container.appendChild(el);
    });
}

function agregarItem(prod) {
    const provId = prod.proveedorId || (prod.proveedor ? prod.proveedor.id : null);

    const existente = itemsPedido.find(i => i.producto_id == prod.id);
    if (existente) {
        existente.cantidad++;
        showNotification(`Cantidad de ${prod.nombre} aumentada`, 'info');
    } else {
        itemsPedido.push({
            producto_id: prod.id,
            nombre: prod.nombre,
            precio: parseFloat(prod.precio),
            cantidad: 1,
            proveedor_id: provId // Guardar ID proveedor para agrupar luego
        });
        showNotification(`${prod.nombre} añadido al pedido`, 'success');
    }
    renderizarCarritoPedido();
}


function renderizarCarritoPedido() {
    const tbody = document.getElementById('tablaItemsPedido');
    tbody.innerHTML = '';
    let total = 0;

    itemsPedido.forEach((item, idx) => {
        const sub = item.cantidad * item.precio;
        total += sub;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nombre}</td>
            <td>
                <label for="cant_${idx}" class="sr-only">Cantidad</label>
                <input type="number" id="cant_${idx}" value="${item.cantidad}" style="width:50px">
            </td>
            <td>${item.precio.toFixed(2)}</td>
            <td>${sub.toFixed(2)}</td>
            <td><button class="btn-remove" aria-label="Eliminar item">x</button></td>
        `;

        tr.querySelector('input').onchange = (e) => cambiarCant(idx, e.target.value);
        tr.querySelector('.btn-remove').onclick = () => borrarItem(idx);

        tbody.appendChild(tr);
    });
    document.getElementById('totalPedido').innerText = total.toFixed(2) + ' €';
}

function cambiarCant(idx, val) {
    itemsPedido[idx].cantidad = parseInt(val);
    renderizarCarritoPedido();
}

function borrarItem(idx) {
    itemsPedido.splice(idx, 1);
    renderizarCarritoPedido();
}


async function guardarPedido() {
    console.log('💾 Intentando guardar pedido(s)...');

    if (itemsPedido.length === 0) {
        showNotification("El pedido está vacío. Agrega al menos un producto.", 'warning');
        return;
    }

    // 1. Agrupar items por proveedor
    const pedidosPorProveedor = {};

    // Obtener fallback proveedor del select si algún producto no tiene ID (caso raro)
    const selectProvId = document.getElementById('selectProveedor').value;

    itemsPedido.forEach(item => {
        const pid = item.proveedor_id || selectProvId;
        if (!pid) {
            console.warn("Item sin proveedor:", item);
            return;
        }
        if (!pedidosPorProveedor[pid]) {
            pedidosPorProveedor[pid] = {
                proveedorId: pid,
                items: [],
                total: 0
            };
        }
        pedidosPorProveedor[pid].items.push(item);
        pedidosPorProveedor[pid].total += (item.cantidad * item.precio);
    });

    const proveedoresIds = Object.keys(pedidosPorProveedor);
    if (proveedoresIds.length === 0) {
        showNotification("Error: No se pudo determinar el proveedor de los productos.", 'error');
        return;
    }

    if (!await showConfirm(`Se generarán ${proveedoresIds.length} pedido(s) distinto(s) según el proveedor. ¿Continuar?`)) {
        return;
    }

    // 2. Enviar peticiones (Secuencial para evitar saturar o problemas de concurrencia en BD simple)
    let exitos = 0;
    let errores = 0;

    for (const pid of proveedoresIds) {
        const pedidoData = pedidosPorProveedor[pid];

        const payload = {
            proveedorId: pedidoData.proveedorId,
            items: pedidoData.items,
            usuarioId: "1",
            total: pedidoData.total
        };

        try {
            const res = await fetch(`${API_URL}/pedidos.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success) {
                exitos++;
                console.log(`✅ Pedido para proveedor ${pid} creado.`);
            } else {
                errores++;
                console.error(`❌ Error creando pedido proveedor ${pid}:`, data);
            }
        } catch (e) {
            errores++;
            console.error(`❌ Excepción proveedor ${pid}:`, e);
            showNotification("Error de conexión al crear uno de los pedidos.", 'error');
        }
    }

    // 3. Resumen
<<<<<<< HEAD
    // 3. Resumen
=======

>>>>>>> origin/sonia
    if (exitos > 0 && errores === 0) {
        showNotification(`✅ Se han creado ${exitos} pedido(s) correctamente.`, 'success');
        // Limpiar
        itemsPedido = [];
        document.getElementById('selectProveedor').value = "";
        document.getElementById('listaProductosProv').innerHTML = '<p class="text-muted">Selecciona un proveedor para añadir más productos</p>';
        renderizarCarritoPedido();

        // Volver a la lista y recargar
        mostrarSeccion('lista');

        // Forzar recarga de la grid
        if (typeof gridjs !== 'undefined' && document.getElementById("gridPedidos")) {
            document.getElementById("gridPedidos").innerHTML = ''; // Limpiar contenedor
        }
        await cargarPedidos(); // Recargar datos frescos
    } else if (exitos > 0 && errores > 0) {
        showNotification(`⚠️ Proceso terminado con advertencias. Creados: ${exitos}, Fallidos: ${errores}`, 'warning');
        // No limpiamos el carrito para que pueda reintentar los fallidos (aunque esto requeriría lógica más compleja de filtrado post-éxito)
        // Por simplicidad, recargamos la lista
        mostrarSeccion('lista');
        await cargarPedidos();
    } else {
        showNotification("❌ No se pudo crear ningún pedido. Revise los errores.", 'error');
    }
}


function irARecepcion(id) {
    showNotification("Redirigiendo a recepción...", 'info');
    navigateTo('recepcion');
}
