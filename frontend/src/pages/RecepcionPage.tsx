import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { apiFetch, type ApiRequestError } from "../services/apiClient";
import { showConfirm, showNotification } from "../utils/notifications";
import { scanBarcodeFromCamera } from "../utils/barcodeScanner";
import type {
  Producto,
  Categoria,
  Proveedor,
  PedidoItem,
  Pedido,
} from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useRecepcionSearch } from "../hooks/useRecepcionSearch";
import {
  getCategorias,
  getProductos,
  getProveedores,
} from "../services/productosService";
import {
  eliminarPedido,
  getPedidosPendientes,
  recibirPedido,
} from "../services/pedidosService";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import { useScaleSerial } from "../hooks/useScaleSerial";
import UiSelect from "../components/ui/UiSelect";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import BackofficeTablePanel from "../components/ui/BackofficeTablePanel";
import { Badge } from "../components/ui/badge";
import Spinner from "../components/ui/Spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  CalendarDays,
  ClipboardCheck,
  Copy,
  Import,
  PackageSearch,
  Plug,
  PlugZap,
  ScanLine,
  Scale,
  Search,
  Trash2,
  Truck,
} from "lucide-react";

type RecepcionRow = {
  producto_id: number | string;
  nombre: string;
  proveedor: string;
  stock: number;
  cantidadRecibida: number;
  unidad?: string;
  precio: number;
};

function formatEUR(n: number) {
  return `${n.toFixed(2)} €`;
}

function hoyES() {
  const fecha = new Date();
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function stepDeUnidad(unidad?: string) {
  const u = normalizarUnidad(unidad);
  if (u === "ud") return 1;
  if (u === "kg" || u === "l") return 0.1;
  return 1;
}

function normalizarUnidad(raw?: string) {
  const u = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!u) return "ud";
  if (u === "unidad" || u === "unidades" || u === "ud") return "ud";
  if (u === "kilo" || u === "kilos" || u === "kg") return "kg";
  if (u === "litro" || u === "litros" || u === "l") return "l";
  return u;
}


export default function Recepcion() {
  const queryClient = useQueryClient();
  const scale = useScaleSerial({ baudRate: 9600 });

  const productosQuery = useQuery<Producto[]>({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    refetchInterval: 45_000,
  });

  const categoriasQuery = useQuery<Categoria[]>({
    queryKey: queryKeys.categorias,
    queryFn: getCategorias,
    refetchInterval: 60_000,
  });

  const proveedoresQuery = useQuery<Proveedor[]>({
    queryKey: queryKeys.proveedores,
    queryFn: getProveedores,
    refetchInterval: 60_000,
  });

  const [modalPedidosOpen, setModalPedidosOpen] = useState(false);

  const pedidosPendientesQuery = useQuery<Pedido[]>({
    queryKey: queryKeys.pedidosPendientes,
    queryFn: getPedidosPendientes,
    enabled: modalPedidosOpen,
    refetchInterval: modalPedidosOpen ? 30_000 : false,
  });

  const productos = productosQuery.data ?? [];
  const categorias = categoriasQuery.data ?? [];
  const proveedores = proveedoresQuery.data ?? [];
  const loading =
    productosQuery.isLoading ||
    categoriasQuery.isLoading ||
    proveedoresQuery.isLoading;
  const recargarBaseRecepcion = useCallback(async () => {
    await Promise.all([
      productosQuery.refetch(),
      categoriasQuery.refetch(),
      proveedoresQuery.refetch(),
    ]);
  }, [categoriasQuery, productosQuery, proveedoresQuery]);
  const recepcionBaseError =
    [productosQuery.error, categoriasQuery.error, proveedoresQuery.error].find(
      (error): error is Error => error instanceof Error,
    )?.message ?? "";

  const {
    term,
    setTerm,
    provFiltro,
    setProvFiltro,
    catFiltro,
    setCatFiltro,
    resultadosAutocomplete,
  } = useRecepcionSearch({ productos });

  const [resultadosOpen, setResultadosOpen] = useState(false);

  const [recepcion, setRecepcion] = useState<RecepcionRow[]>([]);
  const totalRecepcion = useMemo(
    () => recepcion.reduce((sum, r) => sum + r.precio * r.cantidadRecibida, 0),
    [recepcion],
  );

  const [obs, setObs] = useState("");
  const [expectedKg, setExpectedKg] = useState<string>("");

  // Modal cantidad (manual)
  const [modalCantidadOpen, setModalCantidadOpen] = useState(false);
  const [productoSel, setProductoSel] = useState<Producto | null>(null);
  const [cantidadSel, setCantidadSel] = useState<number>(1);

  // Modal pedidos
  const [cerrandoDrawerPedidos, setCerrandoDrawerPedidos] = useState(false);
  const [verifQty, setVerifQty] = useState<Record<string, number>>({}); // detalle_id -> qty
  const [verifCaptured, setVerifCaptured] = useState<Record<string, number>>(
    {},
  ); // detalle_id -> kg capturados
  const [verifLotes, setVerifLotes] = useState<
    Record<string, Array<{ fecha: string; cantidad: number }>>
  >({});
  const [lotesModalOpen, setLotesModalOpen] = useState(false);
  const [lotesDetalleId, setLotesDetalleId] = useState<string>("");
  const [lotesUnidad, setLotesUnidad] = useState<string>("ud");
  const [lotesMax, setLotesMax] = useState<number>(0);
  const [loteFecha, setLoteFecha] = useState<string>("");
  const [loteCantidad, setLoteCantidad] = useState<string>("");

  const tablaPedidoScrollRef = useRef<HTMLDivElement | null>(null); 
  const buscadorWrapRef = useRef<HTMLDivElement | null>(null);
  const skipCloseRef = useRef(false);
  const drawerPedidosTimerRef = useRef<number | null>(null);

  function manejarWheelTablaPedido(e: React.WheelEvent<HTMLDivElement>) {
  const el = tablaPedidoScrollRef.current;
  if (!el) return;

  const tieneOverflowHorizontal = el.scrollWidth > el.clientWidth;
  if (!tieneOverflowHorizontal) return;

  if (e.deltaY !== 0) {
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }
}

  // Obtener usuario activo para auditoría
  const { user } = useAuth();
  const usuarioLogueadoId = user?.id || 1;

  const confirmarRecepcionMutation = useMutation({
    mutationFn: async (payload: {
      tipo: string;
      motivo: string;
      usuario_id: number | string;
      items: Array<{ producto_id: number | string; cantidad: number }>;
    }) => {
      // El backend acepta un movimiento por request:
      // { productoId: string, cantidad: number, tipo?: 'ENTRADA'|'SALIDA', motivo?: string }
      // y rechaza propiedades extra / payloads "batch" (forbidNonWhitelisted).
      for (const item of payload.items) {
        await apiFetch("/movimientos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({
            productoId: String(item.producto_id),
            cantidad: item.cantidad,
            tipo: payload.tipo,
            motivo: payload.motivo,
          }),
          offlineQueue: {
            enabled: true,
            queuedMessage:
              "La recepción manual queda en cola y se sincronizará al recuperar conexión.",
          },
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      broadcastQueryInvalidation(queryKeys.productos);
    },
  });

  const recibirPedidoMutation = useMutation({
    mutationFn: ({
      pedidoId,
      items,
    }: {
      pedidoId: number | string;
      items: Array<{
        detalle_id: number | string;
        cantidad_recibida: number;
        lotes?: Array<{ fecha_caducidad?: string | null; cantidad: number }>;
      }>;
    }) => recibirPedido(pedidoId, items),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.productos }),
        queryClient.invalidateQueries({ queryKey: queryKeys.pedidos }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.pedidosPendientes,
        }),
      ]);
      broadcastQueryInvalidation(queryKeys.productos);
      broadcastQueryInvalidation(queryKeys.pedidos);
    },
  });

  const eliminarPedidoMutation = useMutation({
    mutationFn: (pedidoId: number | string) => eliminarPedido(pedidoId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.pedidos }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.pedidosPendientes,
        }),
      ]);
      broadcastQueryInvalidation(queryKeys.pedidos);
    },
  });

  useEffect(() => {
    return () => {
      if (drawerPedidosTimerRef.current) {
        window.clearTimeout(drawerPedidosTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void recargarBaseRecepcion();

    const onOnline = () => {
      void recargarBaseRecepcion();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void recargarBaseRecepcion();
      }
    };
    const onPageShow = () => {
      void recargarBaseRecepcion();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [recargarBaseRecepcion]);

  // cerrar dropdown si clic fuera
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (skipCloseRef.current) {
        skipCloseRef.current = false;
        return;
      }
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (
        buscadorWrapRef.current &&
        !buscadorWrapRef.current.contains(target)
      ) {
        setResultadosOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const resultadosRender = useMemo(() => {
    if (!resultadosOpen) return [];
    return resultadosAutocomplete.slice(0, 30);
  }, [resultadosOpen, resultadosAutocomplete]);

  function proveedorNombreDeProducto(p: Producto) {
    const prov = proveedores.find(
      (x) => String(x.id) === String(p.proveedorId),
    );
    return prov?.nombre ?? "N/A";
  }

  function abrirModalCantidad(p: Producto) {
    console.log(
      "[Recepcion] abrirModalCantidad called for:",
      p.nombre,
      "id:",
      p.id,
    );
    setProductoSel(p);
    const unidad = normalizarUnidad(p.unidadMedida);
    const step = stepDeUnidad(
      unidad === "kg" || unidad === "l" ? unidad : "ud",
    );
    setCantidadSel(step);
    setModalCantidadOpen(true);
    console.log("[Recepcion] modalCantidadOpen set to true");
  }

  async function escanearCodigoBarras() {
    const code = await scanBarcodeFromCamera();
    if (!code) {
      showNotification(
        "No se pudo leer un codigo de barras. Intenta de nuevo.",
        "warning",
      );
      return;
    }
    setTerm(code);
    setResultadosOpen(true);
    showNotification(`Codigo leido: ${code}`, "success");
  }

  function cerrarModalCantidad() {
    setModalCantidadOpen(false);
    setProductoSel(null);
  }

  function agregarProducto(p: Producto, cant: number) {
    const provNombre = proveedorNombreDeProducto(p);
    const unidad = normalizarUnidad(p.unidadMedida);

    setRecepcion((prev) => [
      ...prev,
      {
        producto_id: p.id,
        nombre: p.nombre,
        proveedor: provNombre,
        stock: Number(p.stock ?? 0),
        cantidadRecibida: cant,
        unidad,
        precio: Number(p.precio ?? 0),
      },
    ]);

    setTerm("");
    setResultadosOpen(false);
  }

  function actualizarCantidadVerificada(
    detalleId: string,
    siguiente: number,
    maximo: number,
  ) {
    const safe = Math.max(0, Math.min(maximo, siguiente));
    setVerifQty((prev) => ({ ...prev, [detalleId]: safe }));
  }

  function abrirLotes(
    detalleId: string,
    unidad: string | undefined,
    maximo: number,
  ) {
    setLotesDetalleId(detalleId);
    setLotesUnidad(normalizarUnidad(unidad));
    setLotesMax(maximo);
    setLoteFecha("");
    setLoteCantidad("");
    setLotesModalOpen(true);
  }

  function cerrarLotes() {
    setLotesModalOpen(false);
    setLotesDetalleId("");
  }

  function agregarLote() {
    if (!lotesDetalleId) return;
    const fecha = loteFecha.trim();
    const cant = Number(String(loteCantidad || "").replace(",", "."));
    if (!fecha) {
      showNotification("Selecciona una fecha de caducidad.", "warning");
      return;
    }
    if (!Number.isFinite(cant) || cant <= 0) {
      showNotification("Cantidad de lote inválida.", "warning");
      return;
    }

    const currentQty = Number(verifQty[lotesDetalleId] ?? 0);
    const sum = (verifLotes[lotesDetalleId] ?? []).reduce(
      (s, l) => s + Number(l.cantidad || 0),
      0,
    );
    if (sum + cant > currentQty + 0.0005) {
      showNotification(
        "La suma de lotes supera la cantidad a recibir ahora.",
        "warning",
      );
      return;
    }

    setVerifLotes((prev) => ({
      ...prev,
      [lotesDetalleId]: [
        ...(prev[lotesDetalleId] ?? []),
        { fecha, cantidad: cant },
      ],
    }));
    setLoteFecha("");
    setLoteCantidad("");
  }

  function eliminarLote(index: number) {
    if (!lotesDetalleId) return;
    setVerifLotes((prev) => ({
      ...prev,
      [lotesDetalleId]: (prev[lotesDetalleId] ?? []).filter(
        (_, i) => i !== index,
      ),
    }));
  }

  function confirmarLotes() {
    if (!lotesDetalleId) return;

    const cantidadRecibir = Number(verifQty[lotesDetalleId] ?? 0);
    const sumaLotes = (verifLotes[lotesDetalleId] ?? []).reduce(
      (s, l) => s + Number(l.cantidad || 0),
      0
    );

    if (cantidadRecibir > 0 && Math.abs(sumaLotes - cantidadRecibir) > 0.0005) {
      showNotification(
        "La suma de los lotes debe coincidir con la cantidad a recibir.",
        "warning"
      );
      return;
    }

    cerrarLotes();
  }

  function capturarBasculaParaDetalle(
    detalleId: string,
    unidadRaw: string | undefined,
    maximo: number,
  ) {
    const unidad = normalizarUnidad(unidadRaw);
    // Solo tiene sentido capturar báscula para productos por peso (kg).
    if (unidad !== "kg") return;
    const kg = scale.captureKg();
    if (kg == null) return;
    const v = Number(kg.toFixed(3));
    setVerifCaptured((prev) => ({ ...prev, [detalleId]: v }));
    // por defecto, también rellenamos "a recibir ahora"
    actualizarCantidadVerificada(detalleId, v, maximo);
  }

  function eliminarFila(idx: number) {
    setRecepcion((prev) => prev.filter((_, i) => i !== idx));
  }

  async function eliminarPedidoVacioDesdeDrawer(pedidoId: number | string) {
  cerrarDrawerPedidos();
  await new Promise((resolve) => window.setTimeout(resolve, 240));

  const confirmado = await showConfirm({
    title: "Eliminar pedido vacío",
    message: "Este pedido no tiene líneas. ¿Quieres eliminarlo?",
    confirmLabel: "Eliminar",
    icon: "fa-solid fa-trash",
  });

  if (!confirmado) {
    setCerrandoDrawerPedidos(false);
    setModalPedidosOpen(true);
    return;
  }

  try {
    const message = await eliminarPedidoMutation.mutateAsync(pedidoId);
    showNotification(message || "Pedido eliminado correctamente.", "success");
    await pedidosPendientesQuery.refetch();
    setCerrandoDrawerPedidos(false);
    setModalPedidosOpen(true);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el pedido";
    showNotification(message, "error");
    setCerrandoDrawerPedidos(false);
    setModalPedidosOpen(true);
  }
}

  async function confirmarRecepcionManual() {
    if (!recepcion.length) return;

    // Si el usuario indica kg esperados, validamos contra la lectura actual
    const expected = Number(String(expectedKg || "").replace(",", "."));
    if (Number.isFinite(expected) && expected > 0 && scale.weightKg != null) {
      const diff = Math.abs(scale.weightKg - expected);
      // Tolerancia simple: 0.05 kg (50g). Ajustable.
      const tolerance = 0.05;
      if (diff > tolerance) {
        showNotification(
          `⚠️ Peso no coincide: esperado ${expected.toFixed(3)} kg, báscula ${scale.weightKg.toFixed(3)} kg (Δ ${diff.toFixed(3)} kg)`,
          "warning",
        );
        return;
      }
    }

    const payload = {
      tipo: "ENTRADA",
      motivo: obs || "Recepción Manual",
      usuario_id: usuarioLogueadoId,
      items: recepcion.map((r) => ({
        producto_id: r.producto_id,
        cantidad: r.cantidadRecibida,
      })),
    };

    try {
      await confirmarRecepcionMutation.mutateAsync(payload);
    } catch {
      showNotification("Error al guardar recepción", "error");
      return;
    }

    showNotification("Recepción manual guardada correctamente.", "success");
    setRecepcion([]);
    setObs("");
    setExpectedKg("");
  }

  // ===== Pedidos (importación) =====
  const abrirModalPedidos = useCallback(async () => {
    console.log("[Recepcion] abrirModalPedidos called");
    setCerrandoDrawerPedidos(false);
    setModalPedidosOpen(true);
    setVerifQty({}); // Reset quantities for new verification

    try {
      const pendientes = await pedidosPendientesQuery
        .refetch()
        .then((result) => result.data ?? []);

      // Initialize verifQty for all items in all pending orders
      const initialVerifQty: Record<string, number> = {};
      pendientes.forEach((ped) => {
        (ped.items ?? []).forEach((item) => {
          // Default to remaining quantity. If already fully received, it will be 0
          initialVerifQty[String(item.id)] =
            (Number(item.cantidad) || 0) -
            (Number(item.cantidad_recibida) || 0);
        });
      });
      setVerifQty(initialVerifQty);
    } catch (e: any) {
      console.error(e);
      showNotification("Error cargando pedidos pendientes", "error");
    }
  }, [pedidosPendientesQuery]);

  const cerrarDrawerPedidos = useCallback(() => {
    if (!modalPedidosOpen || cerrandoDrawerPedidos) return;
    setCerrandoDrawerPedidos(true);
    if (drawerPedidosTimerRef.current) {
      window.clearTimeout(drawerPedidosTimerRef.current);
    }
    drawerPedidosTimerRef.current = window.setTimeout(() => {
      setModalPedidosOpen(false);
      setCerrandoDrawerPedidos(false);
      drawerPedidosTimerRef.current = null;
    }, 220);
  }, [cerrandoDrawerPedidos, modalPedidosOpen]);

  const verificarPedidoLocal = useCallback(
    async (
      pedidoId: number | string,
      items: PedidoItem[],
      proveedor_nombre: string,
    ) => {
      const TOLERANCIA = 0.05; // 50g aprox (solo aplica a kg)

      cerrarDrawerPedidos();
      await new Promise((resolve) => window.setTimeout(resolve, 240));

      const confirmado = await showConfirm({
        title: "Confirmar recepción",
        message: "¿Confirmar entrada de stock y actualizar pedido?",
        confirmLabel: "Sí, actualizar",
        icon: "fa-solid fa-boxes-stacked",
      });

      if (!confirmado) {
        setCerrandoDrawerPedidos(false);
        setModalPedidosOpen(true);
        return;
      }

      // Verificación con báscula: si hay capturas, avisamos si no coincide con lo esperado
      const discrepancias: string[] = [];
      for (const it of items) {
        const detalleId = String(it.id);
        const unidad = normalizarUnidad(it.unidad);
        if (unidad !== "kg") continue;

        const capt = verifCaptured[detalleId];
        if (capt == null) continue;

        const maxRecibir = Math.max(
          0,
          (Number(it.cantidad) || 0) - (Number(it.cantidad_recibida) || 0),
        );
        const qty = Number(verifQty[detalleId] ?? 0);

        const diffEsperado = Math.abs(capt - maxRecibir);
        const diffQty = Math.abs(capt - qty);

        if (diffEsperado > TOLERANCIA || diffQty > TOLERANCIA) {
          discrepancias.push(
            `${it.producto_nombre}: esperado ${maxRecibir.toFixed(3)} kg, báscula ${capt.toFixed(3)} kg, a recibir ${qty.toFixed(3)} kg`,
          );
        }
      }

      if (discrepancias.length) {
        const okDiscrep = await showConfirm({
          title: "⚠️ Discrepancia con báscula",
          message:
            "Hay líneas donde la lectura de báscula no cuadra con lo esperado.\n\n" +
            discrepancias.slice(0, 6).join("\n") +
            (discrepancias.length > 6 ? `\n... (+${discrepancias.length - 6} más)` : "") +
            "\n\n¿Quieres continuar igualmente?",
          confirmLabel: "Sí, continuar",
        });

        if (!okDiscrep) {
          setCerrandoDrawerPedidos(false);
          setModalPedidosOpen(true);
          return;
        }
      }

      const itemsToReceive = items
        .map((it) => {
          const detalleId = String(it.id);
          return {
            detalle_id: it.id,
            cantidad_recibida: Number(verifQty[detalleId] ?? 0),
            lotes: (verifLotes[detalleId] ?? []).map((l) => ({
              fecha_caducidad: l.fecha,
              cantidad: l.cantidad,
            })),
          };
        })
        .filter((item) => item.cantidad_recibida > 0); // Only send items with received quantity > 0

      // Validación: si hay lotes, deben sumar exactamente lo recibido
      for (const it of itemsToReceive) {
        if (it.lotes && it.lotes.length > 0) {
          const sum = it.lotes.reduce((s, l) => s + Number(l.cantidad || 0), 0);
          const diff = Math.abs(sum - Number(it.cantidad_recibida || 0));
          if (diff > 0.0005) {
            showNotification("La suma de lotes no coincide con la cantidad a recibir.", "warning");
            setCerrandoDrawerPedidos(false);
            setModalPedidosOpen(true);
            return;
          }
        }
      }

      if (itemsToReceive.length === 0) {
        showNotification("No se ha especificado ninguna cantidad a recibir.", "warning");
        setCerrandoDrawerPedidos(false);
        setModalPedidosOpen(true);
        return;
      }

      try {
        const message = await recibirPedidoMutation.mutateAsync({
          pedidoId,
          items: itemsToReceive,
        });

        // Añadir a la tabla de recepción (solo los recibidos > 0)
        const nuevasFilas: RecepcionRow[] = [];
        for (const it of items) {
          const qty = Number(verifQty[String(it.id)] ?? 0);
          if (qty <= 0) continue;

          const prod = productos.find(
            (p) => String(p.id) === String(it.producto_id),
          );
          const provNombre = prod
            ? proveedorNombreDeProducto(prod)
            : proveedor_nombre;

          // stock anterior: si tenemos producto, usamos su stock - qty como en vuestro JS
          const stockAnterior = prod ? Number(prod.stock ?? 0) - qty : 0;

          nuevasFilas.push({
            producto_id: it.producto_id,
            nombre: it.producto_nombre ?? prod?.nombre ?? "Producto",
            proveedor: provNombre,
            stock: stockAnterior,
            cantidadRecibida: qty,
            unidad: it.unidad ?? prod?.unidadMedida ?? prod?.precioUnitario,
            precio: Number(it.precio_unitario ?? prod?.precio ?? 0),
          });
        }

        if (nuevasFilas.length) {
          setRecepcion((prev) => [...prev, ...nuevasFilas]);
        }

        showNotification(message, "success");
        // Refresh the list of pending orders
        await abrirModalPedidos();
      } catch (e) {
        console.error(e);
        const apiError = e as ApiRequestError;
        showNotification("Error de conexión: " + apiError.message, "error");
        setCerrandoDrawerPedidos(false);
        setModalPedidosOpen(true);
      }
    },
    [
      verifQty,
      verifCaptured,
      productos,
      abrirModalPedidos,
      recibirPedidoMutation,
      scale,
    ],
  );

  const pedidosPendientes = pedidosPendientesQuery.data ?? [];
  const pedidosPendientesError =
    pedidosPendientesQuery.error instanceof Error
      ? pedidosPendientesQuery.error.message
      : "";

  const nombreProveedorActual = useMemo(() => {
    if (!recepcion.length) return "Sin seleccionar";
    // Si hay varios, mostramos el primero (igual que vuestro HTML simple)
    return recepcion[0].proveedor;
  }, [recepcion]);

  async function reintentarDatosBase() {
    await Promise.all([
      productosQuery.refetch(),
      categoriasQuery.refetch(),
      proveedoresQuery.refetch(),
    ]);
  }

  return (
    <StaggerPage>
      {/* Header */}
      <StaggerItem>
        <div className="flex items-center justify-between gap-4 mb-[30px] pb-5 border-b-2 border-[var(--color-border-default)] max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-[15px]">
          <div>
            <h1 className="m-0 mb-2 flex items-center gap-3 text-[28px] font-bold text-[var(--color-text-strong)]">
              <Truck className="h-7 w-7 text-[var(--color-brand-500)]" />{" "}
              RECEPCIÓN DE MERCANCÍA
            </h1>
            <p className="m-0 text-[14px] text-[#50596D]">
              Registra las entregas de proveedores y actualiza el inventario
            </p>
          </div>
          <div className="bg-[var(--color-bg-surface)] px-5 py-3 rounded-[14px] text-[var(--color-text-muted)] font-semibold inline-flex items-center gap-2 border border-[var(--color-border-default)] shadow-[var(--shadow-sm)]">
            <CalendarDays className="h-4 w-4" />
            <span>{hoyES()}</span>
          </div>
        </div>
      </StaggerItem>

      {loading && (
        <StaggerItem>
          <Spinner label="Cargando datos de recepcion..." />
        </StaggerItem>
      )}

      {!loading && recepcionBaseError && (
        <StaggerItem>
          <div className="flex flex-col gap-4">
            <Alert type="error" title="Error al cargar recepcion">
              {recepcionBaseError}
            </Alert>
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={reintentarDatosBase}
              >
                Reintentar carga
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      {!loading && !recepcionBaseError && (
        <>
          <StaggerItem>
            <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] border border-[var(--color-border-default)] rounded-[20px] p-6 shadow-[var(--shadow-sm)] mb-4">
              <div className="flex gap-3 items-center flex-wrap justify-between">
                <div className="flex gap-2.5 items-center flex-wrap">
                  <strong className="inline-flex items-center gap-2">
                    <Scale className="h-4 w-4 text-[var(--color-brand-500)]" />{" "}
                    Báscula
                  </strong>
                  <span className="text-[13px] text-[#4a5568]">
                    Lectura:{" "}
                    <strong>
                      {scale.weightKg == null
                        ? "—"
                        : `${scale.weightKg.toFixed(3)} kg`}
                    </strong>
                  </span>
                  {!scale.supported ? (
                    <span className="text-[12px] text-[#e53e3e]">
                      (Web Serial no soportado)
                    </span>
                  ) : scale.connected ? (
                    <button
                      type="button"
                      className="px-4 py-2 rounded-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-default)] hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] transition inline-flex items-center gap-2"
                      onClick={scale.disconnect}
                    >
                      <PlugZap className="h-4 w-4" /> Desconectar
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="px-4 py-2 rounded-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-default)] hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] transition inline-flex items-center gap-2"
                      onClick={scale.connect}
                    >
                      <Plug className="h-4 w-4" /> Conectar
                    </button>
                  )}
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  <label className="text-[13px] text-[#4a5568]">
                    Kg esperados (opcional):
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={expectedKg}
                    onChange={(e) => setExpectedKg(e.target.value)}
                    className="w-40 py-3 px-3 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] text-[var(--color-text-strong)] bg-white box-border focus:border-[var(--color-brand-500)] focus:outline-none"
                    placeholder="0.000"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 rounded-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] text-[var(--color-text-default)] hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                    onClick={() => {
                      const kg = scale.captureKg();
                      if (kg != null) setExpectedKg(String(kg.toFixed(3)));
                    }}
                    disabled={!scale.connected || scale.weightKg == null}
                    title="Copiar lectura a kg esperados"
                  >
                    <Copy className="h-4 w-4" /> Usar lectura
                  </button>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* Panel búsqueda */}
          <StaggerItem>
            <div
              className="mb-[25px] rounded-xl border border-gray-200 bg-white p-[25px] shadow-sm"
              ref={buscadorWrapRef}
            >
              <h2 className="text-[18px] font-semibold text-[var(--color-text-strong)] m-0 mb-5 flex items-center gap-2.5">
                <PackageSearch className="h-5 w-5 text-[var(--color-brand-500)]" />{" "}
                Buscar Producto
              </h2>

              <div className="flex flex-col gap-[15px]">
                <div className="flex gap-3 items-center relative max-[768px]:flex-col max-[768px]:items-stretch">
                  <div className="flex gap-3 items-center w-full">
                    <div className="relative flex-1 flex items-center">
                      {/* Ghost suggestion */}
                      {resultadosAutocomplete.length > 0 &&
                        term.length >= 2 &&
                        resultadosAutocomplete[0].nombre
                          .toLowerCase()
                          .startsWith(term.toLowerCase()) &&
                        resultadosAutocomplete[0].nombre.toLowerCase() !==
                          term.toLowerCase() && (
                          <div
                            className="absolute left-0 top-0 z-[2] flex h-12 w-full items-center overflow-hidden whitespace-pre rounded-[18px] border border-transparent px-3 pl-10 text-sm pointer-events-none"
                            aria-hidden="true"
                          >
                            <span style={{ visibility: "hidden" }}>{term}</span>
                            <span style={{ color: "#a0aec0" }}>
                              {resultadosAutocomplete[0].nombre.slice(
                                term.length,
                              )}
                            </span>
                          </div>
                        )}
                      <input
                        id="inputRecepcion"
                        autoFocus
                        className="relative z-[1] h-12 w-full flex-1 rounded-[18px] border border-gray-300 bg-white px-3 pl-10 text-sm text-gray-900 shadow-sm transition-[border-color,box-shadow] duration-150 box-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={term}
                        autoComplete="off"
                        onChange={(e) => {
                          setTerm(e.target.value);
                          setResultadosOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (
                            (e.key === "Tab" || e.key === "ArrowRight") &&
                            resultadosAutocomplete.length > 0 &&
                            term.length >= 2
                          ) {
                            const firstMatch = resultadosAutocomplete[0];
                            if (
                              firstMatch.nombre
                                .toLowerCase()
                                .startsWith(term.toLowerCase())
                            ) {
                              e.preventDefault();
                              setTerm(firstMatch.nombre);
                              return;
                            }
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (resultadosAutocomplete.length > 0) {
                              abrirModalCantidad(resultadosAutocomplete[0]);
                              setResultadosOpen(false);
                            } else {
                              setResultadosOpen(true);
                            }
                          }
                        }}
                        onFocus={() => setResultadosOpen(true)}
                        placeholder="Escribe nombre o código de barras..."
                        aria-label="Buscar producto por nombre o código"
                      />
                    </div>

                    <button
                      className="inline-flex h-12 w-12 min-w-12 items-center justify-center rounded-[18px] border border-gray-300 bg-white text-gray-400 shadow-sm cursor-pointer transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 touch-manipulation"
                      type="button"
                      onClick={escanearCodigoBarras}
                      aria-label="Escanear codigo de barras"
                      title="Escanear codigo"
                    >
                      <ScanLine className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Dropdown de resultados */}
                  {resultadosOpen && (
                    <div
                      id="listaResultados"
                      className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[220px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-[var(--color-border-default)] text-[#718096] italic">
                          <i className="fa-solid fa-spinner fa-spin" />{" "}
                          Cargando...
                        </div>
                      ) : resultadosRender.length === 0 ? (
                        term.trim().length >= 2 ? (
                          <div className="flex items-center justify-center gap-3 px-4 py-3 border-b border-[var(--color-border-default)] text-[#718096] italic">
                            Sin resultados para «{term.trim()}»
                          </div>
                        ) : null
                      ) : (
                        resultadosRender.map((p) => (
                          <div
                            key={String(p.id)}
                            className="flex cursor-pointer items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 transition-colors duration-150 hover:bg-gray-50"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              skipCloseRef.current = true;
                              abrirModalCantidad(p);
                              setResultadosOpen(false);
                            }}
                          >
                            <div className="min-w-0">
                              <div
                                className="truncate"
                                style={{
                                  fontWeight: 600,
                                  fontSize: "14px",
                                  color: "#2d3748",
                                }}
                              >
                                {p.nombre}
                              </div>

                              {!!(p as any).codigoBarras && (
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#718096",
                                    marginTop: "2px",
                                  }}
                                >
                                  CB: {(p as any).codigoBarras}
                                </div>
                              )}
                            </div>

                            <span
                              style={{
                                fontSize: "12px",
                                color: "#718096",
                                background: "#f7fafc",
                                padding: "2px 8px",
                                borderRadius: "20px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Stock: {p.stock}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-[15px] max-[768px]:flex-col">
                  <UiSelect
                    value={provFiltro}
                    onChange={setProvFiltro}
                    placeholder="Todos los proveedores"
                    options={[
                      { value: "", label: "Todos los proveedores" },
                      ...proveedores.map((p) => ({
                        value: String(p.id),
                        label: p.nombre,
                      })),
                    ]}
                  />

                  <UiSelect
                    value={catFiltro}
                    onChange={setCatFiltro}
                    placeholder="Todas las categorías"
                    options={[
                      { value: "", label: "Todas las categorías" },
                      ...categorias.map((c) => ({
                        value: String(c.id),
                        label: c.nombre,
                      })),
                    ]}
                  />
                </div>
              </div>
              <div className="mt-[15px] text-right">
                <button
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:opacity-90"
                  style={{ display: "inline-flex" }}
                  onClick={abrirModalPedidos}
                >
                  <Import className="h-4 w-4" /> Importar/Recibir Pedido
                </button>
              </div>
            </div>
          </StaggerItem>

          {/* Drawer Importar Pedidos (tablet-first) */}
          {modalPedidosOpen &&
            createPortal(
              <div
                className={`fixed inset-0 z-[1000] backdrop-blur-[4px] transition-[background,opacity] duration-200 ${cerrandoDrawerPedidos ? "bg-[rgba(11,18,32,0)]" : "bg-[rgba(11,18,32,0.42)]"} flex items-stretch justify-end`}
                onClick={cerrarDrawerPedidos}
              >
                <aside
                  className={`w-[min(38vw,620px)] max-w-[100vw] h-full bg-[var(--color-bg-surface)] border-l border-[var(--color-border-default)] shadow-[-16px_0_40px_rgba(0,0,0,0.18)] p-6 overflow-y-auto overflow-x-hidden flex flex-col transition-[transform,opacity] duration-200 ${cerrandoDrawerPedidos ? "translate-x-9 opacity-55" : "translate-x-0 opacity-100"} max-[1280px]:w-[min(58vw,760px)] max-[1024px]:w-[min(78vw,920px)] max-[768px]:w-screen max-[768px]:p-4`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <h3 className="m-0 flex items-center gap-2">
                      <Import className="h-5 w-5 text-[var(--color-brand-500)]" />{" "}
                      Importar Pedido Pendiente
                    </h3>
                    <button
                      type="button"
                      className="w-11 h-11 min-w-11 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] inline-flex items-center justify-center cursor-pointer active:scale-[0.98]"
                      aria-label="Cerrar importacion de pedidos"
                      onClick={cerrarDrawerPedidos}
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-1">
                    {pedidosPendientesQuery.isLoading ||
                    pedidosPendientesQuery.isFetching ? (
                      <div className="flex-1 flex items-center justify-center">
                        <Spinner label="Cargando pedidos pendientes..." />
                      </div>
                    ) : pedidosPendientesError ? (
                      <div className="py-2">
                        <Alert
                          type="error"
                          title="Error al cargar pedidos pendientes"
                        >
                          <div className="flex flex-col gap-4">
                            <span>{pedidosPendientesError}</span>
                            <div>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => pedidosPendientesQuery.refetch()}
                              >
                                Reintentar pedidos
                              </Button>
                            </div>
                          </div>
                        </Alert>
                      </div>
                    ) : pedidosPendientes.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-center text-[var(--color-text-muted)]">
                        <p>No hay pedidos pendientes o incompletos.</p>
                      </div>
                    ) : (
                      <div className="mt-5 flex-1 flex flex-col gap-[18px]">
                        {pedidosPendientes.map((ped) => {
                          const items = Array.isArray(ped.items)
                            ? ped.items
                            : [];
                          const completado =
                            ped.estado.toUpperCase() === "COMPLETADO";
                          const pedidoVacio = items.length === 0;

                          return (
                            <div
                              key={String(ped.id)}
                              className="border border-[var(--color-border-default)] rounded-[14px] p-4 bg-[var(--color-bg-surface)] shadow-[var(--shadow-sm)] flex flex-col justify-between"
                            >
                              <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-[var(--color-border-default)] max-[1024px]:flex-col max-[1024px]:items-start">
                                <div>
                                  <strong>Pedido #{ped.id}</strong> — Proveedor:{" "}
                                  {ped.proveedor_nombre}
                                </div>
                                <span
                                  className={[
                                    "inline-flex items-center justify-center min-h-7 px-2.5 py-1 rounded-full text-[12px] font-bold uppercase whitespace-nowrap",
                                    ped.estado.toLowerCase() === "pendiente"
                                      ? "bg-[#fff5f5] text-[#b33131]"
                                      : ped.estado.toLowerCase() ===
                                          "incompleto"
                                        ? "bg-[#fffaf0] text-[#c05621]"
                                        : "bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]",
                                  ].join(" ")}
                                >
                                  {ped.estado}
                                </span>
                              </div>
                              <div className="min-w-0">
                                {items.length === 0 ? (
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    <div>Este pedido está vacío y no se puede recepcionar.</div>
                                    <div className="mt-3">
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={() => eliminarPedidoVacioDesdeDrawer(ped.id)}
                                        disabled={eliminarPedidoMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar pedido vacío
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    ref={tablaPedidoScrollRef}
                                    onWheel={manejarWheelTablaPedido}
                                    className="mt-2.5 w-full overflow-x-auto overflow-y-hidden pb-2"
                                  >
                                    <Table className="min-w-[1100px] rounded-[20px] border border-slate-100 bg-white text-[12px]">
                                    <TableHeader>
                                      <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                                        <TableHead className="rounded-l-2xl">
                                          Producto
                                        </TableHead>
                                        <TableHead>Unidad</TableHead>
                                        <TableHead>Pedida</TableHead>
                                        <TableHead>Recibida (Antes)</TableHead>
                                        <TableHead className="rounded-r-2xl text-center w-[160px] max-[1024px]:w-[148px]">
                                          A Recibir Ahora
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {items.map((it) => {
                                        const qtyVerif = verifQty[it.id] ?? 0;
                                        const maxRecibir = Math.max(
                                          0,
                                          (Number(it.cantidad) || 0) -
                                            (Number(it.cantidad_recibida) || 0),
                                        );
                                        const unidad = (it.unidad ??
                                          "ud") as string;
                                        const step = stepDeUnidad(unidad);
                                        return (
                                          <TableRow
                                            key={String(it.id)}
                                            className="bo-table-row"
                                          >
                                            <TableCell>
                                              {it.producto_nombre}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                              {unidad}
                                            </TableCell>
                                            <TableCell>{it.cantidad}</TableCell>
                                            <TableCell>
                                              {it.cantidad_recibida || 0}
                                            </TableCell>
                                            <TableCell className="text-center">
                                              {!completado ? (
                                                <div className="inline-flex w-full items-center justify-center gap-2">
                                                  <button
                                                    type="button"
                                                    className="bo-table-action-btn h-11 w-11 min-h-11 min-w-11 rounded-[10px] text-[22px] font-bold leading-none"
                                                    aria-label={`Reducir cantidad de ${it.producto_nombre}`}
                                                    onClick={() =>
                                                      actualizarCantidadVerificada(
                                                        String(it.id),
                                                        Number(qtyVerif || 0) -
                                                          step,
                                                        maxRecibir,
                                                      )
                                                    }
                                                  >
                                                    -
                                                  </button>
                                                  <input
                                                    type="number"
                                                    min={0}
                                                    max={maxRecibir}
                                                    step={step}
                                                    value={qtyVerif}
                                                    onChange={(e) =>
                                                      actualizarCantidadVerificada(
                                                        String(it.id),
                                                        Number(
                                                          e.target.value || 0,
                                                        ),
                                                        maxRecibir,
                                                      )
                                                    }
                                                    className="w-[74px] min-h-11 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-2.5 py-2 text-center font-semibold [appearance:textfield]"
                                                    inputMode="numeric"
                                                  />
                                                  <button
                                                    type="button"
                                                    className="bo-table-action-btn h-11 w-11 min-h-11 min-w-11 rounded-[10px] text-[var(--color-text-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                                                    aria-label={`Usar lectura de báscula para ${it.producto_nombre}`}
                                                    title="Usar lectura de báscula"
                                                    onClick={() =>
                                                      capturarBasculaParaDetalle(
                                                        String(it.id),
                                                        unidad,
                                                        maxRecibir,
                                                      )
                                                    }
                                                    disabled={
                                                      !scale.connected ||
                                                      scale.weightKg == null ||
                                                      step === 1
                                                    }
                                                  >
                                                    <Scale className="h-4 w-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="bo-table-action-btn h-11 w-11 min-h-11 min-w-11 rounded-[10px] text-[var(--color-text-strong)]"
                                                    aria-label={`Gestionar lotes de ${it.producto_nombre}`}
                                                    title="Lotes (caducidad)"
                                                    onClick={() =>
                                                      abrirLotes(
                                                        String(it.id),
                                                        unidad,
                                                        maxRecibir,
                                                      )
                                                    }
                                                  >
                                                    <CalendarDays className="h-4 w-4" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    className="bo-table-action-btn h-11 w-11 min-h-11 min-w-11 rounded-[10px] text-[22px] font-bold leading-none"
                                                    aria-label={`Aumentar cantidad de ${it.producto_nombre}`}
                                                    onClick={() =>
                                                      actualizarCantidadVerificada(
                                                        String(it.id),
                                                        Number(qtyVerif || 0) +
                                                          step,
                                                        maxRecibir,
                                                      )
                                                    }
                                                  >
                                                    +
                                                  </button>
                                                </div>
                                              ) : (
                                                "—"
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                  </div>
                                )}
                              </div>

                              {!completado && !pedidoVacio && (
                                <div className="text-right mt-[15px]">
                                  <button
                                    className="min-h-11 px-4 py-2.5 border-0 rounded-[10px] bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] text-white font-semibold inline-flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(179,49,49,0.24)] transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-px hover:brightness-105 hover:shadow-[0_6px_16px_rgba(179,49,49,0.3)] active:scale-[0.98] focus-visible:outline-[3px] focus-visible:outline-[rgba(179,49,49,0.35)] focus-visible:outline-offset-2"
                                    type="button"
                                    onClick={() =>
                                      verificarPedidoLocal(
                                        Number(ped.id),
                                        items,
                                        ped.proveedor_nombre,
                                      )
                                    }
                                    title="Añadir a recepción"
                                  >
                                    <i className="fa-solid fa-check" /> Añadir
                                    Verificados
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-[18px] pb-2 border-t border-[var(--color-border-default)] bg-[var(--color-bg-surface)]">
                    <button
                      className="w-full min-h-12 px-3 py-3 rounded-lg font-semibold cursor-pointer border-0 bg-[var(--color-border-default)] text-[var(--color-text-muted)]"
                      onClick={cerrarDrawerPedidos}
                    >
                      Cerrar
                    </button>
                  </div>
                </aside>
              </div>,
              document.body,
            )}
        </>
      )}

      {lotesModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/50 z-[11000] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && cerrarLotes()}
          >
            <div className="w-full max-w-[560px] rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[0_25px_50px_rgba(0,0,0,0.25)] overflow-hidden">
              <div className="px-6 py-5 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white flex items-center justify-between gap-3">
                <div className="font-extrabold text-[16px]">
                  Lotes por caducidad
                </div>
                <button
                  type="button"
                  className="bg-white/20 border-0 text-white w-9 h-9 rounded-full cursor-pointer inline-flex items-center justify-center hover:bg-white/30"
                  onClick={cerrarLotes}
                  aria-label="Cerrar"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <div className="p-6 grid gap-4">
                <div className="text-[13px] text-[var(--color-text-muted)] font-semibold">
                  Cantidad a recibir ahora:{" "}
                  <strong>
                    {Number(verifQty[lotesDetalleId] ?? 0).toFixed(3)}{" "}
                    {lotesUnidad}
                  </strong>
                </div>

                <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                      Caducidad
                    </label>
                    <input
                      type="date"
                      value={loteFecha}
                      onChange={(e) => setLoteFecha(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                      Cantidad ({lotesUnidad})
                    </label>
                    <input
                      type="number"
                      value={loteCantidad}
                      onChange={(e) => setLoteCantidad(e.target.value)}
                      step={lotesUnidad === "ud" ? "1" : "0.001"}
                      className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="min-h-11 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-5 py-2.5 rounded-[10px] font-semibold cursor-pointer hover:bg-[var(--color-border-default)]"
                  onClick={agregarLote}
                >
                  <i className="fa-solid fa-plus" /> Añadir lote
                </button>

                <div className="overflow-hidden rounded-[12px] border border-[var(--color-border-default)]">
                  <Table className="bg-white text-[13px]">
                    <TableHeader>
                      <TableRow className="bg-[var(--color-bg-soft)] hover:bg-[var(--color-bg-soft)]">
                        <TableHead className="rounded-l-2xl normal-case tracking-normal text-left text-[12px] text-[var(--color-text-muted)]">
                          Caducidad
                        </TableHead>
                        <TableHead className="normal-case tracking-normal text-left text-[12px] text-[var(--color-text-muted)]">
                          Cantidad
                        </TableHead>
                        <TableHead className="rounded-r-2xl normal-case tracking-normal text-right text-[12px] text-[var(--color-text-muted)]">
                          Acción
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(verifLotes[lotesDetalleId] ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="py-4 text-[var(--color-text-muted)]"
                          >
                            No hay lotes añadidos.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (verifLotes[lotesDetalleId] ?? []).map((l, idx) => (
                          <TableRow key={idx} className="bo-table-row">
                            <TableCell>{l.fecha}</TableCell>
                            <TableCell>
                              {Number(l.cantidad).toFixed(3)} {lotesUnidad}
                            </TableCell>
                            <TableCell className="text-right">
                              <button
                                type="button"
                                className="bo-table-action-btn text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => eliminarLote(idx)}
                                aria-label="Eliminar lote"
                              >
                                <Trash2 strokeWidth={1.5} size={18} />
                              </button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="min-h-11 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white border-0 px-6 py-2.5 rounded-[10px] font-semibold cursor-pointer shadow-[0_4px_15px_rgba(179,49,49,0.25)] hover:-translate-y-0.5 transition"
                    onClick={confirmarLotes}
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {/* Panel recepción actual */}
      <StaggerItem>
        <BackofficeTablePanel
          className="mb-[25px] max-[1024px]:p-0"
          header={
            <div className="flex flex-wrap items-center justify-between gap-3 max-[1024px]:items-start">
              <h3 className="m-0 flex items-center gap-2.5 text-[18px] font-semibold text-[var(--color-text-strong)]">
                <ClipboardCheck className="h-5 w-5 text-[var(--color-brand-500)]" />{" "}
                Recepción Actual
              </h3>
              <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-5 py-2.5">
                <span className="mr-2 text-[13px] text-[#50596D]">
                  Proveedor:
                </span>
                <span className="text-[15px] font-semibold text-[var(--color-text-strong)]">
                  {nombreProveedorActual}
                </span>
              </div>
            </div>
          }
        >
          <div className="[-webkit-overflow-scrolling:touch] w-full overflow-x-auto">
            <Table className="min-w-[760px] overflow-hidden rounded-[24px] border border-slate-100 bg-white max-[1024px]:min-w-0">
              <TableHeader>
                <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                  <TableHead>Producto</TableHead>
                  <TableHead className="max-[1024px]:hidden">
                    Proveedor
                  </TableHead>
                  <TableHead>Stock Actual</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Cantidad Recibida</TableHead>
                  <TableHead>Nuevo Stock</TableHead>
                  <TableHead className="max-[1024px]:hidden">Precio</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {!recepcion.length ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div className="px-5 py-[60px]">
                        <div className="flex flex-col items-center justify-center gap-2 text-center">
                          <i className="fa-solid fa-inbox mb-1 text-[48px] opacity-55" />
                          <p className="m-0 font-bold">
                            No hay productos en la recepción actual
                          </p>
                          <small className="opacity-80">
                            Busca y selecciona productos para comenzar
                          </small>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  recepcion.map((r, idx) => (
                    <TableRow
                      key={`${String(r.producto_id)}-${idx}`}
                      className="bo-table-row"
                    >
                      <TableCell className="text-sm font-medium text-gray-900 max-[1024px]:text-[12px]">
                        {r.nombre}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-[1024px]:hidden">
                        {r.proveedor}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-[1024px]:text-[12px]">
                        {r.stock}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-gray-500 max-[1024px]:text-[12px]">
                        {String(r.unidad ?? "ud")}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900 max-[1024px]:text-[12px]">
                        {r.cantidadRecibida}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-primary max-[1024px]:text-[12px]">
                        {r.stock + r.cantidadRecibida}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 max-[1024px]:hidden">
                        {formatEUR(r.precio)}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-gray-900 max-[1024px]:text-[12px]">
                        {formatEUR(r.precio * r.cantidadRecibida)}
                      </TableCell>
                      <TableCell>
                        <button
                          className="bo-table-action-btn inline-flex text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 max-[1024px]:h-11 max-[1024px]:w-11"
                          onClick={() => eliminarFila(idx)}
                          title="Eliminar"
                          type="button"
                        >
                          <Trash2 strokeWidth={1.5} size={18} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {!!recepcion.length && (
                <TableFooter>
                  <TableRow className="text-[16px] hover:bg-[var(--color-bg-soft)]">
                    <TableCell colSpan={6}>
                      <strong>TOTAL DE LA RECEPCIÓN</strong>
                    </TableCell>
                    <TableCell className="text-[20px] font-bold text-[var(--color-brand-500)]">
                      {formatEUR(totalRecepcion)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </BackofficeTablePanel>
      </StaggerItem>

      {/* Observaciones + acciones */}
      <StaggerItem>
        <div className="mb-[25px] rounded-xl border border-gray-200 bg-white p-[25px] shadow-sm">
          <div className="mb-5">
            <label className="flex items-center gap-2 text-[var(--color-text-muted)] font-semibold mb-2.5 text-[14px]">
              <i className="fa-solid fa-note-sticky" /> Observaciones / Notas
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm resize-y transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Añade notas sobre esta recepción (opcional)..."
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-[15px] max-[768px]:flex-col">
            {!!recepcion.length && (
              <>
                <button
                  className="px-[30px] py-[14px] rounded-[10px] font-semibold text-[15px] cursor-pointer transition-[transform,background,border-color] duration-200 inline-flex items-center gap-2.5 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:-translate-y-0.5 max-[768px]:w-full max-[768px]:justify-center"
                  onClick={() => setRecepcion([])}
                  type="button"
                >
                  <i className="fa-solid fa-xmark" /> Cancelar Recepción
                </button>
                <button
                  className="px-[30px] py-[14px] rounded-[10px] font-semibold text-[15px] cursor-pointer transition-[transform,box-shadow,background] duration-200 inline-flex items-center gap-2.5 bg-[linear-gradient(135deg,#48bb78_0%,#38a169_100%)] text-white shadow-[0_4px_15px_rgba(56,161,105,0.3)] hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#68d391_0%,#48bb78_100%)] hover:shadow-[0_6px_20px_rgba(56,161,105,0.4)] max-[768px]:w-full max-[768px]:justify-center"
                  onClick={confirmarRecepcionManual}
                  type="button"
                >
                  <i className="fa-solid fa-check-circle" /> CONFIRMAR RECEPCIÓN
                </button>
              </>
            )}
          </div>
        </div>
      </StaggerItem>

      {/* Modal Cantidad (usando Portal) */}
      {modalCantidadOpen &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[4px] flex items-center justify-center z-[1000] p-4">
            <div className="bg-[var(--color-bg-surface)] p-[30px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[90%] max-w-[400px]">
              <h3 className="m-0 mb-[15px] text-[var(--color-text-strong)] flex items-center gap-2.5">
                <i className="fa-solid fa-box-open" /> Cantidad Recibida
              </h3>
              <p className="text-[#50596D] text-[14px] mb-5">
                {productoSel?.nombre ?? ""}
              </p>

              <div className="mb-[25px]">
                <label className="block text-[var(--color-text-muted)] font-semibold mb-2 text-[14px]">
                  Cantidad:
                </label>
                <div className="inline-flex items-center gap-2">
                  {(() => {
                    const unidad = normalizarUnidad(productoSel?.unidadMedida);
                    const step = stepDeUnidad(
                      unidad === "kg" || unidad === "l" ? unidad : "ud",
                    );
                    const min = step;
                    return (
                      <button
                        type="button"
                        className="w-11 h-11 min-w-11 min-h-11 border border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-soft)] text-[var(--color-text-strong)] text-[22px] leading-none font-bold inline-flex items-center justify-center cursor-pointer active:scale-[0.97] focus-visible:outline-[3px] focus-visible:outline-[rgba(179,49,49,0.35)] focus-visible:outline-offset-2"
                        aria-label="Reducir cantidad"
                        onClick={() =>
                          setCantidadSel((prev) =>
                            Math.max(min, Number(prev || min) - step),
                          )
                        }
                      >
                        -
                      </button>
                    );
                  })()}
                  <input
                    type="number"
                    className="w-[84px] min-h-11 py-3 px-3 border-2 border-[var(--color-border-default)] rounded-lg text-[18px] font-semibold text-center [appearance:textfield]"
                    min={(() => {
                      const unidad = normalizarUnidad(
                        productoSel?.unidadMedida,
                      );
                      const step = stepDeUnidad(
                        unidad === "kg" || unidad === "l" ? unidad : "ud",
                      );
                      return step;
                    })()}
                    step={(() => {
                      const unidad = normalizarUnidad(
                        productoSel?.unidadMedida,
                      );
                      const step = stepDeUnidad(
                        unidad === "kg" || unidad === "l" ? unidad : "ud",
                      );
                      return step;
                    })()}
                    value={cantidadSel}
                    onChange={(e) => {
                      const unidad = normalizarUnidad(
                        productoSel?.unidadMedida,
                      );
                      const step = stepDeUnidad(
                        unidad === "kg" || unidad === "l" ? unidad : "ud",
                      );
                      let v = Number(e.target.value || step);
                      if (!Number.isFinite(v)) v = step;
                      if (v < step) v = step;
                      if (step === 1) v = Math.round(v);
                      setCantidadSel(v);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && productoSel) {
                        const unidad = normalizarUnidad(
                          productoSel.unidadMedida,
                        );
                        const step = stepDeUnidad(
                          unidad === "kg" || unidad === "l" ? unidad : "ud",
                        );
                        let v = Math.max(step, Number(cantidadSel || step));
                        if (step === 1) v = Math.round(v);
                        agregarProducto(productoSel, v);
                        cerrarModalCantidad();
                      }
                    }}
                    inputMode="numeric"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="w-11 h-11 min-w-11 min-h-11 border border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-soft)] text-[var(--color-text-strong)] text-[22px] leading-none font-bold inline-flex items-center justify-center cursor-pointer active:scale-[0.97] focus-visible:outline-[3px] focus-visible:outline-[rgba(179,49,49,0.35)] focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label="Usar lectura de báscula"
                    onClick={() => {
                      if (!productoSel) return;
                      const unidad = normalizarUnidad(productoSel.unidadMedida);
                      const step = stepDeUnidad(
                        unidad === "kg" || unidad === "l" ? unidad : "ud",
                      );
                      if (step === 1) return;
                      const kg = scale.captureKg();
                      if (kg != null) setCantidadSel(Number(kg.toFixed(3)));
                    }}
                    disabled={!scale.connected || scale.weightKg == null}
                    title="Usar lectura de báscula"
                  >
                    <i className="fa-solid fa-scale-balanced" />
                  </button>
                  <button
                    type="button"
                    className="w-11 h-11 min-w-11 min-h-11 border border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-soft)] text-[var(--color-text-strong)] text-[22px] leading-none font-bold inline-flex items-center justify-center cursor-pointer active:scale-[0.97] focus-visible:outline-[3px] focus-visible:outline-[rgba(179,49,49,0.35)] focus-visible:outline-offset-2"
                    aria-label="Aumentar cantidad"
                    onClick={() => {
                      const unidad = normalizarUnidad(
                        productoSel?.unidadMedida,
                      );
                      const step = stepDeUnidad(
                        unidad === "kg" || unidad === "l" ? unidad : "ud",
                      );
                      setCantidadSel((prev) => {
                        let v = Math.max(step, Number(prev || step) + step);
                        if (step === 1) v = Math.round(v);
                        return v;
                      });
                    }}
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 text-[12px] text-[#718096]">
                  Unidad:{" "}
                  <strong>{normalizarUnidad(productoSel?.unidadMedida)}</strong>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 border-0 rounded-lg font-semibold cursor-pointer bg-[var(--color-border-default)] text-[var(--color-text-muted)]"
                  onClick={cerrarModalCantidad}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 py-3 border-0 rounded-lg font-semibold cursor-pointer bg-[var(--color-brand-500)] text-white hover:bg-[#9c2b2b] transition-colors duration-150"
                  onClick={() => {
                    if (!productoSel) return;
                    const unidad = normalizarUnidad(productoSel.unidadMedida);
                    const step = stepDeUnidad(
                      unidad === "kg" || unidad === "l" ? unidad : "ud",
                    );
                    let v = Math.max(step, Number(cantidadSel || step));
                    if (step === 1) v = Math.round(v);
                    agregarProducto(productoSel, v);
                    cerrarModalCantidad();
                  }}
                  type="button"
                >
                  Añadir
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </StaggerPage>
  );
}
