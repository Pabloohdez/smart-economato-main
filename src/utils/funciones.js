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
    // Obtenemos nombre y código asegurándonos de que sean texto
    const nombre = (p.nombre ?? "").toLowerCase();
    const codigo = (p.codigoBarras ?? "").toString().toLowerCase(); // Añadido .toString() por seguridad
    
    // Devolvemos true si el término de búsqueda está en el nombre O en el código
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
  return productos.filter(p => Number(p.stock) < Number(p.stockMinimo));
}

export function comprobarProximoCaducar(productos) {
  const hoy = new Date();
  const diasLimite = 30;
  
  return productos.filter(p => {
    if (!p.fechaCaducidad) return false;
    
    const fechaCad = new Date(p.fechaCaducidad);
    const diferenciaDias = Math.ceil((fechaCad - hoy) / (1000 * 60 * 60 * 24));
    
    return diferenciaDias >= 0 && diferenciaDias <= diasLimite;
  });
}

// Función auxiliar para formatear fecha de caducidad
function formatearFechaCaducidad(fechaStr) {
  if (!fechaStr) {
    return { 
      badge: 'badge-fecha-normal', 
      texto: 'Sin fecha', 
      clase: '' 
    };
  }
  
  try {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const diferenciaDias = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
    
    const opciones = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const textoFecha = fecha.toLocaleDateString('es-ES', opciones);
    
    if (diferenciaDias < 0) {
      return {
        badge: 'badge-caducado',
        texto: `⚠️ CADUCADO`,
        clase: 'alerta'
      };
    } else if (diferenciaDias <= 7) {
      return {
        badge: 'badge-caducado',
        texto: `⚠️ ${diferenciaDias}d`,
        clase: 'alerta'
      };
    } else if (diferenciaDias <= 30) {
      return {
        badge: 'badge-proximo-caducar',
        texto: `⏰ ${diferenciaDias}d`,
        clase: ''
      };
    } else {
      return {
        badge: 'badge-fecha-normal',
        texto: textoFecha,
        clase: ''
      };
    }
  } catch (error) {
    return { 
      badge: 'badge-fecha-normal', 
      texto: 'Fecha inválida', 
      clase: '' 
    };
  }
}

// Configuración de iconos y colores para alérgenos
const ICONOS_ALERGENOS = {
  'Lácteos': { icono: 'fa-cow', bg: '#e3f2fd', color: '#1976d2' },
  'Gluten': { icono: 'fa-wheat-awn', bg: '#fff8e1', color: '#f57c00' },
  'Huevos': { icono: 'fa-egg', bg: '#fffde7', color: '#f9a825' },
  'Pescado': { icono: 'fa-fish', bg: '#e1f5fe', color: '#0277bd' },
  'Crustáceos': { icono: 'fa-shrimp', bg: '#fce4ec', color: '#c2185b' },
  'Moluscos': { icono: 'fa-circle', bg: '#f3e5f5', color: '#7b1fa2' },
  'Frutos secos': { icono: 'fa-seedling', bg: '#efebe9', color: '#5d4037' },
  'Soja': { icono: 'fa-leaf', bg: '#f1f8e9', color: '#558b2f' },
  'Sulfitos': { icono: 'fa-wine-bottle', bg: '#f3e5f5', color: '#8e24aa' }
};

// Función auxiliar para generar badges de alérgenos
function generarBadgesAlergenos(alergenos) {
  if (!alergenos || alergenos.length === 0) {
    return '<span style="color: #a0aec0; font-size: 12px; font-style: italic;">Sin alérgenos</span>';
  }
  
  const badges = alergenos.map(alergeno => {
    const config = ICONOS_ALERGENOS[alergeno] || { 
      icono: 'fa-triangle-exclamation', 
      bg: '#fff5f5', 
      color: '#c53030' 
    };
    
    return `<span class="badge-alergeno" style="background: ${config.bg}; color: ${config.color};">
      <i class="fa-solid ${config.icono}"></i> ${alergeno}
    </span>`;
  }).join('');
  
  return `<div class="contenedor-alergenos">${badges}</div>`;
}

export function renderizarTabla(datos) {
  const cuerpo = document.querySelector('#tablaProductos tbody');
  const resumen = document.querySelector('#resumenInventario');
  
  if (!cuerpo) return;
  cuerpo.innerHTML = '';

  if (!Array.isArray(datos) || datos.length === 0) {
    cuerpo.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 60px 20px;">
          <div style="color: #a0aec0;">
            <i class="fa-solid fa-box-open" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
            <p style="font-size: 16px; font-weight: 600; margin: 10px 0;">No se encontraron productos</p>
            <small style="font-size: 13px;">Intenta ajustar los filtros o buscar otro término</small>
          </div>
        </td>
      </tr>
    `;
    if (resumen) resumen.innerHTML = '';
    return;
  }

  datos.forEach(p => {
    const fila = document.createElement('tr');
    const stockBajo = Number(p.stock) < Number(p.stockMinimo);
    
    // Calcular estado de caducidad
    const caducidad = formatearFechaCaducidad(p.fechaCaducidad);
    
    if (stockBajo || caducidad.clase === 'alerta') {
      fila.classList.add('alerta');
    }
    
    // Badge de stock
    const badgeStock = stockBajo 
      ? `<span class="badge-stock-bajo">⚠️ ${p.stock}</span>`
      : `<span class="badge-stock-ok">✓ ${p.stock}</span>`;
    
    // Badges de alérgenos
    const badgesAlergenos = generarBadgesAlergenos(p.alergenos);
    
    fila.innerHTML = `
      <td style="text-align: center; color: #718096; font-weight: 600;">${p.id ?? ''}</td>
      <td><strong style="color: #2d3748;">${p.nombre ?? ''}</strong></td>
      <td>
        <span style="display: inline-block; padding: 4px 12px; background: #edf2f7; 
                     color: #4a5568; border-radius: 12px; font-size: 12px; font-weight: 600;">
          ${p.categoria?.nombre ?? '-'}
        </span>
      </td>
      <td style="text-align: right; font-weight: 700; color: #2f855a;">
        ${Number(p.precio).toFixed(2)} €
      </td>
      <td style="text-align: center;">${badgeStock}</td>
      <td style="text-align: center; color: #718096; font-weight: 600;">${p.stockMinimo ?? 0}</td>
      <td style="text-align: center;">
        <span class="${caducidad.badge}">${caducidad.texto}</span>
      </td>
      <td>${badgesAlergenos}</td>
      <td style="color: #4a5568; font-size: 13px;">
        <i class="fa-solid fa-truck" style="color: #a0aec0; margin-right: 6px;"></i>
        ${p.proveedor?.nombre ?? '-'}
      </td>
    `;
    cuerpo.appendChild(fila);
  });

  // Calcular resumen
  const totalProductos = datos.length;
  const productosStockBajo = datos.filter(p => Number(p.stock) < Number(p.stockMinimo)).length;
  const valorTotal = datos
    .reduce((acc, p) => acc + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0)
    .toFixed(2);

  if (resumen) {
    resumen.innerHTML = `
      <div class="resumen-item">
        <i class="fa-solid fa-boxes-stacked" style="color: #a0aec0;"></i>
        <span>Total Productos: <span class="resumen-valor">${totalProductos}</span></span>
      </div>
      ${productosStockBajo > 0 ? `
        <div class="resumen-item">
          <i class="fa-solid fa-triangle-exclamation" style="color: #e53e3e;"></i>
          <span>Stock Bajo: <span class="resumen-valor" style="color: #e53e3e;">${productosStockBajo}</span></span>
        </div>
      ` : ''}
      <div class="resumen-item">
        <i class="fa-solid fa-euro-sign" style="color: #a0aec0;"></i>
        <span>Valor Total: <span class="resumen-valor">${valorTotal} €</span></span>
      </div>
    `;
  }
}

export function renderizarCategorias(categorias) {
  const select = document.querySelector('#categoriaSelect');
  if (!select) return;
  
  select.innerHTML = '<option value="">Todas las categorías</option>';
  categorias.forEach(c => {
    const opcion = document.createElement('option');
    opcion.value = c.nombre ?? '';
    opcion.textContent = c.nombre ?? '';
    select.appendChild(opcion);
  });
}

export function renderizarProveedores(proveedores) {
  const select = document.querySelector('#proveedorSelect');
  if (!select) return;

  select.innerHTML = '<option value="">Todos los proveedores</option>';
  proveedores.forEach(p => {
    const opcion = document.createElement('option');
    opcion.value = p.nombre ?? '';
    opcion.textContent = p.nombre ?? '';
    select.appendChild(opcion);
  });
}

