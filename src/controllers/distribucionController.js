<<<<<<< HEAD
=======
import { mostrarAlertaAlergenos } from "../utils/alergenosUtils.js";

// Controlador de Distribución
>>>>>>> origin/sonia
import { showNotification, showConfirm } from "../utils/notifications.js";
import {
    productoTieneAlergenos,
    verificarPreferencias,
    mostrarAlertaAlergenos,
    filtrarListaPorAlergenos,
    generarBadgesProducto
} from "../utils/alergenosUtils.js";

const API_URL = 'http://localhost:8080/api';
let todosLosProductos = [];
let productoActual = null;
let carrito = [];

async function cargarProductos() {
    try {
        console.log('📦 Cargando productos para distribución...');
        const res = await fetch(`${API_URL}/productos.php`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        console.log('✅ Respuesta recibida:', json);

        if (json.success) {
            todosLosProductos = json.data;
            console.log(`✅ ${todosLosProductos.length} productos cargados`);
        } else {
            console.error('❌ Error en respuesta:', json.error);
            showNotification('Error al cargar productos: ' + (json.error || 'Respuesta inválida'), 'error');
        }
    } catch (error) {
        console.error('❌ Error cargando productos:', error);
        showNotification('Error de conexión con el servidor.', 'error');
    }
}

// Función para cargar el historial de movimientos
async function cargarHistorialMovimientos() {
    try {
        const res = await fetch(`${API_URL}/movimientos.php`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const json = await res.json();
        console.log('✅ Historial recibido:', json);

        const tbody = document.getElementById('tbodyHistorialMovimientos');

        if (!json.success || !json.data || json.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px; color: #666;">No hay movimientos registrados</td></tr>';
            return;
        }

        // Filtrar solo movimientos de tipo SALIDA
        const salidas = json.data.filter(m => m.tipo === 'SALIDA');

        if (salidas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px; color: #666;">No hay salidas registradas</td></tr>';
            return;
        }

        tbody.innerHTML = '';

        salidas.forEach(mov => {
            const fecha = new Date(mov.fecha);
            const fechaFormateada = fecha.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const horaFormateada = fecha.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Determinar clase de badge según el destino/motivo
            const motivo = mov.motivo || 'Sin especificar';
            let badgeClass = 'badge-default';

            if (motivo.toLowerCase().includes('cocina')) {
                badgeClass = 'badge-cocina';
            } else if (motivo.toLowerCase().includes('bar') || motivo.toLowerCase().includes('cafetería')) {
                badgeClass = 'badge-bar';
            } else if (motivo.toLowerCase().includes('eventos')) {
                badgeClass = 'badge-eventos';
            } else if (motivo.toLowerCase().includes('caducidad') || motivo.toLowerCase().includes('merma')) {
                badgeClass = 'badge-merma';
            } else if (motivo.toLowerCase().includes('donación')) {
                badgeClass = 'badge-donacion';
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="Fecha">${fechaFormateada}</td>
                <td data-label="Hora">${horaFormateada}</td>
                <td data-label="Producto">${mov.producto_nombre || 'Producto desconocido'}</td>
                <td data-label="Cantidad">${mov.cantidad}</td>
                <td data-label="Destino">
                    <span class="badge-destino ${badgeClass}">
                        ${motivo}
                    </span>
                </td>
                <td data-label="Usuario">
                    <span class="usuario-badge">
                        ${mov.usuario_nombre || 'Desconocido'}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });

        console.log(`✅ ${salidas.length} movimientos de salida mostrados`);
    } catch (error) {
        console.error('❌ Error cargando historial:', error);
        const tbody = document.getElementById('tbodyHistorialMovimientos');
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 20px; color: red;">Error al cargar el historial</td></tr>';
    }
}


// Función para realizar la búsqueda en la base de datos
async function realizarBusqueda() {
    const input = document.getElementById('buscadorProd');
    const lista = document.getElementById('listaResultados');

    const term = input.value.toLowerCase().trim();
    console.log('🔍 Buscando en la base de datos:', term);

    if (term.length < 2) {
        lista.style.display = 'none';
        if (term.length === 0) {
            return;
        }
        showNotification('Por favor, escribe al menos 2 caracteres para buscar', 'warning');
        return;
    }

    // Mostrar indicador de carga
    lista.innerHTML = '<div class="item-resultado" style="color: #666; font-style: italic; cursor: default;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando en la base de datos...</div>';
    lista.style.display = 'block';

    try {
        // Hacer petición a la API con el término de búsqueda
        console.log('📡 Consultando API para buscar productos...');
        const res = await fetch(`${API_URL}/productos.php?buscar=${encodeURIComponent(term)}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        console.log('✅ Respuesta de búsqueda recibida:', json);

        let matches = [];
        if (json.success && json.data) {
            let data = json.data;
            // Aplicar filtrado por preferencias (si está activo)
            data = filtrarListaPorAlergenos(data);

            // Filtrar por el término de búsqueda en el cliente también
            matches = data.filter(p =>
                p.nombre.toLowerCase().includes(term) ||
                (p.codigoBarras && p.codigoBarras.toLowerCase().includes(term))
            );
        }

        console.log(`✅ Encontrados ${matches.length} productos que coinciden`);

        lista.innerHTML = '';

        if (matches.length === 0) {
            lista.innerHTML = '<div class="item-resultado" style="color: #666; font-style: italic; cursor: default;">No se encontraron productos</div>';
            lista.style.display = 'block';
            return;
        }

        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'item-resultado';
            div.innerHTML = `<strong>${p.nombre}</strong> <small>(Stock: ${p.stock})</small>`;
            div.setAttribute('tabindex', '0');
            div.setAttribute('role', 'button');
            div.onclick = () => seleccionarProducto(p);
            div.onkeydown = (e) => { if (e.key === 'Enter') seleccionarProducto(p) };
            lista.appendChild(div);
        });
        lista.style.display = 'block';

    } catch (error) {
        console.error('❌ Error al buscar productos:', error);
        lista.innerHTML = '<div class="item-resultado" style="color: red; cursor: default;">Error al buscar en la base de datos</div>';
        lista.style.display = 'block';
    }
}

function seleccionarProducto(p) {
    const verificacion = productoTieneAlergenos(p);
    const pref = verificarPreferencias();

    if (verificacion.tiene && pref.alertas) {
        showNotification(`⚠️ ATENCIÓN: "${p.nombre}" contiene alérgenos: ${verificacion.alergenos.join(', ')}`, 'warning');
    }

    productoActual = p;
    document.getElementById('nombreSeleccionado').innerHTML = `
        ${p.nombre} 
        <div style="margin-top: 5px;">${generarBadgesProducto(p)}</div>
    `;
    document.getElementById('stockSeleccionado').innerText = p.stock;
    document.getElementById('detalleProducto').style.display = 'block';
    document.getElementById('listaResultados').style.display = 'none';
    document.getElementById('buscadorProd').value = p.nombre;
}

window.ajustarCant = (delta) => {
    const inp = document.getElementById('cantidadSalida');
    let val = parseInt(inp.value) + delta;
    if (val < 1) val = 1;
    if (productoActual && val > productoActual.stock) val = productoActual.stock;
    inp.value = val;
};

window.agregarAlCarrito = async () => {
    if (!productoActual) return;

    const verificacion = productoTieneAlergenos(productoActual);
    const pref = verificarPreferencias();

    // Bloqueo estricto
    if (verificacion.tiene && pref.bloqueo) {
        showNotification(`❌ ACCIÓN BLOQUEADA: No puedes distribuir este producto debido a tu alergia a: ${verificacion.alergenos.join(', ')}`, 'error');
        return;
    }

    // Alerta de confirmación
    if (verificacion.tiene && pref.alertas) {
        const confirmar = await showConfirm(
            `⚠️ ADVERTENCIA DE SEGURIDAD\n\n` +
            `Vas a distribuir "${productoActual.nombre}", que contiene: ${verificacion.alergenos.join(', ')}.\n\n` +
            `¿Estás seguro de que deseas continuar?`
        );
        if (!confirmar) return;
    }

    const cant = parseInt(document.getElementById('cantidadSalida').value);

    // VERIFICACIÓN DE ALÉRGENOS
    // Si el usuario tiene alertas activas y el producto contiene alérgenos peligrosos
    // mostrarAlertaAlergenos devolverá true si el usuario CANCELA la operación.
    const debeBloquear = await mostrarAlertaAlergenos(productoActual);
    if (debeBloquear) return;

    const existente = carrito.find(i => i.productoId == productoActual.id);
    if (existente) {
        existente.cantidad += cant;
    } else {
        carrito.push({
            productoId: productoActual.id,
            nombre: productoActual.nombre,
            cantidad: cant
        });
    }

    renderizarCarrito();
    productoActual = null;
    document.getElementById('detalleProducto').style.display = 'none';
    document.getElementById('buscadorProd').value = '';
    document.getElementById('buscadorProd').focus();
};

function renderizarCarrito() {
    const tbody = document.getElementById('tablaCarrito');
    document.getElementById('itemsCount').innerText = `${carrito.length} items`;

    if (carrito.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">La lista está vacía</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    carrito.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.nombre}</td>
            <td>${item.cantidad}</td>
            <td><button onclick="eliminarDelCarrito(${index})" aria-label="Eliminar ${item.nombre}" style="color:#bd2130;"><i class="fa-solid fa-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.eliminarDelCarrito = (index) => {
    carrito.splice(index, 1);
    renderizarCarrito();
};

window.confirmarSalida = async () => {
    if (carrito.length === 0) return showNotification("El carrito está vacío", 'warning');

    const motivo = document.getElementById('motivoSalida').value;

    if (!await showConfirm(`¿Confirmar salida de ${carrito.length} productos para ${motivo}?`)) return;

    try {
        let errores = [];
        let exitosos = 0;

        // Enviar cada producto del carrito por separado
        for (const item of carrito) {
            const payload = {
                productoId: item.productoId,
                cantidad: item.cantidad,
                tipo: 'SALIDA',
                motivo: motivo,
                usuarioId: 'admin1'
            };

            console.log('📤 Enviando movimiento:', payload);

            try {
                const res = await fetch(`${API_URL}/movimientos.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify(payload)
                });

                const data = await res.json();

                if (data.success) {
                    exitosos++;
                    console.log(`✅ Movimiento registrado para ${item.nombre}`);
                } else {
                    errores.push(`${item.nombre}: ${data.error || 'Error desconocido'}`);
                    console.error(`❌ Error con ${item.nombre}:`, data.error);
                }
            } catch (error) {
                errores.push(`${item.nombre}: Error de red`);
                console.error(`❌ Error de red con ${item.nombre}:`, error);
            }
        }

        // Mostrar resultado
        if (errores.length === 0) {
            showNotification(`✅ Todos los movimientos registrados correctamente (${exitosos} productos).`, 'success');
            carrito = [];
            renderizarCarrito();
            cargarProductos();
            cargarHistorialMovimientos(); // Actualizar historial
        } else if (exitosos > 0) {
            showNotification(`⚠️ Parcialmente completado: ${exitosos} exitosos, ${errores.length} errores.`, 'warning');
            carrito = [];
            renderizarCarrito();
            cargarProductos();
            cargarHistorialMovimientos(); // Actualizar historial
        } else {
            showNotification(`❌ Error al registrar salidas.`, 'error');
        }

    } catch (error) {
        console.error('❌ Error crítico:', error);
        showNotification('Error de red al procesar las salidas', 'error');
    }
};

// Función de inicialización
export async function initDistribucion() {
    console.log('🚀 Iniciando módulo de distribución...');

    // Obtener elementos del DOM
    const input = document.getElementById('buscadorProd');
    const lista = document.getElementById('listaResultados');
    const btnBuscar = document.getElementById('btnBuscarDistribucion');

    if (!input || !lista || !btnBuscar) {
        console.error('❌ Elementos del DOM no encontrados:', {
            input: !!input,
            lista: !!lista,
            btnBuscar: !!btnBuscar
        });
        return;
    }

    console.log('✅ Elementos del buscador encontrados');

    // Event listener para el botón de búsqueda
    btnBuscar.addEventListener('click', function () {
        console.log('👆 ¡CLICK EN BOTÓN DE BÚSQUEDA DETECTADO!');
        realizarBusqueda();
    });
    console.log('✅ Event listener del botón de búsqueda agregado');

    // Event listener para Enter en el input
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            realizarBusqueda();
        }
    });
    console.log('✅ Event listener de Enter en input agregado');

    // Event listener para búsqueda mientras escribe (autocomplete)
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        if (term.length < 2) {
            lista.style.display = 'none';
            return;
        }

        let data = todosLosProductos;
        // Aplicar filtrado por preferencias (si está activo)
        data = filtrarListaPorAlergenos(data);

        const matches = data.filter(p =>
            p.nombre.toLowerCase().includes(term) ||
            (p.codigoBarras && p.codigoBarras.includes(term))
        );

        lista.innerHTML = '';
        matches.forEach(p => {
            const div = document.createElement('div');
            div.className = 'item-resultado';
            div.innerHTML = `<strong>${p.nombre}</strong> <small>(${p.stock})</small>`;
            div.setAttribute('tabindex', '0');
            div.setAttribute('role', 'button');
            div.onclick = () => seleccionarProducto(p);
            div.onkeydown = (e) => { if (e.key === 'Enter') seleccionarProducto(p) };
            lista.appendChild(div);
        });
        lista.style.display = matches.length ? 'block' : 'none';
    });

    console.log('✅ Event listener de autocomplete agregado');

    // Cargar productos e historial al inicio
    await cargarProductos();
    await cargarHistorialMovimientos();
    console.log('✅ Sistema de distribución inicializado');
}
