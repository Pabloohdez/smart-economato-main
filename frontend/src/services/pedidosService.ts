import { apiFetch } from "./apiClient";
import type { Pedido, PedidoHistorial } from "../types";
import type { CrearPedidoPayload } from "./productosService";

type PedidosResponse<T> = {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

export async function getPedidos(): Promise<PedidoHistorial[]> {
  const json = await apiFetch<PedidosResponse<PedidoHistorial[]>>("/pedidos", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  if (!json?.success) {
    throw new Error(json?.error?.message || "Error cargando pedidos");
  }

  return Array.isArray(json.data) ? json.data : [];
}

export async function getPedidosPendientes(): Promise<Pedido[]> {
  const json = await apiFetch<PedidosResponse<Pedido[]>>("/pedidos", {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });

  if (!json?.success) {
    throw new Error(json?.error?.message || "Error cargando pedidos pendientes");
  }

  const pedidos = Array.isArray(json.data) ? json.data : [];
  return pedidos.filter((pedido) => pedido.estado === "PENDIENTE" || pedido.estado === "INCOMPLETO");
}

export async function crearPedidoHistorial(payload: CrearPedidoPayload): Promise<boolean> {
  const json = await apiFetch<PedidosResponse<unknown>>("/pedidos", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
    body: JSON.stringify(payload),
    offlineQueue: {
      enabled: true,
      queuedMessage: "El pedido queda en cola y se enviará cuando vuelva la conexión.",
    },
  });

  return Boolean(json?.success);
}

export async function recibirPedido(
  pedidoId: number | string,
  items: Array<{ detalle_id: number | string; cantidad_recibida: number }>,
): Promise<string> {
  const json = await apiFetch<{ data?: { message?: string } }>(`/pedidos/${pedidoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({ accion: "RECIBIR", items }),
    offlineQueue: {
      enabled: true,
      queuedMessage: "La recepción del pedido queda en cola y se sincronizará al volver la conexión.",
      optimisticResponse: {
        message: "Recepción en cola para sincronización",
      },
    },
  });

  return json?.data?.message ?? (json as { message?: string })?.message ?? "Recepción procesada correctamente";
}