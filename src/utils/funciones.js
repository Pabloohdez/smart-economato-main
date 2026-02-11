// src/utils/funciones.js

export function filtrarPorCategoria(productos, categoria) {
  const cat = (categoria ?? "").trim();
  if (!cat) return [...productos];
  return productos.filter(p => (p.categoria?.nombre ?? "") === cat);
}

export function filtrarPorProveedor(productos, proveedor) {
  const prov = (proveedor ?? "").trim();
  if (!prov) return [...productos];
  return productos.filter(p => (p.proveedor?.nombre ?? "") === prov);
}

export function buscarProducto(productos, termino) {
  const q = (termino ?? "").trim().toLowerCase();
  if (!q) return [...productos];
  return productos.filter(p => {
    const nombre = (p.nombre ?? "").toLowerCase();
    const codigo = (p.codigoBarras ?? p.codigobarras ?? "").toString().toLowerCase();
    return nombre.includes(q) || codigo.includes(q);
  });
}

export function ordenarPorPrecio(productos, orden) {
  const dir = (orden === "desc") ? -1 : 1;
  return [...productos].sort((a, b) => {
    const pa = Number(a.precio) || 0;
    const pb = Number(b.precio) || 0;
    return (pa - pb) * dir;
  });
}

export function comprobarStockMinimo(productos) {
  return productos.filter(p => {
    const stock = Number(p.stock) || 0;
    const min = Number(p.stockMinimo || p.stockminimo) || 0;
    return stock < min;
  });
}

// --- LÓGICA DE CADUCIDAD ---
function formatearFechaCaducidad(fechaStr) {
  if (!fechaStr || fechaStr === "NULL") {
    return { badge: 'badge-fecha-normal', texto: 'Sin fecha', clase: '' };
  }

  try {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    // Resetear horas para comparar solo días
    hoy.setHours(0, 0, 0, 0);
    const diferenciaDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));

    const opciones = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const textoFecha = fecha.toLocaleDateString('es-ES', opciones);

    if (diferenciaDias < 0) {
      return { badge: 'badge-caducado', texto: `⚠️ CADUCADO`, clase: 'alerta' };
    } else if (diferenciaDias <= 7) {
      return { badge: 'badge-caducado', texto: `⚠️ ${diferenciaDias}d`, clase: 'alerta' };
    } else if (diferenciaDias <= 30) {
      return { badge: 'badge-proximo-caducar', texto: `⏰ ${diferenciaDias}d`, clase: '' };
    } else {
      return { badge: 'badge-fecha-normal', texto: textoFecha, clase: '' };
    }
  } catch (error) {
    return { badge: 'badge-fecha-normal', texto: 'Error fecha', clase: '' };
  }
}

// --- RENDERIZADO DE TABLA ---
export function renderizarTabla(datos) {
  const cuerpo = document.querySelector('#tablaProductos tbody');
  const resumen = document.querySelector('#resumenInventario');

  if (!cuerpo) return;
  cuerpo.innerHTML = '';

  if (!Array.isArray(datos) || datos.length === 0) {
    cuerpo.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:50px;">No hay productos</td></tr>`;
    return;
  }

  datos.forEach(p => {
    const fila = document.createElement('tr');

    // Normalización de nombres (Postgres vs JS)
    const stockActual = Number(p.stock) || 0;
    const stockMinimo = Number(p.stockMinimo || p.stockminimo) || 0;
    const fechaCad = p.fechaCaducidad || p.fechacaducidad;

    const stockBajo = stockActual < stockMinimo;
    const infoCad = formatearFechaCaducidad(fechaCad);

    // Si el stock es bajo o está caducado/crítico, añadimos la clase 'alerta'
    if (stockBajo || infoCad.clase === 'alerta') {
      fila.classList.add('alerta');
    }

    // Badge de stock con estilo directo por si falla el CSS
    const badgeStock = stockBajo
      ? `<span class="badge-stock-bajo" style="background:#fff5f5; color:#e53e3e; padding:4px 8px; border-radius:4px; font-weight:bold; border:1px solid #feb2b2;">⚠️ ${stockActual}</span>`
      : `<span class="badge-stock-ok" style="color:#2f855a; font-weight:bold;">✓ ${stockActual}</span>`;

    fila.innerHTML = `
            <td style="text-align: center; font-weight: bold; color: #718096;">${p.id ?? ''}</td>
            <td><strong style="color: #2d3748;">${p.nombre ?? ''}</strong></td>
            <td><span style="background:#edf2f7; padding:2px 8px; border-radius:10px; font-size:11px;">${p.categoria?.nombre || p.categoria_nombre || '-'}</span></td>
            <td style="text-align: right; font-weight: bold; color: #2f855a;">${Number(p.precio).toFixed(2)} €</td>
            <td style="text-align: center;">${badgeStock}</td>
            <td style="text-align: center; color: #a0aec0;">${stockMinimo}</td>
            <td style="text-align: center;"><span class="${infoCad.badge}">${infoCad.texto}</span></td>
            <td><small>${p.proveedor?.nombre || p.proveedor_nombre || '-'}</small></td>
            <td style="text-align: center;">
                <button class="btn-editar" onclick="alert('Editar ID: ${p.id}')" style="border:none; background:none; cursor:pointer; color:#4a5568;">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
        `;
    cuerpo.appendChild(fila);
  });

  // Actualizar Resumen inferior
  if (resumen) {
    const total = datos.length;
    const bajos = datos.filter(p => (Number(p.stock) || 0) < (Number(p.stockMinimo || p.stockminimo) || 0)).length;
    resumen.innerHTML = `
            <div style="display:flex; gap:20px; padding:10px; background:#f7fafc; border-radius:8px; font-size:13px;">
                <span>📦 Total: <strong>${total}</strong></span>
                <span style="color:${bajos > 0 ? '#e53e3e' : '#2f855a'}">⚠️ Stock Bajo: <strong>${bajos}</strong></span>
            </div>
        `;
  }
}

// --- SELECTS ---
export function renderizarCategorias(categorias) {
  const select = document.querySelector('#categoriaSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Todas las categorías</option>';
  categorias.forEach(c => {
    select.innerHTML += `<option value="${c.nombre}">${c.nombre}</option>`;
  });
}

export function renderizarProveedores(proveedores) {
  const select = document.querySelector('#proveedorSelect');
  if (!select) return;
  select.innerHTML = '<option value="">Todos los proveedores</option>';
  proveedores.forEach(p => {
    select.innerHTML += `<option value="${p.nombre}">${p.nombre}</option>`;
  });
}