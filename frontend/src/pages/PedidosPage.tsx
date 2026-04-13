import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getProductos, getProveedores } from "../services/productosService";
import PedidosGrid from "../components/pedidos/PedidosTable";
import "../styles/pedidos.css";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import EmptyState from "../components/ui/EmptyState";
import { showConfirm, showNotification } from "../utils/notifications";
import type { Proveedor, Producto, PedidoHistorial } from "../types";
import { queryKeys } from "../lib/queryClient";
import { crearPedidoHistorial, getPedidos } from "../services/pedidosService";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import UiSelect from "../components/ui/UiSelect";

type ItemPedido = {
  producto_id: number | string;
  nombre: string;
  precio: number;
  cantidad: number;
  unidad?: string;
  proveedor_id?: number | string | null;
};

const UNIDADES_OPCIONES = [
  { value: "ud", label: "Unidades" },
  { value: "kg", label: "Kg" },
  { value: "l", label: "Litros" },
  { value: "g", label: "Gramos" },
  { value: "ml", label: "Mililitros" },
] as const;

function stepDeUnidad(unidad?: string) {
  if (unidad === "ud") return 1;
  return 0.001;
}

function minDeUnidad(unidad?: string) {
  if (unidad === "ud") return 1;
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
    return itemsPedido.reduce((acc, item) => acc + item.cantidad * item.precio, 0);
  }, [itemsPedido]);

  function irANuevoPedido() {
    setVista("nuevo");
  }

  function irAHistorial() {
    setVista("lista");
  }

  function agregarItem(prod: Producto) {
    const provId = prod.proveedorId ?? prod.proveedor?.id ?? null;
    const unidadDefault = String(prod.unidadMedida || prod.precioUnitario || "ud").trim().toLowerCase();
    const unidad =
      UNIDADES_OPCIONES.some((u) => u.value === unidadDefault) ? unidadDefault : "ud";

    setItemsPedido((prev) => {
      const existente = prev.find((i) => String(i.producto_id) === String(prod.id));

      if (existente) {
        return prev.map((item) =>
          String(item.producto_id) === String(prod.id)
            ? {
                ...item,
                cantidad: item.cantidad + (item.unidad === "ud" ? 1 : 0.001),
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
          cantidad: unidad === "ud" ? 1 : 0.001,
          unidad,
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
        return { ...item, unidad: nextUnidad, cantidad: nextCantidad };
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

      pedidosPorProveedor[pid].items.push(item);
      pedidosPorProveedor[pid].total += item.cantidad * item.precio;
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
      <div className="content-header content-header--split">
        <div>
          <h2>
            <i className="fa-solid fa-file-invoice-dollar"></i>
            Pedidos y Compras
          </h2>
          <p className="content-subtitle">Historial de compras y generación de pedidos por proveedor.</p>
        </div>

        <div className="header-actions">
          <div className="header-date-chip">
            <i className="fa-solid fa-calendar"></i>
            <span>{hoyES()}</span>
          </div>

          <button type="button" className="btn-primary" onClick={irANuevoPedido}>
            <i className="fa-solid fa-plus"></i> Nuevo Pedido
          </button>

          <button type="button" className="btn-secondary" onClick={irAHistorial}>
            <i className="fa-solid fa-list"></i> Ver Historial
          </button>
        </div>
      </div>

      {err && <Alert type="error">{err}</Alert>}

      {vista === "lista" && (
        <div className="card">
          <h3>Historial de Pedidos</h3>

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
        <div className="card">
          <h3>
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
                    className="form-control"
                    value={fechaPedido}
                    onChange={() => {}}
                  />
                </div>
              </div>

              <div className="pedido-builder">
                <div className="lista-productos-prov">
                  <h4>Productos Disponibles</h4>

                  <div className="lista-scroll">
                    {!proveedorId && (
                      <p className="text-muted">Selecciona un proveedor primero</p>
                    )}

                    {proveedorId && productosFiltrados.length === 0 && (
                      <p className="text-muted">No hay productos asociados a este proveedor</p>
                    )}

                    {proveedorId &&
                      productosFiltrados.map((p) => (
                        <div className="item-prov" key={String(p.id)}>
                          <span>{p.nombre}</span>
                          <strong>{Number(p.precio).toFixed(2)} €</strong>
                          <button type="button" onClick={() => agregarItem(p)}>
                            +
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="carrito-pedido">
                  <h4>Items del Pedido</h4>

                  <table className="table-carrito">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Unidad</th>
                        <th>Cant.</th>
                        <th>Precio</th>
                        <th>Total</th>
                        <th>Acción</th>
                      </tr>
                    </thead>

                    <tbody>
                      {itemsPedido.length === 0 && (
                        <tr>
                          <td colSpan={6}>No hay productos añadidos al pedido.</td>
                        </tr>
                      )}

                      {itemsPedido.map((item, idx) => {
                        const subtotal = item.cantidad * item.precio;
                        const unidad = item.unidad ?? "ud";

                        return (
                          <tr key={`${item.producto_id}-${idx}`}>
                            <td>{item.nombre}</td>
                            <td style={{ minWidth: 140 }}>
                              <UiSelect
                                value={unidad}
                                onChange={(v) => cambiarUnidad(idx, v)}
                                options={UNIDADES_OPCIONES.map((u) => ({
                                  value: u.value,
                                  label: u.label,
                                }))}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={minDeUnidad(unidad)}
                                step={stepDeUnidad(unidad)}
                                value={item.cantidad}
                                className="input-cantidad"
                                onChange={(e) => cambiarCantidad(idx, e.target.value)}
                              />
                            </td>
                            <td>{item.precio.toFixed(2)} €</td>
                            <td>{subtotal.toFixed(2)} €</td>
                            <td>
                              <button
                                type="button"
                                className="btn-remove"
                                onClick={() => borrarItem(idx)}
                              >
                                x
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr>
                        <td colSpan={4} className="text-right">
                          <strong>Total Estimado:</strong>
                        </td>
                        <td colSpan={2}>
                          <strong>{totalPedido.toFixed(2)} €</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <button
                    type="button"
                    className="btn-success btn-block"
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
    </div>
  );
}