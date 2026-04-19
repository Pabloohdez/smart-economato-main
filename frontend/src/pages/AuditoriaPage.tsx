import { useEffect, useMemo, useState } from "react";
import { apiFetch, type ApiRequestError } from "../services/apiClient";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import type { UsuarioActivo } from "../types";
import { useAuth } from "../contexts/AuthContext";
import UiSelect from "../components/ui/UiSelect";
import SearchInput from "../components/ui/SearchInput";
import TablePagination from "../components/ui/TablePagination";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import { Eye } from "lucide-react";

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
      MOVIMIENTO: { clase: "bg-[#e6f7ff] text-[#0066cc]", icono: "fa-arrows-rotate", texto: "Movimiento" },
      PEDIDO: { clase: "bg-[#f0f9ff] text-[#0284c7]", icono: "fa-shopping-cart", texto: "Pedido" },
      BAJA: { clase: "bg-[#fff1f2] text-[#e11d48]", icono: "fa-trash", texto: "Baja" },
      CREAR_PRODUCTO: { clase: "bg-[#f0fdf4] text-[#16a34a]", icono: "fa-plus", texto: "Crear Producto" },
      MODIFICAR_PRODUCTO: { clase: "bg-[#fef3c7] text-[#d97706]", icono: "fa-edit", texto: "Modificar Producto" },
      ELIMINAR_PRODUCTO: { clase: "bg-[#fef2f2] text-[#dc2626]", icono: "fa-times", texto: "Eliminar Producto" },
    };
    return (
      badges[accion] ?? {
        clase: "bg-[#e6f7ff] text-[#0066cc]",
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
        <div className="mb-[28px] pb-5 border-b-2 border-[var(--color-border-default)]">
          <h1 className="text-[28px] font-bold text-[var(--color-text-strong)] m-0 mb-2 flex items-center gap-3">
            <i className="fa-solid fa-clipboard-list"></i> REGISTRO DE AUDITORÍA
          </h1>
          <p className="text-[14px] text-[var(--color-text-muted)] m-0">
            Historial completo de actividades del sistema
          </p>
        </div>

        <div className="bg-[var(--color-bg-surface)] p-6 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] border border-[var(--color-border-default)]">
          <Alert type="error" title="Acceso denegado">
            {errorMsg || "Se requieren permisos de administrador"}
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <StaggerPage className="w-full">
      <StaggerItem className="mb-[28px] pb-5 border-b-2 border-[var(--color-border-default)]">
        <h1 className="text-[28px] font-bold text-[var(--color-text-strong)] m-0 mb-2 flex items-center gap-3">
          <i className="fa-solid fa-clipboard-list"></i> REGISTRO DE AUDITORÍA
        </h1>
        <p className="text-[14px] text-[var(--color-text-muted)] m-0">
          Historial completo de actividades del sistema
        </p>
      </StaggerItem>

      <StaggerItem className="se-card mb-6 p-6">
        <div className="flex flex-wrap gap-5 items-end">
          <div className="flex flex-col gap-2 flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <label htmlFor="filtroAccion" className="font-semibold text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
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

          <div className="flex flex-col gap-2 flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <label htmlFor="filtroUsuario" className="font-semibold text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
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

          <div className="flex flex-col gap-2 flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <label htmlFor="filtroFechaDesde" className="font-semibold text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
              <i className="fa-solid fa-calendar"></i> Desde
            </label>
            <input
              type="date"
              id="filtroFechaDesde"
              className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[var(--radius-sm)] text-[14px] bg-[var(--color-bg-surface)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_3px_rgba(179,49,49,0.1)] focus:outline-none"
              value={filtros.fechaDesde}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-2 flex-1 min-w-[220px] max-[768px]:min-w-0 max-[768px]:w-full">
            <label htmlFor="filtroFechaHasta" className="font-semibold text-[13px] text-[var(--color-text-muted)] flex items-center gap-1.5">
              <i className="fa-solid fa-calendar"></i> Hasta
            </label>
            <input
              type="date"
              id="filtroFechaHasta"
              className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[var(--radius-sm)] text-[14px] bg-[var(--color-bg-surface)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_3px_rgba(179,49,49,0.1)] focus:outline-none"
              value={filtros.fechaHasta}
              onChange={(e) =>
                setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 items-stretch flex-wrap self-end max-[768px]:w-full max-[768px]:flex-col">
            <button
              type="button"
              id="btnAplicarFiltros"
              className="h-11 px-5 rounded-[var(--radius-sm)] font-semibold text-[14px] cursor-pointer inline-flex items-center gap-2 border-0 text-white bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] shadow-[0_4px_12px_rgba(179,49,49,0.3)] transition-[transform,box-shadow,filter] duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(179,49,49,0.4)] hover:brightness-105 max-[768px]:w-full max-[768px]:justify-center"
              onClick={aplicarFiltros}
            >
              <i className="fa-solid fa-search"></i> Aplicar
            </button>
            <button
              type="button"
              id="btnLimpiarFiltros"
              className="h-11 px-5 rounded-[var(--radius-sm)] font-semibold text-[14px] cursor-pointer inline-flex items-center gap-2 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] transition-[background,border-color] duration-150 hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] max-[768px]:w-full max-[768px]:justify-center"
              onClick={limpiarFiltros}
            >
              <i className="fa-solid fa-eraser"></i> Limpiar
            </button>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem className="flex gap-4 mb-5 flex-wrap max-[768px]:flex-col">
        <div className="se-card flex items-center gap-3 px-5 py-4 text-[14px] text-[var(--color-text-muted)] flex-1 min-w-40">
          <i className="fa-solid fa-list-ol"></i>
          <span>
            <strong>{resumen.total}</strong> registros
          </span>
        </div>
        <div className="se-card flex items-center gap-3 px-5 py-4 text-[14px] text-[var(--color-text-muted)] flex-1 min-w-40">
          <i className="fa-solid fa-calendar-days"></i>
          <span>{resumen.rangoFechas}</span>
        </div>
        <div className="se-card flex items-center gap-3 px-5 py-4 text-[14px] text-[var(--color-text-muted)] flex-1 min-w-40">
          <i className="fa-solid fa-users"></i>
          <span>
            <strong>{resumen.usuariosUnicos}</strong> usuario
            {resumen.usuariosUnicos !== 1 ? "s" : ""}
          </span>
        </div>
      </StaggerItem>

      <StaggerItem className="se-card p-6">
        {loading && <Spinner label="Cargando auditoría..." />}
        {!loading && errorMsg && (
          <Alert type="error" title="Error al cargar">{errorMsg}</Alert>
        )}
        {!loading && !errorMsg && (
          <>
            <div className="mb-4 flex gap-3 items-center justify-between flex-wrap">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="Buscar en auditoría..."
                ariaLabel="Buscar en auditoría"
                maxWidthClassName="max-w-[380px]"
              />
              <span className="text-[#718096] text-[13px]">
                Mostrando <strong>{visible.length}</strong> de <strong>{filtrados.length}</strong>
                {totalRegistros ? ` (total remoto: ${totalRegistros})` : ""}
              </span>
            </div>

            <div className="se-table-shell">
              <table className="se-table">
                <thead>
                  <tr>
                    <th className="text-left">Fecha/Hora</th>
                    <th className="text-left">Usuario</th>
                    <th className="text-left">Acción</th>
                    <th className="text-left">Entidad</th>
                    <th className="text-right">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="se-table-empty">
                        No hay registros.
                      </td>
                    </tr>
                  ) : (
                    visible.map((reg) => {
                      const badge = getAccionBadge(reg.accion);
                      return (
                        <tr key={String(reg.id)}>
                          <td className="whitespace-nowrap font-medium text-[var(--color-text-strong)]">{formatearFecha(reg.fecha)}</td>
                          <td className="text-[var(--color-text-strong)]">{reg.usuario_nombre || reg.usuario_id || "—"}</td>
                          <td>
                            <span className={`px-3 py-1.5 rounded-md text-[12px] font-semibold inline-flex items-center gap-1.5 ${badge.clase}`}>
                              <i className={`fa-solid ${badge.icono}`} /> {badge.texto}
                            </span>
                          </td>
                          <td className="text-[var(--color-text-strong)]">{reg.entidad || "—"}</td>
                          <td className="text-right">
                            <button
                              type="button"
                              className="se-icon-btn se-icon-btn--primary"
                              onClick={() => abrirModal(reg)}
                              title="Ver detalle"
                              aria-label="Ver detalle"
                            >
                              <Eye strokeWidth={1.5} size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              totalItems={filtrados.length}
              page={pageSafe}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
              pageSizeOptions={[pageSize]}
              label="registros"
            />
          </>
        )}
      </StaggerItem>

      {modalOpen && registroSeleccionado && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
          onClick={(e) => e.target === e.currentTarget && cerrarModal()}
        >
          <div className="bg-[var(--color-bg-surface)] rounded-[var(--radius-md)] w-[90%] max-w-[600px] max-h-[80vh] overflow-hidden shadow-[var(--shadow-lg)]">
            <div className="px-6 py-5 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white flex justify-between items-center">
              <h3 className="m-0 text-[18px] flex items-center gap-3">
                <i className="fa-solid fa-info-circle"></i> Detalles de la
                Acción
              </h3>
              <button
                type="button"
                className="bg-white/20 border-0 text-white w-8 h-8 rounded-full cursor-pointer transition-transform duration-200 inline-flex items-center justify-center hover:bg-white/30 hover:rotate-90"
                onClick={cerrarModal}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="p-6 max-h-[calc(80vh-80px)] overflow-y-auto">
              <div className="mb-5">
                <div className="text-[13px] font-bold text-[var(--color-brand-500)] uppercase tracking-wide mb-3 pb-2 border-b-2 border-b-[var(--color-brand-100)] flex items-center gap-2">
                  <i className="fa-solid fa-circle-info"></i> Información
                  General
                </div>
                <div className="grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
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
                  <div className="mb-5">
                    <div className="text-[13px] font-bold text-[var(--color-brand-500)] uppercase tracking-wide mb-3 pb-2 border-b-2 border-b-[var(--color-brand-100)] flex items-center gap-2">
                      <i
                        className={`fa-solid ${obtenerIconoAccion(registroSeleccionado.accion)}`}
                      ></i>
                      Datos de la Operación
                    </div>

                    <div className="grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
                      {renderDetallesOperacion(registroSeleccionado)}
                    </div>
                  </div>
                )}

              {registroSeleccionado.entidad && (
                <div className="mt-4 px-4 py-3 bg-[var(--color-bg-soft)] rounded-[var(--radius-sm)] text-[13px] text-[var(--color-text-muted)] flex items-center gap-2">
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
    </StaggerPage>
  );
}

function crearItemDetalleReact(label: string, valor: string) {
  return (
    <div className="px-4 py-3 bg-[var(--color-bg-soft)] rounded-[var(--radius-sm)] border-l-[3px] border-l-[var(--color-border-default)] hover:border-l-[var(--color-brand-500)] transition-[border-color] duration-150" key={`${label}-${valor}`}>
      <div className="font-bold text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest mb-0.5">{label}</div>
      <div className="text-[14px] font-medium text-[var(--color-text-strong)]">{valor}</div>
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
