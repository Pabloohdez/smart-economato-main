// src/utils/funciones.js

export function filtrarPorCategoria(productos, categoria) {
  const cat = (categoria ?? "").trim();
  if (!cat) return [...productos];
  return productos.filter(p => (p.nombreCategoria || p.categoria_nombre || "") === cat);
}

export function filtrarPorProveedor(productos, proveedor) {
  const prov = (proveedor ?? "").trim();
  if (!prov) return [...productos];
  return productos.filter(p => (p.nombreProveedor || p.proveedor_nombre || "") === prov);
}

export function buscarProducto(productos, termino) {
  const q = (termino ?? "").trim().toLowerCase();
  if (!q) return [...productos];
  return productos.filter(p => {
    const nombre = (p.nombre ?? "").toLowerCase();
    const codigo = (p.codigoBarras || p.codigobarras || "").toString().toLowerCase();
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
    const min = Number(p.stockMinimo || p.stockminimo || 0);
    return stock <= min;
  });
}

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