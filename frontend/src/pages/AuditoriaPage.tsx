import { useEffect, useMemo, useRef, useState } from "react";
import { Grid, html } from "gridjs";
import "gridjs/dist/theme/mermaid.css";
import "../styles/auditoria.css";
import { apiFetch, type ApiRequestError } from "../services/apiClient";

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

type UsuarioActivo = {
  id?: string | number;
  nombre?: string;
  rol?: string;
  role?: string;
  usuario?: string;
  username?: string;
};

export default function AuditoriaPage() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridInstance = useRef<Grid | null>(null);

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

  useEffect(() => {
    const usuario = obtenerUsuarioActual();
    if (!esAdmin(usuario)) {
      setAccesoDenegado(true);
      setLoading(false);
      return;
    }

    void cargarAuditoria();
  }, []);

  useEffect(() => {
    if (!gridRef.current || accesoDenegado) return;

    if (gridInstance.current) {
      try {
        gridInstance.current.destroy();
      } catch {
        // ignore
      }
      gridInstance.current = null;
    }

    const data = registrosAuditoria.map((reg) => [
      formatearFecha(reg.fecha),
      reg.usuario_nombre || reg.usuario_id || "—",
      generarBadgeAccion(reg.accion),
      reg.entidad || "—",
      generarBotonDetalles(reg),
    ]);

    gridInstance.current = new Grid({
      columns: [
        { name: "Fecha/Hora", width: "180px" },
        { name: "Usuario", width: "150px" },
        { name: "Acción", width: "200px" },
        { name: "Entidad", width: "120px" },
        { name: "Detalles", width: "120px" },
      ],
      data,
      sort: true,
      search: true,
      pagination: {
        limit: 20,
      },
      language: {
        search: {
          placeholder: "Buscar...",
        },
        pagination: {
          previous: "Anterior",
          next: "Siguiente",
          showing: "Mostrando",
          results: () => "registros",
        },
      },
      style: {
        table: {
          "white-space": "nowrap",
        },
      },
    });

    gridInstance.current.render(gridRef.current);

    return () => {
      if (gridInstance.current) {
        try {
          gridInstance.current.destroy();
        } catch {
          // ignore
        }
        gridInstance.current = null;
      }
    };
  }, [registrosAuditoria, accesoDenegado]);

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

  function generarBadgeAccion(accion: string) {
    const badges: Record<
      string,
      { clase: string; icono: string; texto: string }
    > = {
      MOVIMIENTO: {
        clase: "badge-movimiento",
        icono: "fa-arrows-rotate",
        texto: "Movimiento",
      },
      PEDIDO: {
        clase: "badge-pedido",
        icono: "fa-shopping-cart",
        texto: "Pedido",
      },
      BAJA: { clase: "badge-baja", icono: "fa-trash", texto: "Baja" },
      CREAR_PRODUCTO: {
        clase: "badge-crear",
        icono: "fa-plus",
        texto: "Crear Producto",
      },
      MODIFICAR_PRODUCTO: {
        clase: "badge-modificar",
        icono: "fa-edit",
        texto: "Modificar Producto",
      },
      ELIMINAR_PRODUCTO: {
        clase: "badge-eliminar",
        icono: "fa-times",
        texto: "Eliminar Producto",
      },
    };

    const badge = badges[accion] || {
      clase: "badge-movimiento",
      icono: "fa-question",
      texto: accion,
    };

    return html(`
      <span class="badge-accion ${badge.clase}">
        <i class="fa-solid ${badge.icono}"></i>
        ${badge.texto}
      </span>
    `);
  }

  function generarBotonDetalles(registro: RegistroAuditoria) {
    return html(`
      <button class="btn-ver-detalles-grid" data-auditoria-id="${registro.id}">
        <i class="fa-solid fa-eye"></i> Ver
      </button>
    `);
  }

  useEffect(() => {
    const root = gridRef.current;
    if (!root) return;

    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const btn = target.closest("[data-auditoria-id]") as HTMLElement | null;
      if (!btn) return;

      const id = btn.getAttribute("data-auditoria-id");
      const registro = registrosAuditoria.find(
        (r) => String(r.id) === String(id),
      );
      if (registro) abrirModal(registro);
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [registrosAuditoria]);

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
          <p style={{ color: "#c53030", fontWeight: 600 }}>
            Acceso denegado:{" "}
            {errorMsg || "Se requieren permisos de administrador"}
          </p>
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
            <select
              id="filtroAccion"
              className="select-filtro"
              value={filtros.accion}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, accion: e.target.value }))
              }
            >
              <option value="">Todas las acciones</option>
              <option value="MOVIMIENTO">Movimientos de Stock</option>
              <option value="PEDIDO">Pedidos</option>
              <option value="BAJA">Bajas de Producto</option>
              <option value="CREAR_PRODUCTO">Crear Producto</option>
              <option value="MODIFICAR_PRODUCTO">Modificar Producto</option>
              <option value="ELIMINAR_PRODUCTO">Eliminar Producto</option>
            </select>
          </div>

          <div className="filtro-item">
            <label htmlFor="filtroUsuario">
              <i className="fa-solid fa-user"></i> Usuario
            </label>
            <select
              id="filtroUsuario"
              className="select-filtro"
              value={filtros.usuario}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, usuario: e.target.value }))
              }
            >
              <option value="">Todos los usuarios</option>
              {usuariosDisponibles.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
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
        {loading && <p>Cargando auditoría...</p>}
        {!loading && errorMsg && (
          <p style={{ color: "#c53030", fontWeight: 600 }}>{errorMsg}</p>
        )}
        <div id="grid-auditoria" ref={gridRef} />
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

function obtenerUsuarioActual(): UsuarioActivo | null {
  const userStr = localStorage.getItem("usuarioActivo");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

function obtenerUsuarioId(usuario: UsuarioActivo | null) {
  if (!usuario) return "";
  return String(usuario.id ?? usuario.usuario ?? usuario.username ?? "");
}

function esAdmin(usuario: UsuarioActivo | null) {
  const rol = String(usuario?.rol ?? usuario?.role ?? "").toLowerCase();
  return rol === "admin" || rol === "administrador";
}
