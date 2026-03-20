import { useEffect, useMemo, useState } from "react";
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
import "../styles/avisos.css";
import { apiFetch } from "../services/apiClient";
import Spinner from "../components/ui/Spinner";

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

type GastoMensual = {
  mes: string;
  nombre_usuario: string;
  num_pedidos: number;
  total_mes: number | string;
};

type ModalModo = "baja" | "pedido" | null;

export default function AvisosPage() {
  const [productos, setProductos] = useState<ProductoAviso[]>([]);
  const [caducados, setCaducados] = useState<ProductoAviso[]>([]);
  const [stockBajo, setStockBajo] = useState<ProductoAviso[]>([]);
  const [gastosMensuales, setGastosMensuales] = useState<GastoMensual[]>([]);
  const [loading, setLoading] = useState(true);
  const [timestamp, setTimestamp] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [accionActual, setAccionActual] = useState<ModalModo>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoAviso | null>(null);
  const [cantidadModal, setCantidadModal] = useState(1);
  const [confirmando, setConfirmando] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");
  const [toastTipo, setToastTipo] = useState<"success" | "error">("success");

  // Obtener usuario activo
  const userRaw = localStorage.getItem("usuarioActivo");
  const user = userRaw ? JSON.parse(userRaw) : null;

  useEffect(() => {
    void cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setLoading(true);

      const [productosRaw, categorias, proveedores] = await Promise.all([
        getProductos(),
        getCategorias(),
        getProveedores(),
      ]);

      let gastos: GastoMensual[] = [];
      try {
        const data = await apiFetch<{ success: boolean; data?: { gastos_por_mes?: GastoMensual[] } }>("/informes?tipo=gastos_mensuales");
        if (data.success && data.data?.gastos_por_mes) {
          gastos = data.data.gastos_por_mes;
        }
      } catch (e) {
        console.error("Error cargando gastos mensuales:", e);
      }

      const datosNormalizados: ProductoAviso[] = (productosRaw || []).map((p: any) => {
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

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const listaCaducados: ProductoAviso[] = [];
      const listaStockBajo: ProductoAviso[] = [];

      datosNormalizados.forEach((p) => {
        if (
          p.fechaCaducidadNormalizada &&
          p.fechaCaducidadNormalizada !== "NULL" &&
          p.fechaCaducidadNormalizada !== "Sin fecha"
        ) {
          const fecha = new Date(p.fechaCaducidadNormalizada);
          if (!Number.isNaN(fecha.getTime()) && fecha < hoy) {
            const diasCaducado = Math.ceil((hoy.getTime() - fecha.getTime()) / 86400000);
            listaCaducados.push({ ...p, diasCaducado });
          }
        }

        if (p.stockMinimoNum > 0 && p.stockNum <= p.stockMinimoNum) {
          listaStockBajo.push(p);
        }
      });

      listaCaducados.sort((a, b) => (b.diasCaducado ?? 0) - (a.diasCaducado ?? 0));
      listaStockBajo.sort(
        (a, b) => a.stockNum / a.stockMinimoNum - b.stockNum / b.stockMinimoNum
      );

      setProductos(datosNormalizados);
      setCaducados(listaCaducados);
      setStockBajo(listaStockBajo);
      setGastosMensuales(gastos);

      setTimestamp(
        "Actualizado: " +
          new Date().toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
      );
    } catch (error) {
      console.error("Error cargando avisos:", error);
      mostrarToast(
        `Error cargando avisos: ${error instanceof Error ? error.message : "desconocido"}`,
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  const valorRiesgo = useMemo(() => {
    return caducados.reduce((sum, p) => sum + p.precioNum * p.stockNum, 0);
  }, [caducados]);

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
        await registrarBaja({
          productoId: productoSeleccionado.id,
          cantidad: cantidadModal,
          tipoBaja: "Caducado",
          motivo: "Caducidad registrada desde Centro de Avisos",
          usuarioId: user?.id || "admin",
        });

        mostrarToast("Baja registrada correctamente", "success");
      } else if (accionActual === "pedido") {
        await crearPedido({
          proveedorId:
            productoSeleccionado.proveedorObj?.id || productoSeleccionado.proveedorId,
          total: cantidadModal * productoSeleccionado.precioNum,
          usuarioId: user?.id || "admin",
          items: [
            {
              producto_id: productoSeleccionado.id,
              cantidad: cantidadModal,
              precio: productoSeleccionado.precioNum,
              nombre: productoSeleccionado.nombre,
            },
          ],
        });

        mostrarToast("Pedido creado correctamente", "success");
      }

      cerrarModal();
      await cargarDatos();
    } catch (error) {
      console.error(error);
      mostrarToast("Error al realizar la acción", "error");
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
    <div className="avisos-page">
      <div className="avisos-header">
        <div>
          <h1 className="avisos-titulo">
            <i className="fa-solid fa-bell"></i> Centro de Avisos
          </h1>
          <p className="avisos-subtitulo">Resumen de alertas y notificaciones del sistema</p>
        </div>
        <div className="avisos-timestamp">{timestamp}</div>
      </div>

      <div className="avisos-metricas">
        <div className="metrica-card metrica-total">
          <div className="metrica-icono">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="metrica-info">
            <span className="metrica-numero">{loading ? "-" : totalAlertas}</span>
            <span className="metrica-label">Alertas Activas</span>
          </div>
        </div>

        <div className="metrica-card metrica-critico">
          <div className="metrica-icono">
            <i className="fa-solid fa-skull-crossbones"></i>
          </div>
          <div className="metrica-info">
            <span className="metrica-numero">{loading ? "-" : caducados.length}</span>
            <span className="metrica-label">Productos Caducados</span>
          </div>
        </div>

        <div className="metrica-card metrica-valor">
          <div className="metrica-icono">
            <i className="fa-solid fa-coins"></i>
          </div>
          <div className="metrica-info">
            <span className="metrica-numero">{loading ? "-" : `${valorRiesgo.toFixed(2)} €`}</span>
            <span className="metrica-label">Valor en Riesgo</span>
          </div>
        </div>
      </div>

      <section className="avisos-seccion">
        <div className="seccion-header seccion-header--danger">
          <div className="seccion-titulo">
            <i className="fa-solid fa-calendar-xmark"></i>
            <h2>Productos Caducados</h2>
          </div>
          <span className="seccion-contador">{caducados.length}</span>
        </div>

        <div className="seccion-body">
          {loading ? (
            <div className="avisos-vacio"><Spinner label="Cargando caducados..." /></div>
          ) : caducados.length === 0 ? (
            <div className="aviso-ok">
              <i className="fa-solid fa-circle-check"></i>
              <span>No hay productos caducados</span>
            </div>
          ) : (
            caducados.map((p) => (
              <div className="alerta-item" key={`cad-${p.id}`}>
                <div className="alerta-indicador alerta-indicador--danger"></div>

                <div className="alerta-contenido">
                  <p className="alerta-titulo">{p.nombre}</p>
                  <p className="alerta-detalle">
                    {p.nombreCategoria} · Stock: {p.stockNum}
                  </p>
                </div>

                <div className="alerta-acciones">
                  <button
                    type="button"
                    className="btn-accion-alert btn-baja"
                    onClick={() => abrirModalBaja(p)}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    <span>Dar de Baja</span>
                  </button>
                </div>

                <div className="alerta-meta">
                  <strong>{p.precioNum.toFixed(2)} €</strong>
                  <br />
                  {tiempoRelativo(p.diasCaducado || 0)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="avisos-seccion">
        <div className="seccion-header seccion-header--warning">
          <div className="seccion-titulo">
            <i className="fa-solid fa-box-open"></i>
            <h2>Stock por Debajo del Mínimo</h2>
          </div>
          <span className="seccion-contador">{stockBajo.length}</span>
        </div>

        <div className="seccion-body">
          {loading ? (
            <div className="avisos-vacio"><Spinner label="Cargando stock..." /></div>
          ) : stockBajo.length === 0 ? (
            <div className="aviso-ok">
              <i className="fa-solid fa-circle-check"></i>
              <span>Todos los productos tienen stock suficiente</span>
            </div>
          ) : (
            stockBajo.map((p) => {
              const pct = Math.min(100, Math.round((p.stockNum / p.stockMinimoNum) * 100));
              const barClass =
                pct <= 25
                  ? "stock-bar-fill--danger"
                  : pct <= 75
                  ? "stock-bar-fill--warning"
                  : "stock-bar-fill--ok";

              const cantidadSugerida = Math.max(1, p.stockMinimoNum * 2 - p.stockNum);

              return (
                <div className="alerta-item" key={`stock-${p.id}`}>
                  <div className="alerta-indicador alerta-indicador--warning"></div>

                  <div className="alerta-contenido">
                    <p className="alerta-titulo">{p.nombre}</p>
                    <p className="alerta-detalle">
                      {p.nombreCategoria} · {p.nombreProveedor}
                    </p>
                  </div>

                  <div className="alerta-acciones">
                    <button
                      type="button"
                      className="btn-accion-alert btn-pedir"
                      onClick={() => abrirModalPedido(p, cantidadSugerida)}
                    >
                      <i className="fa-solid fa-truck-fast"></i>
                      <span>Pedir</span>
                    </button>
                  </div>

                  <div className="stock-bar-container" title={`${p.stockNum} / ${p.stockMinimoNum}`}>
                    <div className={`stock-bar-fill ${barClass}`} style={{ width: `${pct}%` }}></div>
                  </div>

                  <div className="alerta-meta">
                    <strong>{p.stockNum}</strong> / {p.stockMinimoNum}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="avisos-seccion">
        <div className="seccion-header seccion-header--info">
          <div className="seccion-titulo">
            <i className="fa-solid fa-chart-line"></i>
            <h2>Resumen Financiero</h2>
          </div>
        </div>

        <div className="seccion-body">
          {loading ? (
            <div className="avisos-vacio"><Spinner label="Calculando..." /></div>
          ) : (
            <div className="financiero-grid">
              <div className="financiero-item">
                <div className="financiero-label">Pérdida por Caducidad</div>
                <div className="financiero-valor financiero-valor--danger">
                  {financieroResumen.valorCaducado.toFixed(2)} €
                </div>
              </div>

              <div className="financiero-item">
                <div className="financiero-label">Valor en Stock Bajo</div>
                <div className="financiero-valor financiero-valor--warning">
                  {financieroResumen.valorStockBajo.toFixed(2)} €
                </div>
              </div>

              {financieroResumen.masCaro && (
                <div className="financiero-item" style={{ gridColumn: "1 / -1" }}>
                  <div className="financiero-label">Producto en Riesgo de Mayor Valor</div>
                  <div className="financiero-valor">
                    {financieroResumen.masCaro.nombre}{" "}
                    <span style={{ fontWeight: 400, fontSize: "13px", color: "#6B7280" }}>
                      — {(financieroResumen.masCaro.precioNum * financieroResumen.masCaro.stockNum).toFixed(2)} €
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="avisos-seccion">
        <div className="seccion-header seccion-header--success">
          <div className="seccion-titulo">
            <i className="fa-solid fa-bell"></i>
            <h2>Gastos Mensuales por Profesor</h2>
          </div>
        </div>

        <div className="seccion-body">
          <div className="card-table-wrapper">
            <table className="table-avisos">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Profesor</th>
                  <th className="text-center">Pedidos</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "16px 0" }}>
                      <Spinner size="sm" label="Cargando datos financieros..." />
                    </td>
                  </tr>
                ) : gastosMensuales.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      No hay datos de gastos registrados
                    </td>
                  </tr>
                ) : (
                  gastosMensuales.map((g, idx) => (
                    <tr key={`${g.mes}-${g.nombre_usuario}-${idx}`}>
                      <td>{formatearMes(g.mes)}</td>
                      <td>{g.nombre_usuario}</td>
                      <td className="text-center">{g.num_pedidos}</td>
                      <td className="text-right">
                        <strong>{Number(g.total_mes).toFixed(2)} €</strong>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className={`modal-overlay ${modalOpen ? "active" : ""}`}>
        <div className={`modal-card ${accionActual === "baja" ? "modo-danger" : "modo-success"}`}>
          <div className="modal-header">
            <h3>
              {accionActual === "baja" ? "Confirmar Baja de Producto" : "Solicitar Pedido"}
            </h3>
            <button type="button" className="modal-close" onClick={cerrarModal}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="modal-body">
            <p className="modal-texto">
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

            <div className="input-grupo">
              <label htmlFor="modal-cantidad">Cantidad</label>
              <div className="input-wrapper">
                <button
                  type="button"
                  className="btn-cantidad"
                  onClick={() => setCantidadModal((v) => Math.max(1, v - 1))}
                >
                  -
                </button>

                <input
                  id="modal-cantidad"
                  type="number"
                  min={1}
                  max={accionActual === "baja" ? productoSeleccionado?.stockNum : undefined}
                  value={cantidadModal}
                  onChange={(e) => setCantidadModal(Math.max(1, Number(e.target.value) || 1))}
                />

                <button
                  type="button"
                  className="btn-cantidad"
                  onClick={() => {
                    const max =
                      accionActual === "baja"
                        ? productoSeleccionado?.stockNum || cantidadModal + 1
                        : cantidadModal + 1;
                    setCantidadModal((v) => Math.min(max, v + 1));
                  }}
                >
                  +
                </button>
              </div>

              <span className="modal-hint">
                {accionActual === "baja" && productoSeleccionado
                  ? `Stock actual: ${productoSeleccionado.stockNum} unidades`
                  : accionActual === "pedido" && productoSeleccionado
                  ? `Stock mínimo: ${productoSeleccionado.stockMinimoNum} | Actual: ${productoSeleccionado.stockNum}`
                  : ""}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-modal btn-cancelar" onClick={cerrarModal}>
              Cancelar
            </button>

            <button
              type="button"
              className={`btn-modal btn-confirmar ${confirmando ? "loading" : ""}`}
              onClick={confirmarAccion}
              disabled={confirmando}
            >
              <span className="btn-texto">Confirmar</span>
              <span className="btn-loader">
                <i className="fa-solid fa-circle-notch fa-spin"></i>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className={`toast toast-${toastTipo} ${toastOpen ? "active" : ""}`}>
        <i
          className={
            toastTipo === "success"
              ? "fa-solid fa-circle-check"
              : "fa-solid fa-circle-xmark"
          }
        ></i>
        <span>{toastMensaje}</span>
      </div>
    </div>
  );
}