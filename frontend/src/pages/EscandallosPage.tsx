import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProductos, type Producto } from "../services/productosService";
import "../styles/escandallos.css";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import { showConfirm, showNotification } from "../utils/notifications";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useAuth } from "../contexts/AuthContext";
import { deleteEscandallo, getEscandallos, saveEscandallo } from "../services/escandallosService";
import type { Escandallo, EscandalloItem } from "../types";
import { queryKeys } from "../lib/queryClient";

export default function EscandallosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [busquedaReceta, setBusquedaReceta] = useState("");
  const [busquedaIngrediente, setBusquedaIngrediente] = useState("");
  const [filtroReceta, setFiltroReceta] = useState("");
  const [filtroIngrediente, setFiltroIngrediente] = useState("");
  const debouncedBusquedaReceta = useDebouncedValue(busquedaReceta, 300);
  const debouncedBusquedaIngrediente = useDebouncedValue(busquedaIngrediente, 300);

  const [modalOpen, setModalOpen] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);
  const [detalleEscandallo, setDetalleEscandallo] = useState<Escandallo | null>(null);

  const [editEscandalloId, setEditEscandalloId] = useState<number | null>(null);
  const [nombrePlato, setNombrePlato] = useState("");
  const [pvpPlato, setPvpPlato] = useState("0");
  const [elaboracionPlato, setElaboracionPlato] = useState("");

  const [ingredientesReceta, setIngredientesReceta] = useState<EscandalloItem[]>([]);
  const [productoIngredienteId, setProductoIngredienteId] = useState("");
  const [cantidadIngrediente, setCantidadIngrediente] = useState("");
  const [busquedaProductoIngrediente, setBusquedaProductoIngrediente] = useState("");
  const [mostrarSugerenciasIngrediente, setMostrarSugerenciasIngrediente] = useState(false);

  const productosQuery = useQuery({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
  });

  const escandallosQuery = useQuery({
    queryKey: queryKeys.escandallos,
    queryFn: getEscandallos,
  });

  const saveEscandalloMutation = useMutation({
    mutationFn: ({ payload, id }: { payload: Parameters<typeof saveEscandallo>[0]; id?: number | null }) =>
      saveEscandallo(payload, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.escandallos });
    },
  });

  const deleteEscandalloMutation = useMutation({
    mutationFn: deleteEscandallo,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.escandallos });
    },
  });

  const todosLosProductos = useMemo(() => {
    const lista = Array.isArray(productosQuery.data) ? [...productosQuery.data] : [];

    if (!lista.find((p) => String(p.nombre).trim().toLowerCase() === "sal")) {
      lista.push({
        id: "999",
        nombre: "Sal",
        precio: 0.6,
        stock: 0,
        proveedorId: null,
        categoriaId: null,
      } as Producto);
    }

    return lista;
  }, [productosQuery.data]);

  const escandallos = escandallosQuery.data ?? [];

  const loadingProductos = productosQuery.isLoading;
  const loadingEscandallos = escandallosQuery.isLoading;
  const err =
    (productosQuery.error instanceof Error && productosQuery.error.message)
    || (escandallosQuery.error instanceof Error && escandallosQuery.error.message)
    || "";

  useEffect(() => {
    setFiltroReceta(debouncedBusquedaReceta);
    setFiltroIngrediente(debouncedBusquedaIngrediente);
  }, [debouncedBusquedaIngrediente, debouncedBusquedaReceta]);

  const escandallosFiltrados = useMemo(() => {
    const textoReceta = filtroReceta.trim().toLowerCase();
    const textoIngrediente = filtroIngrediente.trim().toLowerCase();

    return escandallos.filter((esc) => {
      const coincideNombre = esc.nombre.toLowerCase().includes(textoReceta);

      let coincideIngrediente = true;
      if (textoIngrediente) {
        coincideIngrediente = esc.items.some((item) =>
          item.nombre.toLowerCase().includes(textoIngrediente),
        );
      }

      return coincideNombre && coincideIngrediente;
    });
  }, [escandallos, filtroReceta, filtroIngrediente]);

  const productoIngredienteSeleccionado = useMemo(
    () => todosLosProductos.find((producto) => String(producto.id) === String(productoIngredienteId)) ?? null,
    [productoIngredienteId, todosLosProductos],
  );

  const productosSugeridos = useMemo(() => {
    const texto = busquedaProductoIngrediente.trim().toLowerCase();
    if (texto.length < 2) {
      return [];
    }

    return todosLosProductos
      .filter((producto) => producto.nombre.toLowerCase().includes(texto))
      .slice(0, 8);
  }, [busquedaProductoIngrediente, todosLosProductos]);

  const costeTotal = useMemo(() => {
    return ingredientesReceta.reduce(
      (sum, ing) => sum + ing.cantidad * ing.precio,
      0,
    );
  }, [ingredientesReceta]);

  const pvp = Number.parseFloat(pvpPlato || "0") || 0;
  const beneficioNeto = pvp - costeTotal;
  const margenBeneficio = pvp > 0 ? (beneficioNeto / pvp) * 100 : 0;

  function abrirNuevaReceta() {
    limpiarFormulario();
    setModoLectura(false);
    setModalOpen(true);
  }

  function abrirEditarReceta(esc: Escandallo) {
    cargarRecetaEnFormulario(esc, false);
  }

  function abrirVerReceta(esc: Escandallo) {
    setDetalleEscandallo({
      ...esc,
      items: getEscandalloItems(esc),
    });
  }

  function cerrarDetalle() {
    setDetalleEscandallo(null);
  }

  function cargarRecetaEnFormulario(esc: Escandallo, readonly: boolean) {
    setEditEscandalloId(esc.id);
    setNombrePlato(esc.nombre);
    setPvpPlato(String(esc.pvp));
    setElaboracionPlato(esc.elaboracion || "");
    setIngredientesReceta([...(esc.items || [])]);
    setProductoIngredienteId("");
    setCantidadIngrediente("");
    setBusquedaProductoIngrediente("");
    setMostrarSugerenciasIngrediente(false);
    setModoLectura(readonly);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
  }

  function getEscandalloItems(escandallo: Escandallo | null | undefined) {
    return Array.isArray(escandallo?.items) ? escandallo.items : [];
  }

  function limpiarFormulario() {
    setEditEscandalloId(null);
    setNombrePlato("");
    setPvpPlato("0");
    setElaboracionPlato("");
    setIngredientesReceta([]);
    setProductoIngredienteId("");
    setCantidadIngrediente("");
    setBusquedaProductoIngrediente("");
    setMostrarSugerenciasIngrediente(false);
  }

  function seleccionarIngrediente(producto: Producto) {
    setProductoIngredienteId(String(producto.id));
    setBusquedaProductoIngrediente(producto.nombre);
    setMostrarSugerenciasIngrediente(false);
  }

  function agregarIngrediente() {
    const prodId = productoIngredienteId;
    const cantidad = Number.parseFloat(cantidadIngrediente);

    if (!prodId || Number.isNaN(cantidad) || cantidad <= 0) {
      showNotification("Selecciona un producto y una cantidad válida.", "warning");
      return;
    }

    const producto = todosLosProductos.find(
      (p) => String(p.id) === String(prodId),
    );
    if (!producto) return;

    setIngredientesReceta((prev) => {
      const idx = prev.findIndex(
        (i) => String(i.producto_id) === String(prodId),
      );
      if (idx >= 0) {
        return prev.map((item, index) =>
          index === idx
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item,
        );
      }

      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          cantidad,
        },
      ];
    });

    setProductoIngredienteId("");
    setCantidadIngrediente("");
    setBusquedaProductoIngrediente("");
    setMostrarSugerenciasIngrediente(false);
  }

  function eliminarIngrediente(index: number) {
    setIngredientesReceta((prev) => prev.filter((_, i) => i !== index));
  }

  function actualizarCantidadIngrediente(index: number, cantidad: string) {
    const parsed = Number.parseFloat(cantidad);
    setIngredientesReceta((prev) => prev.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      return {
        ...item,
        cantidad: Number.isNaN(parsed) || parsed <= 0 ? item.cantidad : parsed,
      };
    }));
  }

  async function guardarEscandallo(e: React.FormEvent) {
    e.preventDefault();

    if (ingredientesReceta.length === 0) {
      showNotification("La receta debe tener al menos un ingrediente.", "warning");
      return;
    }

    const payload = {
      nombre: nombrePlato.trim(),
      pvp: Number.parseFloat(pvpPlato || "0") || 0,
      elaboracion: elaboracionPlato,
      items: [...ingredientesReceta],
      autor: String(user?.nombre ?? user?.username ?? "Admin"),
    };

    if (!payload.nombre) {
      showNotification("El nombre del plato es obligatorio.", "warning");
      return;
    }

    await saveEscandalloMutation.mutateAsync({ payload, id: editEscandalloId });

    cerrarModal();
    limpiarFormulario();
    showNotification("Receta guardada correctamente.", "success");
  }

  async function eliminarEscandallo(id: number) {
    const esc = escandallos.find((x) => x.id === id);
    if (!esc) {
      showNotification("Error: Receta no encontrada.", "error");
      return;
    }

    const confirmado = await showConfirm({
      title: "Eliminar receta",
      message: `¿Eliminar la receta "${esc.nombre}"?\n\nEsta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      variant: "danger",
      icon: "fa-solid fa-trash",
    });
    if (!confirmado) return;

    await deleteEscandalloMutation.mutateAsync(id);
    showNotification("Receta eliminada correctamente.", "success");
  }

  function aplicarFiltros() {
    setFiltroReceta(busquedaReceta);
    setFiltroIngrediente(busquedaIngrediente);
  }

  function mostrarTodo() {
    setBusquedaReceta("");
    setBusquedaIngrediente("");
    setFiltroReceta("");
    setFiltroIngrediente("");
  }

  function classMargenTabla(margen: number) {
    if (margen < 20) return "text-danger";
    if (margen < 50) return "text-warning";
    return "text-success";
  }

  function classMargenResumen(margen: number) {
    if (margen < 20) return "resumen-value text-danger";
    if (margen < 50) return "resumen-value text-warning";
    return "resumen-value text-success";
  }

  function classMargenBadge(margen: number) {
    if (margen < 20) return "bg-red-50 text-red-700 ring-red-200";
    if (margen < 50) return "bg-amber-50 text-amber-700 ring-amber-200";
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  const detalleItems = getEscandalloItems(detalleEscandallo);
  const detalleCoste = detalleItems.reduce(
    (sum, item) => sum + Number(item.cantidad) * Number(item.precio),
    0,
  );
  const detallePvp = Number(detalleEscandallo?.pvp ?? 0);
  const detalleMargen = detallePvp > 0 ? ((detallePvp - detalleCoste) / detallePvp) * 100 : 0;

  return (
    <div className="table-wrapper">
      <div className="table-header">
        <h1>Escandallos y Recetas</h1>

        <div className="escandallo-controls">
          <div className="grupo-busqueda">
            <label htmlFor="busquedaEscandallos" className="label-control">
              Buscar Receta
            </label>
            <input
              type="text"
              id="busquedaEscandallos"
              className="input-control"
              placeholder="Buscar por nombre..."
              value={busquedaReceta}
              onChange={(e) => setBusquedaReceta(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") aplicarFiltros();
              }}
            />
          </div>

          <button
            type="button"
            className="btn-accion btn-buscar"
            onClick={aplicarFiltros}
          >
            <i className="fa-solid fa-search"></i> Buscar
          </button>

          <div className="grupo-busqueda">
            <label htmlFor="busquedaIngrediente" className="label-control">
              Buscar por Ingrediente
            </label>
            <input
              type="text"
              id="busquedaIngrediente"
              className="input-control"
              placeholder="Por ingrediente..."
              value={busquedaIngrediente}
              onChange={(e) => setBusquedaIngrediente(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") aplicarFiltros();
              }}
            />
          </div>

          <button
            type="button"
            className="btn-accion btn-buscar"
            onClick={aplicarFiltros}
          >
            <i className="fa-solid fa-filter"></i> Filtrar
          </button>

          <button
            type="button"
            className="btn-accion btn-mostrar-todo"
            onClick={mostrarTodo}
          >
            <i className="fa-solid fa-sync"></i> Mostrar Todo
          </button>

          <button
            type="button"
            className="btn-accion btn-nuevo"
            onClick={abrirNuevaReceta}
          >
            <i className="fa-solid fa-plus"></i> Nueva Receta
          </button>
        </div>
      </div>

      {(loadingProductos || loadingEscandallos) && <Spinner label="Cargando datos..." />}
      {err && <Alert type="error">{err}</Alert>}

      <div className="table-container">
        <table>
          <caption className="sr-only">
            Lista de escandallos y recetas disponibles
          </caption>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Autor</th>
              <th>Ingredientes</th>
              <th>Coste Total</th>
              <th>PVP</th>
              <th>Beneficio %</th>
                    <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {escandallosFiltrados.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  No se encontraron recetas.
                </td>
              </tr>
            ) : (
              escandallosFiltrados.map((esc) => {
                const margen =
                  esc.pvp > 0 ? ((esc.pvp - esc.coste) / esc.pvp) * 100 : 0;

                return (
                  <tr key={esc.id}>
                    <td
                      className="font-bold text-primary clickable-name"
                      onClick={() => abrirVerReceta(esc)}
                    >
                      {esc.nombre}
                    </td>
                    <td>{esc.autor || "Admin"}</td>
                    <td>{esc.items?.length ?? 0} ingredientes</td>
                    <td>{esc.coste.toFixed(2)} €</td>
                    <td>{esc.pvp.toFixed(2)} €</td>
                    <td className={`font-bold ${classMargenTabla(margen)}`}>
                      {margen.toFixed(1)}%
                    </td>
                    <td className="action-cell">
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-sm btn-secondary"
                          title="Ver detalle"
                          onClick={() => abrirVerReceta(esc)}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-primary"
                          title="Editar"
                          onClick={() => abrirEditarReceta(esc)}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          type="button"
                          className="btn-sm btn-danger"
                          title="Eliminar"
                          onClick={() => eliminarEscandallo(esc.id)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {detalleEscandallo && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-brand-600)] px-8 py-7 text-white">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.28em] text-white/70">
                  Ficha de escandallo
                </p>
                <h2 className="m-0 text-3xl font-black tracking-tight">
                  {detalleEscandallo.nombre}
                </h2>
                <p className="mt-2 text-sm font-medium text-white/80">
                  Autor: {detalleEscandallo.autor || "Admin"}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarDetalle}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl text-white transition hover:bg-white/20"
                aria-label="Cerrar detalle"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="max-h-[calc(92vh-96px)] overflow-y-auto px-8 py-8">
              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5 text-center">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Coste total
                  </span>
                  <span className="mt-2 block text-3xl font-black text-slate-800">
                    {detalleCoste.toFixed(2)} €
                  </span>
                </article>

                <article className="rounded-3xl border border-red-100 bg-red-50/70 px-6 py-5 text-center">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-brand-500)]">
                    PVP
                  </span>
                  <span className="mt-2 block text-3xl font-black text-[var(--color-brand-500)]">
                    {detallePvp.toFixed(2)} €
                  </span>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Margen
                  </span>
                  <span className={`mt-2 inline-flex rounded-full px-4 py-2 text-2xl font-black ring-1 ${classMargenBadge(detalleMargen)}`}>
                    {detalleMargen.toFixed(1)}%
                  </span>
                </article>
              </div>

              <section className="mt-8 rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-[2px] w-8 bg-[var(--color-brand-500)]"></span>
                  <h3 className="m-0 text-sm font-black uppercase tracking-[0.2em] text-slate-700">
                    Ingredientes
                  </h3>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      <tr>
                        <th className="px-5 py-4">Producto</th>
                        <th className="px-5 py-4 text-center">Cantidad</th>
                        <th className="px-5 py-4 text-right">Coste unidad</th>
                        <th className="px-5 py-4 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">
                            Este escandallo no tiene ingredientes registrados.
                          </td>
                        </tr>
                      ) : (
                        detalleItems.map((item, index) => {
                          const subtotal = Number(item.cantidad) * Number(item.precio);
                          return (
                            <tr key={`${item.producto_id}-${index}`} className="border-t border-slate-100">
                              <td className="px-5 py-4 font-bold uppercase tracking-[0.06em] text-slate-700">
                                {item.nombre}
                              </td>
                              <td className="px-5 py-4 text-center text-slate-500">
                                {item.cantidad}
                              </td>
                              <td className="px-5 py-4 text-right text-slate-500">
                                {Number(item.precio).toFixed(2)} €
                              </td>
                              <td className="px-5 py-4 text-right font-bold text-slate-700">
                                {subtotal.toFixed(2)} €
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-8 rounded-[26px] border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-[2px] w-8 bg-[var(--color-brand-500)]"></span>
                  <h3 className="m-0 text-sm font-black uppercase tracking-[0.2em] text-slate-700">
                    Elaboración
                  </h3>
                </div>

                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white px-6 py-5 text-sm leading-7 text-slate-600 whitespace-pre-wrap">
                  {detalleEscandallo.elaboracion?.trim() || "Sin instrucciones de elaboración registradas."}
                </div>
              </section>

              <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                  onClick={cerrarDetalle}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-brand-500)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200/70 transition hover:bg-[var(--color-brand-600)]"
                  onClick={() => {
                    cerrarDetalle();
                    abrirEditarReceta(detalleEscandallo);
                  }}
                >
                  <i className="fa-solid fa-pen mr-2"></i>
                  Editar receta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay-escandallos modal-open-escandallos">
          <div className="modal-content">
            <button
              type="button"
              className="close-modal"
              aria-label="Cerrar ventana"
              onClick={cerrarModal}
            >
              &times;
            </button>

            <h2 className="modal-title">
              {modoLectura
                ? "Ver Receta"
                : editEscandalloId
                  ? "Editar Receta"
                  : "Nueva Receta"}
            </h2>

            <form onSubmit={guardarEscandallo}>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="nombrePlato" className="label-form">
                    <i className="fa-solid fa-utensils"></i>
                    Nombre del Plato
                  </label>
                  <input
                    type="text"
                    id="nombrePlato"
                    required
                    className="input-form"
                    placeholder="Ej: Tortilla Española"
                    value={nombrePlato}
                    disabled={modoLectura}
                    onChange={(e) => setNombrePlato(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pvpPlato" className="label-form">
                    <i className="fa-solid fa-euro-sign"></i>
                    Precio Venta (PVP)
                  </label>
                  <input
                    type="number"
                    id="pvpPlato"
                    step="0.01"
                    className="input-form"
                    value={pvpPlato}
                    disabled={modoLectura}
                    onChange={(e) => setPvpPlato(e.target.value)}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="elaboracionPlato" className="label-form">
                    <i className="fa-solid fa-list-ol"></i>
                    Pasos de Elaboración
                  </label>
                  <textarea
                    id="elaboracionPlato"
                    rows={4}
                    className="textarea-form"
                    placeholder="Describe los pasos para preparar la receta..."
                    value={elaboracionPlato}
                    disabled={modoLectura}
                    onChange={(e) => setElaboracionPlato(e.target.value)}
                  />
                </div>
              </div>

              <div className="calculadora-panel">
                <h3 className="calculadora-title">
                  <i className="fa-solid fa-basket-shopping"></i>
                  Ingredientes
                </h3>

                {!modoLectura && (
                  <div className="calculadora-controls">
                    <div className="control-group-grow">
                      <label
                        htmlFor="busquedaProductoIngrediente"
                        className="label-control"
                      >
                        Producto
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          id="busquedaProductoIngrediente"
                          className="input-form"
                          placeholder="Escribe al menos 2 letras..."
                          value={busquedaProductoIngrediente}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setBusquedaProductoIngrediente(nextValue);
                            setMostrarSugerenciasIngrediente(true);
                            if (productoIngredienteSeleccionado?.nombre !== nextValue) {
                              setProductoIngredienteId("");
                            }
                          }}
                          onFocus={() => {
                            if (busquedaProductoIngrediente.trim().length >= 2) {
                              setMostrarSugerenciasIngrediente(true);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && productosSugeridos.length === 1) {
                              e.preventDefault();
                              seleccionarIngrediente(productosSugeridos[0]);
                            }
                          }}
                        />

                        {productoIngredienteSeleccionado && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                              Seleccionado
                            </span>
                            <span>
                              {productoIngredienteSeleccionado.nombre} ({Number(productoIngredienteSeleccionado.precio).toFixed(2)} €)
                            </span>
                          </div>
                        )}

                        {mostrarSugerenciasIngrediente && productosSugeridos.length > 0 && (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
                            {productosSugeridos.map((producto) => (
                              <button
                                key={String(producto.id)}
                                type="button"
                                className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-slate-50"
                                onClick={() => seleccionarIngrediente(producto)}
                              >
                                <span className="min-w-0 pr-3">
                                  <span className="block truncate text-sm font-bold text-slate-700">
                                    {producto.nombre}
                                  </span>
                                  <span className="block text-xs text-slate-400">
                                    ID {producto.id}
                                  </span>
                                </span>
                                <span className="text-sm font-black text-[var(--color-brand-500)]">
                                  {Number(producto.precio).toFixed(2)} €
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {mostrarSugerenciasIngrediente && busquedaProductoIngrediente.trim().length >= 2 && productosSugeridos.length === 0 && (
                          <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-xl">
                            No se han encontrado ingredientes con ese nombre.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="control-group-fixed">
                      <label
                        htmlFor="cantidadIngrediente"
                        className="label-control"
                      >
                        Cant.
                      </label>
                      <input
                        type="number"
                        id="cantidadIngrediente"
                        step="0.001"
                        placeholder="0"
                        className="input-form"
                        value={cantidadIngrediente}
                        onChange={(e) => setCantidadIngrediente(e.target.value)}
                      />
                    </div>

                    <button
                      type="button"
                      className="btn-add-ingredient"
                      title="Añadir ingrediente"
                      onClick={agregarIngrediente}
                    >
                      <i className="fa-solid fa-plus"></i>
                    </button>
                  </div>
                )}

                <div className="table-container-ing">
                  <table className="table-ingredientes">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th style={{ width: "80px" }}>Cant.</th>
                        <th style={{ width: "80px" }}>Coste U.</th>
                        <th style={{ width: "90px" }}>Total</th>
                        <th style={{ width: "50px", textAlign: "center" }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientesReceta.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: "center" }}>
                            No hay ingredientes añadidos.
                          </td>
                        </tr>
                      ) : (
                        ingredientesReceta.map((ing, index) => {
                          const total = ing.cantidad * ing.precio;
                          return (
                            <tr key={`${ing.producto_id}-${index}`}>
                              <td>{ing.nombre}</td>
                              <td>
                                {modoLectura ? (
                                  ing.cantidad
                                ) : (
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    className="input-form"
                                    value={String(ing.cantidad)}
                                    onChange={(e) => actualizarCantidadIngrediente(index, e.target.value)}
                                  />
                                )}
                              </td>
                              <td>{ing.precio.toFixed(2)} €</td>
                              <td>{total.toFixed(2)} €</td>
                              <td className="action-cell">
                                {!modoLectura && (
                                  <button
                                    type="button"
                                    className="btn-eliminar-item"
                                    onClick={() => eliminarIngrediente(index)}
                                  >
                                    <i className="fa-solid fa-trash"></i>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="tfoot-resumen">
                        <td colSpan={3} className="tfoot-label">
                          COSTE TOTAL:
                        </td>
                        <td className="tfoot-total">
                          {costeTotal.toFixed(2)} €
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-5">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Coste actual
                  </span>
                  <span className="mt-2 block text-3xl font-black text-slate-800">
                    {costeTotal.toFixed(2)} €
                  </span>
                  <p className="mt-2 mb-0 text-sm text-slate-500">
                    Suma de todos los ingredientes de la receta.
                  </p>
                </article>

                <article className="rounded-3xl border border-red-100 bg-red-50/70 px-6 py-5">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-[var(--color-brand-500)]">
                    PVP sugerido
                  </span>
                  <span className="mt-2 block text-3xl font-black text-[var(--color-brand-500)]">
                    {pvp.toFixed(2)} €
                  </span>
                  <p className="mt-2 mb-0 text-sm text-slate-500">
                    Precio final que verá el usuario o cliente interno.
                  </p>
                </article>

                <article className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
                  <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Rentabilidad
                  </span>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className={`inline-flex rounded-full px-4 py-2 text-xl font-black ring-1 ${classMargenBadge(margenBeneficio)}`}>
                      {margenBeneficio.toFixed(1)}%
                    </span>
                    <span className="text-2xl font-black text-slate-700">
                      {beneficioNeto.toFixed(2)} €
                    </span>
                  </div>
                  <p className="mt-2 mb-0 text-sm text-slate-500">
                    Margen y beneficio neto calculados en tiempo real.
                  </p>
                </article>
              </div>

              <div className="form-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={cerrarModal}
                >
                  Cancelar
                </button>

                {!modoLectura && (
                  <button type="submit" className="btn-save">
                    <i className="fa-solid fa-save"></i> Guardar Receta
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
