import { useEffect, useMemo, useState } from "react";
import "../styles/auditoria.css";
import { apiFetch, type ApiRequestError } from "../services/apiClient";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import type { UsuarioActivo } from "../types";
import { useAuth } from "../contexts/AuthContext";
import UiSelect from "../components/ui/UiSelect";

type RegistroAuditoria = {
  id: number | string;
  fecha: string;
  usuario_id?: string | number;
  usuario_nombre?: string;
  accion: string;
  entidad?: string;
  entidad_id?: string | number;
  detalles?: Record<string, any>;
};

type FiltrosAuditoria = {
  accion: string;
  usuario: string;
  fechaDesde: string;
  fechaHasta: string;
};

export default function AuditoriaPage() {
  const { user: authUser } = useAuth();

  const [registrosAuditoria, setRegistrosAuditoria] = useState<
    RegistroAuditoria[]
  >([]);
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<string[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filtros, setFiltros] = useState<FiltrosAuditoria>({
    accion: "",
    usuario: "",
    fechaDesde: "",
    fechaHasta: "",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] =
    useState<RegistroAuditoria | null>(null);

  const [accesoDenegado, setAccesoDenegado] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    if (!esAdmin(authUser)) {
      setAccesoDenegado(true);
      setLoading(false);
      return;
    }

    void cargarAuditoria();
  }, []);

  const accionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    registrosAuditoria.forEach((r) => set.add(String(r.accion ?? "")));
    return Array.from(set).filter(Boolean).sort();
  }, [registrosAuditoria]);

  const usuariosOpts = useMemo(() => {
    return usuariosDisponibles.slice().sort().map((u) => ({ value: u, label: u }));
  }, [usuariosDisponibles]);

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    return registrosAuditoria.filter((r) => {
      if (filtros.accion && String(r.accion) !== filtros.accion) return false;
      if (filtros.usuario && String(r.usuario_nombre ?? r.usuario_id ?? "") !== filtros.usuario) return false;
      if (filtros.fechaDesde) {
        if (new Date(r.fecha) < new Date(filtros.fechaDesde)) return false;
      }
      if (filtros.fechaHasta) {
        const hasta = new Date(filtros.fechaHasta);
        hasta.setHours(23, 59, 59, 999);
        if (new Date(r.fecha) > hasta) return false;
      }
      if (!s) return true;
      return (
        String(r.id).toLowerCase().includes(s)
        || String(r.usuario_nombre ?? r.usuario_id ?? "").toLowerCase().includes(s)
        || String(r.accion ?? "").toLowerCase().includes(s)
        || String(r.entidad ?? "").toLowerCase().includes(s)
      );
    });
  }, [registrosAuditoria, filtros, q]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const visible = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtrados.slice(start, start + pageSize);
  }, [filtrados, pageSafe]);

  useEffect(() => {
    setPage(1);
  }, [q, filtros.accion, filtros.usuario, filtros.fechaDesde, filtros.fechaHasta]);

  async function cargarAuditoria(filtrosAplicados?: Partial<FiltrosAuditoria>) {
    try {
      setLoading(true);
      setErrorMsg("");

      const params = new URLSearchParams();
      const f = { ...filtros, ...filtrosAplicados };

      if (f.accion) params.append("accion", f.accion);
      if (f.usuario) params.append("usuario", f.usuario);
      if (f.fechaDesde) params.append("fecha_desde", f.fechaDesde);
      if (f.fechaHasta) params.append("fecha_hasta", f.fechaHasta);

      params.append("limite", "200");

      const url = `/auditoria?${params.toString()}`;
      const result = await apiFetch<any>(url, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      });
      const data = result.data || result;

      if (data.registros) {
        const registros = Array.isArray(data.registros) ? data.registros : [];
        setRegistrosAuditoria(registros);
        setTotalRegistros(Number(data.total ?? registros.length));

        const usuarios: string[] = Array.from(
          new Set<string>(
            registros
              .map((r: RegistroAuditoria) =>
                String(r.usuario_nombre || r.usuario_id || "").trim(),
              )
              .filter((u: string) => u.length > 0),
          ),
        ).sort((a, b) => a.localeCompare(b));

        setUsuariosDisponibles(usuarios);
      } else if (result.error) {
        setErrorMsg(
          result.error.message || result.error || "Error al cargar auditoría",
        );
      } else {
        setErrorMsg("Error al cargar auditoría");
      }
    } catch (error) {
      console.error("Error al cargar auditoría:", error);
      const apiError = error as ApiRequestError;

      if (apiError.status === 403) {
        const payload =
          typeof apiError.payload === "object" && apiError.payload !== null
            ? (apiError.payload as { error?: string })
            : undefined;
        setAccesoDenegado(true);
        setErrorMsg(payload?.error || apiError.message || "Se requieren permisos de administrador");
      } else {
        setErrorMsg("Error de conexión");
      }
    } finally {
      setLoading(false);
    }
  }

  function aplicarFiltros() {
    void cargarAuditoria();
  }

  function limpiarFiltros() {
    const vacios = {
      accion: "",
      usuario: "",
      fechaDesde: "",
      fechaHasta: "",
    };
    setFiltros(vacios);
    void cargarAuditoria(vacios);
  }

  function abrirModal(registro: RegistroAuditoria) {
    setRegistroSeleccionado(registro);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setRegistroSeleccionado(null);
  }

  function getAccionBadge(accion: string) {
    const badges: Record<string, { clase: string; icono: string; texto: string }> = {
      MOVIMIENTO: { clase: "badge-movimiento", icono: "fa-arrows-rotate", texto: "Movimiento" },
      PEDIDO: { clase: "badge-pedido", icono: "fa-shopping-cart", texto: "Pedido" },
      BAJA: { clase: "badge-baja", icono: "fa-trash", texto: "Baja" },
      CREAR_PRODUCTO: { clase: "badge-crear", icono: "fa-plus", texto: "Crear Producto" },
      MODIFICAR_PRODUCTO: { clase: "badge-modificar", icono: "fa-edit", texto: "Modificar Producto" },
      ELIMINAR_PRODUCTO: { clase: "badge-eliminar", icono: "fa-times", texto: "Eliminar Producto" },
    };
    return (
      badges[accion] ?? {
        clase: "badge-movimiento",
        icono: "fa-question",
        texto: accion,
      }
    );
  }

  const resumen = useMemo(() => {
    const usuariosUnicos = new Set(
      registrosAuditoria.map((r) => r.usuario_nombre || r.usuario_id || ""),
    ).size;

    let rangoFechas = "Sin datos";
    if (registrosAuditoria.length > 0) {
      const fechas = registrosAuditoria
        .map((r) => new Date(r.fecha))
        .filter((d) => !Number.isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      if (fechas.length > 0) {
        const opts: Intl.DateTimeFormatOptions = {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        };
        const desde = fechas[0].toLocaleDateString("es-ES", opts);
        const hasta = fechas[fechas.length - 1].toLocaleDateString(
          "es-ES",
          opts,
        );
        rangoFechas = desde === hasta ? desde : `${desde} — ${hasta}`;
      }
    }

    return {
      total: totalRegistros,
      usuariosUnicos,
      rangoFechas,
    };
  }, [registrosAuditoria, totalRegistros]);

  if (accesoDenegado) {
    return (
      <div>
        <div className="header-auditoria">
          <h1 className="titulo-auditoria">
            <i className="fa-solid fa-clipboard-list"></i> REGISTRO DE AUDITORÍA
          </h1>
          <p className="subtitulo">
            Historial completo de actividades del sistema
          </p>
        </div>

        <div className="panel-tabla">
          <Alert type="error" title="Acceso denegado">
            {errorMsg || "Se requieren permisos de administrador"}
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header-auditoria">
        <h1 className="titulo-auditoria">
          <i className="fa-solid fa-clipboard-list"></i> REGISTRO DE AUDITORÍA
        </h1>
        <p className="subtitulo">
          Historial completo de actividades del sistema
        </p>
      </div>

      <div className="panel-filtros">
        <div className="filtros-container">
          <div className="filtro-item">
            <label htmlFor="filtroAccion">
              <i className="fa-solid fa-filter"></i> Tipo de Acción
            </label>
            <UiSelect
              id="filtroAccion"
              value={filtros.accion}
              onChange={(v) => setFiltros((prev) => ({ ...prev, accion: v }))}
              placeholder="Todas las acciones"
              options={[
                { value: "", label: "Todas las acciones" },
                { value: "MOVIMIENTO", label: "Movimientos de Stock" },
                { value: "PEDIDO", label: "Pedidos" },
                { value: "BAJA", label: "Bajas de Producto" },
                { value: "CREAR_PRODUCTO", label: "Crear Producto" },
                { value: "MODIFICAR_PRODUCTO", label: "Modificar Producto" },
                { value: "ELIMINAR_PRODUCTO", label: "Eliminar Producto" },
              ]}
            />
          </div>

          <div className="filtro-item">
            <label htmlFor="filtroUsuario">
              <i className="fa-solid fa-user"></i> Usuario
            </label>
            <UiSelect
              id="filtroUsuario"
              value={filtros.usuario}
              onChange={(v) => setFiltros((prev) => ({ ...prev, usuario: v }))}
              placeholder="Todos los usuarios"
              options={[
                { value: "", label: "Todos los usuarios" },
                ...usuariosOpts,
              ]}
            />
          </div>

          <div className="filtro-item">
            <label htmlFor="filtroFechaDesde">
              <i className="fa-solid fa-calendar"></i> Desde
            </label>
            <input
              type="date"
              id="filtroFechaDesde"
              className="input-fecha"
              value={filtros.fechaDesde}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))
              }
            />
          </div>

          <div className="filtro-item">
            <label htmlFor="filtroFechaHasta">
              <i className="fa-solid fa-calendar"></i> Hasta
            </label>
            <input
              type="date"
              id="filtroFechaHasta"
              className="input-fecha"
              value={filtros.fechaHasta}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))
              }
            />
          </div>

          <div className="filtro-acciones">
            <button
              type="button"
              id="btnAplicarFiltros"
              className="btn-aplicar"
              onClick={aplicarFiltros}
            >
              <i className="fa-solid fa-search"></i> Aplicar
            </button>
            <button
              type="button"
              id="btnLimpiarFiltros"
              className="btn-limpiar"
              onClick={limpiarFiltros}
            >
              <i className="fa-solid fa-eraser"></i> Limpiar
            </button>
          </div>
        </div>
      </div>

      <div className="barra-resumen">
        <div className="resumen-item">
          <i className="fa-solid fa-list-ol"></i>
          <span>
            <strong>{resumen.total}</strong> registros
          </span>
        </div>
        <div className="resumen-item">
          <i className="fa-solid fa-calendar-days"></i>
          <span>{resumen.rangoFechas}</span>
        </div>
        <div className="resumen-item">
          <i className="fa-solid fa-users"></i>
          <span>
            <strong>{resumen.usuariosUnicos}</strong> usuario
            {resumen.usuariosUnicos !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="panel-tabla">
        {loading && <Spinner label="Cargando auditoría..." />}
        {!loading && errorMsg && (
          <Alert type="error" title="Error al cargar">{errorMsg}</Alert>
        )}
        {!loading && !errorMsg && (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar en auditoría"
                style={{ maxWidth: 360 }}
              />
              <span style={{ color: "#718096", fontSize: 13 }}>
                Mostrando <strong>{visible.length}</strong> de <strong>{filtrados.length}</strong>
                {totalRegistros ? ` (total remoto: ${totalRegistros})` : ""}
              </span>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha/Hora</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Entidad</th>
                    <th style={{ textAlign: "right" }}>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#718096" }}>
                        No hay registros.
                      </td>
                    </tr>
                  ) : (
                    visible.map((reg) => {
                      const badge = getAccionBadge(reg.accion);
                      return (
                        <tr key={String(reg.id)}>
                          <td style={{ whiteSpace: "nowrap" }}>{formatearFecha(reg.fecha)}</td>
                          <td>{reg.usuario_nombre || reg.usuario_id || "—"}</td>
                          <td>
                            <span className={`badge-accion ${badge.clase}`}>
                              <i className={`fa-solid ${badge.icono}`} /> {badge.texto}
                            </span>
                          </td>
                          <td>{reg.entidad || "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button type="button" className="btn-secondary" onClick={() => abrirModal(reg)}>
                              <i className="fa-solid fa-eye" /> Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pageSafe <= 1}
                >
                  Anterior
                </button>
                <span style={{ fontSize: 13, color: "#4a5568" }}>
                  {pageSafe} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={pageSafe >= totalPages}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && registroSeleccionado && (
        <div
          className="modal-detalles"
          onClick={(e) => e.target === e.currentTarget && cerrarModal()}
        >
          <div className="modal-contenido">
            <div className="modal-header">
              <h3>
                <i className="fa-solid fa-info-circle"></i> Detalles de la
                Acción
              </h3>
              <button
                type="button"
                className="btn-cerrar-modal"
                onClick={cerrarModal}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="detalle-seccion">
                <div className="detalle-seccion-titulo">
                  <i className="fa-solid fa-circle-info"></i> Información
                  General
                </div>
                <div className="detalle-grid">
                  {crearItemDetalleReact(
                    "Registro",
                    `#${registroSeleccionado.id}`,
                  )}
                  {crearItemDetalleReact(
                    "Fecha y Hora",
                    formatearFecha(registroSeleccionado.fecha),
                  )}
                  {crearItemDetalleReact(
                    "Usuario",
                    String(
                      registroSeleccionado.usuario_nombre ||
                        registroSeleccionado.usuario_id ||
                        "—",
                    ),
                  )}
                  {crearItemDetalleReact(
                    "Acción",
                    obtenerTextoAccion(registroSeleccionado.accion),
                  )}
                </div>
              </div>

              {registroSeleccionado.detalles &&
                Object.keys(registroSeleccionado.detalles).length > 0 && (
                  <div className="detalle-seccion">
                    <div className="detalle-seccion-titulo">
                      <i
                        className={`fa-solid ${obtenerIconoAccion(registroSeleccionado.accion)}`}
                      ></i>
                      Datos de la Operación
                    </div>

                    <div className="detalle-grid">
                      {renderDetallesOperacion(registroSeleccionado)}
                    </div>
                  </div>
                )}

              {registroSeleccionado.entidad && (
                <div className="detalle-pie">
                  <i className="fa-solid fa-tag"></i>
                  <span>
                    Entidad afectada:{" "}
                    <strong>
                      {registroSeleccionado.entidad_id
                        ? `${capitalizar(registroSeleccionado.entidad)} #${registroSeleccionado.entidad_id}`
                        : capitalizar(registroSeleccionado.entidad)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function crearItemDetalleReact(label: string, valor: string) {
  return (
    <div className="detalle-item" key={`${label}-${valor}`}>
      <div className="detalle-label">{label}</div>
      <div className="detalle-valor">{valor}</div>
    </div>
  );
}

function renderDetallesOperacion(registro: RegistroAuditoria) {
  const detalles = registro.detalles || {};
  const items: React.ReactNode[] = [];

  if (detalles.producto) {
    items.push(crearItemDetalleReact("Producto", String(detalles.producto)));
  }

  if (detalles.cantidad !== undefined) {
    items.push(crearItemDetalleReact("Cantidad", `${detalles.cantidad} uds.`));
  }

  switch (registro.accion) {
    case "BAJA":
      if (detalles.tipo)
        items.push(
          crearItemDetalleReact("Tipo de Baja", String(detalles.tipo)),
        );
      if (detalles.motivo)
        items.push(crearItemDetalleReact("Motivo", String(detalles.motivo)));
      break;

    case "MOVIMIENTO":
      if (detalles.tipo) {
        items.push(
          crearItemDetalleReact(
            "Tipo",
            detalles.tipo === "ENTRADA"
              ? "Entrada de stock"
              : "Salida de stock",
          ),
        );
      }
      if (detalles.motivo)
        items.push(crearItemDetalleReact("Motivo", String(detalles.motivo)));
      if (
        detalles.stock_anterior !== undefined &&
        detalles.stock_nuevo !== undefined
      ) {
        items.push(
          crearItemDetalleReact(
            "Stock",
            `${detalles.stock_anterior} → ${detalles.stock_nuevo}`,
          ),
        );
      }
      break;

    case "PEDIDO":
      if (detalles.proveedor)
        items.push(
          crearItemDetalleReact("Proveedor", String(detalles.proveedor)),
        );
      if (detalles.estado)
        items.push(crearItemDetalleReact("Estado", String(detalles.estado)));
      if (detalles.motivo)
        items.push(crearItemDetalleReact("Motivo", String(detalles.motivo)));
      break;

    default:
      if (detalles.motivo)
        items.push(crearItemDetalleReact("Motivo", String(detalles.motivo)));
      if (detalles.precio) {
        items.push(
          crearItemDetalleReact(
            "Precio",
            `${parseFloat(detalles.precio).toFixed(2)} €`,
          ),
        );
      }
      if (detalles.categoria)
        items.push(
          crearItemDetalleReact("Categoría", String(detalles.categoria)),
        );
      break;
  }

  return items;
}

function formatearFecha(fechaStr: string) {
  const fecha = new Date(fechaStr);
  return fecha.toLocaleString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function obtenerTextoAccion(accion: string) {
  const textos: Record<string, string> = {
    MOVIMIENTO: "Movimiento de Stock",
    PEDIDO: "Pedido",
    BAJA: "Baja de Producto",
    CREAR_PRODUCTO: "Creación de Producto",
    MODIFICAR_PRODUCTO: "Modificación de Producto",
    ELIMINAR_PRODUCTO: "Eliminación de Producto",
  };
  return textos[accion] || accion;
}

function obtenerIconoAccion(accion: string) {
  const iconos: Record<string, string> = {
    MOVIMIENTO: "fa-arrows-rotate",
    PEDIDO: "fa-shopping-cart",
    BAJA: "fa-box-archive",
    CREAR_PRODUCTO: "fa-plus-circle",
    MODIFICAR_PRODUCTO: "fa-pen-to-square",
    ELIMINAR_PRODUCTO: "fa-trash-can",
  };
  return iconos[accion] || "fa-file-lines";
}

function capitalizar(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function obtenerUsuarioId(usuario: UsuarioActivo | null) {
  if (!usuario) return "";
  return String(usuario.id ?? usuario.usuario ?? usuario.username ?? "");
}

function esAdmin(usuario: UsuarioActivo | null) {
  const rol = String(usuario?.rol ?? usuario?.role ?? "").toLowerCase();
  return rol === "admin" || rol === "administrador";
}
