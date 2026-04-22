import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCategorias,
  getProductos,
  getProveedores,
  registrarBaja,
  crearPedido,
  type Categoria,
  type Producto,
  type Proveedor,
} from "../services/productosService";
import Spinner from "../components/ui/Spinner";
import { useAuth } from "../contexts/AuthContext";
import { getGastosMensuales, type GastoMensual } from "../services/informesService";
import { getLotesProducto, type LoteProducto } from "../services/lotesService";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import BackofficeTablePanel from "../components/ui/BackofficeTablePanel";
import { Badge } from "../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Trash2, Truck } from "lucide-react";

type ProductoAviso = Producto & {
  nombreCategoria: string;
  proveedorObj?: Proveedor | null;
  nombreProveedor: string;
  fechaCaducidadNormalizada: string | null;
  stockMinimoNum: number;
  stockNum: number;
  precioNum: number;
  diasCaducado?: number;
};

type ModalModo = "baja" | "pedido" | null;

function hoyES() {
  return new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AvisosPage() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [accionActual, setAccionActual] = useState<ModalModo>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoAviso | null>(null);
  const [cantidadModal, setCantidadModal] = useState(1);
  const [confirmando, setConfirmando] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");
  const [toastTipo, setToastTipo] = useState<"success" | "error">("success");

  // Obtener usuario activo
  const { user } = useAuth();

  const productosQuery = useQuery({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    refetchInterval: 45_000,
  });

  const categoriasQuery = useQuery({
    queryKey: queryKeys.categorias,
    queryFn: getCategorias,
    refetchInterval: 60_000,
  });

  const proveedoresQuery = useQuery({
    queryKey: queryKeys.proveedores,
    queryFn: getProveedores,
    refetchInterval: 60_000,
  });

  const gastosMensualesQuery = useQuery({
    queryKey: queryKeys.informesGastosMensuales,
    queryFn: getGastosMensuales,
    refetchInterval: 60_000,
  });

  const lotesQuery = useQuery<LoteProducto[]>({
    queryKey: queryKeys.lotesProducto,
    queryFn: getLotesProducto,
    refetchInterval: 45_000,
  });

  const bajaMutation = useMutation({
    mutationFn: registrarBaja,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.productos }),
        queryClient.invalidateQueries({ queryKey: queryKeys.informesGastosMensuales }),
      ]);
      broadcastQueryInvalidation(queryKeys.productos);
      broadcastQueryInvalidation(queryKeys.informesGastosMensuales);
    },
  });

  const pedidoMutation = useMutation({
    mutationFn: crearPedido,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pedidos }),
        queryClient.invalidateQueries({ queryKey: queryKeys.informesGastosMensuales }),
      ]);
      broadcastQueryInvalidation(queryKeys.pedidos);
      broadcastQueryInvalidation(queryKeys.informesGastosMensuales);
    },
  });

  const loading =
    productosQuery.isLoading
    || categoriasQuery.isLoading
    || proveedoresQuery.isLoading
    || gastosMensualesQuery.isLoading
    || lotesQuery.isLoading;

  const productos = useMemo<ProductoAviso[]>(() => {
    const productosRaw = productosQuery.data ?? [];
    const categorias = categoriasQuery.data ?? [];
    const proveedores = proveedoresQuery.data ?? [];

    return productosRaw.map((p: any) => {
      const categoriaId = p.categoriaid ?? p.categoriaId ?? p.categoria?.id ?? null;
      const proveedorId = p.proveedorid ?? p.proveedorId ?? p.proveedor?.id ?? null;

      const proveedorObj =
        proveedores.find((pr) => String(pr.id) === String(proveedorId)) ?? null;

      const nombreCategoria =
        categorias.find((c) => String(c.id) === String(categoriaId))?.nombre || "General";

      const nombreProveedor = proveedorObj?.nombre || "N/A";

      return {
        ...p,
        nombreCategoria,
        proveedorObj,
        nombreProveedor,
        fechaCaducidadNormalizada: p.fechacaducidad || p.fechaCaducidad || null,
        stockMinimoNum: Number(p.stockminimo || p.stockMinimo || 0),
        stockNum: Number(p.stock || 0),
        precioNum: Number(p.precio || 0),
      };
    });
  }, [categoriasQuery.data, productosQuery.data, proveedoresQuery.data]);

  const caducados = useMemo<ProductoAviso[]>(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const lotes = lotesQuery.data ?? [];
    const lotesPorProducto = new Map<string, LoteProducto[]>();
    for (const l of lotes) {
      const pid = String(l.productoId);
      const arr = lotesPorProducto.get(pid) ?? [];
      arr.push(l);
      lotesPorProducto.set(pid, arr);
    }

    const listaCaducados = productos.map((p) => {
      const pid = String((p as any).id ?? "");
      const lotesP = lotesPorProducto.get(pid) ?? [];
      const tieneLotes = lotesP.length > 0;

      let cantidadCaducada = 0;
      let minFechaCaducada: Date | null = null;

      for (const l of lotesP) {
        if (!l.fechaCaducidad) continue;
        const fecha = new Date(l.fechaCaducidad);
        if (Number.isNaN(fecha.getTime())) continue;
        if (fecha < hoy && Number(l.cantidad) > 0) {
          cantidadCaducada += Number(l.cantidad);
          if (!minFechaCaducada || fecha < minFechaCaducada) minFechaCaducada = fecha;
        }
      }

      // Si hay lotes, el caducado viene SOLO de lotes (fuente de verdad)
      if (tieneLotes) {
        if (cantidadCaducada <= 0) return null;
      } else {
        // Fallback: productos antiguos sin lotes (todavía) -> usar fechaCaducidad del producto
        // Si el stock ya está a 0, no tiene sentido mantener el aviso de "dar de baja"
        if (p.stockNum <= 0) return null;
        const raw = p.fechaCaducidadNormalizada;
        if (!raw || raw === "NULL" || raw === "Sin fecha") return null;
        const fecha = new Date(String(raw).replace(" ", "T"));
        if (Number.isNaN(fecha.getTime()) || fecha >= hoy) return null;
        cantidadCaducada = p.stockNum;
        minFechaCaducada = fecha;
      }

      const diasCaducado = minFechaCaducada
        ? Math.ceil((hoy.getTime() - minFechaCaducada.getTime()) / 86400000)
        : 0;

      // Para acciones/valorización, usamos el "stock caducado" (suma de lotes caducados)
      return {
        ...p,
        stockNum: Number(cantidadCaducada.toFixed(3)),
        diasCaducado,
      };
    }).filter(Boolean) as ProductoAviso[];

    return listaCaducados.sort((a, b) => (b.diasCaducado ?? 0) - (a.diasCaducado ?? 0));
  }, [lotesQuery.data, productos]);

  const stockBajo = useMemo<ProductoAviso[]>(() => {
    return productos
      .filter((p) => p.stockMinimoNum > 0 && p.stockNum <= p.stockMinimoNum)
      .sort((a, b) => a.stockNum / a.stockMinimoNum - b.stockNum / b.stockMinimoNum);
  }, [productos]);

  const gastosMensuales = gastosMensualesQuery.data ?? [];
  const timestamp = useMemo(() => {
    if (!productosQuery.dataUpdatedAt && !gastosMensualesQuery.dataUpdatedAt) {
      return "";
    }

    const updatedAt = Math.max(productosQuery.dataUpdatedAt, gastosMensualesQuery.dataUpdatedAt);
    return (
      "Actualizado: "
      + new Date(updatedAt).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [gastosMensualesQuery.dataUpdatedAt, productosQuery.dataUpdatedAt]);

  const valorRiesgo = useMemo(() => {
    // "Riesgo" = valor caducados + valor de stock bajo (evitando duplicar por id)
    const map = new Map<string, ProductoAviso>();
    for (const p of caducados) map.set(String(p.id), p);
    for (const p of stockBajo) {
      const id = String(p.id);
      if (!map.has(id)) map.set(id, p);
    }
    let total = 0;
    for (const p of map.values()) total += p.precioNum * p.stockNum;
    return total;
  }, [caducados, stockBajo]);

  const totalAlertas = caducados.length + stockBajo.length;

  function tiempoRelativo(dias: number) {
    if (dias === 0) return "Hoy";
    if (dias === 1) return "Hace 1 día";
    if (dias < 7) return `Hace ${dias} días`;
    if (dias < 30) return `Hace ${Math.floor(dias / 7)} semanas`;
    return `Hace ${Math.floor(dias / 30)} meses`;
  }

  function abrirModalBaja(p: ProductoAviso) {
    setProductoSeleccionado(p);
    setAccionActual("baja");
    setCantidadModal(p.stockNum || 1);
    setModalOpen(true);
  }

  function abrirModalPedido(p: ProductoAviso, cantidadSugerida: number) {
    setProductoSeleccionado(p);
    setAccionActual("pedido");
    setCantidadModal(cantidadSugerida);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setProductoSeleccionado(null);
    setAccionActual(null);
    setCantidadModal(1);
    setConfirmando(false);
  }

  async function confirmarAccion() {
    if (!productoSeleccionado || !accionActual) return;
    if (cantidadModal <= 0) return;

    try {
      setConfirmando(true);

      if (accionActual === "baja") {
        const unidad = String((productoSeleccionado as any)?.unidadMedida ?? "ud").toLowerCase();
        const cantidadNormalizada =
          unidad === "ud"
            ? Math.round(cantidadModal)
            : Number(cantidadModal.toFixed(3));

        await bajaMutation.mutateAsync({
          productoId: productoSeleccionado.id,
          cantidad: cantidadNormalizada,
          tipoBaja: "Caducado",
          motivo: "Caducidad registrada desde Centro de Avisos",
        });

        mostrarToast("Baja registrada correctamente", "success");
      }else if (accionActual === "pedido") {
        const proveedorId =
          productoSeleccionado.proveedorObj?.id ?? productoSeleccionado.proveedorId;

        if (!proveedorId) {
          throw new Error("El producto no tiene proveedor asociado");
        }

        await pedidoMutation.mutateAsync({
          proveedorId,
          total: cantidadModal * productoSeleccionado.precioNum,
          items: [
            {
              producto_id: productoSeleccionado.id,
              cantidad: cantidadModal,
              precio: productoSeleccionado.precioNum,
              unidad: "ud",
            },
          ],
        });

        mostrarToast("Pedido creado correctamente", "success");
      }

      cerrarModal();
    } catch (error) {
      console.error("Error accion aviso:", error);
      mostrarToast(
        error instanceof Error ? error.message : "Error al realizar la acción",
        "error"
      );
      setConfirmando(false);
    }
  }

  function mostrarToast(mensaje: string, tipo: "success" | "error") {
    setToastMensaje(mensaje);
    setToastTipo(tipo);
    setToastOpen(true);

    window.setTimeout(() => {
      setToastOpen(false);
    }, 4000);
  }

  function formatearMes(mesStr: string) {
    const [year, month] = mesStr.split("-");
    const fecha = new Date(Number(year), Number(month) - 1);
    return fecha.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }

  const financieroResumen = useMemo(() => {
    const valorCaducado = caducados.reduce((s, p) => s + p.precioNum * p.stockNum, 0);
    const valorStockBajo = stockBajo.reduce((s, p) => s + p.precioNum * p.stockNum, 0);

    const todosEnRiesgo = [...caducados, ...stockBajo];
    const masCaro =
      todosEnRiesgo.length > 0
        ? todosEnRiesgo.reduce((max, p) =>
            p.precioNum * p.stockNum > max.precioNum * max.stockNum ? p : max
          )
        : null;

    return { valorCaducado, valorStockBajo, masCaro };
  }, [caducados, stockBajo]);

  return (
    <StaggerPage className="p-6 max-w-[1400px] mx-auto max-[768px]:p-4">
      <StaggerItem className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-semibold text-[#111827] m-0 mb-1 flex items-center gap-3">
            <i className="fa-solid fa-bell"></i> Centro de Avisos
          </h1>
          <p className="text-[#6b7280] text-[14px] m-0">Resumen de alertas y notificaciones del sistema</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap max-[768px]:w-full">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-[var(--color-bg-surface)] border border-[#e5e7eb] shadow-[0_2px_8px_rgba(15,23,42,0.05)] text-[#4b5563] text-[13px] font-semibold max-[768px]:w-full max-[768px]:justify-center">
            <i className="fa-solid fa-calendar text-[var(--color-brand-500)]"></i>
            <span>{hoyES()}</span>
          </div>

          {timestamp ? (
            <div className="text-[12px] text-[#6b7280] px-3.5 py-2.5 bg-[#f9fafb] rounded-[10px] border border-[#e5e7eb] max-[768px]:w-full max-[768px]:text-center">
              {timestamp}
            </div>
          ) : null}
        </div>
      </StaggerItem>

      <StaggerItem className="grid [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-8">
        <div className="bg-[var(--color-bg-surface)] border border-[#e5e7eb] rounded-[10px] p-5 flex items-center gap-4 transition-[transform,box-shadow] duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5">
          <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-[20px] bg-[#fef3c7] text-[#d97706]">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="flex-1">
            <span className="block text-[24px] font-bold text-[#111827] leading-tight">{loading ? "-" : totalAlertas}</span>
            <span className="block text-[13px] text-[#6b7280] mt-0.5">Alertas Activas</span>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] border border-[#e5e7eb] rounded-[10px] p-5 flex items-center gap-4 transition-[transform,box-shadow] duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5">
          <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-[20px] bg-[#fee2e2] text-[#dc2626]">
            <i className="fa-solid fa-skull-crossbones"></i>
          </div>
          <div className="flex-1">
            <span className="block text-[24px] font-bold text-[#111827] leading-tight">{loading ? "-" : caducados.length}</span>
            <span className="block text-[13px] text-[#6b7280] mt-0.5">Productos Caducados</span>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] border border-[#e5e7eb] rounded-[10px] p-5 flex items-center gap-4 transition-[transform,box-shadow] duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-0.5">
          <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-[20px] bg-[#dbeafe] text-[#2563eb]">
            <i className="fa-solid fa-coins"></i>
          </div>
          <div className="flex-1">
            <span className="block text-[24px] font-bold text-[#111827] leading-tight">{loading ? "-" : `${valorRiesgo.toFixed(2)} €`}</span>
            <span className="block text-[13px] text-[#6b7280] mt-0.5">Valor en Riesgo</span>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem className="mb-6 overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="px-5 py-4 border-l-4 border-l-[#dc2626] flex justify-between items-center bg-[linear-gradient(90deg,#fef2f2_0%,#f9fafb_100%)]">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-calendar-xmark text-[16px] text-[#6b7280]"></i>
            <h2 className="m-0 text-[16px] font-semibold text-[#111827]">Productos Caducados</h2>
          </div>
          <span className="bg-[var(--color-bg-surface)] text-[#374151] px-3 py-1 rounded-xl text-[13px] font-semibold border border-[#e5e7eb]">
            {caducados.length}
          </span>
        </div>

        <div>
          {loading ? (
            <div className="py-10 text-center text-[#9ca3af]"><Spinner label="Cargando caducados..." /></div>
          ) : caducados.length === 0 ? (
            <div className="py-10 text-center text-[#10b981]">
              <i className="fa-solid fa-circle-check block text-[32px] mb-2"></i>
              <span>No hay productos caducados</span>
            </div>
          ) : (
            caducados.map((p) => (
              <div
                className="grid [grid-template-columns:4px_1fr_auto_auto] gap-4 px-5 py-4 border-b border-b-[#f3f4f6] items-center transition-colors hover:bg-[#f9fafb] max-[768px]:[grid-template-columns:4px_1fr] max-[768px]:gap-3"
                key={`cad-${p.id}`}
              >
                <div className="w-1 h-10 rounded bg-[#dc2626]"></div>

                <div className="min-w-0 flex flex-col gap-0.5">
                  <p className="m-0 mb-1 text-[14px] font-semibold text-[#111827]">{p.nombre}</p>
                  <p className="m-0 text-[13px] text-[#6b7280]">
                    {p.nombreCategoria} · Stock: {p.stockNum}
                  </p>
                </div>

                <div className="flex gap-2 max-[768px]:col-start-2 max-[768px]:mt-2">
                  <button
                    type="button"
                    className="bo-table-action-btn text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => abrirModalBaja(p)}
                    title="Dar de baja"
                    aria-label={`Dar de baja ${p.nombre}`}
                  >
                    <Trash2 strokeWidth={1.5} size={18} />
                  </button>
                </div>

                <div className="text-right text-[12px] text-[#6b7280] min-w-20 max-[768px]:col-start-2 max-[768px]:text-left max-[768px]:mt-1">
                  <strong>{p.precioNum.toFixed(2)} €</strong>
                  <br />
                  {tiempoRelativo(p.diasCaducado || 0)}
                </div>
              </div>
            ))
          )}
        </div>
      </StaggerItem>

      <StaggerItem className="mb-6 overflow-hidden rounded-[30px] border border-slate-200/90 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="px-5 py-4 border-l-4 border-l-[#f59e0b] flex justify-between items-center bg-[linear-gradient(90deg,#fffbeb_0%,#f9fafb_100%)]">
          <div className="flex items-center gap-2.5">
            <i className="fa-solid fa-box-open text-[16px] text-[#6b7280]"></i>
            <h2 className="m-0 text-[16px] font-semibold text-[#111827]">Stock por Debajo del Mínimo</h2>
          </div>
          <span className="bg-[var(--color-bg-surface)] text-[#374151] px-3 py-1 rounded-xl text-[13px] font-semibold border border-[#e5e7eb]">
            {stockBajo.length}
          </span>
        </div>

        <div>
          {loading ? (
            <div className="py-10 text-center text-[#9ca3af]"><Spinner label="Cargando stock..." /></div>
          ) : stockBajo.length === 0 ? (
            <div className="py-10 text-center text-[#10b981]">
              <i className="fa-solid fa-circle-check block text-[32px] mb-2"></i>
              <span>Todos los productos tienen stock suficiente</span>
            </div>
          ) : (
            stockBajo.map((p) => {
              const pct = Math.min(100, Math.round((p.stockNum / p.stockMinimoNum) * 100));
              const barClass =
                pct <= 25
                  ? "bg-[linear-gradient(90deg,#dc2626,#ef4444)]"
                  : pct <= 75
                  ? "bg-[linear-gradient(90deg,#f59e0b,#fbbf24)]"
                  : "bg-[linear-gradient(90deg,#10b981,#34d399)]";

              const cantidadSugerida = Math.max(1, p.stockMinimoNum * 2 - p.stockNum);

              return (
                <div
                  className="grid [grid-template-columns:4px_1fr_auto_auto] gap-4 px-5 py-4 border-b border-b-[#f3f4f6] items-center transition-colors hover:bg-[#f9fafb] max-[768px]:[grid-template-columns:4px_1fr] max-[768px]:gap-3"
                  key={`stock-${p.id}`}
                >
                  <div className="w-1 h-10 rounded bg-[#f59e0b]"></div>

                  <div className="min-w-0 flex flex-col gap-0.5">
                    <p className="m-0 mb-1 text-[14px] font-semibold text-[#111827]">{p.nombre}</p>
                    <p className="m-0 text-[13px] text-[#6b7280]">
                      {p.nombreCategoria} · {p.nombreProveedor}
                    </p>
                  </div>

                  <div className="flex gap-2 max-[768px]:col-start-2 max-[768px]:mt-2">
                    <button
                      type="button"
                      className="bo-table-action-btn text-slate-500 hover:bg-[rgba(179,49,49,0.08)] hover:text-[var(--color-brand-500)]"
                      onClick={() => abrirModalPedido(p, cantidadSugerida)}
                      title="Solicitar pedido"
                      aria-label={`Solicitar pedido para ${p.nombre}`}
                    >
                      <Truck strokeWidth={1.5} size={18} />
                    </button>
                  </div>

                  <div className="w-[120px] h-1.5 bg-[#f3f4f6] rounded overflow-hidden max-[768px]:col-start-2 max-[768px]:w-full max-[768px]:mt-2" title={`${p.stockNum} / ${p.stockMinimoNum}`}>
                    <div className={`h-full rounded transition-[width] duration-300 ${barClass}`} style={{ width: `${pct}%` }}></div>
                  </div>

                  <div className="text-right text-[12px] text-[#6b7280] min-w-20 whitespace-nowrap max-[768px]:col-start-2 max-[768px]:text-left max-[768px]:mt-1">
                    <strong>{p.stockNum}</strong> / {p.stockMinimoNum}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </StaggerItem>

      <StaggerItem>
        <BackofficeTablePanel
          header={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-[16px] font-semibold text-[#111827]">Resumen Financiero</h2>
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="destructive" className="px-3 py-1 text-[11px] font-semibold">
                  Caducidad: {financieroResumen.valorCaducado.toFixed(2)} €
                </Badge>
                <Badge variant="warning" className="px-3 py-1 text-[11px] font-semibold">
                  Stock bajo: {financieroResumen.valorStockBajo.toFixed(2)} €
                </Badge>
              </div>
            </div>
          }
        >
          {loading ? (
            <div className="py-10 text-center text-[#9ca3af]"><Spinner label="Calculando..." /></div>
          ) : (
            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <div className="rounded-[22px] border border-red-100 bg-red-50/60 p-5">
                <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-[#6b7280]">Pérdida por Caducidad</div>
                <div className="text-[20px] font-bold text-[#dc2626]">{financieroResumen.valorCaducado.toFixed(2)} €</div>
              </div>

              <div className="rounded-[22px] border border-amber-100 bg-amber-50/60 p-5">
                <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-[#6b7280]">Valor en Stock Bajo</div>
                <div className="text-[20px] font-bold text-[#d97706]">{financieroResumen.valorStockBajo.toFixed(2)} €</div>
              </div>

              {financieroResumen.masCaro && (
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-5 md:col-span-2">
                  <div className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-[#6b7280]">Producto en Riesgo de Mayor Valor</div>
                  <div className="text-[18px] font-bold text-[#111827]">
                    {financieroResumen.masCaro.nombre}{" "}
                    <span className="text-[13px] font-normal text-[#6B7280]">
                      — {(financieroResumen.masCaro.precioNum * financieroResumen.masCaro.stockNum).toFixed(2)} €
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </BackofficeTablePanel>
      </StaggerItem>

      <StaggerItem>
        <BackofficeTablePanel
          header={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="m-0 text-[16px] font-semibold text-[#111827]">Gastos Mensuales por Profesor</h2>
              <Badge variant="success" className="px-3 py-1 text-[11px] font-semibold">
                {gastosMensuales.length} fila(s)
              </Badge>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <Table className="min-w-[760px] overflow-hidden rounded-[24px] border border-slate-100 bg-white">
              <TableHeader>
                <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="rounded-l-2xl">Mes</TableHead>
                  <TableHead>Profesor</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="rounded-r-2xl text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center">
                      <Spinner size="sm" label="Cargando datos financieros..." />
                    </TableCell>
                  </TableRow>
                ) : gastosMensuales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                      No hay datos de gastos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  gastosMensuales.map((g, idx) => (
                    <TableRow key={`${g.mes}-${g.nombre_usuario}-${idx}`} className="bo-table-row">
                      <TableCell className="text-sm text-slate-700">{formatearMes(g.mes)}</TableCell>
                      <TableCell className="text-sm text-slate-700">{g.nombre_usuario}</TableCell>
                      <TableCell className="text-center text-sm text-slate-700">{g.num_pedidos}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-slate-900">{Number(g.total_mes).toFixed(2)} €</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </BackofficeTablePanel>
      </StaggerItem>

      <div className={`fixed inset-0 bg-black/40 [backdrop-filter:blur(4px)] flex items-center justify-center z-[1000] transition-opacity duration-200 ${modalOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
        <div className={`bg-[var(--color-bg-surface)] w-[90%] max-w-[400px] rounded-xl border border-[#e5e7eb] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${modalOpen ? "translate-y-0 scale-100" : "translate-y-5 scale-95"}`}>
          <div className="flex justify-between items-center px-5 py-4 border-b border-b-[#f3f4f6]">
            <h3>
              {accionActual === "baja" ? "Confirmar Baja de Producto" : "Solicitar Pedido"}
            </h3>
            <button type="button" className="bg-transparent border-0 text-[#9ca3af] cursor-pointer text-[16px] p-1 rounded hover:bg-[#f3f4f6] hover:text-[#374151]" onClick={cerrarModal}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="p-5">
            <p className="m-0 mb-5 text-[#4b5563] text-[14px] leading-relaxed">
              {accionActual === "baja" && productoSeleccionado && (
                <>
                  Vas a dar de baja <strong>{productoSeleccionado.nombre}</strong> por caducidad.
                  <br />
                  Esta acción reducirá el stock disponible y quedará registrada.
                </>
              )}

              {accionActual === "pedido" && productoSeleccionado && (
                <>
                  Se creará un nuevo pedido para <strong>{productoSeleccionado.nombre}</strong>
                  <br />
                  al proveedor: <em>{productoSeleccionado.nombreProveedor}</em>.
                </>
              )}
            </p>

            <div>
              <label htmlFor="modal-cantidad" className="block text-[12px] font-medium text-[#374151] mb-1.5">Cantidad</label>
              <div className="flex items-center border border-[#d1d5db] rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="bg-[#f9fafb] border-0 w-10 h-10 text-[18px] text-[#6b7280] cursor-pointer border-r border-r-[#e5e7eb] hover:bg-[#f3f4f6] hover:text-[#111827]"
                  onClick={() => setCantidadModal((v) => Math.max(1, v - 1))}
                >
                  -
                </button>

                <input
                  id="modal-cantidad"
                  type="number"
                  min={1}
                  step={String((productoSeleccionado as any)?.unidadMedida ?? "ud").toLowerCase() === "ud" ? 1 : 0.1}
                  max={accionActual === "baja" ? productoSeleccionado?.stockNum : undefined}
                  value={cantidadModal}
                  onChange={(e) => {
                    const unidad = String((productoSeleccionado as any)?.unidadMedida ?? "ud").toLowerCase();
                    let value = Number(e.target.value) || 1;

                    if (unidad === "ud") {
                      value = Math.round(value);
                    }

                    setCantidadModal(Math.max(1, value));
                  }}
                  className="flex-1 border-0 text-center text-[16px] font-semibold py-2 outline-none [appearance:textfield]"
                />

                <button
                  type="button"
                  className="bg-[#f9fafb] border-0 w-10 h-10 text-[18px] text-[#6b7280] cursor-pointer border-l border-l-[#e5e7eb] hover:bg-[#f3f4f6] hover:text-[#111827]"
                  onClick={() => {
                    const unidad = String((productoSeleccionado as any)?.unidadMedida ?? "ud").toLowerCase();
                    const incremento = unidad === "ud" ? 1 : 0.1;

                    const max =
                      accionActual === "baja"
                        ? productoSeleccionado?.stockNum || cantidadModal + incremento
                        : cantidadModal + incremento;

                    setCantidadModal((v) => Math.min(max, Number((v + incremento).toFixed(3))));
                  }}
                >
                  +
                </button>
              </div>

              <span className="block mt-1.5 text-[11px] text-[#6b7280]">
                {accionActual === "baja" && productoSeleccionado
                  ? `Stock actual: ${productoSeleccionado.stockNum} unidades`
                  : accionActual === "pedido" && productoSeleccionado
                  ? `Stock mínimo: ${productoSeleccionado.stockMinimoNum} | Actual: ${productoSeleccionado.stockNum}`
                  : ""}
              </span>
            </div>
          </div>

          <div className="px-5 py-4 bg-[#f9fafb] border-t border-t-[#f3f4f6] flex justify-end gap-3 rounded-b-xl">
            <button type="button" className="px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer border border-[#d1d5db] bg-[var(--color-bg-surface)] text-[#374151] hover:bg-[#f3f4f6]" onClick={cerrarModal}>
              Cancelar
            </button>

            <button
              type="button"
              className={`px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer border border-transparent text-white inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${
                accionActual === "baja"
                  ? "bg-[#dc2626] hover:bg-[#b91c1c]"
                  : "bg-[#2563eb] hover:bg-[#1d4ed8]"
              }`}
              onClick={confirmarAccion}
              disabled={confirmando}
            >
              {confirmando ? <i className="fa-solid fa-circle-notch fa-spin"></i> : null}
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 translate-y-[100px] opacity-0 bg-[#111827] text-white px-5 py-2.5 rounded-[30px] flex items-center gap-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.2)] z-[2000] text-[13px] font-medium transition-[transform,opacity] duration-400 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
          toastOpen ? "translate-y-0 opacity-100" : ""
        }`}
      >
        <i
          className={
            toastTipo === "success"
              ? "fa-solid fa-circle-check text-[#34d399]"
              : "fa-solid fa-circle-xmark text-[#f87171]"
          }
        ></i>
        <span>{toastMensaje}</span>
      </div>
    </StaggerPage>
  );
}