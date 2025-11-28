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

export function buscarProducto(productos, nombre) {
  const q = (nombre ?? "").trim().toLowerCase();
  if (!q) return [...productos];
  return productos.filter(p => (p.nombre ?? "").toLowerCase().includes(q));
}

export function ordenarPorPrecio(productos, orden) {
  const dir = (orden === "desc") ? -1 : 1; // asc por defecto
  return [...productos].sort((a, b) => {
    const pa = Number(a.precio) || 0;
    const pb = Number(b.precio) || 0;
    return (pa - pb) * dir;
  });
}

export function comprobarStockMinimo(productos) {
  return productos.filter(p => Number(p.stock) < Number(p.stockMinimo));
}

export function renderizarTabla(datos) {
  const cuerpo  = document.querySelector('#tablaProductos tbody');
  const resumen = document.querySelector('#resumen');
  
  if (!cuerpo) return; // Seguridad por si no ha cargado el DOM
  cuerpo.innerHTML = '';

  if (!Array.isArray(datos) || datos.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px;">No se encontraron productos con esos criterios.</td></tr>';
    if (resumen) resumen.textContent = '';
    return;
  }

  datos.forEach(p => {
    const fila = document.createElement('tr');
    if (Number(p.stock) < Number(p.stockMinimo)) fila.classList.add('alerta');
    fila.innerHTML = `
      <td>${p.id ?? ''}</td>
      <td><strong>${p.nombre ?? ''}</strong></td>
      <td>${p.categoria?.nombre ?? '-'}</td>
      <td>${Number(p.precio).toFixed(2)} €</td>
      <td>${p.stock ?? 0}</td>
      <td>${p.stockMinimo ?? 0}</td>
      <td>${p.proveedor?.nombre ?? '-'}</td>
    `;
    cuerpo.appendChild(fila);
  });

  const totalProductos = datos.length;
  const valorTotal = datos
    .reduce((acc, p) => acc + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0)
    .toFixed(2);

  if (resumen) resumen.textContent =
    `Productos: ${totalProductos} | Valor Total Stock: ${valorTotal} €`;
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