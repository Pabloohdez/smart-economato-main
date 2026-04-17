import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Alert from "../components/ui/Alert";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { showConfirm } from "../utils/notifications";
import UiSelect from "../components/ui/UiSelect";

// Ajusta esta línea si en tu proyecto real estos métodos están en otro service
import { getCategorias, getProveedores, crearProductosBatch } from "../services/productosService";
import type { Categoria, Proveedor } from "../types";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";

type ProductoTemporal = {
  nombre: string;
  precio: number;
  precioUnitario: string;
  stock: number;
  stockMinimo: number;
  categoriaId: number | string;
  proveedorId: number | string;
  unidadMedida: string;
  marca: string;
  codigoBarras: string;
  fechaCaducidad: string;
  alergenos: string[];
  descripcion: string;
  imagen: string;
  activo: boolean;
  _tempCategoriaNombre: string;
  _tempProveedorNombre: string;
};

export default function IngresarProductoPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [precio, setPrecio] = useState("");
  const [unidadMedida, setUnidadMedida] = useState<"ud" | "kg" | "l">("ud");
  const [stock, setStock] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [proveedorId, setProveedorId] = useState("");

  const [listaTemporal, setListaTemporal] = useState<ProductoTemporal[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<"ok" | "warn" | "error" | "info" | "">("");

  const categoriasQuery = useQuery({
    queryKey: queryKeys.categorias,
    queryFn: getCategorias,
    refetchInterval: 60_000,
  });

  const proveedoresQuery = useQuery({
    queryKey: queryKeys.proveedores,
    queryFn: getProveedores,
    refetchInterval: 60_000,
  });

  const guardarBatchMutation = useMutation({
    mutationFn: crearProductosBatch,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      broadcastQueryInvalidation(queryKeys.productos);
    },
  });

  const categorias: Categoria[] = categoriasQuery.data ?? [];
  const proveedores: Proveedor[] = proveedoresQuery.data ?? [];
  const loadingSelects = categoriasQuery.isLoading || proveedoresQuery.isLoading;

  const contadorTexto = useMemo(() => {
    if (listaTemporal.length === 0) return "0 productos";
    if (listaTemporal.length === 1) return "1 producto listo";
    return `${listaTemporal.length} productos listos`;
  }, [listaTemporal]);

  function generarCodigoBarras() {
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    return `8410001${random}`;
  }

  function limpiarInputs() {
    setNombre("");
    setCategoriaId("");
    setPrecio("");
    setUnidadMedida("ud");
    setStock("");
    setStockMin("");
    setProveedorId("");
  }

  function agregarALista() {
    const nombreLimpio = nombre.trim();
    const precioNum = parseFloat(precio);
    const parseNumber = (raw: string) => Number(String(raw || "").replace(",", "."));
    const stockNumRaw = parseNumber(stock);
    const stockMinNumRaw = parseNumber(stockMin);
    const stockNum =
      unidadMedida === "ud"
        ? Math.max(0, Math.floor(Number.isFinite(stockNumRaw) ? stockNumRaw : 0))
        : Math.max(0, Number.isFinite(stockNumRaw) ? stockNumRaw : 0);
    const stockMinNum =
      unidadMedida === "ud"
        ? Math.max(0, Math.floor(Number.isFinite(stockMinNumRaw) ? stockMinNumRaw : 0))
        : Math.max(0, Number.isFinite(stockMinNumRaw) ? stockMinNumRaw : 0);

    if (!nombreLimpio || !categoriaId || !proveedorId || Number.isNaN(precioNum)) {
      setMensajeEstado("Por favor completa todos los campos obligatorios.");
      setMensajeTipo("warn");
      return;
    }

    const categoriaNombre =
      categorias.find((c) => String(c.id) === String(categoriaId))?.nombre ?? "";
    const proveedorNombre =
      proveedores.find((p) => String(p.id) === String(proveedorId))?.nombre ?? "";

    const unidadLabel = unidadMedida === "kg" ? "kg" : unidadMedida === "l" ? "l" : "ud";

    const nuevoProducto: ProductoTemporal = {
      nombre: nombreLimpio,
      precio: precioNum,
      precioUnitario: unidadLabel,
      stock: stockNum,
      stockMinimo: stockMinNum,
      categoriaId,
      proveedorId,
      unidadMedida: unidadLabel,
      marca: "Sin marca",
      codigoBarras: generarCodigoBarras(),
      fechaCaducidad: "2024-12-31",
      alergenos: [],
      descripcion: "",
      imagen: "producto-generico.jpg",
      activo: true,
      _tempCategoriaNombre: categoriaNombre,
      _tempProveedorNombre: proveedorNombre,
    };

    setListaTemporal((prev) => [...prev, nuevoProducto]);
    limpiarInputs();
    setMensajeEstado("Producto agregado a la lista temporal.");
    setMensajeTipo("ok");
  }

  function borrarFila(index: number) {
    setListaTemporal((prev) => prev.filter((_, i) => i !== index));
  }

  async function limpiarLista() {
    if (listaTemporal.length === 0) return;

    const confirmado = await showConfirm({
      title: "Descartar lista",
      message: "¿Estás seguro de descartar toda la lista?",
      confirmLabel: "Descartar",
      variant: "danger",
      icon: "fa-solid fa-trash",
    });
    if (!confirmado) return;

    setListaTemporal([]);
    setMensajeEstado("Lista limpiada.");
    setMensajeTipo("info");
  }

  async function guardarEnBaseDeDatos() {
    if (listaTemporal.length === 0) return;

    const confirmado = await showConfirm({
      title: "Confirmar importación",
      message: `¿Confirmas importar ${listaTemporal.length} producto${listaTemporal.length !== 1 ? "s" : ""} al inventario?`,
      confirmLabel: "Importar",
      icon: "fa-solid fa-file-import",
    });
    if (!confirmado) return;

    try {
      setGuardando(true);
      setMensajeEstado("Procesando...");
      setMensajeTipo("info");

      const productosLimpios = listaTemporal.map((producto) => ({
            nombre: producto.nombre,
            precio: producto.precio,
            precioUnitario: producto.precioUnitario,
            stock: producto.stock,
            stockMinimo: producto.stockMinimo,
            categoriaId: producto.categoriaId,
            proveedorId: producto.proveedorId,
            unidadMedida: producto.unidadMedida,
            marca: producto.marca,
            codigoBarras: producto.codigoBarras,
            fechaCaducidad: producto.fechaCaducidad,
            alergenos: producto.alergenos,
            descripcion: producto.descripcion,
            imagen: producto.imagen,
            activo: producto.activo,
      }));

      try {
        await guardarBatchMutation.mutateAsync(productosLimpios);
        setMensajeEstado(`¡Éxito! Se guardaron ${productosLimpios.length} productos correctamente.`);
        setMensajeTipo("ok");
        setListaTemporal([]);
      } catch (error) {
        console.error("Error guardando productos en lote:", error);
        setMensajeEstado("Error al guardar los productos. Inténtalo de nuevo.");
        setMensajeTipo("error");
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="inline-flex items-center gap-2 px-[18px] py-2.5 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] rounded-[10px] font-semibold text-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-[background,color,border-color,transform,box-shadow] duration-200 hover:bg-[var(--color-border-default)] hover:text-[var(--color-text-strong)] hover:border-[var(--color-border-strong)] hover:-translate-x-[3px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          icon="fa-solid fa-arrow-left"
          onClick={() => nav("/inventario")}
        >
          Volver al Inventario
        </Button>
      </div>

      <h1 className="text-center text-[var(--color-brand-500)] mb-6 font-bold tracking-wide">
        INGRESO MASIVO DE MERCANCÍA
      </h1>

      <div className="bg-[var(--color-bg-surface)] p-[25px] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex flex-wrap gap-5 items-end border border-black/5">
        <div className="flex flex-col gap-2 flex-grow min-w-[220px] flex-[2]">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputNombre">
            Nombre del Producto
          </label>
          <input
            id="inputNombre"
            type="text"
            className="w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
            placeholder="Ej: Leche Entera"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 flex-grow min-w-[160px] flex-[1.5]">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="selectCategoria">
            Categoría
          </label>
          <UiSelect
            id="selectCategoria"
            value={categoriaId}
            onChange={setCategoriaId}
            disabled={loadingSelects}
            placeholder={loadingSelects ? "Cargando..." : "Seleccionar..."}
            options={[
              { value: "", label: loadingSelects ? "Cargando..." : "Seleccionar..." },
              ...categorias.map((c) => ({ value: String(c.id), label: c.nombre })),
            ]}
          />
        </div>

        <div className="flex flex-col gap-2 flex-grow min-w-[120px] flex-[0.9]">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="selectUnidadMedida">
            Unidad
          </label>
          <UiSelect
            id="selectUnidadMedida"
            value={unidadMedida}
            onChange={(v) => setUnidadMedida((v as any) || "ud")}
            options={[
              { value: "ud", label: "Unidades (ud)" },
              { value: "kg", label: "Peso (kg)" },
              { value: "l", label: "Volumen (l)" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-2 flex-grow min-w-[120px] flex-[0.9]">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputPrecio">
            Precio ({unidadMedida === "kg" ? "€/kg" : unidadMedida === "l" ? "€/l" : "€/ud"})
          </label>
          <input
            id="inputPrecio"
            type="number"
            className="w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
            placeholder="0.00"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 flex-grow min-w-[90px] flex-[0.8]">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputStock">
            Stock
          </label>
          <input
            id="inputStock"
            type="number"
            className="w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
            placeholder="0"
            step={unidadMedida === "ud" ? "1" : "0.001"}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 flex-grow min-w-[90px] flex-[0.8]">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="inputStockMin">
            Mínimo
          </label>
          <input
            id="inputStockMin"
            type="number"
            className="w-full px-3.5 py-2.5 border border-[var(--color-border-default)] rounded-lg text-[14px] bg-[var(--color-bg-soft)] box-border transition-[border-color,box-shadow,background] duration-150 focus:bg-white focus:border-[#3182ce] focus:shadow-[0_0_0_3px_rgba(49,130,206,0.1)] focus:outline-none"
            placeholder="5"
            step={unidadMedida === "ud" ? "1" : "0.001"}
            value={stockMin}
            onChange={(e) => setStockMin(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 flex-grow min-w-[160px] flex-[1.5]">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide" htmlFor="selectProveedor">
            Proveedor
          </label>
          <UiSelect
            id="selectProveedor"
            value={proveedorId}
            onChange={setProveedorId}
            disabled={loadingSelects}
            placeholder={loadingSelects ? "Cargando..." : "Seleccionar..."}
            options={[
              { value: "", label: loadingSelects ? "Cargando..." : "Seleccionar..." },
              ...proveedores.map((p) => ({ value: String(p.id), label: p.nombre })),
            ]}
          />
        </div>

        <Button
          type="button"
          variant="success"
          className="h-11 px-7 border-0 rounded-[10px] font-semibold text-[14px] cursor-pointer inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_rgba(49,130,206,0.3)] transition-[transform,box-shadow,filter] duration-200 bg-[linear-gradient(135deg,#4299e1_0%,#3182ce_100%)] text-white hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(49,130,206,0.4)] hover:brightness-105 active:translate-y-px disabled:opacity-70 disabled:cursor-not-allowed"
          icon="fa-solid fa-plus"
          onClick={agregarALista}
        >
          Agregar
        </Button>
      </div>

      <div className="mt-[35px]">
        <h3 className="text-[var(--color-text-strong)] mb-4 flex items-center gap-2.5 text-[1.1rem] flex-wrap">
          <i className="fa-solid fa-list-check"></i> Lista de Previsualización
          <span className="text-[12px] bg-[var(--color-border-default)] text-[var(--color-text-muted)] px-2.5 py-1 rounded-xl font-semibold">
            {contadorTexto}
          </span>
        </h3>

        <div className="overflow-x-auto rounded-xl border border-black/5 shadow-[var(--shadow-sm)]">
          <table className="w-full border-separate border-spacing-0 bg-[var(--color-bg-surface)]">
          <thead>
            <tr>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] p-4 text-left font-semibold text-[13px] border-b-2 border-b-[var(--color-border-default)]">Nombre</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] p-4 text-left font-semibold text-[13px] border-b-2 border-b-[var(--color-border-default)]">Categoría</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] p-4 text-left font-semibold text-[13px] border-b-2 border-b-[var(--color-border-default)]">Precio</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] p-4 text-left font-semibold text-[13px] border-b-2 border-b-[var(--color-border-default)]">Stock</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] p-4 text-left font-semibold text-[13px] border-b-2 border-b-[var(--color-border-default)]">Proveedor</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] p-4 text-center font-semibold text-[13px] border-b-2 border-b-[var(--color-border-default)]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {listaTemporal.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-5">
                  <EmptyState
                    icon="fa-solid fa-box-open"
                    title="Lista vacía"
                    description="Agrega productos para previsualizar antes de confirmar la importación."
                  />
                </td>
              </tr>
            ) : (
              listaTemporal.map((prod, index) => (
                <tr key={`${prod.codigoBarras}-${index}`} className="border-b border-b-[var(--color-border-default)] last:border-b-0 hover:bg-[#fafbfc]">
                  <td className="px-4 py-3 text-[14px] text-[var(--color-text-strong)]">{prod.nombre}</td>
                  <td className="px-4 py-3 text-[14px] text-[var(--color-text-strong)]">{prod._tempCategoriaNombre}</td>
                  <td className="px-4 py-3 text-[14px] text-[var(--color-text-strong)]">
                    {prod.precio.toFixed(2)} €/{prod.unidadMedida || "ud"}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[var(--color-text-strong)]">{prod.stock}</td>
                  <td className="px-4 py-3 text-[14px] text-[var(--color-text-strong)]">{prod._tempProveedorNombre}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      className="bg-[#fff5f5] text-[#e53e3e] border-0 w-8 h-8 rounded-lg cursor-pointer transition-transform duration-200 inline-flex items-center justify-center shadow-[0_2px_4px_rgba(229,62,62,0.1)] hover:bg-[#fed7d7] hover:scale-105"
                      onClick={() => borrarFila(index)}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-5 mt-6 mb-5 pt-5 border-t border-t-[var(--color-border-default)] flex-wrap">
        <Button
          type="button"
          variant="secondary"
          className={`h-11 px-7 border-0 rounded-[10px] font-semibold text-[14px] cursor-pointer inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_rgba(229,62,62,0.3)] transition-[transform,box-shadow,filter] duration-200 bg-[linear-gradient(135deg,#fc8181_0%,#e53e3e_100%)] text-white hover:-translate-y-0.5 hover:shadow-[0_6px_15px_rgba(229,62,62,0.4)] hover:brightness-105 active:translate-y-px disabled:opacity-70 disabled:cursor-not-allowed ${listaTemporal.length === 0 ? "hidden" : ""}`}
          icon="fa-solid fa-trash"
          onClick={limpiarLista}
        >
          Descartar Todo
        </Button>

        <Button
          type="button"
          variant="primary"
          className={`h-11 px-9 border-0 rounded-[10px] font-semibold text-[15px] cursor-pointer inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_rgba(56,161,105,0.3)] transition-[transform,box-shadow,filter] duration-200 bg-[linear-gradient(135deg,#48bb78_0%,#38a169_100%)] text-white tracking-wide hover:-translate-y-0.5 hover:shadow-[0_6px_18px_rgba(56,161,105,0.4)] hover:brightness-105 active:translate-y-px disabled:opacity-70 disabled:cursor-not-allowed ${listaTemporal.length === 0 ? "hidden" : ""}`}
          icon="fa-solid fa-cloud-arrow-up"
          onClick={guardarEnBaseDeDatos}
          disabled={listaTemporal.length === 0}
          loading={guardando}
        >
          CONFIRMAR E IMPORTAR
        </Button>
      </div>

      {mensajeEstado && (
        <Alert
          type={
            mensajeTipo === "ok" ? "success"
            : mensajeTipo === "warn" ? "warning"
            : mensajeTipo === "error" ? "error"
            : "info"
          }
        >
          {mensajeEstado}
        </Alert>
      )}
    </div>
  );
}