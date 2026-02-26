import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/recepcion.css";

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
  estado: "PENDIENTE" | "INCOMPLETO" | string;
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

const API_URL = "http://localhost:8080/api";

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
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([]);
  const [verificandoPedido, setVerificandoPedido] = useState<Pedido | null>(null);
  const verifQtyRef = useRef<Record<string, number>>({}); // detalle_id -> qty

  const usuarioId = 1; // TODO: sacarlo del usuario logeado si lo tenéis en localStorage

  async function cargarDatos() {
    setLoading(true);
    try {
      const [pRes, cRes, prRes] = await Promise.all([
        fetch(`${API_URL}/productos.php`, { headers: { "X-Requested-With": "XMLHttpRequest" } }),
        fetch(`${API_URL}/categorias.php`, { headers: { "X-Requested-With": "XMLHttpRequest" } }),
        fetch(`${API_URL}/proveedores.php`, { headers: { "X-Requested-With": "XMLHttpRequest" } }),
      ]);

      const [pJson, cJson, prJson] = await Promise.all([pRes.json(), cRes.json(), prRes.json()]);

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

  const resultados = useMemo(() => {
    const t = term.trim().toLowerCase();
    return productos.filter((p) => {
      const matchText = !t || String(p.nombre ?? "").toLowerCase().includes(t);
      const matchProv = !provFiltro || String(p.proveedorId ?? "") === String(provFiltro);
      const matchCat = !catFiltro || String(p.categoriaId ?? "") === String(catFiltro);
      return matchText && matchProv && matchCat;
    });
  }, [productos, term, provFiltro, catFiltro]);

  function proveedorNombreDeProducto(p: Producto) {
    const prov = proveedores.find((x) => String(x.id) === String(p.proveedorId));
    return prov?.nombre ?? "N/A";
  }

  function abrirModalCantidad(p: Producto) {
    setProductoSel(p);
    setCantidadSel(1);
    setModalCantidadOpen(true);
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

  function eliminarFila(idx: number) {
    setRecepcion((prev) => prev.filter((_, i) => i !== idx));
  }

  async function confirmarRecepcionManual() {
    if (!recepcion.length) return;

    const payload = {
      tipo: "ENTRADA",
      motivo: obs || "Recepción Manual",
      usuario_id: usuarioId,
      items: recepcion.map((r) => ({
        producto_id: r.producto_id,
        cantidad: r.cantidadRecibida,
      })),
    };

    const res = await fetch(`${API_URL}/movimientos.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Error al guardar recepción");
      return;
    }

    alert("Recepción Manual Exitosa ✅");
    setRecepcion([]);
    setObs("");
    await cargarDatos();
  }

  // ===== Pedidos (importación) =====
  async function abrirModalPedidos() {
    setModalPedidosOpen(true);
    setVerificandoPedido(null);

    try {
      const res = await fetch(`${API_URL}/pedidos.php`, { headers: { "X-Requested-With": "XMLHttpRequest" } });
      const json = await res.json();

      if (!json?.success || !json?.data) throw new Error("Respuesta inesperada");

      const pendientes: Pedido[] = (json.data as Pedido[]).filter(
        (p) => p.estado === "PENDIENTE" || p.estado === "INCOMPLETO"
      );

      setPedidosPendientes(pendientes);
    } catch (e: any) {
      console.error(e);
      alert("Error cargando pedidos pendientes");
      setPedidosPendientes([]);
    }
  }

  async function verificarPedido(id: number | string) {
    try {
      const res = await fetch(`${API_URL}/pedidos.php?id=${id}`, { headers: { "X-Requested-With": "XMLHttpRequest" } });
      const json = await res.json();
      if (!json?.success) throw new Error("Error cargando detalles");

      const pedido: Pedido = json.data;
      setVerificandoPedido(pedido);

      // inicializa cantidades a lo solicitado
      const map: Record<string, number> = {};
      (pedido.items ?? []).forEach((it) => {
        map[String(it.id)] = Number(it.cantidad ?? 0);
      });
      verifQtyRef.current = map;
    } catch (e) {
      console.error(e);
      alert("Error verificando pedido");
    }
  }

  async function confirmarVerificacion(pedidoId: number | string) {
    if (!verificandoPedido) return;
    if (!confirm("¿Confirmar entrada de stock y actualizar pedido?")) return;

    const items = (verificandoPedido.items ?? []).map((it) => ({
      detalle_id: it.id,
      cantidad_recibida: Number(verifQtyRef.current[String(it.id)] ?? 0),
    }));

    try {
      const res = await fetch(`${API_URL}/pedidos.php?id=${pedidoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ accion: "RECIBIR", items }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        alert("Error: " + (json?.error?.message ?? "Desconocido"));
        return;
      }

      // Cerrar modal
      setModalPedidosOpen(false);
      setVerificandoPedido(null);

      // Volver a cargar datos de productos
      await cargarDatos();

      // Añadir a la tabla de recepción (solo los recibidos > 0)
      const nuevasFilas: RecepcionRow[] = [];
      for (const it of verificandoPedido.items ?? []) {
        const qty = Number(verifQtyRef.current[String(it.id)] ?? 0);
        if (qty <= 0) continue;

        const prod = productos.find((p) => String(p.id) === String(it.producto_id));
        const provNombre = prod ? proveedorNombreDeProducto(prod) : verificandoPedido.proveedor_nombre;

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

      alert(json?.data?.message ?? "Recepción procesada correctamente");
    } catch (e: any) {
      console.error(e);
      alert("Error de conexión: " + e.message);
    }
  }

  async function rechazarPedido(pedidoId: number | string) {
    if (!confirm("¿Seguro que quieres RECHAZAR/CANCELAR este pedido completo?")) return;

    try {
      const res = await fetch(`${API_URL}/pedidos.php?id=${pedidoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ accion: "CANCELAR" }),
      });

      if (!res.ok) {
        alert("Error al rechazar el pedido");
        return;
      }

      alert("Pedido rechazado/cancelado correctamente");
      // refrescar lista
      await abrirModalPedidos();
    } catch {
      alert("Error de conexión");
    }
  }

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
      <div className="panel-busqueda">
        <h2 className="titulo-seccion">
          <i className="fa-solid fa-magnifying-glass" /> Buscar Producto
        </h2>

        <div className="controles-busqueda">
          <div className="campo-busqueda">
            <input
              className="input-busqueda"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setResultadosOpen(true);
              }}
              placeholder="Escribe el nombre del producto o escanea código de barras..."
              aria-label="Buscar producto por nombre o código"
            />

            <button
              className="btn-buscar-producto"
              onClick={() => setResultadosOpen(true)}
              style={{
                background: "linear-gradient(135deg, #b33131 0%, #9c2b2b 100%)",
                color: "white",
                border: "none",
                boxShadow: "0 4px 6px rgba(179, 49, 49, 0.3)",
                minWidth: 150,
                width: "auto",
                padding: "12px 30px",
                borderRadius: 12,
                fontWeight: "bold",
              }}
            >
              <i className="fa-solid fa-search" /> Buscar
            </button>
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

        {/* Resultados */}
        {resultadosOpen && (
          <div className="resultados-busqueda">
            {loading ? (
              <div style={{ padding: 20 }}>Cargando...</div>
            ) : resultados.length ? (
              resultados.map((p) => (
                <div key={String(p.id)} className="item-resultado" onClick={() => abrirModalCantidad(p)}>
                  <div className="info-producto-resultado">
                    <div className="nombre-producto-resultado">{p.nombre}</div>
                    <div className="detalles-producto-resultado">
                      Stock: {p.stock} | {formatEUR(Number(p.precio ?? 0))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: 20 }}>
                No se encontraron productos.
              </div>
            )}
          </div>
        )}

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

      {/* Modal Pedidos */}
      {modalPedidosOpen && (
        <div className="modal-overlay">
          <div className="modal-contenido" style={{ maxWidth: 600 }}>
            {!verificandoPedido ? (
              <>
                <h3>
                  <i className="fa-solid fa-list-check" /> Pedidos Pendientes
                </h3>

                <div style={{ maxHeight: 300, overflowY: "auto" }}>
                  {!pedidosPendientes.length ? (
                    <div style={{ padding: 10 }}>No hay pedidos pendientes de recepción.</div>
                  ) : (
                    <table className="tabla-recepcion" style={{ width: "100%" }}>
                      <thead style={{ fontSize: "0.8em" }}>
                        <tr>
                          <th>ID</th>
                          <th>Proveedor</th>
                          <th>Estado</th>
                          <th>Total</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pedidosPendientes.map((p) => (
                          <tr key={String(p.id)}>
                            <td>#{p.id}</td>
                            <td>{p.proveedor_nombre}</td>
                            <td>{p.estado}</td>
                            <td>{formatEUR(Number(p.total ?? 0))}</td>
                            <td>
                              <button className="btn-buscar-producto" style={{ padding: "10px 12px" }} onClick={() => verificarPedido(p.id)}>
                                <i className="fa-solid fa-clipboard-check" /> Verificar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <button className="btn-modal btn-modal-cancelar" style={{ marginTop: 15, width: "100%" }} onClick={() => setModalPedidosOpen(false)}>
                  Cerrar
                </button>
              </>
            ) : (
              <>
                <div className="verificacion-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0 }}>
                    Verificando Pedido #{verificandoPedido.id} - {verificandoPedido.proveedor_nombre}
                  </h4>
                  <button className="btn-modal btn-modal-cancelar" onClick={() => setVerificandoPedido(null)}>
                    Volver
                  </button>
                </div>

                <table className="tabla-recepcion" style={{ width: "100%", marginTop: 10 }}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Solicitado</th>
                      <th>Recibido</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(verificandoPedido.items ?? []).map((it) => (
                      <tr key={String(it.id)}>
                        <td>{it.producto_nombre}</td>
                        <td>{it.cantidad}</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={it.cantidad}
                            defaultValue={it.cantidad}
                            className="input-cantidad-recepcion"
                            style={{ width: 80 }}
                            onChange={(e) => {
                              verifQtyRef.current[String(it.id)] = Number(e.target.value || 0);
                            }}
                          />
                        </td>
                        <td>
                          <i className="fa-solid fa-check" style={{ color: "#2f855a" }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button className="btn-accion btn-cancelar" onClick={() => rechazarPedido(verificandoPedido.id)}>
                    Rechazar Todo
                  </button>
                  <button className="btn-accion btn-guardar-recepcion" onClick={() => confirmarVerificacion(verificandoPedido.id)}>
                    Confirmar Recepción
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
                <th>Proveedor</th>
                <th>Stock Actual</th>
                <th>Cantidad Recibida</th>
                <th>Nuevo Stock</th>
                <th>Precio</th>
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
                    <td>{r.proveedor}</td>
                    <td>{r.stock}</td>
                    <td>{r.cantidadRecibida}</td>
                    <td className="stock-nuevo">{r.stock + r.cantidadRecibida}</td>
                    <td>{formatEUR(r.precio)}</td>
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

      {/* Modal Cantidad */}
      {modalCantidadOpen && (
        <div className="modal-overlay">
          <div className="modal-contenido">
            <h3>
              <i className="fa-solid fa-box-open" /> Cantidad Recibida
            </h3>
            <p className="modal-producto-nombre">{productoSel?.nombre ?? ""}</p>

            <div className="modal-input-group">
              <label>Cantidad:</label>
              <input
                type="number"
                className="modal-input-cantidad"
                min={1}
                value={cantidadSel}
                onChange={(e) => setCantidadSel(Number(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && productoSel) {
                    agregarProducto(productoSel, Math.max(1, Number(cantidadSel || 1)));
                    cerrarModalCantidad();
                  }
                }}
              />
            </div>

            <div className="modal-botones">
              <button className="btn-modal btn-modal-cancelar" onClick={cerrarModalCantidad}>
                Cancelar
              </button>
              <button
                className="btn-modal btn-modal-confirmar"
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
        </div>
      )}
    </div>
  );
}