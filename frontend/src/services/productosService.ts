const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";

export type Categoria = { id: number | string; nombre: string };
export type Proveedor = { id: number | string; nombre: string };

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  stockMinimo?: number | null;
  fechaCaducidad?: string | null;

  categoriaId?: number | null;
  proveedorId?: number | null;

  categoria?: Categoria | null;
  proveedor?: Proveedor | null;
};

export type CrearProductoPayload = {
  nombre: string;
  precio: number;
  precioUnitario: string;
  stock: number;
  stockMinimo: number;
  categoriaId: number | string;
  proveedorId: number | string;
  unidadMedida: string;
  marca: string;
  codigoBarras: string;
  fechaCaducidad: string;
  alergenos: string[];
  descripcion: string;
  imagen: string;
  activo: boolean;
};

export type RegistrarBajaPayload = {
  productoId: number | string;
  cantidad: number;
  tipoBaja: string;
  motivo: string;
  usuarioId: string;
};

export type CrearPedidoPayload = {
  proveedorId: number | string | null | undefined;
  total: number;
  usuarioId: string;
  items: Array<{
    producto_id: number | string;
    cantidad: number;
    precio: number;
    nombre: string;
  }>;
};

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json();
}

export async function getProductos(): Promise<Producto[]> {
  const json = await getJSON<any>("/productos");
  const data = Array.isArray(json) ? json : (json?.data ?? []);
  return data as Producto[];
}

export async function getCategorias(): Promise<Categoria[]> {
  const json = await getJSON<any>("/categorias");
  const data = Array.isArray(json) ? json : (json?.data ?? []);
  return data as Categoria[];
}

export async function getProveedores(): Promise<Proveedor[]> {
  const json = await getJSON<any>("/proveedores");
  const data = Array.isArray(json) ? json : (json?.data ?? []);
  return data as Proveedor[];
}

export async function crearProducto(payload: CrearProductoPayload): Promise<any> {
  const res = await fetch(`${API_URL}/productos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} en /productos: ${text}`);
  }

  return res.json();
}

export async function registrarBaja(payload: RegistrarBajaPayload): Promise<any> {
  const res = await fetch(`${API_URL}/bajas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} en /bajas: ${text}`);
  }

  return res.json();
}

export async function crearPedido(payload: CrearPedidoPayload): Promise<any> {
  const res = await fetch(`${API_URL}/pedidos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} en /pedidos: ${text}`);
  }

  return res.json();
}