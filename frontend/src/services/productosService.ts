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
  usuarioId?: string;
};

export type CrearPedidoPayload = {
  proveedorId: number | string | null | undefined;
  total: number;
  usuarioId: string;
  items: Array<{
    producto_id: number | string;
    unidad?: string;
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
    offlineQueue: {
      enabled: true,
      queuedMessage: "Los productos se han dejado en cola y se crearán al recuperar conexión.",
    },
  });
}

export async function registrarBaja(payload: RegistrarBajaPayload): Promise<unknown> {
  // El backend rechaza campos extra como `usuarioId` en /bajas.
  // Aceptamos el tipo por compatibilidad, pero lo excluimos del body.
  const { usuarioId: _usuarioId, ...body } = payload;
  return apiFetch("/bajas", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(body),
    offlineQueue: {
      enabled: true,
      queuedMessage: "La baja queda pendiente y se sincronizará cuando vuelva la red.",
    },
  });
}

export async function crearPedido(payload: CrearPedidoPayload): Promise<unknown> {
  return apiFetch("/pedidos", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
    offlineQueue: {
      enabled: true,
      queuedMessage: "El pedido se ha guardado en cola y se enviará al recuperar conexión.",
    },
  });
}