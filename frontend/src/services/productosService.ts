import { apiFetch } from "./apiClient";

export type { Categoria, Proveedor, Producto } from "../types";
import type { Categoria, Proveedor, Producto } from "../types";

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

function unwrap<T>(json: unknown): T[] {
  return (Array.isArray(json) ? json : ((json as any)?.data ?? [])) as T[];
}

export async function getProductos(): Promise<Producto[]> {
  return unwrap<Producto>(await apiFetch("/productos"));
}

export async function getCategorias(): Promise<Categoria[]> {
  return unwrap<Categoria>(await apiFetch("/categorias"));
}

export async function getProveedores(): Promise<Proveedor[]> {
  return unwrap<Proveedor>(await apiFetch("/proveedores"));
}

export async function crearProducto(payload: CrearProductoPayload): Promise<unknown> {
  return apiFetch("/productos", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
  });
}

export async function crearProductosBatch(items: CrearProductoPayload[]): Promise<unknown> {
  return apiFetch("/productos/batch", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(items),
  });
}

export async function registrarBaja(payload: RegistrarBajaPayload): Promise<unknown> {
  return apiFetch("/bajas", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
  });
}

export async function crearPedido(payload: CrearPedidoPayload): Promise<unknown> {
  return apiFetch("/pedidos", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
  });
}