import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCategorias,
  getProductos,
} from "../services/productosService";
import type { Categoria, Producto } from "../types";
import "../styles/rendimiento.css";
import "../components/ui/ui.css";
import { apiFetch } from "../services/apiClient";
import { showConfirm } from "../utils/notifications";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import { useScaleSerial } from "../hooks/useScaleSerial";
import UiSelect from "../components/ui/UiSelect";

type RegistroRendimiento = {
  id: number;
  ingrediente: string;
  pesoBruto: number;
  pesoNeto: number;
  desperdicio: number;
  rendimiento: number;
  merma: number;
};

type RegistroHistorial = RegistroRendimiento & {
  fecha: string;
  observaciones?: string;
  categoria?: string;
};

export default function RendimientoPage() {
  const queryClient = useQueryClient();
  const [fechaActual, setFechaActual] = useState("");

  const [registrosRendimiento, setRegistrosRendimiento] = useState<
    RegistroRendimiento[]
  >([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [filtroCategoriaHistorial, setFiltroCategoriaHistorial] = useState("");
  const [resultadosSugerencias, setResultadosSugerencias] = useState<
    Producto[]
  >([]);

  const [observaciones, setObservaciones] = useState("");
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<"" | "exito" | "error">("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalIngrediente, setModalIngrediente] = useState("");
  const [modalPesoBruto, setModalPesoBruto] = useState("");
  const [modalPesoNeto, setModalPesoNeto] = useState("");

  const scale = useScaleSerial({ baudRate: 9600 });

  const productosQuery = useQuery<Producto[]>({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    refetchInterval: 45_000,
  });

  const categoriasQuery = useQuery<Categoria[]>({
    queryKey: queryKeys.categorias,
    queryFn: getCategorias,
    refetchInterval: 60_000,
  });

  const historialQuery = useQuery<RegistroHistorial[]>({
    queryKey: queryKeys.rendimientosHistorial,
    queryFn: async () => {
      const json = await apiFetch<{ success?: boolean; error?: string; data?: RegistroHistorial[] }>("/rendimientos?limit=50");

      if (!json.success) {
        throw new Error(json.error || "Error cargando historial");
      }

      return Array.isArray(json.data) ? json.data : [];
    },
    refetchInterval: 60_000,
  });

  const eliminarHistorialMutation = useMutation({
    mutationFn: async (id: number) => {
      const json = await apiFetch<{ success?: boolean; error?: string }>(`/rendimientos?id=${id}`, { method: "DELETE" });

      if (!json.success) {
        throw new Error(json.error || "Error al eliminar");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.rendimientosHistorial });
      broadcastQueryInvalidation(queryKeys.rendimientosHistorial);
    },
  });

  const guardarAnalisisMutation = useMutation({
    mutationFn: async (payload: Array<RegistroRendimiento & { fecha: string; observaciones: string }>) => {
      const json = await apiFetch<{ success?: boolean; error?: string }>("/rendimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        offlineQueue: {
          enabled: true,
          queuedMessage: "El análisis queda en cola y se sincronizará cuando vuelva la conexión.",
        },
      });

      if (!json.success) {
        throw new Error(json.error || "Error desconocido");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.rendimientosHistorial });
      broadcastQueryInvalidation(queryKeys.rendimientosHistorial);
    },
  });

  const productosDisponibles = productosQuery.data ?? [];
  const categoriasDisponibles = categoriasQuery.data ?? [];
  const historialRendimiento = historialQuery.data ?? [];
  const loadingHistorial = historialQuery.isLoading;

  useEffect(() => {
    setFechaActual(
      new Date().toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    if (historialQuery.error instanceof Error) {
      console.error("Error API historial:", historialQuery.error);
      mostrarMensaje("Error cargando historial", "error");
    }
  }, [historialQuery.error]);

  useEffect(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto || texto.length < 2) {
      setResultadosSugerencias([]);
      return;
    }

    const sugerencias = productosDisponibles
      .filter((p) => {
        const nombre = String(p.nombre ?? "").toLowerCase();
        const categoriaNombre = String(
          (p as any).categoria_nombre ?? p.categoria?.nombre ?? "",
        ).toLowerCase();
        return nombre.includes(texto) || categoriaNombre.includes(texto);
      })
      .slice(0, 8);

    setResultadosSugerencias(sugerencias);
  }, [busqueda, productosDisponibles]);

  function mostrarMensaje(texto: string, tipo: "exito" | "error") {
    setMensajeEstado(texto);
    setMensajeTipo(tipo);

    window.setTimeout(() => {
      setMensajeEstado("");
      setMensajeTipo("");
    }, 3000);
  }

  function abrirModal() {
    setModalIngrediente("");
    setModalPesoBruto("");
    setModalPesoNeto("");
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
  }

  const calculoModal = useMemo(() => {
    const pesoBruto = parseFloat(modalPesoBruto) || 0;
    const pesoNeto = parseFloat(modalPesoNeto) || 0;

    const desperdicio = Math.max(0, pesoBruto - pesoNeto);
    const rendimiento = pesoBruto > 0 ? (pesoNeto / pesoBruto) * 100 : 0;
    const merma = pesoBruto > 0 ? (desperdicio / pesoBruto) * 100 : 0;

    return { desperdicio, rendimiento, merma };
  }, [modalPesoBruto, modalPesoNeto]);

  function confirmarRegistro() {
    const ingrediente = modalIngrediente.trim();
    const pesoBruto = parseFloat(modalPesoBruto);
    const pesoNeto = parseFloat(modalPesoNeto);

    if (!ingrediente) {
      mostrarMensaje("Introduce el nombre del ingrediente", "error");
      return;
    }
    if (Number.isNaN(pesoBruto) || pesoBruto <= 0) {
      mostrarMensaje("Introduce un peso bruto válido", "error");
      return;
    }
    if (Number.isNaN(pesoNeto) || pesoNeto < 0) {
      mostrarMensaje("Introduce un peso neto válido", "error");
      return;
    }
    if (pesoNeto > pesoBruto) {
      mostrarMensaje(
        "El peso neto no puede ser mayor que el peso bruto",
        "error",
      );
      return;
    }

    const desperdicio = pesoBruto - pesoNeto;
    const rendimiento = (pesoNeto / pesoBruto) * 100;
    const merma = (desperdicio / pesoBruto) * 100;

    const nuevo: RegistroRendimiento = {
      id: Date.now(),
      ingrediente,
      pesoBruto,
      pesoNeto,
      desperdicio,
      rendimiento,
      merma,
    };

    setRegistrosRendimiento((prev) => [...prev, nuevo]);
    setModalOpen(false);
    mostrarMensaje(
      `${ingrediente} añadido — Rendimiento: ${rendimiento.toFixed(1)}%`,
      "exito",
    );
  }

  function eliminarRegistro(index: number) {
    setRegistrosRendimiento((prev) => {
      const copia = [...prev];
      const reg = copia[index];
      copia.splice(index, 1);

      if (reg) {
        mostrarMensaje(`${reg.ingrediente} eliminado`, "exito");
      }

      return copia;
    });
  }

  async function eliminarRegistroHistorial(id: number) {
    const confirmado = await showConfirm({
      title: "Eliminar registro",
      message: "¿Estás seguro de eliminar este registro del historial?",
      confirmLabel: "Eliminar",
      variant: "danger",
      icon: "fa-solid fa-trash",
    });
    if (!confirmado) return;

    try {
      await eliminarHistorialMutation.mutateAsync(id);
      mostrarMensaje("Registro eliminado", "exito");
    } catch (e) {
      console.error(e);
      mostrarMensaje("Error de red al eliminar", "error");
    }
  }

  async function guardarAnalisis() {
    if (registrosRendimiento.length === 0) {
      mostrarMensaje("No hay registros para guardar", "error");
      return;
    }

    const fechaHoy = new Date().toISOString().split("T")[0];

    const payload = registrosRendimiento.map((reg) => ({
      ...reg,
      fecha: fechaHoy,
      observaciones,
    }));

    try {
      await guardarAnalisisMutation.mutateAsync(payload);

      mostrarMensaje("✅ Análisis guardado en la nube correctamente", "exito");
      setRegistrosRendimiento([]);
      setObservaciones("");
    } catch (e) {
      console.error("Error guardando:", e);
      mostrarMensaje(
        `Error al guardar en base de datos: ${e instanceof Error ? e.message : "desconocido"}`,
        "error",
      );
    }
  }

  function limpiarTodo() {
    setRegistrosRendimiento([]);
    mostrarMensaje("Registros limpiados", "exito");
  }

  function imprimir() {
    window.print();
  }

  function seleccionarProductoMaster(nombre: string) {
    setModalIngrediente(nombre);
    setModalPesoBruto("");
    setModalPesoNeto("");
    setBusquedаInterna("");
    setResultadosSugerencias([]);
    setModalOpen(true);
  }

  function setBusquedаInterna(value: string) {
    setBusqueda(value);
  }

  const registrosFiltradosHistorial = useMemo(() => {
    let filtrados = [...historialRendimiento];
    const texto = busqueda.toLowerCase().trim();

    if (texto) {
      filtrados = filtrados.filter((item) =>
        String(item.ingrediente ?? "")
          .toLowerCase()
          .includes(texto),
      );
    }

    if (filtroCategoriaHistorial) {
      filtrados = filtrados.filter(
        (item) =>
          String(item.categoria ?? "").toLowerCase() ===
          filtroCategoriaHistorial.toLowerCase(),
      );
    }

    if (filtroCategoria) {
      filtrados = filtrados.filter((item) => {
        const prod = productosDisponibles.find(
          (p) =>
            String(p.nombre).toLowerCase() ===
            String(item.ingrediente).toLowerCase(),
        );
        const nombreCat = String(prod?.categoria?.nombre ?? "").toLowerCase();
        return !filtroCategoria || nombreCat === filtroCategoria.toLowerCase();
      });
    }

    return filtrados;
  }, [
    historialRendimiento,
    busqueda,
    filtroCategoria,
    filtroCategoriaHistorial,
    productosDisponibles,
  ]);

  const totalesActuales = useMemo(() => {
    const pesoBruto = registrosRendimiento.reduce(
      (sum, r) => sum + r.pesoBruto,
      0,
    );
    const pesoNeto = registrosRendimiento.reduce(
      (sum, r) => sum + r.pesoNeto,
      0,
    );
    const desperdicio = registrosRendimiento.reduce(
      (sum, r) => sum + r.desperdicio,
      0,
    );
    const rendimiento = pesoBruto > 0 ? (pesoNeto / pesoBruto) * 100 : 0;
    const merma = pesoBruto > 0 ? (desperdicio / pesoBruto) * 100 : 0;

    return { pesoBruto, pesoNeto, desperdicio, rendimiento, merma };
  }, [registrosRendimiento]);

  const estadisticas = useMemo(() => {
    const todos = [...registrosRendimiento, ...historialRendimiento];
    const total = todos.length;

    const rendimientoMedio =
      total > 0
        ? todos.reduce((sum, r) => sum + Number(r.rendimiento ?? 0), 0) / total
        : 0;

    const mermaMedia =
      total > 0
        ? todos.reduce((sum, r) => sum + Number(r.merma ?? 0), 0) / total
        : 0;

    const desperdicioTotal = todos.reduce(
      (sum, r) => sum + Number(r.desperdicio ?? 0),
      0,
    );

    return {
      ingredientes: total,
      rendimientoMedio,
      mermaMedia,
      desperdicioTotal,
    };
  }, [registrosRendimiento, historialRendimiento]);

  function getClaseRendimiento(valor: number) {
    if (valor >= 75) return "rendimiento-alto";
    if (valor >= 50) return "rendimiento-medio";
    return "rendimiento-bajo";
  }

  function getClaseMerma(valor: number) {
    if (valor >= 40) return "rendimiento-bajo";
    if (valor >= 25) return "rendimiento-medio";
    return "rendimiento-alto";
  }

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
      <div
        className="header-rendimiento"
        data-print-date={new Date().toLocaleString("es-ES")}
      >
        <div>
          <h1 className="titulo-rendimiento">
            <i className="fa-solid fa-chart-pie"></i> Rendimiento
          </h1>
          <p className="subtitulo">
            Toda materia prima susceptible de manipulación o preelaboración
            tendrá una merma y un rendimiento real
          </p>
        </div>

        <div className="acciones-header-rend">
          <div className="info-fecha">
            <i className="fa-solid fa-calendar"></i>
            <span>{fechaActual}</span>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#4a5568" }}>
              Báscula:{" "}
              <strong>
                {scale.weightKg == null ? "—" : `${scale.weightKg.toFixed(3)} kg`}
              </strong>
            </span>
            {!scale.supported ? (
              <span style={{ fontSize: 12, color: "#e53e3e" }}>
                (Web Serial no soportado)
              </span>
            ) : scale.connected ? (
              <button
                type="button"
                className="btn-secundario-rend"
                onClick={scale.disconnect}
                style={{ padding: "8px 10px" }}
              >
                <i className="fa-solid fa-plug-circle-xmark"></i> Desconectar
              </button>
            ) : (
              <button
                type="button"
                className="btn-secundario-rend"
                onClick={scale.connect}
                style={{ padding: "8px 10px" }}
              >
                <i className="fa-solid fa-plug"></i> Conectar báscula
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn-secundario-rend"
            onClick={imprimir}
          >
            <i className="fa-solid fa-print"></i> Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="stats-container-rend">
        <div className="stat-card-rend stat-ingredientes">
          <div className="stat-icon-rend">
            <i className="fa-solid fa-carrot"></i>
          </div>
          <div className="stat-info-rend">
            <span className="stat-label-rend">Ingredientes Analizados</span>
            <span className="stat-valor-rend">{estadisticas.ingredientes}</span>
          </div>
        </div>

        <div className="stat-card-rend stat-rendimiento-avg">
          <div className="stat-icon-rend">
            <i className="fa-solid fa-arrow-trend-up"></i>
          </div>
          <div className="stat-info-rend">
            <span className="stat-label-rend">Rendimiento Medio</span>
            <span className="stat-valor-rend">
              {estadisticas.rendimientoMedio.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="stat-card-rend stat-merma-avg">
          <div className="stat-icon-rend">
            <i className="fa-solid fa-arrow-trend-down"></i>
          </div>
          <div className="stat-info-rend">
            <span className="stat-label-rend">Merma Media</span>
            <span className="stat-valor-rend">
              {estadisticas.mermaMedia.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="stat-card-rend stat-desperdicio-total">
          <div className="stat-icon-rend">
            <i className="fa-solid fa-trash-can"></i>
          </div>
          <div className="stat-info-rend">
            <span className="stat-label-rend">Desperdicio Total</span>
            <span className="stat-valor-rend">
              {estadisticas.desperdicioTotal.toFixed(2)} kg
            </span>
          </div>
        </div>
      </div>

      <div className="panel-registro-rend">
        <div className="controles-registro-rend">
          <div className="grupo-herramientas-izq">
            <div className="campo-busqueda-rend">
              <i className="fa-solid fa-search icono-busqueda"></i>
              <input
                type="text"
                className="input-busqueda-rend"
                placeholder="Buscar ingrediente..."
                aria-label="Buscar ingrediente"
                value={busqueda}
                onChange={(e) => setBusquedаInterna(e.target.value)}
              />
            </div>

            <UiSelect
              value={filtroCategoria}
              onChange={setFiltroCategoria}
              placeholder="Todas las categorías"
              options={[
                { value: "", label: "Todas las categorías" },
                ...categoriasDisponibles.map((cat) => ({ value: cat.nombre, label: cat.nombre })),
              ]}
            />
          </div>

          <div className="filtros-rend">
            <button
              type="button"
              className="btn-nuevo-rend"
              onClick={abrirModal}
            >
              <i className="fa-solid fa-plus"></i> Nuevo Análisis
            </button>
          </div>
        </div>

        <div
          className={`resultados-busqueda-rend ${resultadosSugerencias.length === 0 ? "oculto" : ""}`}
        >
          {resultadosSugerencias.length > 0 && (
            <>
              <div
                style={{
                  padding: "10px 15px",
                  background: "#f8fafc",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#718096",
                  borderBottom: "2px solid #edf2f7",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Sugerencias del Maestro de Productos
              </div>

              {resultadosSugerencias.map((p) => (
                <div
                  key={String(p.id)}
                  className="resultado-sugerencia-rend"
                  onClick={() => seleccionarProductoMaster(p.nombre)}
                >
                  <div className="prod-nombre">
                    <i
                      className="fa-solid fa-plus-circle"
                      style={{ color: "#38a169", marginRight: "8px" }}
                    ></i>
                    {p.nombre}
                  </div>
                  <div className="prod-meta">
                    <span className="prod-tag">
                      {(p as any).categoria_nombre ||
                        p.categoria?.nombre ||
                        "General"}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="panel-tabla-rend">
        <h3 className="titulo-seccion-rend">
          <i className="fa-solid fa-table"></i> Registro de Rendimiento Actual
        </h3>

        <div className="tabla-wrapper-rend">
          <table className="tabla-rendimiento">
            <caption className="visually-hidden">
              Tabla de análisis de rendimiento de ingredientes
            </caption>
            <thead>
              <tr>
                <th>Ingrediente</th>
                <th>Peso Bruto (kg)</th>
                <th>Peso Neto (kg)</th>
                <th>Desperdicio (kg)</th>
                <th>% Total</th>
                <th>% Rendimiento</th>
                <th>% Merma</th>
                <th>Acción</th>
              </tr>
            </thead>

            <tbody>
              {registrosRendimiento.length === 0 ? (
                <tr className="fila-vacia-rend">
                  <td colSpan={8}>
                    <div className="mensaje-vacio-rend">
                      <i className="fa-solid fa-inbox"></i>
                      <p>No hay registros de rendimiento</p>
                      <small>Haz clic en "Nuevo Análisis" para comenzar</small>
                    </div>
                  </td>
                </tr>
              ) : (
                registrosRendimiento.map((reg, index) => {
                  const porcTotal =
                    totalesActuales.pesoBruto > 0
                      ? (reg.pesoBruto / totalesActuales.pesoBruto) * 100
                      : 0;

                  return (
                    <tr key={reg.id}>
                      <td>
                        <strong>{reg.ingrediente}</strong>
                      </td>
                      <td>{reg.pesoBruto.toFixed(3)}</td>
                      <td>{reg.pesoNeto.toFixed(3)}</td>
                      <td>{reg.desperdicio.toFixed(3)}</td>
                      <td>{porcTotal.toFixed(1)}%</td>
                      <td className={getClaseRendimiento(reg.rendimiento)}>
                        {reg.rendimiento.toFixed(1)}%
                      </td>
                      <td className={getClaseMerma(reg.merma)}>
                        {reg.merma.toFixed(1)}%
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-eliminar-rend"
                          title="Eliminar registro"
                          onClick={() => eliminarRegistro(index)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            <tfoot
              className={registrosRendimiento.length === 0 ? "oculto" : ""}
            >
              <tr className="fila-total-rend">
                <td>
                  <strong>TOTALES</strong>
                </td>
                <td className="total-valor-rend">
                  {totalesActuales.pesoBruto.toFixed(3)}
                </td>
                <td className="total-valor-rend">
                  {totalesActuales.pesoNeto.toFixed(3)}
                </td>
                <td className="total-valor-rend">
                  {totalesActuales.desperdicio.toFixed(3)}
                </td>
                <td className="total-valor-rend">100%</td>
                <td className="total-valor-rend">
                  {totalesActuales.rendimiento.toFixed(1)}%
                </td>
                <td className="total-valor-rend">
                  {totalesActuales.merma.toFixed(1)}%
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="panel-acciones-rend">
        <div className="campo-observaciones-rend">
          <label
            className="label-observaciones-rend"
            htmlFor="textareaObservacionesRend"
          >
            <i className="fa-solid fa-note-sticky"></i> Observaciones
          </label>
          <textarea
            id="textareaObservacionesRend"
            className="textarea-observaciones-rend"
            placeholder="Añade notas sobre este análisis de rendimiento (opcional)..."
            rows={3}
            aria-label="Observaciones del análisis"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        <div className="botones-finales-rend">
          <button
            type="button"
            className="btn-accion-rend btn-cancelar-rend"
            onClick={limpiarTodo}
            disabled={registrosRendimiento.length === 0}
          >
            <i className="fa-solid fa-xmark"></i> Limpiar Todo
          </button>

          <button
            type="button"
            className="btn-accion-rend btn-guardar-rend"
            onClick={guardarAnalisis}
            disabled={registrosRendimiento.length === 0}
          >
            <i className="fa-solid fa-save"></i> GUARDAR ANÁLISIS
          </button>
        </div>
      </div>

      <div className={`mensaje-estado-rend ${mensajeTipo}`}>
        {mensajeEstado}
      </div>

      <div className="panel-historial-rend">
        <div className="header-historial-rend">
          <h3 className="titulo-seccion-rend">
            <i className="fa-solid fa-clock-rotate-left"></i> Historial de
            Análisis
          </h3>

          <div className="filtros-historial-rend">
            <UiSelect
              value={filtroCategoriaHistorial}
              onChange={setFiltroCategoriaHistorial}
              placeholder="Todas las categorías"
              options={[
                { value: "", label: "Todas las categorías" },
                ...categoriasDisponibles.map((cat) => ({ value: cat.nombre, label: cat.nombre })),
              ]}
            />
          </div>
        </div>

        <div className="contenedor-historial-rend">
          {loadingHistorial ? (
            <p style={{ textAlign: "center", color: "black", padding: "20px" }}>
              Cargando historial...
            </p>
          ) : registrosFiltradosHistorial.length === 0 ? (
            <p style={{ textAlign: "center", color: "black", padding: "20px" }}>
              El historial de análisis aparecerá aquí
            </p>
          ) : (
            registrosFiltradosHistorial.map((item) => {
              const claseRend =
                item.rendimiento >= 75 ? "badge-rendimiento" : "";
              const claseMerma = item.merma >= 30 ? "badge-merma" : "";

              return (
                <div key={item.id} className="historial-item-rend">
                  <div className="historial-info-rend">
                    <span className="historial-nombre-rend">
                      {item.ingrediente}
                    </span>
                    <span className="historial-detalle-rend">
                      {item.fecha} · Bruto: {Number(item.pesoBruto).toFixed(3)}{" "}
                      kg → Neto: {Number(item.pesoNeto).toFixed(3)} kg
                      {item.observaciones ? ` · ${item.observaciones}` : ""}
                    </span>
                  </div>

                  <div className="historial-valores-rend">
                    <span className={`historial-badge-rend ${claseRend}`}>
                      <i className="fa-solid fa-arrow-up"></i>{" "}
                      {Number(item.rendimiento).toFixed(1)}%
                    </span>
                    <span className={`historial-badge-rend ${claseMerma}`}>
                      <i className="fa-solid fa-arrow-down"></i>{" "}
                      {Number(item.merma).toFixed(1)}%
                    </span>
                    <button
                      type="button"
                      className="btn-eliminar-rend"
                      title="Eliminar del historial"
                      onClick={() => eliminarRegistroHistorial(item.id)}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div
        className={`modal-overlay-rend ${modalOpen ? "" : "oculto"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrarModal();
        }}
      >
        <div className="modal-contenido-rend">
          <h3>
            <i className="fa-solid fa-chart-pie"></i>
            Análisis de Rendimiento
          </h3>

          <p className="modal-ingrediente-nombre">
            {modalIngrediente || "Nuevo ingrediente"}
          </p>

          <div className="modal-campos-rend">
            <div className="modal-campo-rend">
              <label htmlFor="modalInputIngrediente">Ingrediente:</label>
              <input
                type="text"
                id="modalInputIngrediente"
                className="modal-input-rend"
                placeholder="Nombre del ingrediente..."
                value={modalIngrediente}
                onChange={(e) => setModalIngrediente(e.target.value)}
              />
            </div>

            <div className="modal-campo-rend">
              <label htmlFor="modalInputPesoBruto">Peso Bruto (kg):</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  id="modalInputPesoBruto"
                  className="modal-input-rend"
                  min="0.001"
                  step="0.001"
                  placeholder="0.000"
                  value={modalPesoBruto}
                  onChange={(e) => setModalPesoBruto(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-modal-rend"
                  onClick={() => {
                    const kg = scale.captureKg();
                    if (kg != null) setModalPesoBruto(String(kg.toFixed(3)));
                  }}
                  disabled={!scale.connected || scale.weightKg == null}
                  title="Usar lectura actual de la báscula"
                  style={{ padding: "10px 12px" }}
                >
                  <i className="fa-solid fa-scale-balanced"></i>
                </button>
              </div>
            </div>

            <div className="modal-campo-rend">
              <label htmlFor="modalInputPesoNeto">Peso Neto (kg):</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="number"
                  id="modalInputPesoNeto"
                  className="modal-input-rend"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={modalPesoNeto}
                  onChange={(e) => setModalPesoNeto(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-modal-rend"
                  onClick={() => {
                    const kg = scale.captureKg();
                    if (kg != null) setModalPesoNeto(String(kg.toFixed(3)));
                  }}
                  disabled={!scale.connected || scale.weightKg == null}
                  title="Usar lectura actual de la báscula"
                  style={{ padding: "10px 12px" }}
                >
                  <i className="fa-solid fa-scale-balanced"></i>
                </button>
              </div>
            </div>

            <div className="modal-resultados-rend">
              <div className="modal-resultado-item">
                <span className="resultado-label">Desperdicio:</span>
                <span className="resultado-valor">
                  {calculoModal.desperdicio.toFixed(3)} kg
                </span>
              </div>
              <div className="modal-resultado-item">
                <span className="resultado-label">% Rendimiento:</span>
                <span
                  className={`resultado-valor ${getClaseRendimiento(calculoModal.rendimiento)}`}
                >
                  {calculoModal.rendimiento.toFixed(1)}%
                </span>
              </div>
              <div className="modal-resultado-item">
                <span className="resultado-label">% Merma:</span>
                <span className="resultado-valor resultado-merma">
                  {calculoModal.merma.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="modal-botones-rend">
            <button
              type="button"
              className="btn-modal-rend btn-modal-cancelar-rend"
              onClick={cerrarModal}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-modal-rend btn-modal-confirmar-rend"
              onClick={confirmarRegistro}
            >
              Añadir Registro
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
