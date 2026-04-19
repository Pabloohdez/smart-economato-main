import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCategorias,
  getProductos,
} from "../services/productosService";
import type { Categoria, Producto } from "../types";
import { apiFetch } from "../services/apiClient";
import { showConfirm } from "../utils/notifications";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import { useScaleSerial } from "../hooks/useScaleSerial";
import UiSelect from "../components/ui/UiSelect";
import SearchInput from "../components/ui/SearchInput";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import { Trash2 } from "lucide-react";

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

  const productosDisponibles = useMemo(
    () => productosQuery.data ?? [],
    [productosQuery.data],
  );
  const categoriasDisponibles = useMemo(
    () => categoriasQuery.data ?? [],
    [categoriasQuery.data],
  );
  const historialRendimiento = useMemo(
    () => historialQuery.data ?? [],
    [historialQuery.data],
  );
  const loadingHistorial = historialQuery.isLoading;
  const lastHistorialErrorRef = useRef<string>("");

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
      const key = historialQuery.error.message || "historial-error";
      if (lastHistorialErrorRef.current !== key) {
        lastHistorialErrorRef.current = key;
        console.error("Error API historial:", historialQuery.error);
        mostrarMensaje("Error cargando historial", "error");
      }
    }
  }, [historialQuery.error]);

  useEffect(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto || texto.length < 2) {
      setResultadosSugerencias((prev) => (prev.length ? [] : prev));
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

    setResultadosSugerencias((prev) => {
      if (prev.length === sugerencias.length && prev.every((p, i) => p.id === sugerencias[i]?.id)) {
        return prev;
      }
      return sugerencias;
    });
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
    if (valor >= 75) return "text-[#38a169] font-bold";
    if (valor >= 50) return "text-[#dd6b20] font-bold";
    return "text-[#e53e3e] font-bold";
  }

  function getClaseMerma(valor: number) {
    if (valor >= 40) return "text-[#e53e3e] font-bold";
    if (valor >= 25) return "text-[#dd6b20] font-bold";
    return "text-[#38a169] font-bold";
  }

  return (
    <StaggerPage className="max-w-[1400px] mx-auto w-full">
      <StaggerItem
        className="flex justify-between items-start mb-[25px] flex-wrap gap-4 max-[768px]:flex-col"
        data-print-date={new Date().toLocaleString("es-ES")}
      >
        <div>
          <h1 className="text-[1.8rem] font-extrabold text-[var(--color-text-strong)] m-0 mb-1 flex items-center gap-3 max-[768px]:text-[1.4rem]">
            <i className="fa-solid fa-chart-pie"></i> Rendimiento
          </h1>
          <p className="text-[14px] text-[var(--color-text-muted)] m-0 italic">
            Toda materia prima susceptible de manipulación o preelaboración
            tendrá una merma y un rendimiento real
          </p>
        </div>

        <div className="flex gap-4 items-center flex-wrap max-[768px]:w-full max-[768px]:flex-col max-[768px]:items-stretch">
          <div className="flex items-center gap-2 bg-[var(--color-bg-surface)] px-4 py-2.5 rounded-xl text-[var(--color-text-muted)] text-[14px] border border-[var(--color-border-default)] shadow-[var(--shadow-sm)] max-[768px]:justify-center">
            <i className="fa-solid fa-calendar"></i>
            <span>{fechaActual}</span>
          </div>

          <div className="flex gap-2.5 items-center flex-wrap max-[768px]:justify-center">
            <span className="text-[12px] text-[#4a5568]">
              Báscula:{" "}
              <strong>
                {scale.weightKg == null ? "—" : `${scale.weightKg.toFixed(3)} kg`}
              </strong>
            </span>
            {!scale.supported ? (
              <span className="text-[12px] text-[#e53e3e]">
                (Web Serial no soportado)
              </span>
            ) : scale.connected ? (
              <button
                type="button"
                className="bg-[linear-gradient(135deg,#334155_0%,#1f2937_100%)] text-white border-0 px-[18px] py-2.5 rounded-xl font-bold text-[14px] cursor-pointer shadow-[0_4px_12px_rgba(31,41,55,0.24)] transition-[transform,box-shadow] duration-200 inline-flex items-center gap-2 whitespace-nowrap hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(31,41,55,0.32)]"
                onClick={scale.disconnect}
              >
                <i className="fa-solid fa-plug-circle-xmark"></i> Desconectar
              </button>
            ) : (
              <button
                type="button"
                className="bg-[linear-gradient(135deg,#334155_0%,#1f2937_100%)] text-white border-0 px-[18px] py-2.5 rounded-xl font-bold text-[14px] cursor-pointer shadow-[0_4px_12px_rgba(31,41,55,0.24)] transition-[transform,box-shadow] duration-200 inline-flex items-center gap-2 whitespace-nowrap hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(31,41,55,0.32)]"
                onClick={scale.connect}
              >
                <i className="fa-solid fa-plug"></i> Conectar báscula
              </button>
            )}
          </div>

          <button
            type="button"
            className="bg-[linear-gradient(135deg,#334155_0%,#1f2937_100%)] text-white border-0 px-[18px] py-2.5 rounded-xl font-bold text-[14px] cursor-pointer shadow-[0_4px_12px_rgba(31,41,55,0.24)] transition-[transform,box-shadow] duration-200 inline-flex items-center gap-2 whitespace-nowrap hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(31,41,55,0.32)]"
            onClick={imprimir}
          >
            <i className="fa-solid fa-print"></i> Imprimir / PDF
          </button>
        </div>
      </StaggerItem>

      <StaggerItem className="grid grid-cols-4 gap-4 mb-[25px] max-[768px]:grid-cols-2 max-[480px]:grid-cols-1">
        <div className="bg-[var(--color-bg-surface)] rounded-[14px] p-5 flex items-center gap-4 shadow-[var(--shadow-sm)] border border-black/5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]">
          <div className="w-[50px] h-[50px] rounded-xl flex items-center justify-center text-[1.3rem] flex-shrink-0 bg-[#ebf8ff] text-[#3182ce]">
            <i className="fa-solid fa-carrot"></i>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Ingredientes Analizados</span>
            <span className="text-[1.5rem] font-extrabold text-[var(--color-text-strong)]">{estadisticas.ingredientes}</span>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] rounded-[14px] p-5 flex items-center gap-4 shadow-[var(--shadow-sm)] border border-black/5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]">
          <div className="w-[50px] h-[50px] rounded-xl flex items-center justify-center text-[1.3rem] flex-shrink-0 bg-[#f0fff4] text-[#38a169]">
            <i className="fa-solid fa-arrow-trend-up"></i>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Rendimiento Medio</span>
            <span className="text-[1.5rem] font-extrabold text-[var(--color-text-strong)]">
              {estadisticas.rendimientoMedio.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] rounded-[14px] p-5 flex items-center gap-4 shadow-[var(--shadow-sm)] border border-black/5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]">
          <div className="w-[50px] h-[50px] rounded-xl flex items-center justify-center text-[1.3rem] flex-shrink-0 bg-[#fff5f5] text-[#e53e3e]">
            <i className="fa-solid fa-arrow-trend-down"></i>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Merma Media</span>
            <span className="text-[1.5rem] font-extrabold text-[var(--color-text-strong)]">
              {estadisticas.mermaMedia.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] rounded-[14px] p-5 flex items-center gap-4 shadow-[var(--shadow-sm)] border border-black/5 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.08)]">
          <div className="w-[50px] h-[50px] rounded-xl flex items-center justify-center text-[1.3rem] flex-shrink-0 bg-[#fffaf0] text-[#dd6b20]">
            <Trash2 strokeWidth={1.5} size={22} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Desperdicio Total</span>
            <span className="text-[1.5rem] font-extrabold text-[var(--color-text-strong)]">
              {estadisticas.desperdicioTotal.toFixed(2)} kg
            </span>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem className="se-card p-[25px] mb-[25px] w-full box-border">
        <div className="flex justify-between items-center gap-5 max-[768px]:flex-col max-[768px]:items-stretch">
          <div className="flex gap-4 flex-1 items-center max-[768px]:flex-col max-[768px]:items-stretch">
            <SearchInput
              value={busqueda}
              onChange={setBusquedаInterna}
              placeholder="Buscar ingrediente..."
              ariaLabel="Buscar ingrediente"
              className="flex-1"
            />

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

          <div className="flex gap-2.5 items-center flex-wrap max-[768px]:w-full">
            <button
              type="button"
              className="ml-auto bg-[linear-gradient(135deg,#48bb78_0%,#38a169_100%)] text-white border-0 px-6 py-2.5 rounded-xl font-bold text-[14px] cursor-pointer shadow-[0_4px_12px_rgba(56,161,105,0.3)] transition-[transform,box-shadow,filter] duration-200 inline-flex items-center gap-2 whitespace-nowrap hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(56,161,105,0.4)] hover:brightness-105 max-[768px]:w-full max-[768px]:justify-center max-[768px]:ml-0"
              onClick={abrirModal}
            >
              <i className="fa-solid fa-plus"></i> Nuevo Análisis
            </button>
          </div>
        </div>

        <div
          className={`mt-4 max-h-[200px] overflow-y-auto border border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-surface)] ${resultadosSugerencias.length === 0 ? "hidden" : ""}`}
        >
          {resultadosSugerencias.length > 0 && (
            <>
              <div
                className="px-4 py-2.5 bg-[#f8fafc] text-[11px] font-bold text-[#718096] border-b-2 border-b-[#edf2f7] uppercase tracking-wide"
              >
                Sugerencias del Maestro de Productos
              </div>

              {resultadosSugerencias.map((p) => (
                <div
                  key={String(p.id)}
                  className="px-[18px] py-3 cursor-pointer border-b border-b-[#f0f4f8] flex justify-between items-center transition-colors hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-brand-500)] last:border-b-0"
                  onClick={() => seleccionarProductoMaster(p.nombre)}
                >
                  <div className="font-semibold text-[14px]">
                    <i
                      className="fa-solid fa-plus-circle"
                      style={{ color: "#38a169", marginRight: "8px" }}
                    ></i>
                    {p.nombre}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">
                    <span className="bg-[#f1f5f9] px-2 py-0.5 rounded-[10px] font-bold uppercase ml-2.5">
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
      </StaggerItem>

      <StaggerItem className="se-card p-[25px] mb-[25px] w-full box-border">
        <h3 className="text-[1.1rem] font-bold text-[var(--color-text-strong)] m-0 mb-5 flex items-center gap-2.5">
          <i className="fa-solid fa-table"></i> Registro de Rendimiento Actual
        </h3>

        <div className="se-table-shell">
          <table className="se-table">
            <caption className="visually-hidden">
              Tabla de análisis de rendimiento de ingredientes
            </caption>
            <thead>
              <tr>
                <th className="text-left">Ingrediente</th>
                <th className="text-left">Peso Bruto (kg)</th>
                <th className="text-left">Peso Neto (kg)</th>
                <th className="text-left">Desperdicio (kg)</th>
                <th className="text-left">% Total</th>
                <th className="text-left">% Rendimiento</th>
                <th className="text-left">% Merma</th>
                <th className="text-left">Acción</th>
              </tr>
            </thead>

            <tbody>
              {registrosRendimiento.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="text-center py-10 text-[#a0aec0] flex flex-col items-center gap-2">
                      <i className="fa-solid fa-inbox text-[2rem] opacity-50"></i>
                      <p className="m-0 font-semibold">No hay registros de rendimiento</p>
                      <small className="text-[12px]">Haz clic en "Nuevo Análisis" para comenzar</small>
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
                      <td className="text-[var(--color-text-strong)]">
                        <strong>{reg.ingrediente}</strong>
                      </td>
                      <td className="text-[var(--color-text-strong)]">{reg.pesoBruto.toFixed(3)}</td>
                      <td className="text-[var(--color-text-strong)]">{reg.pesoNeto.toFixed(3)}</td>
                      <td className="text-[var(--color-text-strong)]">{reg.desperdicio.toFixed(3)}</td>
                      <td className="text-[var(--color-text-strong)]">{porcTotal.toFixed(1)}%</td>
                      <td className={getClaseRendimiento(reg.rendimiento)}>
                        {reg.rendimiento.toFixed(1)}%
                      </td>
                      <td className={getClaseMerma(reg.merma)}>
                        {reg.merma.toFixed(1)}%
                      </td>
                      <td>
                        <button
                          type="button"
                          className="se-icon-btn se-icon-btn--danger"
                          title="Eliminar registro"
                          onClick={() => eliminarRegistro(index)}
                        >
                          <Trash2 strokeWidth={1.5} size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            <tfoot
              className={registrosRendimiento.length === 0 ? "hidden" : ""}
            >
              <tr className="bg-[linear-gradient(to_right,#f7fafc,var(--color-border-default))]">
                <td className="px-4 py-3 font-bold text-[14px] text-[var(--color-text-strong)] border-t-2 border-t-[var(--color-border-strong)]">
                  <strong>TOTALES</strong>
                </td>
                <td className="px-4 py-3 font-extrabold text-[var(--color-brand-500)] border-t-2 border-t-[var(--color-border-strong)]">
                  {totalesActuales.pesoBruto.toFixed(3)}
                </td>
                <td className="px-4 py-3 font-extrabold text-[var(--color-brand-500)] border-t-2 border-t-[var(--color-border-strong)]">
                  {totalesActuales.pesoNeto.toFixed(3)}
                </td>
                <td className="px-4 py-3 font-extrabold text-[var(--color-brand-500)] border-t-2 border-t-[var(--color-border-strong)]">
                  {totalesActuales.desperdicio.toFixed(3)}
                </td>
                <td className="px-4 py-3 font-extrabold text-[var(--color-brand-500)] border-t-2 border-t-[var(--color-border-strong)]">100%</td>
                <td className="px-4 py-3 font-extrabold text-[var(--color-brand-500)] border-t-2 border-t-[var(--color-border-strong)]">
                  {totalesActuales.rendimiento.toFixed(1)}%
                </td>
                <td className="px-4 py-3 font-extrabold text-[var(--color-brand-500)] border-t-2 border-t-[var(--color-border-strong)]">
                  {totalesActuales.merma.toFixed(1)}%
                </td>
                <td className="px-4 py-3 border-t-2 border-t-[var(--color-border-strong)]"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </StaggerItem>

      <StaggerItem className="se-card p-[25px] mb-[25px] w-full box-border">
        <div>
          <label
            className="font-semibold text-[var(--color-text-muted)] flex items-center gap-2 mb-2"
            htmlFor="textareaObservacionesRend"
          >
            <i className="fa-solid fa-note-sticky"></i> Observaciones
          </label>
          <textarea
            id="textareaObservacionesRend"
            className="w-full px-4 py-3 border border-[var(--color-border-default)] rounded-[10px] text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-200 focus:border-[var(--color-brand-500)] focus:bg-[var(--color-bg-surface)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none resize-y"
            placeholder="Añade notas sobre este análisis de rendimiento (opcional)..."
            rows={3}
            aria-label="Observaciones del análisis"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        <div className="flex gap-3 justify-end mt-5 max-[768px]:flex-col">
          <button
            type="button"
            className="px-7 py-3 rounded-xl font-bold text-[14px] cursor-pointer inline-flex items-center gap-2 transition-opacity bg-[var(--color-border-default)] text-[var(--color-text-muted)] disabled:opacity-60 disabled:cursor-not-allowed max-[768px]:w-full max-[768px]:justify-center"
            onClick={limpiarTodo}
            disabled={registrosRendimiento.length === 0}
          >
            <i className="fa-solid fa-xmark"></i> Limpiar Todo
          </button>

          <button
            type="button"
            className="px-7 py-3 rounded-xl font-bold text-[14px] cursor-pointer inline-flex items-center gap-2 transition-[transform,box-shadow,filter] duration-200 bg-[linear-gradient(135deg,#48bb78_0%,#38a169_100%)] text-white shadow-[0_4px_12px_rgba(56,161,105,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(56,161,105,0.4)] hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed max-[768px]:w-full max-[768px]:justify-center"
            onClick={guardarAnalisis}
            disabled={registrosRendimiento.length === 0}
          >
            <i className="fa-solid fa-save"></i> GUARDAR ANÁLISIS
          </button>
        </div>
      </StaggerItem>

      {mensajeEstado ? (
        <div
          className={`px-5 py-3 rounded-[10px] mb-5 font-semibold border ${
            mensajeTipo === "exito"
              ? "bg-[#f0fff4] text-[#276749] border-[#c6f6d5]"
              : mensajeTipo === "error"
              ? "bg-[#fff5f5] text-[#9b2c2c] border-[#fed7d7]"
              : "bg-transparent border-transparent"
          }`}
        >
          {mensajeEstado}
        </div>
      ) : null}

      <StaggerItem className="se-card p-[25px] mb-[25px] w-full box-border">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4 max-[768px]:flex-col max-[768px]:items-stretch">
          <h3 className="text-[1.1rem] font-bold text-[var(--color-text-strong)] m-0 flex items-center gap-2.5">
            <i className="fa-solid fa-clock-rotate-left"></i> Historial de Análisis
          </h3>

          <div className="flex gap-2.5">
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

        <div className="max-h-[400px] overflow-y-auto">
          {loadingHistorial ? (
            <p className="text-center text-black p-5 m-0">Cargando historial...</p>
          ) : registrosFiltradosHistorial.length === 0 ? (
            <p className="text-center text-black p-5 m-0">El historial de análisis aparecerá aquí</p>
          ) : (
            registrosFiltradosHistorial.map((item) => {
              const claseRend =
                item.rendimiento >= 75
                  ? "bg-[#f0fff4] text-[#38a169]"
                  : "bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]";
              const claseMerma =
                item.merma >= 30
                  ? "bg-[#fff5f5] text-[#e53e3e]"
                  : "bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]";

              return (
                <div
                  key={item.id}
                  className="flex justify-between items-center px-4 py-3 border-b border-b-[#f0f4f8] transition-colors hover:bg-[#fafbfc] last:border-b-0 max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-2.5"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[var(--color-text-strong)]">
                      {item.ingrediente}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-muted)]">
                      {item.fecha} · Bruto: {Number(item.pesoBruto).toFixed(3)} kg → Neto:{" "}
                      {Number(item.pesoNeto).toFixed(3)} kg
                      {item.observaciones ? ` · ${item.observaciones}` : ""}
                    </span>
                  </div>

                  <div className="flex gap-5 items-center max-[768px]:w-full max-[768px]:justify-start">
                    <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${claseRend}`}>
                      <i className="fa-solid fa-arrow-up"></i>{" "}
                      {Number(item.rendimiento).toFixed(1)}%
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${claseMerma}`}>
                      <i className="fa-solid fa-arrow-down"></i>{" "}
                      {Number(item.merma).toFixed(1)}%
                    </span>
                    <button
                      type="button"
                      className="se-icon-btn se-icon-btn--danger"
                      title="Eliminar del historial"
                      onClick={() => eliminarRegistroHistorial(item.id)}
                    >
                      <Trash2 strokeWidth={1.5} size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </StaggerItem>

      <div
        className={`fixed inset-0 bg-black/50 [backdrop-filter:blur(4px)] flex justify-center items-center z-[1000] ${modalOpen ? "" : "hidden"}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrarModal();
        }}
      >
        <div className="bg-[var(--color-bg-surface)] rounded-2xl p-[30px] max-w-[500px] w-[90%] shadow-[0_25px_50px_rgba(0,0,0,0.25)]">
          <h3 className="m-0 mb-5 text-[1.3rem] text-[var(--color-text-strong)] flex items-center gap-2.5">
            <i className="fa-solid fa-chart-pie"></i>
            Análisis de Rendimiento
          </h3>

          <p className="font-semibold text-[var(--color-text-muted)] m-0 mb-5 px-4 py-2.5 bg-[var(--color-bg-soft)] rounded-lg border-l-[3px] border-l-[var(--color-brand-500)]">
            {modalIngrediente || "Nuevo ingrediente"}
          </p>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modalInputIngrediente" className="font-semibold text-[13px] text-[var(--color-text-muted)]">Ingrediente:</label>
              <input
                type="text"
                id="modalInputIngrediente"
                className="px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:border-[var(--color-brand-500)] focus:bg-[var(--color-bg-surface)] focus:shadow-[0_0_0_3px_rgba(179,49,49,0.1)] focus:outline-none"
                placeholder="Nombre del ingrediente..."
                value={modalIngrediente}
                onChange={(e) => setModalIngrediente(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modalInputPesoBruto" className="font-semibold text-[13px] text-[var(--color-text-muted)]">Peso Bruto (kg):</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  id="modalInputPesoBruto"
                  className="flex-1 px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:border-[var(--color-brand-500)] focus:bg-[var(--color-bg-surface)] focus:shadow-[0_0_0_3px_rgba(179,49,49,0.1)] focus:outline-none"
                  min="0.001"
                  step="0.001"
                  placeholder="0.000"
                  value={modalPesoBruto}
                  onChange={(e) => setModalPesoBruto(e.target.value)}
                />
                <button
                  type="button"
                  className="px-3 py-2.5 rounded-[10px] font-bold text-[14px] cursor-pointer transition-opacity bg-[var(--color-border-default)] text-[var(--color-text-muted)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center"
                  onClick={() => {
                    const kg = scale.captureKg();
                    if (kg != null) setModalPesoBruto(String(kg.toFixed(3)));
                  }}
                  disabled={!scale.connected || scale.weightKg == null}
                  title="Usar lectura actual de la báscula"
                >
                  <i className="fa-solid fa-scale-balanced"></i>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="modalInputPesoNeto" className="font-semibold text-[13px] text-[var(--color-text-muted)]">Peso Neto (kg):</label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  id="modalInputPesoNeto"
                  className="flex-1 px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:border-[var(--color-brand-500)] focus:bg-[var(--color-bg-surface)] focus:shadow-[0_0_0_3px_rgba(179,49,49,0.1)] focus:outline-none"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={modalPesoNeto}
                  onChange={(e) => setModalPesoNeto(e.target.value)}
                />
                <button
                  type="button"
                  className="px-3 py-2.5 rounded-[10px] font-bold text-[14px] cursor-pointer transition-opacity bg-[var(--color-border-default)] text-[var(--color-text-muted)] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center"
                  onClick={() => {
                    const kg = scale.captureKg();
                    if (kg != null) setModalPesoNeto(String(kg.toFixed(3)));
                  }}
                  disabled={!scale.connected || scale.weightKg == null}
                  title="Usar lectura actual de la báscula"
                >
                  <i className="fa-solid fa-scale-balanced"></i>
                </button>
              </div>
            </div>

            <div className="bg-[linear-gradient(135deg,#f7fafc_0%,var(--color-border-default)_100%)] p-[18px] rounded-xl flex flex-col gap-2.5 border border-[var(--color-border-default)] mt-1">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[13px] text-[var(--color-text-muted)]">Desperdicio:</span>
                <span className="font-extrabold text-[1.1rem] text-[var(--color-text-strong)]">
                  {calculoModal.desperdicio.toFixed(3)} kg
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[13px] text-[var(--color-text-muted)]">% Rendimiento:</span>
                <span className={`font-extrabold text-[1.1rem] ${getClaseRendimiento(calculoModal.rendimiento)}`}>
                  {calculoModal.rendimiento.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-[13px] text-[var(--color-text-muted)]">% Merma:</span>
                <span className="font-extrabold text-[1.1rem] text-[#e53e3e]">
                  {calculoModal.merma.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              className="flex-1 px-5 py-3 rounded-[10px] font-bold text-[14px] cursor-pointer transition-colors bg-[var(--color-border-default)] text-[var(--color-text-muted)] hover:text-[var(--color-text-strong)]"
              onClick={cerrarModal}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="flex-1 px-5 py-3 rounded-[10px] font-bold text-[14px] cursor-pointer transition-[transform,box-shadow,filter] duration-200 text-white bg-[linear-gradient(135deg,var(--color-brand-500)_0%,#9c2b2b_100%)] shadow-[0_4px_12px_rgba(179,49,49,0.3)] hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(179,49,49,0.4)] hover:brightness-105"
              onClick={confirmarRegistro}
            >
              Añadir Registro
            </button>
          </div>
        </div>
      </div>
    </StaggerPage>
  );
}
