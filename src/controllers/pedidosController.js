import { getProductos, getProveedores } from "../services/apiService.js";
import { navigateTo } from "../router.js";

const API_URL = './api';
let itemsPedido = [];
let productosCache = [];

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
        alert("Error crítico: Librería GridJS no encontrada. Verifique su conexión a internet.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/pedidos.php`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
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
            gridElement.innerHTML = '';

            const data = Array.isArray(json.data) ? json.data : [];

            if (data.length === 0) {
                gridElement.innerHTML = '<div style="padding:20px; text-align:center; color:#666">No hay pedidos registrados todavía.</div>';
                return;
            }

            new gridjs.Grid({
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
            alert("Error cargando pedidos: " + (json.error?.message || "Desconocido"));
        }
    } catch (e) {
        console.error("❌ Excepción en cargarPedidos:", e);
        document.getElementById("gridPedidos").innerHTML = `<p style="color:red">Error de conexión: ${e.message}</p>`;
    }
}

async function cargarProveedores() {
    try {
        const res = await fetch(`${API_URL}/proveedores.php`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        const json = await res.json();
        const sel = document.getElementById('selectProveedor');
        sel.innerHTML = '<option value="">-- Seleccionar --</option>';
        if (json.success) {
            json.data.forEach(p => {
                sel.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
            });
        }
    } catch (e) {
        console.error(e);
    }
}

async function actualizarProductosDeProveedor() {
    const provId = document.getElementById('selectProveedor').value;

    if (!productosCache.length) {
        try {
            const res = await fetch(`${API_URL}/productos.php`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            const json = await res.json();
            if (json.success) productosCache = json.data;
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
    const existente = itemsPedido.find(i => i.producto_id == prod.id);
    if (existente) {
        existente.cantidad++;
    } else {
        itemsPedido.push({
            producto_id: prod.id,
            nombre: prod.nombre,
            precio: parseFloat(prod.precio),
            cantidad: 1
        });
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
    const provId = document.getElementById('selectProveedor').value;
    if (!provId || itemsPedido.length === 0) return alert("Faltan datos");

    const payload = {
        proveedor_id: provId,
        items: itemsPedido,
        usuario_id: "1"
    };

    try {
        const res = await fetch(`${API_URL}/pedidos.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Pedido Creado con Éxito ✅");
            itemsPedido = [];
            document.getElementById('selectProveedor').value = "";
            document.getElementById('listaProductosProv').innerHTML = '<p class="text-muted">Selecciona un proveedor primero</p>';
            renderizarCarritoPedido();
            mostrarSeccion('lista');
            cargarPedidos();
        } else {
            const errorData = await res.json();
            alert("Error al crear pedido: " + (errorData.error || "Error desconocido"));
        }
    } catch (e) {
        console.error(e);
        alert("Error de red");
    }
}

function irARecepcion(id) {
    alert("Para recepcionar este pedido, ve al módulo de Recepción e impórtalo desde allí.");
    navigateTo('recepcion');
}
