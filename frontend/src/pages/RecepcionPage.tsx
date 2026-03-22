import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import "../styles/recepcion.css";
import { apiFetch, type ApiRequestError } from "../services/apiClient";
import { showConfirm, showNotification } from "../utils/notifications";
import { scanBarcodeFromCamera } from "../utils/barcodeScanner";

type Producto = {
  id: number | string;
  nombre: string;
  stock: number;
  precio: number;
  proveedorId?: number | string;
  categoriaId?: number | string;
};

type Categoria = { id: number | string; nombre: string };
type Proveedor = { id: number | string; nombre: string };

type PedidoItem = {
  id: number | string; // id del detalle
  producto_id: number | string;
  producto_nombre: string;
  cantidad: number;
  cantidad_recibida?: number;
  precio_unitario?: number;
};

type Pedido = {
  id: number | string;
  proveedor_nombre: string;
  estado: "PENDIENTE" | "INCOMPLETO" | "COMPLETADO" | string;
  total: number | string;
  items: PedidoItem[];
};

type RecepcionRow = {
  producto_id: number | string;
  nombre: string;
  proveedor: string;
  stock: number;
  cantidadRecibida: number;
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

export default function Recepcion() {
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [term, setTerm] = useState("");
  const [provFiltro, setProvFiltro] = useState<string>("");
  const [catFiltro, setCatFiltro] = useState<string>("");

  const [resultadosOpen, setResultadosOpen] = useState(false);

  const [recepcion, setRecepcion] = useState<RecepcionRow[]>([]);
  const totalRecepcion = useMemo(
    () => recepcion.reduce((sum, r) => sum + r.precio * r.cantidadRecibida, 0),
    [recepcion]
  );

  const [obs, setObs] = useState("");

  // Modal cantidad (manual)
  const [modalCantidadOpen, setModalCantidadOpen] = useState(false);
  const [productoSel, setProductoSel] = useState<Producto | null>(null);
  const [cantidadSel, setCantidadSel] = useState<number>(1);

  // Modal pedidos
  const [modalPedidosOpen, setModalPedidosOpen] = useState(false);
  const [cerrandoDrawerPedidos, setCerrandoDrawerPedidos] = useState(false);
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([]);
  const [verifQty, setVerifQty] = useState<Record<string, number>>({}); // detalle_id -> qty

  const buscadorWrapRef = useRef<HTMLDivElement | null>(null);
  const skipCloseRef = useRef(false);
  const drawerPedidosTimerRef = useRef<number | null>(null);

  // Obtener usuario activo para auditoría
  const userRaw = localStorage.getItem("usuarioActivo");
  let user: any = null;
  try {
    user = userRaw ? JSON.parse(userRaw) : null;
  } catch {
    user = null;
  }
  const usuarioLogueadoId = user?.id || 1;

  async function cargarDatos() {
    setLoading(true);
    try {
      const [pJson, cJson, prJson] = await Promise.all([
        apiFetch<{ success?: boolean; data?: any[] }>("/productos", { headers: { "X-Requested-With": "XMLHttpRequest" } }),
        apiFetch<{ success?: boolean; data?: any[] }>("/categorias", { headers: { "X-Requested-With": "XMLHttpRequest" } }),
        apiFetch<{ success?: boolean; data?: any[] }>("/proveedores", { headers: { "X-Requested-With": "XMLHttpRequest" } }),
      ]);

      if (!pJson?.success) throw new Error("Error cargando productos");
      if (!cJson?.success) throw new Error("Error cargando categorías");
      if (!prJson?.success) throw new Error("Error cargando proveedores");

      // normalizamos números
      const prods: Producto[] = (pJson.data ?? []).map((x: any) => ({
        ...x,
        stock: Number(x.stock ?? 0),
        precio: Number(x.precio ?? 0),
      }));

      setProductos(prods);
      setCategorias(cJson.data ?? []);
      setProveedores(prJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarDatos().catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    return () => {
      if (drawerPedidosTimerRef.current) {
        window.clearTimeout(drawerPedidosTimerRef.current);
      }
    };
  }, []);

  // cerrar dropdown si clic fuera
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (skipCloseRef.current) {
        skipCloseRef.current = false;
        return;
      }
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (buscadorWrapRef.current && !buscadorWrapRef.current.contains(target)) {
        setResultadosOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const resultadosAutocomplete = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return productos.filter((p) => {
      const matchText = String(p.nombre ?? "").toLowerCase().includes(t);
      const matchProv = !provFiltro || String(p.proveedorId ?? "") === String(provFiltro);
      const matchCat = !catFiltro || String(p.categoriaId ?? "") === String(catFiltro);
      return matchText && matchProv && matchCat;
    });
  }, [productos, term, provFiltro, catFiltro]);

  const resultadosRender = useMemo(() => {
    if (!resultadosOpen) return [];
    return resultadosAutocomplete.slice(0, 30);
  }, [resultadosOpen, resultadosAutocomplete]);

  function proveedorNombreDeProducto(p: Producto) {
    const prov = proveedores.find((x) => String(x.id) === String(p.proveedorId));
    return prov?.nombre ?? "N/A";
  }

  function abrirModalCantidad(p: Producto) {
    console.log("[Recepcion] abrirModalCantidad called for:", p.nombre, "id:", p.id);
    setProductoSel(p);
    setCantidadSel(1);
    setModalCantidadOpen(true);
    console.log("[Recepcion] modalCantidadOpen set to true");
  }

  async function escanearCodigoBarras() {
    const code = await scanBarcodeFromCamera();
    if (!code) {
      showNotification("No se pudo leer un codigo de barras. Intenta de nuevo.", "warning");
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

    setRecepcion((prev) => [
      ...prev,
      {
        producto_id: p.id,
        nombre: p.nombre,
        proveedor: provNombre,
        stock: Number(p.stock ?? 0),
        cantidadRecibida: cant,
        precio: Number(p.precio ?? 0),
      },
    ]);

    setTerm("");
    setResultadosOpen(false);
  }

  function actualizarCantidadVerificada(detalleId: string, siguiente: number, maximo: number) {
    const safe = Math.max(0, Math.min(maximo, siguiente));
    setVerifQty((prev) => ({ ...prev, [detalleId]: safe }));
  }

  function eliminarFila(idx: number) {
    setRecepcion((prev) => prev.filter((_, i) => i !== idx));
  }

  async function confirmarRecepcionManual() {
    if (!recepcion.length) return;

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
      await apiFetch("/movimientos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(payload),
      });
    } catch {
      showNotification("Error al guardar recepción", "error");
      return;
    }

    showNotification("Recepción manual guardada correctamente.", "success");
    setRecepcion([]);
    setObs("");
    await cargarDatos();
  }

  // ===== Pedidos (importación) =====
  const abrirModalPedidos = useCallback(async () => {
    console.log("[Recepcion] abrirModalPedidos called");
    setCerrandoDrawerPedidos(false);
    setModalPedidosOpen(true);
    setVerifQty({}); // Reset quantities for new verification

    try {
      const json = await apiFetch<{ success?: boolean; data?: Pedido[] }>("/pedidos", { headers: { "X-Requested-With": "XMLHttpRequest" } });

      if (!json?.success || !json?.data) throw new Error("Respuesta inesperada");

      const pendientes: Pedido[] = (json.data as Pedido[]).filter(
        (p) => p.estado === "PENDIENTE" || p.estado === "INCOMPLETO"
      );

      setPedidosPendientes(pendientes);

      // Initialize verifQty for all items in all pending orders
      const initialVerifQty: Record<string, number> = {};
      pendientes.forEach(ped => {
        (ped.items ?? []).forEach(item => {
          // Default to remaining quantity. If already fully received, it will be 0
          initialVerifQty[String(item.id)] = (Number(item.cantidad) || 0) - (Number(item.cantidad_recibida) || 0);
        });
      });
      setVerifQty(initialVerifQty);

    } catch (e: any) {
      console.error(e);
      showNotification("Error cargando pedidos pendientes", "error");
      setPedidosPendientes([]);
    }
  }, []);

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

  const verificarPedidoLocal = useCallback(async (pedidoId: number | string, items: PedidoItem[], proveedor_nombre: string) => {
    const confirmado = await showConfirm({
      title: "Confirmar recepción",
      message: "¿Confirmar entrada de stock y actualizar pedido?",
      confirmLabel: "Sí, actualizar",
      icon: "fa-solid fa-boxes-stacked",
    });
    if (!confirmado) return;

    const itemsToReceive = items.map((it) => ({
      detalle_id: it.id,
      cantidad_recibida: Number(verifQty[String(it.id)] ?? 0),
    })).filter(item => item.cantidad_recibida > 0); // Only send items with received quantity > 0

    if (itemsToReceive.length === 0) {
      showNotification("No se ha especificado ninguna cantidad a recibir.", "warning");
      return;
    }

    try {
      const json = await apiFetch<{ data?: { message?: string } }>(`/pedidos/${pedidoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ accion: "RECIBIR", items: itemsToReceive }),
      });

      // Volver a cargar datos de productos
      await cargarDatos();

      // Añadir a la tabla de recepción (solo los recibidos > 0)
      const nuevasFilas: RecepcionRow[] = [];
      for (const it of items) {
        const qty = Number(verifQty[String(it.id)] ?? 0);
        if (qty <= 0) continue;

        const prod = productos.find((p) => String(p.id) === String(it.producto_id));
        const provNombre = prod ? proveedorNombreDeProducto(prod) : proveedor_nombre;

        // stock anterior: si tenemos producto, usamos su stock - qty como en vuestro JS
        const stockAnterior = prod ? Number(prod.stock ?? 0) - qty : 0;

        nuevasFilas.push({
          producto_id: it.producto_id,
          nombre: it.producto_nombre ?? prod?.nombre ?? "Producto",
          proveedor: provNombre,
          stock: stockAnterior,
          cantidadRecibida: qty,
          precio: Number(it.precio_unitario ?? prod?.precio ?? 0),
        });
      }

      if (nuevasFilas.length) {
        setRecepcion((prev) => [...prev, ...nuevasFilas]);
      }

      showNotification(json?.data?.message ?? "Recepción procesada correctamente", "success");
      // Refresh the list of pending orders
      await abrirModalPedidos();
    } catch (e) {
      console.error(e);
      const apiError = e as ApiRequestError;
      showNotification("Error de conexión: " + apiError.message, "error");
    }
  }, [verifQty, productos, abrirModalPedidos]);

  const nombreProveedorActual = useMemo(() => {
    if (!recepcion.length) return "Sin seleccionar";
    // Si hay varios, mostramos el primero (igual que vuestro HTML simple)
    return recepcion[0].proveedor;
  }, [recepcion]);

  return (
    <div>
      {/* Header */}
      <div className="header-recepcion">
        <div>
          <h1 className="titulo-recepcion">
            <i className="fa-solid fa-truck-ramp-box" /> RECEPCIÓN DE MERCANCÍA
          </h1>
          <p className="subtitulo">Registra las entregas de proveedores y actualiza el inventario</p>
        </div>
        <div className="info-fecha">
          <i className="fa-solid fa-calendar" />
          <span>{hoyES()}</span>
        </div>
      </div>

      {/* Panel búsqueda */}
      <div className="panel-busqueda" ref={buscadorWrapRef}>
        <h2 className="titulo-seccion">
          <i className="fa-solid fa-magnifying-glass" /> Buscar Producto
        </h2>

        <div className="controles-busqueda">
          <div className="campo-busqueda" style={{ position: "relative" }}>
            <div className="busq-wrap">
              <div className="busq-input-wrap">
                {/* Ghost suggestion */}
                {resultadosAutocomplete.length > 0 &&
                  term.length >= 2 &&
                  resultadosAutocomplete[0].nombre.toLowerCase().startsWith(term.toLowerCase()) &&
                  resultadosAutocomplete[0].nombre.toLowerCase() !== term.toLowerCase() && (
                    <div className="busq-ghost" aria-hidden="true">
                      <span style={{ visibility: "hidden" }}>{term}</span>
                      <span style={{ color: "#a0aec0" }}>
                        {resultadosAutocomplete[0].nombre.slice(term.length)}
                      </span>
                    </div>
                  )}
                <input
                  id="inputRecepcion"
                  className="busq-input"
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
                      if (firstMatch.nombre.toLowerCase().startsWith(term.toLowerCase())) {
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
                className="btn-buscar-producto"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResultadosOpen(true);
                }}
              >
                <i className="fa-solid fa-search" /> Buscar
              </button>

              <button
                className="btn-scan-recepcion"
                type="button"
                onClick={escanearCodigoBarras}
                aria-label="Escanear codigo de barras"
                title="Escanear codigo"
              >
                <i className="fa-solid fa-camera" />
              </button>
            </div>

            {/* Dropdown de resultados */}
            {resultadosOpen && (
              <div id="listaResultados" className="resultados-busqueda">
                {loading ? (
                  <div className="item-resultado" style={{ color: "#718096", fontStyle: "italic", justifyContent: "center" }}>
                    <i className="fa-solid fa-spinner fa-spin" /> Cargando...
                  </div>
                ) : resultadosRender.length === 0 ? (
                  term.trim().length >= 2 ? (
                    <div className="item-resultado" style={{ color: "#718096", fontStyle: "italic", justifyContent: "center" }}>
                      Sin resultados para «{term.trim()}»
                    </div>
                  ) : null
                ) : (
                  resultadosRender.map((p) => (
                    <div
                      key={String(p.id)}
                      className="item-resultado"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        skipCloseRef.current = true;
                        abrirModalCantidad(p);
                        setResultadosOpen(false);
                      }}
                    >
                      <span className="nombre-producto-resultado" style={{ fontWeight: 600, fontSize: "14px", color: "#2d3748" }}>{p.nombre}</span>
                      <span className="detalles-producto-resultado" style={{ fontSize: "12px", color: "#718096", background: "#f7fafc", padding: "2px 8px", borderRadius: "20px" }}>Stock: {p.stock}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="filtros-rapidos">
            <select className="select-filtro" value={provFiltro} onChange={(e) => setProvFiltro(e.target.value)}>
              <option value="">Todos los proveedores</option>
              {proveedores.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {p.nombre}
                </option>
              ))}
            </select>

            <select className="select-filtro" value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ textAlign: "right", marginTop: 15 }}>
          <button
            className="btn-buscar-producto"
            style={{ background: "#2d3748", display: "inline-flex" }}
            onClick={abrirModalPedidos}
          >
            <i className="fa-solid fa-cloud-arrow-down" /> Importar/Recibir Pedido
          </button>
        </div>
      </div>

      {/* Drawer Importar Pedidos (tablet-first) */}
      {modalPedidosOpen && createPortal(
        <div
          className={`modal-overlay-recepcion active recepcion-overlay-drawer ${cerrandoDrawerPedidos ? "is-closing" : ""}`}
          onClick={cerrarDrawerPedidos}
        >
          <aside className="recepcion-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="recepcion-drawer-header">
              <h3>
                <i className="fa-solid fa-cloud-arrow-down" /> Importar Pedido Pendiente
              </h3>
              <button
                type="button"
                className="recepcion-drawer-close"
                aria-label="Cerrar importacion de pedidos"
                onClick={cerrarDrawerPedidos}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="recepcion-drawer-body">

            {pedidosPendientes.length === 0 ? (
              <div className="recepcion-pedidos-vacio">
                <p>No hay pedidos pendientes o incompletos.</p>
              </div>
            ) : (
              <div className="recepcion-pedidos-lista">
                {pedidosPendientes.map((ped) => {
                  const items = Array.isArray(ped.items) ? ped.items : [];
                  const completado = ped.estado.toUpperCase() === "COMPLETADO";

                  return (
                    <div key={String(ped.id)} className="pedido-card recepcion-pedido-card">
                      <div className="pedido-card-header">
                        <div>
                          <strong>Pedido #{ped.id}</strong> — Proveedor: {ped.proveedor_nombre}
                        </div>
                        <span className={`badge-estado ${ped.estado.toLowerCase()}`}>
                          {ped.estado}
                        </span>
                      </div>
                      <div className="pedido-card-body">
                        {items.length === 0 ? (
                          <p>Sin items</p>
                        ) : (
                          <table className="tabla-recepcion recepcion-tabla-pedidos" style={{ marginTop: 10 }}>
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th>Pedida</th>
                                <th>Recibida (Antes)</th>
                                <th className="recepcion-col-recibir">A Recibir Ahora</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((it) => {
                                const qtyVerif = verifQty[it.id] ?? 0;
                                const maxRecibir = Math.max(
                                  0,
                                  (Number(it.cantidad) || 0) - (Number(it.cantidad_recibida) || 0)
                                );
                                return (
                                  <tr key={String(it.id)}>
                                    <td>{it.producto_nombre}</td>
                                    <td>{it.cantidad}</td>
                                    <td>{it.cantidad_recibida || 0}</td>
                                    <td className="recepcion-col-recibir">
                                      {!completado ? (
                                        <div className="recepcion-stepper-inline">
                                          <button
                                            type="button"
                                            className="recepcion-stepper-btn"
                                            aria-label={`Reducir cantidad de ${it.producto_nombre}`}
                                            onClick={() =>
                                              actualizarCantidadVerificada(String(it.id), Number(qtyVerif || 0) - 1, maxRecibir)
                                            }
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            min={0}
                                            max={maxRecibir}
                                            value={qtyVerif}
                                            onChange={(e) =>
                                              actualizarCantidadVerificada(
                                                String(it.id),
                                                Number(e.target.value || 0),
                                                maxRecibir
                                              )
                                            }
                                            className="recepcion-stepper-input"
                                            inputMode="numeric"
                                          />
                                          <button
                                            type="button"
                                            className="recepcion-stepper-btn"
                                            aria-label={`Aumentar cantidad de ${it.producto_nombre}`}
                                            onClick={() =>
                                              actualizarCantidadVerificada(String(it.id), Number(qtyVerif || 0) + 1, maxRecibir)
                                            }
                                          >
                                            +
                                          </button>
                                        </div>
                                      ) : (
                                        "—"
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>

                      {!completado && (
                        <div style={{ textAlign: "right", marginTop: 15 }}>
                          <button
                            className="btn-accion-recepcion"
                            type="button"
                            onClick={() =>
                              verificarPedidoLocal(Number(ped.id), items, ped.proveedor_nombre)
                            }
                            title="Añadir a recepción"
                          >
                            <i className="fa-solid fa-check" /> Añadir Verificados
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>

            <div className="recepcion-drawer-footer">
              <button className="recepcion-btn-modal recepcion-btn-modal-cancelar" onClick={cerrarDrawerPedidos}>
                Cerrar
              </button>
            </div>
          </aside>
        </div>,
        document.body
      )}
      {/* Panel recepción actual */}
      <div className="panel-recepcion">
        <div className="header-panel-recepcion">
          <h3 className="titulo-seccion">
            <i className="fa-solid fa-clipboard-check" /> Recepción Actual
          </h3>

          <div className="info-proveedor">
            <span className="label-proveedor">Proveedor:</span>
            <span className="nombre-proveedor">{nombreProveedorActual}</span>
          </div>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-recepcion">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="recepcion-col-proveedor">Proveedor</th>
                <th>Stock Actual</th>
                <th>Cantidad Recibida</th>
                <th>Nuevo Stock</th>
                <th className="recepcion-col-precio">Precio</th>
                <th>Subtotal</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {!recepcion.length ? (
                <tr className="fila-vacia">
                  <td colSpan={8}>
                    <div className="mensaje-vacio">
                      <i className="fa-solid fa-inbox" />
                      <p>No hay productos en la recepción actual</p>
                      <small>Busca y selecciona productos para comenzar</small>
                    </div>
                  </td>
                </tr>
              ) : (
                recepcion.map((r, idx) => (
                  <tr key={`${String(r.producto_id)}-${idx}`}>
                    <td>{r.nombre}</td>
                    <td className="recepcion-col-proveedor">{r.proveedor}</td>
                    <td>{r.stock}</td>
                    <td>{r.cantidadRecibida}</td>
                    <td className="stock-nuevo">{r.stock + r.cantidadRecibida}</td>
                    <td className="recepcion-col-precio">{formatEUR(r.precio)}</td>
                    <td>{formatEUR(r.precio * r.cantidadRecibida)}</td>
                    <td>
                      <button className="btn-eliminar-item" onClick={() => eliminarFila(idx)} title="Eliminar">
                        <i className="fa-solid fa-trash" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {!!recepcion.length && (
              <tfoot>
                <tr className="fila-total">
                  <td colSpan={6}>
                    <strong>TOTAL DE LA RECEPCIÓN</strong>
                  </td>
                  <td className="total-valor">{formatEUR(totalRecepcion)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Observaciones + acciones */}
      <div className="panel-acciones">
        <div className="campo-observaciones">
          <label className="label-observaciones">
            <i className="fa-solid fa-note-sticky" /> Observaciones / Notas
          </label>
          <textarea
            className="textarea-observaciones"
            placeholder="Añade notas sobre esta recepción (opcional)..."
            rows={3}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>

        <div className="botones-finales">
          {!!recepcion.length && (
            <>
              <button className="btn-accion btn-cancelar" onClick={() => setRecepcion([])}>
                <i className="fa-solid fa-xmark" /> Cancelar Recepción
              </button>
              <button className="btn-accion btn-guardar-recepcion" onClick={confirmarRecepcionManual}>
                <i className="fa-solid fa-check-circle" /> CONFIRMAR RECEPCIÓN
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal Cantidad (usando Portal) */}
      {modalCantidadOpen && createPortal(
        <div className="modal-overlay-recepcion active">
          <div className="recepcion-modal-contenido">
            <h3>
              <i className="fa-solid fa-box-open" /> Cantidad Recibida
            </h3>
            <p className="recepcion-modal-producto-nombre">{productoSel?.nombre ?? ""}</p>

            <div className="recepcion-modal-input-group">
              <label>Cantidad:</label>
              <div className="recepcion-stepper-modal">
                <button
                  type="button"
                  className="recepcion-stepper-btn"
                  aria-label="Reducir cantidad"
                  onClick={() => setCantidadSel((prev) => Math.max(1, Number(prev || 1) - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  className="recepcion-modal-input-cantidad"
                  min={1}
                  value={cantidadSel}
                  onChange={(e) => setCantidadSel(Math.max(1, Number(e.target.value || 1)))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && productoSel) {
                      agregarProducto(productoSel, Math.max(1, Number(cantidadSel || 1)));
                      cerrarModalCantidad();
                    }
                  }}
                  inputMode="numeric"
                  autoFocus
                />
                <button
                  type="button"
                  className="recepcion-stepper-btn"
                  aria-label="Aumentar cantidad"
                  onClick={() => setCantidadSel((prev) => Math.max(1, Number(prev || 1) + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="recepcion-modal-botones">
              <button className="recepcion-btn-modal recepcion-btn-modal-cancelar" onClick={cerrarModalCantidad}>
                Cancelar
              </button>
              <button
                className="recepcion-btn-modal recepcion-btn-modal-confirmar"
                onClick={() => {
                  if (!productoSel) return;
                  agregarProducto(productoSel, Math.max(1, Number(cantidadSel || 1)));
                  cerrarModalCantidad();
                }}
              >
                Añadir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}