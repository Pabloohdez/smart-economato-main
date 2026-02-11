const API_URL = import.meta.env.VITE_API_URL as string;

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

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  return res.json();
}

export async function getProductos(): Promise<Producto[]> {
  const json = await getJSON<any>("/productos.php");
  const data = Array.isArray(json) ? json : (json?.data ?? []);
  return data as Producto[];
}

/** Opcional: si no existen endpoints, puedes no usarlos */
export async function getCategorias(): Promise<Categoria[]> {
  const json = await getJSON<any>("/categorias.php");
  const data = Array.isArray(json) ? json : (json?.data ?? []);
  return data as Categoria[];
}

export async function getProveedores(): Promise<Proveedor[]> {
  const json = await getJSON<any>("/proveedores.php");
  const data = Array.isArray(json) ? json : (json?.data ?? []);
  return data as Proveedor[];
}
