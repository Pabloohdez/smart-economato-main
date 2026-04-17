import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getProductos, getProveedores } from "../services/productosService";
import PedidosGrid from "../components/pedidos/PedidosTable";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import EmptyState from "../components/ui/EmptyState";
import { showConfirm, showNotification } from "../utils/notifications";
import type { Proveedor, Producto, PedidoHistorial } from "../types";
import { queryKeys } from "../lib/queryClient";
import { crearPedidoHistorial, getPedidos } from "../services/pedidosService";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import UiSelect from "../components/ui/UiSelect";
import { crearProductoMinimo } from "../services/productosService";

type ItemPedido = {
  producto_id: number | string;
  nombre: string;
  precio: number;
  cantidad: number;
  unidad?: string;
  unidadBase?: "ud" | "kg" | "l";
  proveedor_id?: number | string | null;
};

const UNIDADES_OPCIONES = [
  { value: "ud", label: "Unidades" },
  { value: "kg", label: "Kg" },
  { value: "l", label: "Litros" },
  { value: "g", label: "Gramos" },
  { value: "ml", label: "Mililitros" },
] as const;

function normalizarUnidad(raw?: string) {
  const u = String(raw ?? "").trim().toLowerCase();
  if (!u) return "ud";
  if (u === "unidad" || u === "unidades" || u === "ud") return "ud";
  if (u === "kilo" || u === "kilos" || u === "kg") return "kg";
  if (u === "litro" || u === "litros" || u === "l") return "l";
  if (u === "gramo" || u === "gramos" || u === "g") return "g";
  if (u === "mililitro" || u === "mililitros" || u === "ml") return "ml";
  return u;
}

function detectarUnidadDesdeTexto(raw?: string): "ud" | "kg" | "l" | "g" | "ml" | null {
  const s = String(raw ?? "").toLowerCase();
  if (!s.trim()) return null;
  // buscamos tokens comunes sin fiarnos del resto del texto
  if (/\bkg\b/.test(s) || /\bkilo(s)?\b/.test(s)) return "kg";
  if (/\bg\b/.test(s) || /\bgramo(s)?\b/.test(s)) return "g";
  if (/\bml\b/.test(s) || /\bmililitro(s)?\b/.test(s)) return "ml";
  // cuidado: "l" puede colisionar con palabras, por eso buscamos " l" o "litro"
  if (/\blitro(s)?\b/.test(s) || /(^|\s)l(\s|$)/.test(s)) return "l";
  if (/\bud\b/.test(s) || /\bunidade(s)?\b/.test(s) || /\bunidad(es)?\b/.test(s)) return "ud";
  return null;
}

function unidadBaseDeProducto(prod: Producto): "ud" | "kg" | "l" {
  // La unidad base debe venir del campo de unidad (no del texto de precio unitario),
  // porque `precioUnitario` a veces contiene descripciones y rompe la detección.
  const fromUnidad = prod.unidadMedida ? normalizarUnidad(prod.unidadMedida) : null;
  const fromPrecioUnitario = !fromUnidad ? detectarUnidadDesdeTexto((prod as any).precioUnitario) : null;
  const u = fromUnidad ?? fromPrecioUnitario ?? "ud";
  if (u === "kg" || u === "g") return "kg";
  if (u === "l" || u === "ml") return "l";
  return "ud";
}

function opcionesUnidadParaBase(base: "ud" | "kg" | "l") {
  if (base === "kg") return [{ value: "kg", label: "Kg" }, { value: "g", label: "Gramos" }] as const;
  if (base === "l") return [{ value: "l", label: "Litros" }, { value: "ml", label: "Mililitros" }] as const;
  return [{ value: "ud", label: "Unidades" }] as const;
}

function factorAUnidadBase(unidad: string, base: "ud" | "kg" | "l") {
  const u = normalizarUnidad(unidad);
  if (base === "ud") return 1;
  if (base === "kg") return u === "g" ? 0.001 : 1;
  if (base === "l") return u === "ml" ? 0.001 : 1;
  return 1;
}

function baseDesdeUnidadSeleccionada(unidad: string): "ud" | "kg" | "l" {
  const u = normalizarUnidad(unidad);
  if (u === "kg" || u === "g") return "kg";
  if (u === "l" || u === "ml") return "l";
  return "ud";
}

function stepDeUnidad(unidad?: string) {
  const u = normalizarUnidad(unidad);
  if (u === "ud" || u === "g" || u === "ml") return 1;
  return 0.001; // kg / l
}

function minDeUnidad(unidad?: string) {
  const u = normalizarUnidad(unidad);
  if (u === "ud" || u === "g" || u === "ml") return 1;
  return 0.001;
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

export default function PedidosPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const [vista, setVista] = useState<"lista" | "nuevo">("lista");
  const [fechaPedido, setFechaPedido] = useState("");

  const [proveedorId, setProveedorId] = useState("");
  const [itemsPedido, setItemsPedido] = useState<ItemPedido[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNombre, setManualNombre] = useState("");
  const [manualUnidad, setManualUnidad] = useState<"ud" | "kg" | "l">("ud");
  const [manualPrecio, setManualPrecio] = useState("");
  const [manualCantidad, setManualCantidad] = useState("");

  const [err, setErr] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFechaPedido(today);
  }, []);

  const pedidosQuery = useQuery<PedidoHistorial[]>({
    queryKey: queryKeys.pedidos,
    queryFn: getPedidos,
    refetchInterval: 45_000,
  });

  const proveedoresQuery = useQuery<Proveedor[]>({
    queryKey: queryKeys.proveedores,
    queryFn: getProveedores,
    enabled: vista === "nuevo",
  });

  const productosQuery = useQuery<Producto[]>({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    enabled: vista === "nuevo",
  });

  const guardarPedidosMutation = useMutation({
    mutationFn: async (
      pedidosPorProveedor: Record<string, { proveedorId: string; items: ItemPedido[]; total: number }>,
    ) => {
      let exitos = 0;
      let errores = 0;

      for (const pid of Object.keys(pedidosPorProveedor)) {
        const pedidoData = pedidosPorProveedor[pid];

        const ok = await crearPedidoHistorial({
          proveedorId: pedidoData.proveedorId,
          items: pedidoData.items,
          usuarioId: "1",
          total: pedidoData.total,
        });

        if (ok) {
          exitos++;
        } else {
          errores++;
        }
      }

      return { exitos, errores };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.pedidos });
      broadcastQueryInvalidation(queryKeys.pedidos);
    },
  });

  const crearProductoManualMutation = useMutation({
    mutationFn: async () => {
      const nombre = manualNombre.trim();
      const precio = Number(String(manualPrecio || "").replace(",", "."));
      if (!proveedorId) throw new Error("Selecciona un proveedor antes.");
      if (!nombre) throw new Error("Nombre de producto obligatorio.");
      if (!Number.isFinite(precio) || precio < 0) throw new Error("Precio inválido.");
      return crearProductoMinimo({
        nombre,
        precio,
        unidadMedida: manualUnidad,
        proveedorId,
      });
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      const prodLike: Producto = {
        id: created.id,
        nombre: created.nombre,
        precio: Number(created.precio ?? 0),
        stock: 0,
        proveedorId: Number.isFinite(Number(proveedorId)) ? Number(proveedorId) : (proveedorId as any),
        unidadMedida: manualUnidad,
        precioUnitario: manualUnidad,
      } as any;
      agregarItem(prodLike);

      // si el usuario puso cantidad, la aplicamos al último item agregado
      const cant = Number(String(manualCantidad || "").replace(",", "."));
      if (Number.isFinite(cant) && cant > 0) {
        setItemsPedido((prev) => {
          let lastIdx = -1;
          for (let i = prev.length - 1; i >= 0; i -= 1) {
            if (String(prev[i].producto_id) === String(created.id)) {
              lastIdx = i;
              break;
            }
          }
          if (lastIdx < 0) return prev;
          const next = prev.slice();
          next[lastIdx] = { ...next[lastIdx], cantidad: cant };
          return next;
        });
      }

      setManualOpen(false);
      setManualNombre("");
      setManualPrecio("");
      setManualCantidad("");
      setManualUnidad("ud");
      showNotification("Producto manual creado y añadido al pedido.", "success");
    },
    onError: (e) => {
      showNotification(e instanceof Error ? e.message : "Error creando producto manual", "error");
    },
  });

  const pedidos = pedidosQuery.data ?? [];
  const proveedores = proveedoresQuery.data ?? [];
  const productos = productosQuery.data ?? [];
  const loadingPedidos = pedidosQuery.isLoading;
  const loadingNuevo = proveedoresQuery.isLoading || productosQuery.isLoading;
  const guardando = guardarPedidosMutation.isPending;

  useEffect(() => {
    if (pedidosQuery.error instanceof Error) {
      setErr(pedidosQuery.error.message);
      return;
    }

    if (vista === "nuevo" && (proveedoresQuery.error || productosQuery.error)) {
      setErr("Error cargando proveedores o productos");
      return;
    }

    setErr("");
  }, [pedidosQuery.error, productosQuery.error, proveedoresQuery.error, vista]);

  const productosFiltrados = useMemo(() => {
    if (!proveedorId) return [];

    return productos.filter((p) => {
      const pid = p.proveedorId ?? p.proveedor?.id ?? null;
      return String(pid) === proveedorId;
    });
  }, [productos, proveedorId]);

  const totalPedido = useMemo(() => {
    return itemsPedido.reduce((acc, item) => {
      const base = item.unidadBase ?? "ud";
      const factor = factorAUnidadBase(item.unidad ?? base, base);
      return acc + item.cantidad * factor * item.precio;
    }, 0);
  }, [itemsPedido]);

  const pedidosResumen = useMemo(() => {
    const pendientes = pedidos.filter((p) => String(p.estado ?? "").toUpperCase() === "PENDIENTE").length;
    const incompletos = pedidos.filter((p) => String(p.estado ?? "").toUpperCase() === "INCOMPLETO").length;
    const importeTotal = pedidos.reduce((acc, p) => acc + Number(p.total ?? 0), 0);

    return { pendientes, incompletos, importeTotal };
  }, [pedidos]);

  function irANuevoPedido() {
    setVista("nuevo");
  }

  function irAHistorial() {
    setVista("lista");
  }

  function agregarItem(prod: Producto) {
    const provId = prod.proveedorId ?? prod.proveedor?.id ?? null;
    const base = unidadBaseDeProducto(prod);
    const unidad = opcionesUnidadParaBase(base)[0].value;

    setItemsPedido((prev) => {
      const existente = prev.find((i) => String(i.producto_id) === String(prod.id));

      if (existente) {
        return prev.map((item) =>
          String(item.producto_id) === String(prod.id)
            ? {
                ...item,
                cantidad: item.cantidad + (normalizarUnidad(item.unidad) === "ud" ? 1 : 1),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          producto_id: prod.id,
          nombre: prod.nombre,
          precio: Number(prod.precio),
          cantidad: 1,
          unidad,
          unidadBase: base,
          proveedor_id: provId,
        },
      ];
    });
  }

  function cambiarCantidad(index: number, value: string) {
    const raw = Number(String(value || "").replace(",", "."));
    const unidad = itemsPedido[index]?.unidad ?? "ud";
    const min = minDeUnidad(unidad);
    const cantidad = Number.isFinite(raw) ? Math.max(min, raw) : min;

    setItemsPedido((prev) =>
      prev.map((item, i) => (i === index ? { ...item, cantidad } : item))
    );
  }

  function cambiarUnidad(index: number, unidad: string) {
    setItemsPedido((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const nextUnidad = unidad || "ud";
        const min = minDeUnidad(nextUnidad);
        const nextCantidad = Math.max(min, Number(item.cantidad || 0) || min);
        const nextBase = baseDesdeUnidadSeleccionada(nextUnidad);
        return { ...item, unidad: nextUnidad, unidadBase: nextBase, cantidad: nextCantidad };
      })
    );
  }

  function borrarItem(index: number) {
    setItemsPedido((prev) => prev.filter((_, i) => i !== index));
  }

  async function guardarPedido() {
    if (itemsPedido.length === 0) {
      showNotification("El pedido está vacío. Agrega al menos un producto.", "warning");
      return;
    }

    const pedidosPorProveedor: Record<
      string,
      { proveedorId: string; items: ItemPedido[]; total: number }
    > = {};

    itemsPedido.forEach((item) => {
      const pid = String(item.proveedor_id || proveedorId || "");
      if (!pid) return;

      if (!pedidosPorProveedor[pid]) {
        pedidosPorProveedor[pid] = {
          proveedorId: pid,
          items: [],
          total: 0,
        };
      }

      const base = item.unidadBase ?? "ud";
      const factor = factorAUnidadBase(item.unidad ?? base, base);
      const cantidadBase = item.cantidad * factor;

      pedidosPorProveedor[pid].items.push({
        ...item,
        unidad: base,
        cantidad: cantidadBase,
      });
      pedidosPorProveedor[pid].total += cantidadBase * item.precio;
    });

    const proveedoresIds = Object.keys(pedidosPorProveedor);

    if (proveedoresIds.length === 0) {
      showNotification("No se pudo determinar el proveedor de los productos.", "error");
      return;
    }

    const confirmado = await showConfirm({
      title: "Confirmar pedido",
      message: `Se generarán ${proveedoresIds.length} pedido(s) distinto(s) según el proveedor. ¿Continuar?`,
      confirmLabel: "Crear pedidos",
      icon: "fa-solid fa-cart-plus",
    });

    if (!confirmado) return;

    try {
      const { exitos, errores } = await guardarPedidosMutation.mutateAsync(pedidosPorProveedor);

      if (exitos > 0 && errores === 0) {
        showNotification(`Se han creado ${exitos} pedido(s) correctamente.`, "success");
        setItemsPedido([]);
        setProveedorId("");
        setVista("lista");
      } else if (exitos > 0 && errores > 0) {
        showNotification(`Proceso terminado con advertencias. Creados: ${exitos}, Fallidos: ${errores}`, "warning");
        setVista("lista");
      } else {
        showNotification("No se pudo crear ningún pedido.", "error");
      }
    } catch {
      showNotification("No se pudo crear ningún pedido.", "error");
    }
  }

  const irARecepcion = useCallback(
    (id: number | string) => {
      console.log("Pedido a recepcionar:", id);
      nav("/recepcion");
    },
    [nav]
  );

  return (
    <div>
      <div className="mb-[30px] border-b-2 border-[var(--color-border-default)] pb-5 flex flex-wrap items-end justify-between gap-4 max-[900px]:items-stretch">
        <div>
          <h2 className="m-0 text-[28px] font-bold text-[var(--color-text-strong)] flex items-center gap-3">
            <i className="fa-solid fa-file-invoice-dollar text-[var(--color-brand-500)]"></i>
            Pedidos y Compras
          </h2>
          <p className="mt-2 mb-0 text-[14px] text-[var(--color-text-muted)]">Historial de compras y generación de pedidos por proveedor.</p>
        </div>

        <div className="flex gap-[15px] flex-wrap items-center max-[900px]:w-full">
          <div className="inline-flex items-center gap-2.5 px-4 py-3 border border-[var(--color-border-default)] rounded-[12px] bg-[var(--color-bg-surface)] shadow-[var(--shadow-sm)] text-[var(--color-text-muted)] font-semibold max-[900px]:w-full max-[900px]:justify-center">
            <i className="fa-solid fa-calendar text-[var(--color-brand-500)]"></i>
            <span>{hoyES()}</span>
          </div>

          <button
            type="button"
            className="min-h-11 bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] text-white border-0 px-6 py-3 rounded-[10px] font-semibold cursor-pointer shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow,background] duration-200 hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-500)_100%)] max-[900px]:w-full max-[900px]:justify-center inline-flex items-center gap-2.5"
            onClick={irANuevoPedido}
          >
            <i className="fa-solid fa-plus"></i> Nuevo Pedido
          </button>

          <button
            type="button"
            className="min-h-11 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-5 py-2.5 rounded-[10px] font-semibold cursor-pointer transition-[background,border-color] duration-200 whitespace-nowrap max-[900px]:w-full max-[900px]:justify-center inline-flex items-center gap-2.5 hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
            onClick={irAHistorial}
          >
            <i className="fa-solid fa-list"></i> Ver Historial
          </button>
        </div>
      </div>

      <section className="grid grid-cols-3 gap-3 mb-4 max-[900px]:grid-cols-1" aria-label="Resumen de pedidos">
        <article className="border border-[var(--color-border-default)] rounded-[14px] bg-[linear-gradient(180deg,#fff_0%,#f9fbff_100%)] p-[14px_16px] shadow-[var(--shadow-sm)] flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">Pedidos Pendientes</span>
          <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{pedidosResumen.pendientes}</strong>
        </article>
        <article className="border border-[var(--color-border-default)] rounded-[14px] bg-[linear-gradient(180deg,#fff_0%,#f9fbff_100%)] p-[14px_16px] shadow-[var(--shadow-sm)] flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">Pedidos Incompletos</span>
          <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{pedidosResumen.incompletos}</strong>
        </article>
        <article className="border border-[rgba(179,49,49,0.28)] rounded-[14px] bg-[linear-gradient(135deg,rgba(179,49,49,0.08)_0%,rgba(179,49,49,0.02)_100%)] p-[14px_16px] shadow-[var(--shadow-sm)] flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-[var(--color-text-muted)]">Importe Histórico</span>
          <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{pedidosResumen.importeTotal.toFixed(2)} €</strong>
        </article>
      </section>

      {err && <Alert type="error">{err}</Alert>}

      {vista === "lista" && (
        <div className="bg-[var(--color-bg-surface)] border border-black/5 rounded-xl p-[25px] shadow-[var(--shadow-sm)] mb-[25px]">
          <h3 className="text-[18px] text-[var(--color-text-strong)] m-0 mb-5 border-b-2 border-[var(--color-border-default)] pb-2.5">Historial de Pedidos</h3>

          {loadingPedidos && <Spinner label="Cargando pedidos..." />}

          {!loadingPedidos && pedidos.length === 0 && (
            <EmptyState
              icon="fa-solid fa-cart-arrow-down"
              title="No hay pedidos"
              description="No hay pedidos registrados todavía."
            />
          )}

          {!loadingPedidos && pedidos.length > 0 && (
            <PedidosGrid pedidos={pedidos} onIrARecepcion={irARecepcion} />
          )}
        </div>
      )}

      {vista === "nuevo" && (
        <div className="bg-[var(--color-bg-surface)] border border-black/5 rounded-xl p-[25px] shadow-[var(--shadow-sm)] mb-[25px]">
          <h3 className="text-[18px] text-[var(--color-text-strong)] m-0 mb-5 border-b-2 border-[var(--color-border-default)] pb-2.5 flex items-center gap-2">
            <i className="fa-solid fa-cart-shopping"></i> Crear Nuevo Pedido
          </h3>

          {loadingNuevo && <Spinner label="Cargando datos..." />}

          {!loadingNuevo && (
            <>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="selectProveedor">Proveedor:</label>
                  <UiSelect
                    id="selectProveedor"
                    value={proveedorId}
                    onChange={setProveedorId}
                    placeholder="-- Seleccionar Proveedor --"
                    options={[
                      { value: "", label: "-- Seleccionar Proveedor --" },
                      ...proveedores.map((p) => ({ value: String(p.id), label: p.nombre })),
                    ]}
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="fechaPedido">Fecha:</label>
                  <input
                    type="date"
                    id="fechaPedido"
                    disabled
                    className="w-full p-3 border-2 border-[var(--color-border-default)] rounded-[10px] text-[15px] text-[var(--color-text-strong)] bg-white box-border focus:border-[var(--color-brand-500)] focus:outline-none"
                    value={fechaPedido}
                    onChange={() => {}}
                  />
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1.5fr] gap-[30px] mt-5 max-[900px]:grid-cols-1">
                <div>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <h4 className="m-0">Productos Disponibles</h4>
                    <button
                      type="button"
                      className="min-h-10 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-4 py-2 rounded-[10px] font-semibold cursor-pointer transition-[background,border-color] duration-150 whitespace-nowrap hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] inline-flex items-center gap-2"
                      onClick={() => {
                        if (!proveedorId) {
                          showNotification("Selecciona un proveedor antes.", "warning");
                          return;
                        }
                        setManualOpen(true);
                      }}
                    >
                      <i className="fa-solid fa-plus" /> Producto manual
                    </button>
                  </div>

                  <div className="border-2 border-[var(--color-border-default)] h-[400px] overflow-y-auto bg-white rounded-[10px]">
                    {!proveedorId && (
                      <p className="text-[var(--color-text-muted)] p-3">Selecciona un proveedor primero</p>
                    )}

                    {proveedorId && productosFiltrados.length === 0 && (
                      <p className="text-[var(--color-text-muted)] p-3">No hay productos asociados a este proveedor</p>
                    )}

                    {proveedorId &&
                      productosFiltrados.map((p) => (
                        <div className="flex justify-between items-center gap-3 px-[15px] py-4 border-b border-[var(--color-border-default)] text-[14px] hover:bg-[var(--color-bg-soft)]" key={String(p.id)}>
                          <span className="flex-1">{p.nombre}</span>
                          <strong className="whitespace-nowrap">{Number(p.precio).toFixed(2)} €</strong>
                          <button className="bg-[var(--color-brand-500)] text-white border-0 w-11 min-w-11 h-11 rounded-lg font-bold cursor-pointer" type="button" onClick={() => agregarItem(p)}>
                            +
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div>
                  <h4>Items del Pedido</h4>

                  <div className="w-full overflow-x-auto rounded-[10px] border border-[var(--color-border-default)] bg-white">
                    <table className="w-full min-w-[720px] border-collapse text-[14px]">
                      <thead className="bg-[var(--color-bg-soft)]">
                        <tr>
                          <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)] px-4 py-3 border-b-2 border-[var(--color-border-default)]">
                            Producto
                          </th>
                          <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)] px-4 py-3 border-b-2 border-[var(--color-border-default)]">
                            Unidad
                          </th>
                          <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)] px-4 py-3 border-b-2 border-[var(--color-border-default)] whitespace-nowrap">
                            Cant.
                          </th>
                          <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)] px-4 py-3 border-b-2 border-[var(--color-border-default)] whitespace-nowrap">
                            Precio
                          </th>
                          <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)] px-4 py-3 border-b-2 border-[var(--color-border-default)] whitespace-nowrap">
                            Total
                          </th>
                          <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--color-text-muted)] px-4 py-3 border-b-2 border-[var(--color-border-default)] whitespace-nowrap">
                            Acción
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {itemsPedido.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-5 text-[var(--color-text-muted)]">
                              No hay productos añadidos al pedido.
                            </td>
                          </tr>
                        )}

                        {itemsPedido.map((item, idx) => {
                          const unidad = item.unidad ?? "ud";
                          const base = item.unidadBase ?? "ud";
                          const factor = factorAUnidadBase(unidad, base);
                          const subtotal = item.cantidad * factor * item.precio;

                          return (
                            <tr key={`${item.producto_id}-${idx}`} className="border-b border-[var(--color-border-default)] last:border-b-0">
                              <td className="px-4 py-3">{item.nombre}</td>
                              <td className="px-4 py-3 min-w-[180px]">
                                <UiSelect
                                  value={unidad}
                                  onChange={(v) => cambiarUnidad(idx, v)}
                                  options={opcionesUnidadParaBase(base).map((u) => ({
                                    value: u.value,
                                    label: u.label,
                                  }))}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min={minDeUnidad(unidad)}
                                  step={stepDeUnidad(unidad)}
                                  value={item.cantidad}
                                  className="w-[80px] py-1.5 px-2 border border-[var(--color-border-strong)] rounded-lg"
                                  onChange={(e) => cambiarCantidad(idx, e.target.value)}
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">{item.precio.toFixed(2)} €</td>
                              <td className="px-4 py-3 whitespace-nowrap">{subtotal.toFixed(2)} €</td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  className="bg-[#e53e3e] text-white border-0 w-11 min-w-11 h-11 rounded-lg cursor-pointer font-bold"
                                  onClick={() => borrarItem(idx)}
                                >
                                  x
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                      <tfoot className="bg-[var(--color-bg-soft)]">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                            Total Estimado:
                          </td>
                          <td colSpan={2} className="px-4 py-3 font-extrabold whitespace-nowrap">
                            {totalPedido.toFixed(2)} €
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="w-full mt-5 py-[15px] bg-[linear-gradient(135deg,#48bb78_0%,#38a169_100%)] text-white border-0 rounded-[10px] font-semibold cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    onClick={guardarPedido}
                    disabled={guardando}
                  >
                    {guardando ? "Guardando..." : "Confirmar Pedido"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {manualOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && !crearProductoManualMutation.isPending && setManualOpen(false)}
        >
          <div className="w-full max-w-[560px] rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[0_25px_50px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="px-6 py-5 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white flex items-center justify-between gap-3">
              <div className="font-extrabold text-[16px]">Añadir producto manual</div>
              <button
                type="button"
                className="bg-white/20 border-0 text-white w-9 h-9 rounded-full cursor-pointer inline-flex items-center justify-center hover:bg-white/30 disabled:opacity-60"
                onClick={() => setManualOpen(false)}
                disabled={crearProductoManualMutation.isPending}
                aria-label="Cerrar"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6 grid gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                  Nombre
                </label>
                <input
                  value={manualNombre}
                  onChange={(e) => setManualNombre(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                  placeholder="Ej: Producto nuevo"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Unidad base
                  </label>
                  <UiSelect
                    value={manualUnidad}
                    onChange={(v) => setManualUnidad((v as any) || "ud")}
                    options={[
                      { value: "ud", label: "Unidades (ud)" },
                      { value: "kg", label: "Peso (kg)" },
                      { value: "l", label: "Volumen (l)" },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Precio ({manualUnidad === "kg" ? "€/kg" : manualUnidad === "l" ? "€/l" : "€/ud"})
                  </label>
                  <input
                    value={manualPrecio}
                    onChange={(e) => setManualPrecio(e.target.value)}
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Cantidad inicial (opcional)
                  </label>
                  <input
                    value={manualCantidad}
                    onChange={(e) => setManualCantidad(e.target.value)}
                    type="number"
                    step={manualUnidad === "ud" ? "1" : "0.001"}
                    className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                    placeholder={manualUnidad === "ud" ? "1" : "0.001"}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Proveedor
                  </label>
                  <div className="px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] font-semibold">
                    {proveedores.find((p) => String(p.id) === String(proveedorId))?.nombre || "—"}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 max-[640px]:flex-col">
                <button
                  type="button"
                  className="min-h-11 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-5 py-2.5 rounded-[10px] font-semibold cursor-pointer hover:bg-[var(--color-border-default)] max-[640px]:w-full disabled:opacity-60"
                  onClick={() => setManualOpen(false)}
                  disabled={crearProductoManualMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="min-h-11 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white border-0 px-6 py-2.5 rounded-[10px] font-semibold cursor-pointer shadow-[0_4px_15px_rgba(179,49,49,0.25)] hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed max-[640px]:w-full"
                  onClick={() => crearProductoManualMutation.mutate()}
                  disabled={crearProductoManualMutation.isPending}
                >
                  {crearProductoManualMutation.isPending ? "Creando..." : "Crear y añadir"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}