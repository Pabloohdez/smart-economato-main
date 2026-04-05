import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  alergenosCatalogo: ["alergenos", "catalogo"] as const,
  misAlergias: ["alergenos", "mine"] as const,
  productos: ["productos"] as const,
  categorias: ["categorias"] as const,
  proveedores: ["proveedores"] as const,
  pedidos: ["pedidos"] as const,
  pedidosPendientes: ["pedidos", "pendientes"] as const,
  informesGastosMensuales: ["informes", "gastos-mensuales"] as const,
  rendimientosHistorial: ["rendimientos", "historial"] as const,
  escandallos: ["escandallos"] as const,
};