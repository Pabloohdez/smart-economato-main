import { useCallback, useEffect, useMemo, useState } from "react";
import { showConfirm, showNotification } from "../utils/notifications";
import { scanBarcodeFromCamera } from "../utils/barcodeScanner";
import { apiFetch } from "../services/apiClient";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { AlertCircle, CalendarDays, Camera, ClipboardList, Clock3, FileText, History, Mail, Scale, Search, Trash2, Wallet, Wrench } from "lucide-react";
import type { Producto, Categoria, BajaHistorialItem } from "../types";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import UiSelect from "../components/ui/UiSelect";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";

type ProductoBaja = Producto & {
  tipoBaja: "Rotura" | "Caducado" | "Merma" | "Ajuste" | "Otro";
  cantidadBaja: number;
  valorPerdido: number;
  nombreCategoria: string;
};

function formatFechaLargaES(d: Date) {
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatFechaCortaES(iso: string) {
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return { fecha, hora };
}

function claseTipoBaja(tipo: string) {
  const map: Record<string, string> = {
    Rotura: "bg-[#fff5f5] text-[#c53030]",
    Caducado: "bg-[#fffaf0] text-[#dd6b20]",
    Merma: "bg-[#fefcbf] text-[#d69e2e]",
    Ajuste: "bg-[#e6fffa] text-[#319795]",
    Otro: "bg-[var(--color-border-default)] text-[var(--color-text-muted)]",
  };
  return map[tipo] ?? "bg-[var(--color-border-default)] text-[var(--color-text-muted)]";
}

function badgeCaducidad(fechaCaducidad?: string | null) {
  if (!fechaCaducidad) return null;

  const hoy = new Date();
  const cad = new Date(fechaCaducidad);
  const dias = Math.ceil((cad.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  const base = "inline-flex items-center px-3 py-1.5 rounded-lg text-[12px] font-semibold ml-2.5";
  if (dias <= 0) return { text: "CADUCADO", className: `${base} bg-[#fff5f5] text-[#c53030]` };
  if (dias <= 7) return { text: `${dias} días`, className: `${base} bg-[#fff5f5] text-[#c53030]` };
  if (dias <= 30) return { text: `${dias} días`, className: `${base} bg-[#fffaf0] text-[#dd6b20]` };

  return null;
}

export default function BajasPage() {
  // datos base
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [errorDatos, setErrorDatos] = useState("");

  // fecha
  const [fechaActual] = useState(() => formatFechaLargaES(new Date()));

  // stats + historial
  const [stats, setStats] = useState({ roturas: 0, caducados: 0, mermas: 0, valorPerdido: 0 });
  const [historial, setHistorial] = useState<BajaHistorialItem[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState("");
  const [filtroTipoHistorial, setFiltroTipoHistorial] = useState("");

  // búsqueda + filtros
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");
  const [resultadosOpen, setResultadosOpen] = useState(false);
  const [modoCaducados, setModoCaducados] = useState(false);
  const debouncedQ = useDebouncedValue(q, 250);

  // baja actual
  const [productosBaja, setProductosBaja] = useState<ProductoBaja[]>([]);
  const [motivo, setMotivo] = useState("");
  const [mensajeEstado, setMensajeEstado] = useState<{ text: string; color: "green" | "orange" | "red" } | null>(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [modalTipoBaja, setModalTipoBaja] = useState<ProductoBaja["tipoBaja"]>("Rotura");
  const [modalCantidad, setModalCantidad] = useState(1);

  const [confirmando, setConfirmando] = useState(false);

  async function cargarDatos() {
    setLoadingDatos(true);
    setErrorDatos("");
    try {
      const [pJson, cJson] = await Promise.all([
        apiFetch<{ success?: boolean; error?: string; data?: any[] }>("/productos", { headers: { "X-Requested-With": "XMLHttpRequest" } }),
        apiFetch<{ success?: boolean; error?: string; data?: any[] }>("/categorias", { headers: { "X-Requested-With": "XMLHttpRequest" } }),
      ]);

      if (!pJson?.success) throw new Error(pJson?.error || "Error cargando productos");
      if (!cJson?.success) throw new Error(cJson?.error || "Error cargando categorías");

      const prod: Producto[] = (pJson.data ?? []).map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        codigoBarras: p.codigoBarras,
        stock: Number(p.stock ?? 0),
        precio: Number(p.precio ?? 0),
        categoriaId: p.categoriaId ?? p.categoria_id ?? p.categoriaID,
        fechaCaducidad: p.fechaCaducidad ?? p.fecha_caducidad ?? null,
      }));

      const cats: Categoria[] = (cJson.data ?? []).map((c: any) => ({
        id: c.id,
        nombre: c.nombre,
      }));

      setProductos(prod);
      setCategorias(cats);
    } catch (e) {
      console.error(e);
      setErrorDatos("No se pudieron cargar productos o categorías.");
      showNotification("Error de conexión: no se pudieron cargar productos/categorías.", "error");
      setProductos([]);
      setCategorias([]);
    } finally {
      setLoadingDatos(false);
    }
  }

  async function cargarEstadisticasMes() {
    try {
      const hoy = new Date();
      const mes = hoy.getMonth() + 1;
      const anio = hoy.getFullYear();

      const json = await apiFetch<{ success?: boolean; data?: BajaHistorialItem[] }>(`/bajas?mes=${mes}&anio=${anio}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (!json?.success || !Array.isArray(json.data)) {
        setStats({ roturas: 0, caducados: 0, mermas: 0, valorPerdido: 0 });
        return;
      }

      const bajasDelMes: BajaHistorialItem[] = json.data;

      const roturas = bajasDelMes.filter((b) => b.tipoBaja === "Rotura").length;
      const caducados = bajasDelMes.filter((b) => b.tipoBaja === "Caducado").length;
      const mermas = bajasDelMes.filter((b) => b.tipoBaja === "Merma").length;

      const valorPerdido = bajasDelMes.reduce((sum, b: any) => {
        const precio = Number.parseFloat(String(b.producto_precio ?? 0)) || 0;
        const cant = Number.parseInt(String(b.cantidad ?? 0), 10) || 0;
        return sum + precio * cant;
      }, 0);

      setStats({ roturas, caducados, mermas, valorPerdido });
    } catch (e) {
      console.error(e);
      setStats({ roturas: 0, caducados: 0, mermas: 0, valorPerdido: 0 });
    }
  }

  async function cargarHistorialBajas() {
    setLoadingHistorial(true);
    setErrorHistorial("");
    try {
      const hoy = new Date();
      const mes = hoy.getMonth() + 1;
      const anio = hoy.getFullYear();

      const json = await apiFetch<{ success?: boolean; data?: BajaHistorialItem[] }>(`/bajas?mes=${mes}&anio=${anio}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (!json?.success || !Array.isArray(json.data)) {
        setHistorial([]);
        return;
      }

      setHistorial(json.data as BajaHistorialItem[]);
    } catch (e) {
      console.error(e);
      setErrorHistorial("No se pudo cargar el historial de bajas.");
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }

  const recargarBajas = useCallback(async () => {
    await Promise.all([
      cargarDatos(),
      cargarEstadisticasMes(),
      cargarHistorialBajas(),
    ]);
  }, []);

  useEffect(() => {
    void recargarBajas();
  }, [recargarBajas]);

  useEffect(() => {
    const onOnline = () => {
      void recargarBajas();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void recargarBajas();
      }
    };
    const onPageShow = () => {
      void recargarBajas();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [recargarBajas]);

  const resultados = useMemo(() => {
    let list = [...productos];

    const texto = debouncedQ.trim().toLowerCase();
    const categoria = catId;

    if (texto) {
      list = list.filter((p) => {
        const nom = (p.nombre || "").toLowerCase();
        const cb = (p.codigoBarras || "").toLowerCase();
        return nom.includes(texto) || cb.includes(texto);
      });
    }

    if (categoria) {
      list = list.filter((p) => String(p.categoriaId ?? "") === String(categoria));
    }

    if (modoCaducados) {
      const hoy = new Date();
      const proximoMes = new Date(hoy);
      proximoMes.setDate(proximoMes.getDate() + 30);

      list = list.filter((p) => {
        if (!p.fechaCaducidad) return false;
        const cad = new Date(p.fechaCaducidad);
        return cad <= proximoMes;
      });
    }

    return list;
  }, [productos, debouncedQ, catId, modoCaducados]);

  function buscarProductos() {
    // en el JS antiguo buscaba también sin mínimo, aquí lo dejamos simple:
    setResultadosOpen(true);
  }

  async function escanearCodigoBarras() {
    const code = await scanBarcodeFromCamera();
    if (!code) {
      showNotification("No se pudo leer un codigo de barras. Intenta de nuevo.", "warning");
      return;
    }
    setQ(code);
    setModoCaducados(false);
    setResultadosOpen(true);
    showNotification(`Codigo leido: ${code}`, "success");
  }

  function mostrarProductosCaducados() {
    setModoCaducados(true);
    setResultadosOpen(true);
  }

  function seleccionarProducto(p: Producto) {
    // ya existe?
    const ya = productosBaja.some((x) => String(x.id) === String(p.id));
    if (ya) {
      showNotification(
        "Este producto ya está en el registro de bajas. Puedes modificar los datos en la tabla.",
        "warning"
      );
      return;
    }

    if (Number(p.stock ?? 0) <= 0) {
      showNotification("Este producto no tiene stock disponible para dar de baja.", "warning");
      return;
    }

    setProductoSeleccionado(p);
    setModalTipoBaja("Rotura");
    setModalCantidad(1);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
    setProductoSeleccionado(null);
  }

  function confirmarBajaModal() {
    if (!productoSeleccionado) return;

    const stockDisponible = Number(productoSeleccionado.stock ?? 0);
    const cantidad = Number(modalCantidad || 0);

    if (!cantidad || cantidad <= 0) {
      showNotification("Por favor, ingresa una cantidad válida.", "warning");
      return;
    }

    if (cantidad > stockDisponible) {
      showNotification("La cantidad no puede superar el stock disponible.", "warning");
      return;
    }

    const cat = categorias.find((c) => String(c.id) === String(productoSeleccionado.categoriaId ?? ""));
    const nombreCategoria = cat?.nombre ?? "Sin categoría";

    const nuevo: ProductoBaja = {
      ...productoSeleccionado,
      tipoBaja: modalTipoBaja,
      cantidadBaja: cantidad,
      valorPerdido: Number(productoSeleccionado.precio ?? 0) * cantidad,
      nombreCategoria,
    };

    setProductosBaja((prev) => [...prev, nuevo]);

    // limpiar búsqueda como en el JS
    setQ("");
    setResultadosOpen(false);
    setModoCaducados(false);

    cerrarModal();
  }

  async function eliminarProductoBaja(index: number) {
    const ok = await showConfirm("¿Eliminar este producto del registro de bajas?");
    if (!ok) return;

    setProductosBaja((prev) => prev.filter((_, i) => i !== index));
  }

  function setMensaje(text: string, color: "green" | "orange" | "red") {
    setMensajeEstado({ text, color });
    setTimeout(() => setMensajeEstado(null), 5000);
  }

  async function cancelarBaja() {
    const ok = await showConfirm("¿Estás seguro de cancelar este registro de bajas? Se perderán todos los datos.");
    if (!ok) return;

    setProductosBaja([]);
    setMotivo("");
    setMensaje("Registro de bajas cancelado", "orange");
  }

  async function confirmarBaja() {
    if (!productosBaja.length) {
      showNotification("No hay productos para dar de baja", "warning");
      return;
    }

    const totalValor = productosBaja.reduce((sum, p) => sum + p.valorPerdido, 0);

    const ok = await showConfirm(
      `¿Confirmar bajas de ${productosBaja.length} productos con un valor total de ${totalValor.toFixed(2)} €?\n\n` +
        `Esta acción reducirá el stock de los productos seleccionados.`
    );
    if (!ok) return;

    setConfirmando(true);

    let exitosos = 0;
    const errores: string[] = [];

    for (const pb of productosBaja) {
      try {
        const payload = {
          productoId: String(pb.id),
          cantidad: pb.cantidadBaja,
          tipoBaja: pb.tipoBaja,
          motivo: motivo.trim() || "Sin especificar",
        };

        const data = await apiFetch<{ success?: boolean; error?: string }>("/bajas", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify(payload),
        });

        if (data?.success) {
          exitosos++;
        } else {
          errores.push(`${pb.nombre}: ${data?.error || "Error desconocido"}`);
        }
      } catch (e) {
        console.error(e);
        errores.push(`${pb.nombre}: Error de red`);
      }
    }

    setConfirmando(false);

    if (errores.length === 0) {
      setMensaje(`✅ Bajas registradas correctamente: ${exitosos} productos actualizados`, "green");
      setProductosBaja([]);
      setMotivo("");
      await cargarDatos();
      await cargarEstadisticasMes();
      await cargarHistorialBajas();
      showNotification(
        `Bajas registradas exitosamente. Productos afectados: ${exitosos}. Valor total: ${totalValor.toFixed(2)} €.`,
        "success"
      );
      return;
    }

    if (exitosos > 0) {
      setMensaje(`⚠️ Bajas parcialmente completadas: ${exitosos} exitosos, ${errores.length} errores`, "orange");
      setProductosBaja([]);
      setMotivo("");
      await cargarDatos();
      await cargarEstadisticasMes();
      await cargarHistorialBajas();
      showNotification(`⚠️ Resultado mixto: Exitosos: ${exitosos}, Errores: ${errores.length}`, "warning");
      return;
    }

    setMensaje(`❌ Error al registrar bajas: ${errores.length} errores`, "red");
    showNotification(`❌ Error al registrar bajas: ${errores.length} errores`, "error");
  }

  const totalValorBajas = useMemo(() => productosBaja.reduce((sum, p) => sum + p.valorPerdido, 0), [productosBaja]);

  const historialFiltrado = useMemo(() => {
    if (!filtroTipoHistorial) return historial;
    return historial.filter((h) => String(h.tipoBaja) === String(filtroTipoHistorial));
  }, [historial, filtroTipoHistorial]);

  return (
    <StaggerPage>
      {/* HEADER */}
      <StaggerItem>
      <div className="flex justify-between items-center mb-[30px] pb-5 border-b-2 border-[var(--color-border-default)] max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-4">
        <div>
          <h1 className="text-[#c53030] text-[28px] font-bold m-0 mb-2 flex items-center gap-3">
            <AlertCircle className="h-7 w-7" /> GESTIÓN DE BAJAS
          </h1>
          <p className="text-[#50596D] text-[14px] m-0">Registra roturas, caducados, mermas y ajustes de inventario</p>
        </div>
        <div className="bg-[var(--color-bg-soft)] px-5 py-3 rounded-[10px] text-[var(--color-text-muted)] font-semibold inline-flex items-center gap-2 border border-[var(--color-border-default)] max-[768px]:w-full max-[768px]:justify-center">
          <CalendarDays className="h-4 w-4" />
          <span id="fechaActualBajas">{fechaActual}</span>
        </div>
      </div>
      </StaggerItem>

      {(errorDatos || errorHistorial) && (
        <StaggerItem>
          <div className="mb-5 flex flex-col gap-4">
            {errorDatos ? <Alert type="error" title="Error en datos base">{errorDatos}</Alert> : null}
            {errorHistorial ? <Alert type="warning" title="Historial no disponible">{errorHistorial}</Alert> : null}
            <div>
              <Button type="button" variant="secondary" onClick={recargarBajas}>
                Reintentar carga
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      {/* STATS */}
      <StaggerItem>
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-5 mb-[30px] max-[768px]:grid-cols-1">
        <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl flex items-center gap-[15px] shadow-[var(--shadow-sm)] border-l-4 border-l-[#e53e3e] transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
          <div className="w-[50px] h-[50px] rounded-[10px] flex items-center justify-center text-[22px] bg-[#fff5f5] text-[#e53e3e]">
            <Wrench className="h-5 w-5" />
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-[13px] text-[#50596D] mb-1.5">Roturas del Mes</span>
            <span className="text-[24px] font-bold text-[var(--color-text-strong)]" id="statRoturas">
              {stats.roturas}
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl flex items-center gap-[15px] shadow-[var(--shadow-sm)] border-l-4 border-l-[#dd6b20] transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
          <div className="w-[50px] h-[50px] rounded-[10px] flex items-center justify-center text-[22px] bg-[#fffaf0] text-[#dd6b20]">
            <Clock3 className="h-5 w-5" />
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-[13px] text-[#50596D] mb-1.5">Productos Caducados</span>
            <span className="text-[24px] font-bold text-[var(--color-text-strong)]" id="statCaducados">
              {stats.caducados}
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl flex items-center gap-[15px] shadow-[var(--shadow-sm)] border-l-4 border-l-[#d69e2e] transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
          <div className="w-[50px] h-[50px] rounded-[10px] flex items-center justify-center text-[22px] bg-[#fefcbf] text-[#d69e2e]">
            <Scale className="h-5 w-5" />
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-[13px] text-[#50596D] mb-1.5">Mermas Registradas</span>
            <span className="text-[24px] font-bold text-[var(--color-text-strong)]" id="statMermas">
              {stats.mermas}
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-bg-surface)] p-5 rounded-xl flex items-center gap-[15px] shadow-[var(--shadow-sm)] border-l-4 border-l-[#c53030] transition-[transform,box-shadow] duration-200 hover:-translate-y-[3px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]">
          <div className="w-[50px] h-[50px] rounded-[10px] flex items-center justify-center text-[22px] bg-[#fff5f5] text-[#c53030]">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-[13px] text-[#50596D] mb-1.5">Valor Perdido Total</span>
            <span className="text-[24px] font-bold text-[var(--color-text-strong)]" id="statValorPerdido">
              {stats.valorPerdido.toFixed(2)} €
            </span>
          </div>
        </div>
      </div>
      </StaggerItem>

      {/* PANEL REGISTRO */}
      <StaggerItem>
      <div className="mb-[25px] rounded-xl border border-gray-200 bg-white p-[25px] shadow-sm">
        <h2 className="text-[18px] font-semibold text-[var(--color-text-strong)] m-0 mb-5 flex items-center gap-2.5">
          <ClipboardList className="h-5 w-5 text-[var(--color-brand-500)]" /> Registrar Nueva Baja
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3 max-[768px]:flex-col">
            <input
              type="text"
              id="inputBusquedaBaja"
              className="h-12 flex-1 rounded-[18px] border border-gray-300 bg-white px-4 text-sm text-gray-900 shadow-sm transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Buscar producto por nombre o código de barras..."
              aria-label="Buscar producto por nombre o código de barras"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setResultadosOpen(true);
                setModoCaducados(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") buscarProductos();
              }}
            />



            <button
              id="btnEscanearBaja"
              className="inline-flex h-12 w-12 min-w-12 items-center justify-center rounded-[18px] border border-gray-300 bg-white text-gray-400 shadow-sm cursor-pointer transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              type="button"
              onClick={escanearCodigoBarras}
              aria-label="Escanear codigo de barras"
              title="Escanear codigo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-4 max-[768px]:flex-col">
            <UiSelect
              id="selectCategoriaBaja"
              value={catId}
              onChange={(v) => {
                setCatId(v);
                setResultadosOpen(true);
              }}
              disabled={loadingDatos}
              placeholder="Todas las categorías"
              options={[
                { value: "", label: "Todas las categorías" },
                ...categorias.map((c) => ({ value: String(c.id), label: c.nombre })),
              ]}
            />

            <button
              id="btnProductosCaducados"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:opacity-90"
              type="button"
              onClick={mostrarProductosCaducados}
            >
              <Clock3 className="h-4 w-4" /> Ver Productos Próximos a Caducar
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div
          id="resultadosBusquedaBaja"
          className={`mt-5 border-t border-[var(--color-border-default)] pt-5 max-h-[350px] overflow-y-auto ${resultadosOpen ? "" : "hidden"}`}
        >
          {loadingDatos ? (
            <div className="py-3">
              <Spinner size="sm" label="Cargando productos..." />
            </div>
          ) : resultados.length === 0 ? (
            <div className="text-center p-5 text-[#a0aec0]">
              <Search className="h-8 w-8 mb-2.5 mx-auto" />
              <p className="m-0">No se encontraron productos</p>
            </div>
          ) : (
            resultados.map((p) => {
              const cat = categorias.find((c) => String(c.id) === String(p.categoriaId ?? ""));
              const cad = modoCaducados ? badgeCaducidad(p.fechaCaducidad) : null;

              return (
                <button
                  key={String(p.id)}
                  type="button"
                  className="w-full min-h-14 px-[15px] py-[15px] bg-[var(--color-bg-soft)] rounded-[10px] mb-2.5 cursor-pointer transition-[background,border-color,transform] duration-200 border-2 border-transparent text-left active:scale-[0.99] hover:bg-[#fff5f5] hover:border-[#fc8181] hover:translate-x-[5px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(179,49,49,0.35)]"
                  aria-label={`Seleccionar ${p.nombre}`}
                  onClick={() => seleccionarProducto(p)}
                >
                  <div className="flex-1">
                    <div className="font-semibold text-[var(--color-text-strong)] mb-1">{p.nombre}</div>
                    <div className="text-[13px] text-[#50596D]">
                      {cat?.nombre || "Sin categoría"} • Stock: {p.stock} • {Number(p.precio ?? 0).toFixed(2)} €
                      {cad ? <span className={cad.className}>{cad.text}</span> : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      </StaggerItem>

      {/* BAJA ACTIVA */}
      <StaggerItem>
      <div className="mb-[25px] rounded-xl border border-gray-200 bg-white p-[25px] shadow-sm">
        <h3 className="text-[18px] font-semibold text-[var(--color-text-strong)] m-0 mb-5 flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-[var(--color-brand-500)]" /> Registro de Baja Actual
        </h3>

        <div className="overflow-x-auto">
          <table id="tablaBajas" className="w-full border-separate border-spacing-0 bg-white">
            <caption className="visually-hidden">Listado de productos dados de baja en la sesión actual</caption>
            <thead>
              <tr>
                <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Producto</th>
                <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Tipo de Baja</th>
                <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Stock Actual</th>
                <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cantidad Baja</th>
                <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Stock Final</th>
                <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Precio Unit.</th>
                <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Valor Perdido</th>
                <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Acción</th>
              </tr>
            </thead>

            <tbody id="tbodyBajas">
              {productosBaja.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="text-center text-[#a0aec0] py-[60px] px-5">
                      <i className="fa-solid fa-inbox text-[48px] mb-[15px] opacity-50" />
                      <p className="text-[16px] font-semibold m-0 mt-1.5 mb-0.5 text-black">No hay productos registrados en esta baja</p>
                      <small className="block text-[13px] text-black">Busca y selecciona productos para comenzar</small>
                    </div>
                  </td>
                </tr>
              ) : (
                productosBaja.map((p, index) => (
                  <tr key={`${String(p.id)}-${index}`} className="border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <strong>{p.nombre}</strong>
                      <br />
                      <small className="text-sm text-gray-500">{p.nombreCategoria}</small>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className={`inline-block px-3 py-1.5 rounded-lg text-[12px] font-semibold ${claseTipoBaja(p.tipoBaja)}`}>{p.tipoBaja}</span>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-500">{p.stock}</td>

                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      <strong className="text-primary">{p.cantidadBaja}</strong>
                    </td>

                    <td className="px-4 py-3 text-sm font-medium text-primary">{Number(p.stock) - Number(p.cantidadBaja)}</td>

                    <td className="px-4 py-3 text-sm text-gray-500">{Number(p.precio ?? 0).toFixed(2)} €</td>

                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      <strong className="text-primary">{p.valorPerdido.toFixed(2)} €</strong>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-900">
                      <button
                        className="inline-flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                        type="button"
                        onClick={() => eliminarProductoBaja(index)}
                        aria-label={`Eliminar ${p.nombre}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot id="tfootBajas" className={productosBaja.length ? "" : "hidden"}>
              <tr className="bg-[#fff5f5] text-[16px]">
                <td colSpan={6}>
                  <strong>VALOR TOTAL DE BAJAS</strong>
                </td>
                <td id="totalValorBajas" className="text-[#c53030] text-[20px] font-bold">
                  {totalValorBajas.toFixed(2)} €
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      </StaggerItem>

      {/* ACCIONES */}
      <StaggerItem>
      <div className="mb-[25px] rounded-xl border border-gray-200 bg-white p-[25px] shadow-sm">
        <div className="mb-5">
          <label className="flex items-center gap-2 text-[var(--color-text-muted)] font-semibold mb-2.5 text-[14px]" htmlFor="textareaMotivoBaja">
            <Mail className="h-4 w-4" /> Motivo / Descripción Detallada
          </label>
          <textarea
            id="textareaMotivoBaja"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm resize-y transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Describe el motivo de las bajas (opcional pero recomendado)..."
            rows={3}
            aria-label="Motivo o descripción detallada de la baja"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-4 max-[768px]:flex-col">
          <button
            id="btnCancelarBaja"
            className={`px-[30px] py-[14px] rounded-[10px] font-semibold text-[15px] cursor-pointer inline-flex items-center gap-2.5 border-2 border-[var(--color-border-default)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] transition-[transform,background,border-color] duration-200 hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed max-[768px]:w-full max-[768px]:justify-center ${productosBaja.length ? "" : "hidden"}`}
            type="button"
            onClick={cancelarBaja}
            disabled={confirmando}
          >
            <i className="fa-solid fa-xmark" /> Cancelar Registro
          </button>

          <button
            id="btnConfirmarBaja"
            className={`px-[30px] py-[14px] rounded-[10px] font-semibold text-[15px] cursor-pointer inline-flex items-center gap-2.5 border-0 text-white bg-[linear-gradient(135deg,#e53e3e_0%,#c53030_100%)] shadow-[0_4px_15px_rgba(197,48,48,0.3)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(197,48,48,0.4)] disabled:opacity-60 disabled:cursor-not-allowed max-[768px]:w-full max-[768px]:justify-center ${productosBaja.length ? "" : "hidden"}`}
            type="button"
            onClick={confirmarBaja}
            disabled={confirmando}
          >
            {confirmando ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" /> Procesando...
              </>
            ) : (
              <>
                <i className="fa-solid fa-triangle-exclamation" /> CONFIRMAR BAJAS
              </>
            )}
          </button>
        </div>
      </div>
      </StaggerItem>

      {/* MENSAJE ESTADO */}
      <StaggerItem>
      <div
        id="mensajeEstadoBajas"
        className="text-center font-semibold min-h-6 text-[14px] p-3 rounded-lg mt-5 border-2"
        style={
          mensajeEstado
            ? {
                background:
                  mensajeEstado.color === "green"
                    ? "#f0fff4"
                    : mensajeEstado.color === "orange"
                    ? "#fffaf0"
                    : "#fff5f5",
                color:
                  mensajeEstado.color === "green"
                    ? "#2f855a"
                    : mensajeEstado.color === "orange"
                    ? "#c05621"
                    : "#c53030",
                border: `2px solid ${
                  mensajeEstado.color === "green" ? "#9ae6b4" : mensajeEstado.color === "orange" ? "#fbd38d" : "#fc8181"
                }`,
              }
            : { background: "transparent", border: "none" }
        }
      >
        {mensajeEstado?.text ?? ""}
      </div>
      </StaggerItem>

      {/* HISTORIAL */}
      <StaggerItem>
      <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-[25px] rounded-[22px] shadow-[var(--shadow-sm)] border border-[var(--color-border-default)]">
        <div className="flex justify-between items-center mb-5 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-3">
          <h3 className="text-[18px] font-semibold text-[var(--color-text-strong)] m-0 flex items-center gap-2.5">
            <History className="h-5 w-5 text-[var(--color-brand-500)]" /> Historial de Bajas
          </h3>

          <div className="flex gap-2.5">
            <UiSelect
              id="selectFiltroTipoBaja"
              value={filtroTipoHistorial}
              onChange={setFiltroTipoHistorial}
              options={[
                { value: "", label: "Todos los tipos" },
                { value: "Rotura", label: "Roturas" },
                { value: "Caducado", label: "Caducados" },
                { value: "Merma", label: "Mermas" },
                { value: "Ajuste", label: "Ajustes" },
                { value: "Otro", label: "Otros" },
              ]}
            />
          </div>
        </div>

        <div id="contenedorHistorial" className="min-h-[200px]">
          {loadingHistorial ? (
            <div className="py-3">
              <Spinner size="sm" label="Cargando historial..." />
            </div>
          ) : historialFiltrado.length === 0 ? (
            <p className="text-center text-[#666] p-5 m-0">
              No hay bajas registradas este mes
            </p>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              {historialFiltrado.map((baja, idx) => {
                const { fecha, hora } = formatFechaCortaES(baja.fechaBaja);
                const precio = Number.parseFloat(String(baja.producto_precio ?? 0)) || 0;
                const cant = Number.parseInt(String(baja.cantidad ?? 0), 10) || 0;
                const total = precio * cant;

                return (
                  <div
                    key={idx}
                    className="bg-white border border-[#e2e8f0] rounded-lg p-[15px] mb-2.5"
                  >
                    <div className="flex justify-between items-start mb-2.5 gap-4">
                      <div>
                        <strong className="text-[16px]">{baja.producto_nombre || "Producto desconocido"}</strong>
                        <div className="mt-1">
                          <span className={`inline-block px-3 py-1.5 rounded-lg text-[12px] font-semibold ${claseTipoBaja(baja.tipoBaja)}`}>{baja.tipoBaja}</span>
                        </div>
                      </div>

                      <div className="text-right text-[#718096] text-[14px]">
                        <div>{fecha}</div>
                        <div>{hora}</div>
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-2 gap-2.5 text-[14px] text-[#4a5568] max-[640px]:grid-cols-1"
                    >
                      <div>
                        <strong>Cantidad:</strong> {cant}
                      </div>
                      <div>
                        <strong>Usuario:</strong> {baja.usuario_nombre || "Desconocido"}
                      </div>
                      <div>
                        <strong>Precio Ud.:</strong> {precio.toFixed(2)} €
                      </div>
                      <div>
                        <strong>Total:</strong> {total.toFixed(2)} €
                      </div>
                      <div className="col-span-2 max-[640px]:col-span-1">
                        <strong>Motivo:</strong> {baja.motivo || "Sin especificar"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      </StaggerItem>

      {/* MODAL */}
      <div
        id="modalDetalleBaja"
        className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] [backdrop-filter:blur(4px)] ${modalOpen ? "" : "hidden"}`}
      >
        <div className="bg-[var(--color-bg-surface)] p-[30px] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-[90%] max-w-[450px]" role="dialog" aria-modal="true" aria-label="Detalles de la baja">
          <h3 className="m-0 mb-[15px] text-[var(--color-text-strong)] flex items-center gap-2.5">
            <i className="fa-solid fa-circle-minus" />
            Detalles de la Baja
          </h3>

          <p id="modalNombreProductoBaja" className="text-[#50596D] text-[14px] mb-5 font-semibold">
            {productoSeleccionado?.nombre ?? ""}
          </p>

          <div className="flex flex-col gap-5 mb-[25px]">
            <div className="flex flex-col">
              <label htmlFor="modalSelectTipoBaja" className="text-[var(--color-text-muted)] font-semibold mb-2 text-[14px]">Tipo de Baja:</label>
              <UiSelect
                id="modalSelectTipoBaja"
                value={modalTipoBaja}
                onChange={(v) => setModalTipoBaja(v as ProductoBaja["tipoBaja"])}
                options={[
                  { value: "Rotura", label: "Rotura" },
                  { value: "Caducado", label: "Caducado" },
                  { value: "Merma", label: "Merma" },
                  { value: "Ajuste", label: "Ajuste de Inventario" },
                  { value: "Otro", label: "Otro" },
                ]}
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="modalInputCantidadBaja" className="text-[var(--color-text-muted)] font-semibold mb-2 text-[14px]">Cantidad:</label>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  className="w-11 h-11 min-w-11 min-h-11 border border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-soft)] text-[var(--color-text-strong)] text-[22px] leading-none font-bold inline-flex items-center justify-center cursor-pointer active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(179,49,49,0.35)]"
                  aria-label="Reducir cantidad"
                  onClick={() => setModalCantidad((prev) => Math.max(1, Number(prev || 1) - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  id="modalInputCantidadBaja"
                  className="w-[84px] min-h-11 px-3 border-2 border-[var(--color-border-default)] rounded-lg text-[18px] font-semibold text-center [appearance:textfield]"
                  min={1}
                  max={productoSeleccionado?.stock ?? 1}
                  value={modalCantidad}
                  inputMode="numeric"
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    const max = Number(productoSeleccionado?.stock ?? 1);

                    if (v > max) {
                      setModalCantidad(max);
                      showNotification(`La cantidad no puede superar el stock disponible (${max})`, "warning");
                      return;
                    }
                    if (v < 1) {
                      setModalCantidad(1);
                      return;
                    }
                    setModalCantidad(v);
                  }}
                />
                <button
                  type="button"
                  className="w-11 h-11 min-w-11 min-h-11 border border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-soft)] text-[var(--color-text-strong)] text-[22px] leading-none font-bold inline-flex items-center justify-center cursor-pointer active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(179,49,49,0.35)]"
                  aria-label="Aumentar cantidad"
                  onClick={() => {
                    const max = Number(productoSeleccionado?.stock ?? 1);
                    setModalCantidad((prev) => Math.min(max, Number(prev || 1) + 1));
                  }}
                >
                  +
                </button>
              </div>
              <small id="modalStockDisponible" className="mt-1 text-[#50596D] text-[12px]">
                Stock disponible: {productoSeleccionado?.stock ?? 0} unidades
              </small>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              id="btnModalCancelarBaja"
              className="flex-1 py-3 rounded-lg font-semibold cursor-pointer transition-colors bg-[var(--color-border-default)] text-[var(--color-text-muted)] hover:brightness-95"
              type="button"
              onClick={cerrarModal}
            >
              Cancelar
            </button>

            <button
              id="btnModalConfirmarBaja"
              className="flex-1 py-3 rounded-lg font-semibold cursor-pointer transition-colors bg-[#c53030] text-white hover:bg-[#9b2c2c]"
              type="button"
              onClick={confirmarBajaModal}
            >
              Registrar Baja
            </button>
          </div>
        </div>
      </div>
    </StaggerPage>
  );
}