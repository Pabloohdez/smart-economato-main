import { useEffect, useMemo, useState } from "react";
import { getProductos, type Producto } from "../services/productosService";
import "../styles/escandallos.css";

type IngredienteReceta = {
  producto_id: number | string;
  nombre: string;
  cantidad: number;
  precio: number;
};

type Escandallo = {
  id: number;
  nombre: string;
  autor: string;
  coste: number;
  pvp: number;
  items: IngredienteReceta[];
  elaboracion: string;
};

const ESCANDALLOS_INICIALES: Escandallo[] = [
  {
    id: 1,
    nombre: "Tortilla de Patatas",
    autor: "Admin",
    coste: 1.5,
    pvp: 8.0,
    items: [
      { producto_id: 101, nombre: "Huevos", cantidad: 4, precio: 0.2 },
      { producto_id: 102, nombre: "Patatas", cantidad: 1, precio: 0.5 },
      { producto_id: 103, nombre: "Aceite", cantidad: 0.1, precio: 2.0 },
      { producto_id: 999, nombre: "Sal", cantidad: 0.01, precio: 0.6 },
    ],
    elaboracion:
      "1. Pelar y cortar las patatas.\n2. Freír las patatas en abundante aceite.\n3. Batir los huevos con sal.\n4. Mezclar patatas con huevos.\n5. Cuajar la tortilla en la sartén.",
  },
  {
    id: 2,
    nombre: "Ensalada Mixta",
    autor: "Admin",
    coste: 2.1,
    pvp: 9.5,
    items: [
      { producto_id: 201, nombre: "Lechuga", cantidad: 1, precio: 0.8 },
      { producto_id: 202, nombre: "Tomate", cantidad: 2, precio: 0.4 },
      { producto_id: 203, nombre: "Atún", cantidad: 1, precio: 0.9 },
      { producto_id: 999, nombre: "Sal", cantidad: 0.01, precio: 0.6 },
    ],
    elaboracion:
      "1. Lavar y trocear la lechuga.\n2. Cortar el tomate en gajos.\n3. Añadir el atún desmenuzado.\n4. Aliñar con aceite, vinagre y sal al gusto.",
  },
  {
    id: 3,
    nombre: "Salmorejo Cordobés",
    autor: "Admin",
    coste: 1.85,
    pvp: 9.0,
    items: [
      { producto_id: 202, nombre: "Tomate", cantidad: 2, precio: 0.4 },
      { producto_id: 103, nombre: "Aceite", cantidad: 0.15, precio: 2.0 },
      { producto_id: 401, nombre: "Pan Duro", cantidad: 0.3, precio: 0.8 },
      { producto_id: 402, nombre: "Ajo", cantidad: 0.01, precio: 4.0 },
      { producto_id: 999, nombre: "Sal", cantidad: 0.02, precio: 0.6 },
    ],
    elaboracion:
      "1. Triturar los tomates con el ajo.\n2. Añadir el pan troceado y triturar más.\n3. Emulsionar con el aceite poco a poco.\n4. Corregir de sal y servir muy frío.",
  },
  {
    id: 4,
    nombre: "Croquetas de Jamón",
    autor: "Admin",
    coste: 3.2,
    pvp: 12.0,
    items: [
      { producto_id: 501, nombre: "Leche", cantidad: 1, precio: 0.9 },
      { producto_id: 502, nombre: "Harina", cantidad: 0.15, precio: 0.7 },
      { producto_id: 503, nombre: "Mantequilla", cantidad: 0.1, precio: 6.0 },
      {
        producto_id: 504,
        nombre: "Jamón Serrano",
        cantidad: 0.2,
        precio: 15.0,
      },
      { producto_id: 999, nombre: "Sal", cantidad: 0.01, precio: 0.6 },
    ],
    elaboracion:
      "1. Tostar la harina en la mantequilla.\n2. Añadir leche caliente poco a poco.\n3. Incorporar el jamón picado.\n4. Enfriar, bolear, empanar y freír.",
  },
];

export default function EscandallosPage() {
  const [todosLosProductos, setTodosLosProductos] = useState<Producto[]>([]);
  const [escandallos, setEscandallos] = useState<Escandallo[]>(
    ESCANDALLOS_INICIALES,
  );

  const [loadingProductos, setLoadingProductos] = useState(true);
  const [err, setErr] = useState("");

  const [busquedaReceta, setBusquedaReceta] = useState("");
  const [busquedaIngrediente, setBusquedaIngrediente] = useState("");
  const [filtroReceta, setFiltroReceta] = useState("");
  const [filtroIngrediente, setFiltroIngrediente] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modoLectura, setModoLectura] = useState(false);

  const [editEscandalloId, setEditEscandalloId] = useState<number | null>(null);
  const [nombrePlato, setNombrePlato] = useState("");
  const [pvpPlato, setPvpPlato] = useState("0");
  const [elaboracionPlato, setElaboracionPlato] = useState("");

  const [ingredientesReceta, setIngredientesReceta] = useState<
    IngredienteReceta[]
  >([]);
  const [productoIngredienteId, setProductoIngredienteId] = useState("");
  const [cantidadIngrediente, setCantidadIngrediente] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr("");
        setLoadingProductos(true);

        const productos = await getProductos();
        if (!alive) return;

        const lista = Array.isArray(productos) ? [...productos] : [];

        if (
          !lista.find((p) => String(p.nombre).trim().toLowerCase() === "sal")
        ) {
          lista.push({
            id: "999",
            nombre: "Sal",
            precio: 0.6,
            stock: 0,
            proveedorId: null,
            categoriaId: null,
          } as Producto);
        }

        setTodosLosProductos(lista);
      } catch (e) {
        console.warn("No se pudieron cargar productos de la API.", e);
        if (alive) {
          setErr("No se pudieron cargar productos de la API.");
          setTodosLosProductos([
            {
              id: "999",
              nombre: "Sal",
              precio: 0.6,
              stock: 0,
              proveedorId: null,
              categoriaId: null,
            } as Producto,
          ]);
        }
      } finally {
        if (alive) setLoadingProductos(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

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
    cargarRecetaEnFormulario(esc, true);
  }

  function cargarRecetaEnFormulario(esc: Escandallo, readonly: boolean) {
    setEditEscandalloId(esc.id);
    setNombrePlato(esc.nombre);
    setPvpPlato(String(esc.pvp));
    setElaboracionPlato(esc.elaboracion || "");
    setIngredientesReceta([...(esc.items || [])]);
    setProductoIngredienteId("");
    setCantidadIngrediente("");
    setModoLectura(readonly);
    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
  }

  function limpiarFormulario() {
    setEditEscandalloId(null);
    setNombrePlato("");
    setPvpPlato("0");
    setElaboracionPlato("");
    setIngredientesReceta([]);
    setProductoIngredienteId("");
    setCantidadIngrediente("");
  }

  function agregarIngrediente() {
    const prodId = productoIngredienteId;
    const cantidad = Number.parseFloat(cantidadIngrediente);

    if (!prodId || Number.isNaN(cantidad) || cantidad <= 0) {
      alert("Selecciona un producto y una cantidad válida.");
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
  }

  function eliminarIngrediente(index: number) {
    setIngredientesReceta((prev) => prev.filter((_, i) => i !== index));
  }

  function guardarEscandallo(e: React.FormEvent) {
    e.preventDefault();

    if (ingredientesReceta.length === 0) {
      alert("La receta debe tener al menos un ingrediente.");
      return;
    }

    const nuevoEscandallo: Escandallo = {
      id: editEscandalloId ?? Date.now(),
      nombre: nombrePlato.trim(),
      pvp: Number.parseFloat(pvpPlato || "0") || 0,
      coste: costeTotal,
      elaboracion: elaboracionPlato,
      items: [...ingredientesReceta],
      autor: "Admin",
    };

    if (!nuevoEscandallo.nombre) {
      alert("El nombre del plato es obligatorio.");
      return;
    }

    setEscandallos((prev) => {
      if (editEscandalloId) {
        return prev.map((item) =>
          item.id === editEscandalloId ? nuevoEscandallo : item,
        );
      }
      return [...prev, nuevoEscandallo];
    });

    cerrarModal();
    limpiarFormulario();
    alert("Receta guardada correctamente (Local).");
  }

  function eliminarEscandallo(id: number) {
    const esc = escandallos.find((x) => x.id === id);
    if (!esc) {
      alert("Error: Receta no encontrada.");
      return;
    }

    const confirmado = window.confirm(
      `¿Eliminar la receta "${esc.nombre}"?\n\nEsta acción no se puede deshacer.`,
    );
    if (!confirmado) return;

    setEscandallos((prev) => prev.filter((x) => x.id !== id));
    alert("Receta eliminada correctamente.");
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

      {loadingProductos && <p className="estado">Cargando productos...</p>}
      {err && <p className="estado warning">{err}</p>}

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
              <th>Editar</th>
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

      {modalOpen && (
        <div className="modal-overlay modal-open">
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
                        htmlFor="selectProductoIngrediente"
                        className="label-control"
                      >
                        Producto
                      </label>
                      <select
                        id="selectProductoIngrediente"
                        className="select-form"
                        value={productoIngredienteId}
                        onChange={(e) =>
                          setProductoIngredienteId(e.target.value)
                        }
                      >
                        <option value="">Buscar ingrediente...</option>
                        {todosLosProductos.map((prod) => (
                          <option key={String(prod.id)} value={String(prod.id)}>
                            {prod.nombre} ({Number(prod.precio).toFixed(2)}€)
                          </option>
                        ))}
                      </select>
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
                              <td>{ing.cantidad}</td>
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

              <div className="resumen-panel">
                <div className="resumen-item">
                  <strong>Margen Beneficio:</strong>
                  <span className={classMargenResumen(margenBeneficio)}>
                    {margenBeneficio.toFixed(1)}%
                  </span>
                </div>
                <div className="resumen-item">
                  <strong>Beneficio Neto:</strong>
                  <span className="resumen-value">
                    {beneficioNeto.toFixed(2)} €
                  </span>
                </div>
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
