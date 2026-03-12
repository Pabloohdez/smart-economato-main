// frontend/src/pages/Distribucion.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/distribucion.css";

import { showConfirm, showNotification } from "../utils/notifications";
import {
  filtrarListaPorAlergenos,
  generarBadgesProducto,
  mostrarAlertaAlergenos,
  productoTieneAlergenos,
  verificarPreferencias,
} from "../utils/alergenosUtils";

type Producto = {
  id: number | string;
  nombre: string;
  stock: number;
  codigoBarras?: string;
  alergenos?: string[];
};

type CarritoItem = {
  productoId: number | string;
  nombre: string;
  cantidad: number;
};

type Movimiento = {
  fecha: string;
  tipo: string;
  producto_nombre?: string;
  cantidad: number;
  motivo?: string;
  usuario_nombre?: string;
};

const API_URL = (import.meta.env.VITE_API_URL as string) || "/api";

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
}

function badgeDestinoClass(motivoRaw?: string) {
  const motivo = (motivoRaw || "Sin especificar").toLowerCase();
  if (motivo.includes("cocina")) return "badge-cocina";
  if (motivo.includes("bar") || motivo.includes("cafetería") || motivo.includes("cafeteria")) return "badge-bar";
  if (motivo.includes("eventos")) return "badge-eventos";
  if (motivo.includes("caducidad") || motivo.includes("merma")) return "badge-merma";
  if (motivo.includes("donación") || motivo.includes("donacion")) return "badge-donacion";
  return "badge-default";
}

export default function DistribucionPage() {
  const pref = verificarPreferencias();

  const [loadingProductos, setLoadingProductos] = useState(true);
  const [productosBase, setProductosBase] = useState<Producto[]>([]);

  const [historial, setHistorial] = useState<Movimiento[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  const [term, setTerm] = useState("");
  const [resultadosOpen, setResultadosOpen] = useState(false);

  const [productoActual, setProductoActual] = useState<Producto | null>(null);
  const [cantidadSalida, setCantidadSalida] = useState<number>(1);

  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [motivo, setMotivo] = useState("Cocina");

  // resultados desde API (cuando pulsas Buscar)
  const [productosBusqueda, setProductosBusqueda] = useState<Producto[] | null>(null);

  const buscadorWrapRef = useRef<HTMLDivElement | null>(null);

  async function cargarProductos() {
    setLoadingProductos(true);
    try {
      const res = await fetch(`${API_URL}/productos`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const json = await res.json();

      if (!json?.success) throw new Error(json?.error || "Error cargando productos");

      let list: Producto[] = (json.data ?? []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        stock: Number(p.stock ?? 0),
        codigoBarras: p.codigoBarras,
        alergenos: p.alergenos || [],
      }));

      // filtrado por alergias si la preferencia está activa
      list = filtrarListaPorAlergenos(list);

      setProductosBase(list);
    } catch (e) {
      console.error(e);
      showNotification("Error de conexión con el servidor (productos).", "error");
      setProductosBase([]);
    } finally {
      setLoadingProductos(false);
    }
  }

  async function cargarHistorial() {
    setLoadingHistorial(true);
    try {
      const res = await fetch(`${API_URL}/movimientos`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      const json = await res.json();

      if (!json?.success || !Array.isArray(json.data)) {
        setHistorial([]);
        return;
      }

      const salidas: Movimiento[] = json.data.filter((m: any) => m.tipo === "SALIDA");
      setHistorial(salidas);
    } catch (e) {
      console.error(e);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }

  useEffect(() => {
    cargarProductos();
    cargarHistorial();
  }, []);

  // cerrar dropdown si clic fuera
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
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
    if (!t || t.length < 2) return [];

    let list = productosBase.filter((p) => {
      const nom = (p.nombre || "").toLowerCase();
      const cb = (p.codigoBarras || "").toLowerCase();
      return nom.includes(t) || cb.includes(t);
    });

    // ya están filtrados por filtrarListaPorAlergenos, pero por si acaso:
    list = filtrarListaPorAlergenos(list);

    return list.slice(0, 30);
  }, [productosBase, term]);

  const resultadosRender = useMemo(() => {
    if (!resultadosOpen) return [];
    if (productosBusqueda) return productosBusqueda;
    return resultadosAutocomplete;
  }, [resultadosOpen, productosBusqueda, resultadosAutocomplete]);

  async function buscarEnAPI() {
    const t = term.trim().toLowerCase();

    if (t.length < 2) {
      setResultadosOpen(false);
      if (t.length > 0) showNotification("Escribe al menos 2 caracteres para buscar", "warning");
      return;
    }

    setResultadosOpen(true);
    setProductosBusqueda(null);

    try {
      const res = await fetch(`${API_URL}/productos?buscar=${encodeURIComponent(t)}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      if (!json?.success || !Array.isArray(json.data)) {
        setProductosBusqueda([]);
        return;
      }

      let list: Producto[] = json.data.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        stock: Number(p.stock ?? 0),
        codigoBarras: p.codigoBarras,
        alergenos: p.alergenos || [],
      }));

      list = filtrarListaPorAlergenos(list);
      setProductosBusqueda(list);
    } catch (e) {
      console.error(e);
      showNotification("Error al buscar en la base de datos", "error");
      setProductosBusqueda([]);
    }
  }

  function seleccionarProducto(p: Producto) {
    // alerta simple igual que el clásico
    const verif = productoTieneAlergenos(p);
    if (verif.tiene && pref.alertas) {
      showNotification(`⚠️ ATENCIÓN: "${p.nombre}" contiene: ${verif.alergenos.join(", ")}`, "warning");
    }

    setProductoActual(p);
    setCantidadSalida(1);
    setResultadosOpen(false);
    setProductosBusqueda(null);
    setTerm(p.nombre);
  }

  function ajustarCant(delta: number) {
    setCantidadSalida((prev) => {
      let val = Number(prev || 1) + delta;
      if (val < 1) val = 1;
      if (productoActual && val > productoActual.stock) val = productoActual.stock;
      return val;
    });
  }

  async function agregarAlCarrito() {
    if (!productoActual) return;

    // bloqueo estricto (igual que clásico)
    const verif = productoTieneAlergenos(productoActual);
    if (verif.tiene && pref.bloqueo) {
      showNotification(
        `❌ ACCIÓN BLOQUEADA: No puedes distribuir este producto por alergia a: ${verif.alergenos.join(", ")}`,
        "error"
      );
      return;
    }

    // confirmación (igual que clásico)
    if (verif.tiene && pref.alertas) {
      const ok = await showConfirm(
        `⚠️ ADVERTENCIA DE SEGURIDAD\n\n` +
          `Vas a distribuir "${productoActual.nombre}", que contiene: ${verif.alergenos.join(", ")}.\n\n` +
          `¿Deseas continuar?`
      );
      if (!ok) return;
    }

    // confirm “modal” genérico de alergenosUtils (igual que clásico)
    const debeBloquear = await mostrarAlertaAlergenos(productoActual);
    if (debeBloquear) return;

    const cant = Math.max(1, Number(cantidadSalida || 1));
    if (cant > productoActual.stock) {
      showNotification("No hay stock suficiente", "error");
      return;
    }

    setCarrito((prev) => {
      const idx = prev.findIndex((i) => String(i.productoId) === String(productoActual.id));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + cant };
        return copy;
      }
      return [...prev, { productoId: productoActual.id, nombre: productoActual.nombre, cantidad: cant }];
    });

    setProductoActual(null);
    setTerm("");
    setCantidadSalida(1);
  }

  function eliminarDelCarrito(index: number) {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmarSalida() {
    if (!carrito.length) return showNotification("El carrito está vacío", "warning");

    const ok = await showConfirm(`¿Confirmar salida de ${carrito.length} productos para ${motivo}?`);
    if (!ok) return;

    let errores: string[] = [];
    let exitosos = 0;

    for (const item of carrito) {
      const payload = {
        productoId: item.productoId,
        cantidad: item.cantidad,
        tipo: "SALIDA",
        motivo: motivo,
        usuarioId: "admin1",
      };

      try {
        const res = await fetch(`${API_URL}/movimientos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest", // SOLO UNA VEZ (tu error era tenerla duplicada)
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => null);

        if (data?.success) {
          exitosos++;
        } else {
          errores.push(`${item.nombre}: ${data?.error || "Error desconocido"}`);
        }
      } catch (e) {
        console.error(e);
        errores.push(`${item.nombre}: Error de red`);
      }
    }

    if (errores.length === 0) {
      showNotification(`✅ Salidas registradas correctamente (${exitosos} productos).`, "success");
    } else if (exitosos > 0) {
      showNotification(`⚠️ Parcial: ${exitosos} OK, ${errores.length} errores.`, "warning");
    } else {
      showNotification("❌ Error al registrar salidas.", "error");
    }

    setCarrito([]);
    await cargarProductos();
    await cargarHistorial();
  }

  return (
    <div>
      <div className="content-header">
        <h2>Distribución / Salida de Stock</h2>
        <p className="text-muted">Registra la salida de productos hacia cocina, bar u otros departamentos.</p>
      </div>

      <div className="distribucion-container">
        {/* Panel Izq */}
        <div className="card panel-seleccion" ref={buscadorWrapRef}>
          <h3>
            <i className="fa-solid fa-magnifying-glass" /> Buscar Producto
          </h3>

          <div className="form-group">
            <label htmlFor="buscadorProd" className="sr-only">
              Buscar Producto
            </label>

            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                type="text"
                id="buscadorProd"
                className="form-control"
                placeholder="Escribe nombre o código de barras..."
                style={{ flex: 1 }}
                value={term}
                onChange={(e) => {
                  setTerm(e.target.value);
                  setResultadosOpen(true);
                  setProductosBusqueda(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarEnAPI();
                  }
                }}
              />

              <button
                id="btnBuscarDistribucion"
                className="btn btn-primary"
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
                onClick={buscarEnAPI}
              >
                <i className="fa-solid fa-search" /> Buscar
              </button>
            </div>

            {/* Lista resultados */}
            <div
              id="listaResultados"
              className="lista-resultados"
              style={{ display: resultadosOpen ? "block" : "none" }}
            >
              {loadingProductos ? (
                <div className="item-resultado" style={{ color: "#666", fontStyle: "italic", cursor: "default" }}>
                  <i className="fa-solid fa-spinner fa-spin" /> Cargando...
                </div>
              ) : resultadosRender.length === 0 ? (
                term.trim().length >= 2 ? (
                  <div className="item-resultado" style={{ color: "#666", fontStyle: "italic", cursor: "default" }}>
                    No se encontraron productos
                  </div>
                ) : (
                  <div />
                )
              ) : (
                resultadosRender.map((p) => (
                  <div
                    key={String(p.id)}
                    className="item-resultado"
                    role="button"
                    tabIndex={0}
                    onClick={() => seleccionarProducto(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") seleccionarProducto(p);
                    }}
                  >
                    <strong>{p.nombre}</strong> <small>(Stock: {p.stock})</small>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detalle seleccionado */}
          <div className="detalle-producto" style={{ display: productoActual ? "block" : "none" }}>
            <h4 id="nombreSeleccionado">
              {productoActual?.nombre ?? ""}
              {productoActual ? (
                <div style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: generarBadgesProducto(productoActual) }} />
              ) : null}
            </h4>

            <p>
              Stock Actual: <strong id="stockSeleccionado">{productoActual?.stock ?? 0}</strong>
            </p>

            <div className="form-group">
              <label htmlFor="cantidadSalida">Cantidad a retirar:</label>
              <div className="input-cantidad">
                <button type="button" onClick={() => ajustarCant(-1)} aria-label="Disminuir cantidad">
                  -
                </button>
                <input
                  type="number"
                  id="cantidadSalida"
                  value={cantidadSalida}
                  min={1}
                  onChange={(e) => setCantidadSalida(Number(e.target.value))}
                />
                <button type="button" onClick={() => ajustarCant(1)} aria-label="Aumentar cantidad">
                  +
                </button>
              </div>
            </div>

            <button className="btn-primary btn-block" type="button" onClick={agregarAlCarrito}>
              <i className="fa-solid fa-cart-plus" /> Añadir a la Lista
            </button>
          </div>
        </div>

        {/* Panel Der */}
        <div className="card panel-carrito">
          <div className="carrito-header">
            <h3>Lista de Salida</h3>
            <span id="itemsCount" className="badge">
              {carrito.length} items
            </span>
          </div>

          <div className="carrito-body">
            <table className="table-carrito">
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col">Cant.</th>
                  <th scope="col">Acción</th>
                </tr>
              </thead>
              <tbody id="tablaCarrito">
                {carrito.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center">
                      La lista está vacía
                    </td>
                  </tr>
                ) : (
                  carrito.map((item, index) => (
                    <tr key={`${String(item.productoId)}-${index}`}>
                      <td>{item.nombre}</td>
                      <td>{item.cantidad}</td>
                      <td>
                        <button type="button" onClick={() => eliminarDelCarrito(index)} aria-label={`Eliminar ${item.nombre}`}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="carrito-footer">
            <div className="form-group">
              <label htmlFor="motivoSalida">Destino / Motivo:</label>
              <select
                id="motivoSalida"
                className="form-control"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              >
                <option value="Cocina">Cocina</option>
                <option value="Bar/Cafetería">Bar/Cafetería</option>
                <option value="Eventos">Eventos</option>
                <option value="Caducidad/Merma">Caducidad / Merma</option>
                <option value="Donación">Donación</option>
              </select>
            </div>

            <button className="btn-success btn-block" type="button" onClick={confirmarSalida}>
              <i className="fa-solid fa-check" /> Confirmar Salida
            </button>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="card" style={{ marginTop: 20 }}>
        <h3>
          <i className="fa-solid fa-clock-rotate-left" /> Historial de Movimientos
        </h3>

        <div className="table-responsive" style={{ maxHeight: 400, overflowY: "auto" }}>
          <table className="table" id="tablaHistorialMovimientos">
            <thead style={{ position: "sticky", top: 0, background: "white", zIndex: 1 }}>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Destino</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody id="tbodyHistorialMovimientos">
              {loadingHistorial ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: 20, color: "#666" }}>
                    <i className="fa-solid fa-spinner fa-spin" /> Cargando historial...
                  </td>
                </tr>
              ) : historial.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center" style={{ padding: 20, color: "#666" }}>
                    No hay salidas registradas
                  </td>
                </tr>
              ) : (
                historial.map((mov, idx) => {
                  const { fecha, hora } = formatFechaHora(mov.fecha);
                  const motivoTxt = mov.motivo || "Sin especificar";
                  const cls = badgeDestinoClass(motivoTxt);

                  return (
                    <tr key={idx}>
                      <td data-label="Fecha">{fecha}</td>
                      <td data-label="Hora">{hora}</td>
                      <td data-label="Producto">{mov.producto_nombre || "Producto desconocido"}</td>
                      <td data-label="Cantidad">{mov.cantidad}</td>
                      <td data-label="Destino">
                        <span className={`badge-destino ${cls}`}>{motivoTxt}</span>
                      </td>
                      <td data-label="Usuario">
                        <span className="usuario-badge">{mov.usuario_nombre || "Desconocido"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}