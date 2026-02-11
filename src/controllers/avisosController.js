// src/controllers/avisosController.js
import { getProductos, getCategorias, getProveedores, registrarBaja, crearPedido } from '../services/apiService.js';

let productoSeleccionado = null;
let accionActual = null; // 'baja' | 'pedido'

export async function initAvisos() {
    try {
        await cargarDatos();
        setupEventos();
    } catch (error) {
        console.error('Error cargando avisos:', error);
        // Mostrar error en la UI
        const containers = ['lista-caducados', 'lista-stock', 'lista-financiero'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = `<div style="color:#c00; padding:20px; text-align:center;">
                    <i class="fa-solid fa-triangle-exclamation"></i><br>
                    Error: ${error.message}
                </div>`;
            }
        });
    }
}

async function cargarDatos() {
    const [productos, categorias, proveedores] = await Promise.all([
        getProductos(), getCategorias(), getProveedores()
    ]);

    // Normalizar datos
    const datos = productos.map(p => ({
        ...p,
        nombreCategoria: categorias.find(c => c.id == (p.categoriaid || p.categoriaId))?.nombre || 'General',
        proveedorObj: proveedores.find(pr => pr.id == (p.proveedorid || p.proveedorId)),
        nombreProveedor: proveedores.find(pr => pr.id == (p.proveedorid || p.proveedorId))?.nombre || 'N/A',
        fechaCaducidad: p.fechacaducidad || p.fechaCaducidad || null,
        stockMinimo: Number(p.stockminimo || p.stockMinimo || 0),
        stock: Number(p.stock || 0),
        precio: Number(p.precio || 0)
    }));

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // --- Clasificar alertas ---
    const caducados = [];
    const stockBajo = [];

    datos.forEach(p => {
        // Caducados
        if (p.fechaCaducidad && p.fechaCaducidad !== 'NULL' && p.fechaCaducidad !== 'Sin fecha') {
            const fecha = new Date(p.fechaCaducidad);
            if (fecha < hoy) {
                const diasCaducado = Math.ceil((hoy - fecha) / 86400000);
                caducados.push({ ...p, diasCaducado });
            }
        }

        // Stock bajo
        if (p.stockMinimo > 0 && p.stock <= p.stockMinimo) {
            stockBajo.push(p);
        }
    });

    // Ordenar
    caducados.sort((a, b) => b.diasCaducado - a.diasCaducado);
    stockBajo.sort((a, b) => (a.stock / a.stockMinimo) - (b.stock / b.stockMinimo));

    actualizarMetricas(caducados, stockBajo, datos);
    renderCaducados(caducados);
    renderStockBajo(stockBajo);
    renderFinanciero(datos, caducados, stockBajo);
}

function actualizarMetricas(caducados, stockBajo, todos) {
    const totalAlertas = caducados.length + stockBajo.length;
    const valorRiesgo = caducados.reduce((sum, p) => sum + (p.precio * p.stock), 0);

    document.getElementById('metrica-total').textContent = totalAlertas;
    document.getElementById('metrica-criticos').textContent = caducados.length;
    document.getElementById('metrica-valor').textContent = valorRiesgo.toFixed(2) + ' \u20AC';
    document.getElementById('contador-caducados').textContent = caducados.length;
    document.getElementById('contador-stock').textContent = stockBajo.length;

    // Timestamp
    const ts = document.getElementById('avisos-timestamp');
    if (ts) {
        ts.textContent = 'Actualizado: ' + new Date().toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // Badge en sidebar/header (opcional)
    const badge = document.getElementById('dropdown-alertas');
    if (badge) {
        badge.textContent = totalAlertas > 0 ? totalAlertas : '';
        badge.style.display = totalAlertas > 0 ? 'inline-block' : 'none';
    }
}

function renderCaducados(lista) {
    const container = document.getElementById('lista-caducados');
    if (lista.length === 0) {
        container.innerHTML = `
            <div class="aviso-ok">
                <i class="fa-solid fa-circle-check"></i>
                <span>No hay productos caducados</span>
            </div>`;
        return;
    }

    container.innerHTML = lista.map((p, index) => `
        <div class="alerta-item">
            <div class="alerta-indicador alerta-indicador--danger"></div>
            <div class="alerta-contenido">
                <p class="alerta-titulo">${p.nombre}</p>
                <p class="alerta-detalle">${p.nombreCategoria} &middot; Stock: ${p.stock}</p>
            </div>
            <div class="alerta-acciones">
                <button class="btn-accion-alert btn-baja" onclick="window.abrirModalBaja('${p.id}')">
                    <i class="fa-solid fa-trash-can"></i>
                    <span>Dar de Baja</span>
                </button>
            </div>
            <div class="alerta-meta">
                <strong>${p.precio.toFixed(2)} &euro;</strong><br>
                ${tiempoRelativo(p.diasCaducado)}
            </div>
        </div>
    `).join('');

    // Guardar referencia global para buscar productos
    window.alertasData = window.alertasData || {};
    lista.forEach(p => window.alertasData[p.id] = p);
}

function renderStockBajo(lista) {
    const container = document.getElementById('lista-stock');
    if (lista.length === 0) {
        container.innerHTML = `
            <div class="aviso-ok">
                <i class="fa-solid fa-circle-check"></i>
                <span>Todos los productos tienen stock suficiente</span>
            </div>`;
        return;
    }

    container.innerHTML = lista.map(p => {
        const pct = Math.min(100, Math.round((p.stock / p.stockMinimo) * 100));
        const barClass = pct <= 25 ? 'stock-bar-fill--danger'
            : pct <= 75 ? 'stock-bar-fill--warning'
                : 'stock-bar-fill--ok';

        // Sugerencia de pedido: Llegar al stock maximo (si hubiera) o al menos doblar el minimo
        // Simplificamos a: Pedir lo que falta para llegar a stockMinimo * 2
        const cantidadSugerida = Math.max(1, (p.stockMinimo * 2) - p.stock);

        return `
            <div class="alerta-item">
                <div class="alerta-indicador alerta-indicador--warning"></div>
                <div class="alerta-contenido">
                    <p class="alerta-titulo">${p.nombre}</p>
                    <p class="alerta-detalle">${p.nombreCategoria} &middot; ${p.nombreProveedor}</p>
                </div>
                <div class="alerta-acciones">
                    <button class="btn-accion-alert btn-pedir" onclick="window.abrirModalPedido('${p.id}', ${cantidadSugerida})">
                        <i class="fa-solid fa-truck-fast"></i>
                        <span>Pedir</span>
                    </button>
                </div>
                <div class="stock-bar-container" title="${p.stock} / ${p.stockMinimo}">
                    <div class="stock-bar-fill ${barClass}" style="width: ${pct}%"></div>
                </div>
                <div class="alerta-meta">
                    <strong>${p.stock}</strong> / ${p.stockMinimo}
                </div>
            </div>
        `;
    }).join('');

    window.alertasData = window.alertasData || {};
    lista.forEach(p => window.alertasData[p.id] = p);
}

function renderFinanciero(todos, caducados, stockBajo) {
    const container = document.getElementById('lista-financiero');
    const valorCaducado = caducados.reduce((s, p) => s + (p.precio * p.stock), 0);
    const valorStockBajo = stockBajo.reduce((s, p) => s + (p.precio * p.stock), 0);

    // Producto más caro en riesgo
    const todosEnRiesgo = [...caducados, ...stockBajo];
    const masCaro = todosEnRiesgo.length > 0
        ? todosEnRiesgo.reduce((max, p) => (p.precio * p.stock) > (max.precio * max.stock) ? p : max)
        : null;

    container.innerHTML = `
        <div class="financiero-grid">
            <div class="financiero-item">
                <div class="financiero-label">Perdida por Caducidad</div>
                <div class="financiero-valor financiero-valor--danger">${valorCaducado.toFixed(2)} &euro;</div>
            </div>
            <div class="financiero-item">
                <div class="financiero-label">Valor en Stock Bajo</div>
                <div class="financiero-valor financiero-valor--warning">${valorStockBajo.toFixed(2)} &euro;</div>
            </div>
            ${masCaro ? `
            <div class="financiero-item" style="grid-column: 1 / -1;">
                <div class="financiero-label">Producto en Riesgo de Mayor Valor</div>
                <div class="financiero-valor">${masCaro.nombre} <span style="font-weight:400; font-size:13px; color:#6B7280;">&mdash; ${(masCaro.precio * masCaro.stock).toFixed(2)} &euro;</span></div>
            </div>` : ''}
        </div>
    `;
}

function tiempoRelativo(dias) {
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Hace 1 dia';
    if (dias < 7) return `Hace ${dias} dias`;
    if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
    return `Hace ${Math.floor(dias / 30)} meses`;
}

// --- MODAL LOGIC ---

function setupEventos() {
    // Configurar botones globales (close, plus/minus, confirm)
    document.getElementById('modal-close').onclick = cerrarModal;
    document.getElementById('btn-cancelar').onclick = cerrarModal;

    document.getElementById('btn-mas').onclick = () => {
        const inp = document.getElementById('modal-cantidad');
        inp.value = parseInt(inp.value) + 1;
    };
    document.getElementById('btn-menos').onclick = () => {
        const inp = document.getElementById('modal-cantidad');
        if (parseInt(inp.value) > 1) inp.value = parseInt(inp.value) - 1;
    };

    document.getElementById('btn-confirmar').onclick = confirmarAccion;

    // Hacer funciones globales para onclick en HTML
    window.abrirModalBaja = abrirModalBaja;
    window.abrirModalPedido = abrirModalPedido;
}

function abrirModalBaja(id) {
    productoSeleccionado = window.alertasData[id];
    accionActual = 'baja';
    if (!productoSeleccionado) return;

    const modal = document.getElementById('modal-accion');
    modal.classList.add('active', 'modo-danger');
    modal.classList.remove('modo-success');

    document.getElementById('modal-titulo').textContent = 'Confirmar Baja de Producto';
    document.getElementById('modal-mensaje').innerHTML = `
        Vas a dar de baja <strong>${productoSeleccionado.nombre}</strong> por caducidad.<br>
        Esta accion reducira el stock disponible y quedara registrada.
    `;

    const input = document.getElementById('modal-cantidad');
    input.value = productoSeleccionado.stock; // Por defecto todo el stock
    input.max = productoSeleccionado.stock;

    document.getElementById('modal-hint').textContent = `Stock actual: ${productoSeleccionado.stock} unidades`;
}

function abrirModalPedido(id, cantidadSugerida) {
    productoSeleccionado = window.alertasData[id];
    accionActual = 'pedido';
    if (!productoSeleccionado) return;

    const modal = document.getElementById('modal-accion');
    modal.classList.add('active', 'modo-success');
    modal.classList.remove('modo-danger');

    document.getElementById('modal-titulo').textContent = 'Solicitar Pedido';
    document.getElementById('modal-mensaje').innerHTML = `
        Se creara un nuevo pedido para <strong>${productoSeleccionado.nombre}</strong><br>
        al proveedor: <em>${productoSeleccionado.nombreProveedor}</em>.
    `;

    const input = document.getElementById('modal-cantidad');
    input.value = cantidadSugerida;
    input.removeAttribute('max');

    document.getElementById('modal-hint').textContent = `Stock minimo: ${productoSeleccionado.stockMinimo} | Actual: ${productoSeleccionado.stock}`;
}

function cerrarModal() {
    document.getElementById('modal-accion').classList.remove('active');
}

async function confirmarAccion() {
    if (!productoSeleccionado) return;

    const btn = document.getElementById('btn-confirmar');
    const cantidad = parseInt(document.getElementById('modal-cantidad').value);

    if (cantidad <= 0) return;

    btn.classList.add('loading');
    btn.disabled = true;

    try {
        if (accionActual === 'baja') {
            await registrarBaja({
                productoId: productoSeleccionado.id,
                cantidad: cantidad,
                tipoBaja: 'Caducado',
                motivo: 'Caducidad registrada desde Centro de Avisos',
                usuarioId: 'admin1' // Hardcoded por ahora
            });
            mostrarToast('Baja registrada correctamente', 'success');
        }
        else if (accionActual === 'pedido') {
            await crearPedido({
                proveedorId: productoSeleccionado.proveedorObj?.id || productoSeleccionado.proveedorId,
                total: cantidad * productoSeleccionado.precio,
                usuarioId: 'admin1',
                items: [{
                    producto_id: productoSeleccionado.id,
                    cantidad: cantidad,
                    precio: productoSeleccionado.precio,
                    nombre: productoSeleccionado.nombre
                }]
            });
            mostrarToast('Pedido creado correctamente', 'success');
        }

        cerrarModal();
        await cargarDatos(); // Recargar datos para actualizar lista
    } catch (error) {
        console.error(error);
        mostrarToast('Error al realizar la accion', 'error');
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function mostrarToast(mensaje, tipo) {
    const toast = document.getElementById('toast-notificacion');
    const msg = document.getElementById('toast-mensaje');
    const icon = document.getElementById('toast-icon');

    msg.textContent = mensaje;
    toast.className = `toast toast-${tipo} active`;
    icon.className = tipo === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark';

    setTimeout(() => {
        toast.classList.remove('active');
    }, 4000);
}
