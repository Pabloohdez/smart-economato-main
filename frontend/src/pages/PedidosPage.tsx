import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProductos, getProveedores } from "../services/productosService";
import PedidosGrid from "../components/pedidos/PedidosTable";
import "../styles/pedidos.css";
import { apiFetch } from "../services/apiClient";

type Proveedor = {
  id: number | string;
  nombre: string;
};

type Producto = {
  id: number | string;
  nombre: string;
  precio: number;
  stock: number;
  stockMinimo?: number | null;
  fechaCaducidad?: string | null;
  categoriaId?: number | null;
  proveedorId?: number | null;
  categoria?: { id: number | string; nombre: string } | null;
  proveedor?: { id: number | string; nombre: string } | null;
};

type PedidoHistorial = {
  id: number | string;
  proveedor_nombre: string;
  estado: string;
  total: number | string;
};

type ItemPedido = {
  producto_id: number | string;
  nombre: string;
  precio: number;
  cantidad: number;
  proveedor_id?: number | string | null;
};

export default function PedidosPage() {
  const nav = useNavigate();

  const [vista, setVista] = useState<"lista" | "nuevo">("lista");
  const [fechaPedido, setFechaPedido] = useState("");
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<PedidoHistorial[]>([]);

  const [proveedorId, setProveedorId] = useState("");
  const [itemsPedido, setItemsPedido] = useState<ItemPedido[]>([]);

  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [loadingNuevo, setLoadingNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFechaPedido(today);
  }, []);

  const recargarPedidos = useCallback(async () => {
    try {
      setErr("");
      setLoadingPedidos(true);
      const json = await apiFetch<{ success: boolean; data: PedidoHistorial[]; error?: { message?: string } }>("/pedidos", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const data = Array.isArray(json?.data) ? json.data : [];
      setPedidos(json?.success ? data : []);
      if (!json?.success) setErr(json?.error?.message || "Error cargando pedidos");
    } catch (e) {
      setPedidos([]);
      setErr(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoadingPedidos(false);
    }
  }, []);

  useEffect(() => {
    void recargarPedidos();
  }, [recargarPedidos]);

  useEffect(() => {
    if (vista !== "nuevo") return;

    let alive = true;

    (async () => {
      try {
        setLoadingNuevo(true);
        setErr("");

        const [provs, prods] = await Promise.all([
          getProveedores(),
          getProductos(),
        ]);

        if (!alive) return;

        setProveedores(Array.isArray(provs) ? provs : []);
        setProductos(Array.isArray(prods) ? (prods as Producto[]) : []);
      } catch (e) {
        if (alive) {
          console.error(e);
          setErr("Error cargando proveedores o productos");
        }
      } finally {
        if (alive) setLoadingNuevo(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [vista]);

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

    setItemsPedido((prev) => {
      const existente = prev.find((i) => String(i.producto_id) === String(prod.id));

      if (existente) {
        return prev.map((item) =>
          String(item.producto_id) === String(prod.id)
            ? { ...item, cantidad: item.cantidad + 1 }
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
          proveedor_id: provId,
        },
      ];
    });
  }

  function cambiarCantidad(index: number, value: string) {
    const cantidad = Math.max(1, parseInt(value || "1", 10) || 1);

    setItemsPedido((prev) =>
      prev.map((item, i) => (i === index ? { ...item, cantidad } : item))
    );
  }

  function borrarItem(index: number) {
    setItemsPedido((prev) => prev.filter((_, i) => i !== index));
  }

  async function guardarPedido() {
    if (itemsPedido.length === 0) {
      alert("El pedido está vacío. Agrega al menos un producto.");
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
      alert("No se pudo determinar el proveedor de los productos.");
      return;
    }

    const confirmado = window.confirm(
      `Se generarán ${proveedoresIds.length} pedido(s) distinto(s) según el proveedor. ¿Continuar?`
    );

    if (!confirmado) return;

    try {
      setGuardando(true);

      let exitos = 0;
      let errores = 0;

      for (const pid of proveedoresIds) {
        const pedidoData = pedidosPorProveedor[pid];

        const payload = {
          proveedorId: pedidoData.proveedorId,
          items: pedidoData.items,
          usuarioId: "1",
          total: pedidoData.total,
        };

        try {
          const data = await apiFetch<{ success: boolean }>("/pedidos", {
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest" },
            body: JSON.stringify(payload),
          });
          if (data?.success) exitos++; else errores++;
        } catch {
          errores++;
        }
      }

      if (exitos > 0 && errores === 0) {
        alert(`Se han creado ${exitos} pedido(s) correctamente.`);
        setItemsPedido([]);
        setProveedorId("");
        setVista("lista");
        await recargarPedidos();
      } else if (exitos > 0 && errores > 0) {
        alert(`Proceso terminado con advertencias. Creados: ${exitos}, Fallidos: ${errores}`);
        setVista("lista");
        await recargarPedidos();
      } else {
        alert("No se pudo crear ningún pedido.");
      }
    } finally {
      setGuardando(false);
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
      <div className="content-header">
        <h2>Pedidos y Compras</h2>

        <div className="header-actions">
          <button type="button" className="btn-primary" onClick={irANuevoPedido}>
            <i className="fa-solid fa-plus"></i> Nuevo Pedido
          </button>

          <button type="button" className="btn-secondary" onClick={irAHistorial}>
            <i className="fa-solid fa-list"></i> Ver Historial
          </button>
        </div>
      </div>

      {err && <p className="estado error">Error: {err}</p>}

      {vista === "lista" && (
        <div className="card">
          <h3>Historial de Pedidos</h3>

          {loadingPedidos && <p className="estado">Cargando pedidos...</p>}

          {!loadingPedidos && pedidos.length === 0 && (
            <p className="estado">No hay pedidos registrados todavía.</p>
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

          {loadingNuevo && <p className="estado">Cargando datos...</p>}

          {!loadingNuevo && (
            <>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label htmlFor="selectProveedor">Proveedor:</label>
                  <select
                    id="selectProveedor"
                    className="form-control"
                    value={proveedorId}
                    onChange={(e) => setProveedorId(e.target.value)}
                  >
                    <option value="">-- Seleccionar Proveedor --</option>
                    {proveedores.map((p) => (
                      <option key={String(p.id)} value={String(p.id)}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
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
                        <th>Cant.</th>
                        <th>Precio</th>
                        <th>Total</th>
                        <th>Acción</th>
                      </tr>
                    </thead>

                    <tbody>
                      {itemsPedido.length === 0 && (
                        <tr>
                          <td colSpan={5}>No hay productos añadidos al pedido.</td>
                        </tr>
                      )}

                      {itemsPedido.map((item, idx) => {
                        const subtotal = item.cantidad * item.precio;

                        return (
                          <tr key={`${item.producto_id}-${idx}`}>
                            <td>{item.nombre}</td>
                            <td>
                              <input
                                type="number"
                                min={1}
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
                        <td colSpan={3} className="text-right">
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