import { apiFetch } from "./apiClient";

export type LoteProducto = {
  id: number;
  productoId: string;
  pedidoId?: number | null;
  detalleId?: number | null;
  fechaCaducidad: string | null;
  cantidad: number;
};

function unwrap<T>(json: unknown): T[] {
  return (Array.isArray(json) ? json : ((json as any)?.data ?? [])) as T[];
}

export async function getLotesProducto(): Promise<LoteProducto[]> {
  return unwrap<LoteProducto>(await apiFetch("/lotes", { headers: { "X-Requested-With": "XMLHttpRequest" } }));
}

