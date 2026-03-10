import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ingreso.css";

// Ajusta esta línea si en tu proyecto real estos métodos están en otro service
import { getCategorias, getProveedores, crearProducto } from "../services/productosService";

type Categoria = {
  id: number | string;
  nombre: string;
};

type Proveedor = {
  id: number | string;
  nombre: string;
};

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

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);

  const [nombre, setNombre] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [proveedorId, setProveedorId] = useState("");

  const [listaTemporal, setListaTemporal] = useState<ProductoTemporal[]>([]);
  const [loadingSelects, setLoadingSelects] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<"ok" | "warn" | "error" | "info" | "">("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingSelects(true);
        const [cats, provs] = await Promise.all([getCategorias(), getProveedores()]);

        if (!alive) return;

        setCategorias(Array.isArray(cats) ? cats : []);
        setProveedores(Array.isArray(provs) ? provs : []);
      } catch (e) {
        console.error("Error cargando categorías/proveedores:", e);
        if (alive) {
          setMensajeEstado("Error cargando categorías y proveedores.");
          setMensajeTipo("error");
        }
      } finally {
        if (alive) setLoadingSelects(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

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
    setStock("");
    setStockMin("");
    setProveedorId("");
  }

  function agregarALista() {
    const nombreLimpio = nombre.trim();
    const precioNum = parseFloat(precio);
    const stockNum = parseInt(stock, 10);
    const stockMinNum = parseInt(stockMin, 10);

    if (!nombreLimpio || !categoriaId || !proveedorId || Number.isNaN(precioNum)) {
      setMensajeEstado("Por favor completa todos los campos obligatorios.");
      setMensajeTipo("warn");
      return;
    }

    const categoriaNombre =
      categorias.find((c) => String(c.id) === String(categoriaId))?.nombre ?? "";
    const proveedorNombre =
      proveedores.find((p) => String(p.id) === String(proveedorId))?.nombre ?? "";

    const nuevoProducto: ProductoTemporal = {
      nombre: nombreLimpio,
      precio: precioNum,
      precioUnitario: "unidad",
      stock: Number.isNaN(stockNum) ? 0 : stockNum,
      stockMinimo: Number.isNaN(stockMinNum) ? 5 : stockMinNum,
      categoriaId,
      proveedorId,
      unidadMedida: "unidad",
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

  function limpiarLista() {
    if (listaTemporal.length === 0) return;

    const confirmado = window.confirm("¿Estás seguro de descartar toda la lista?");
    if (!confirmado) return;

    setListaTemporal([]);
    setMensajeEstado("Lista limpiada.");
    setMensajeTipo("info");
  }

  async function guardarEnBaseDeDatos() {
    if (listaTemporal.length === 0) return;

    const confirmado = window.confirm(
      `¿Confirmas importar ${listaTemporal.length} productos al inventario?`
    );
    if (!confirmado) return;

    try {
      setGuardando(true);
      setMensajeEstado("Procesando...");
      setMensajeTipo("info");

      let guardados = 0;
      let errores = 0;

      for (const producto of listaTemporal) {
        try {
          const productoLimpio = {
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
          };

          await crearProducto(productoLimpio);
          guardados++;
        } catch (error) {
          console.error(`Error guardando ${producto.nombre}:`, error);
          errores++;
        }
      }

      if (errores === 0) {
        setMensajeEstado(`¡Éxito! Se guardaron ${guardados} productos correctamente.`);
        setMensajeTipo("ok");
        setListaTemporal([]);
      } else {
        setMensajeEstado(`Se guardaron ${guardados}, pero fallaron ${errores}.`);
        setMensajeTipo("warn");
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <button type="button" className="btn-volver" onClick={() => nav("/inventario")}>
          <i className="fa-solid fa-arrow-left"></i> Volver al Inventario
        </button>
      </div>

      <h1 className="titulo-ingreso">INGRESO MASIVO DE MERCANCÍA</h1>

      <div className="panel-captura">
        <div className="campo-grupo campo-nombre">
          <label className="label-input" htmlFor="inputNombre">
            Nombre del Producto
          </label>
          <input
            id="inputNombre"
            type="text"
            className="input-form"
            placeholder="Ej: Leche Entera"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="campo-grupo campo-categoria">
          <label className="label-input" htmlFor="selectCategoria">
            Categoría
          </label>
          <select
            id="selectCategoria"
            className="input-form"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            disabled={loadingSelects}
          >
            <option value="">
              {loadingSelects ? "Cargando..." : "Seleccionar..."}
            </option>
            {categorias.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-grupo campo-precio">
          <label className="label-input" htmlFor="inputPrecio">
            Precio (€)
          </label>
          <input
            id="inputPrecio"
            type="number"
            className="input-form"
            placeholder="0.00"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </div>

        <div className="campo-grupo campo-stock">
          <label className="label-input" htmlFor="inputStock">
            Stock
          </label>
          <input
            id="inputStock"
            type="number"
            className="input-form"
            placeholder="0"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>

        <div className="campo-grupo campo-stock">
          <label className="label-input" htmlFor="inputStockMin">
            Mínimo
          </label>
          <input
            id="inputStockMin"
            type="number"
            className="input-form"
            placeholder="5"
            value={stockMin}
            onChange={(e) => setStockMin(e.target.value)}
          />
        </div>

        <div className="campo-grupo campo-proveedor">
          <label className="label-input" htmlFor="selectProveedor">
            Proveedor
          </label>
          <select
            id="selectProveedor"
            className="input-form"
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            disabled={loadingSelects}
          >
            <option value="">
              {loadingSelects ? "Cargando..." : "Seleccionar..."}
            </option>
            {proveedores.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <button type="button" className="btn-accion btn-agregar" onClick={agregarALista}>
          <i className="fa-solid fa-plus"></i> Agregar
        </button>
      </div>

      <div className="seccion-tabla">
        <h3 className="titulo-lista">
          <i className="fa-solid fa-list-check"></i> Lista de Previsualización
          <span className="badge-contador">{contadorTexto}</span>
        </h3>

        <table className="tabla-temporal">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Proveedor</th>
              <th style={{ textAlign: "center" }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {listaTemporal.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#a0aec0" }}>
                  La lista está vacía.
                </td>
              </tr>
            ) : (
              listaTemporal.map((prod, index) => (
                <tr key={`${prod.codigoBarras}-${index}`}>
                  <td>{prod.nombre}</td>
                  <td>{prod._tempCategoriaNombre}</td>
                  <td>{prod.precio.toFixed(2)} €</td>
                  <td>{prod.stock}</td>
                  <td>{prod._tempProveedorNombre}</td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      className="btn-borrar-fila"
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

      <div className="acciones-finales">
        <button
          type="button"
          className={`btn-accion btn-limpiar ${listaTemporal.length === 0 ? "oculto" : ""}`}
          onClick={limpiarLista}
        >
          <i className="fa-solid fa-trash"></i> Descartar Todo
        </button>

        <button
          type="button"
          className={`btn-accion btn-guardar ${listaTemporal.length === 0 ? "oculto" : ""}`}
          onClick={guardarEnBaseDeDatos}
          disabled={guardando}
        >
          <i className="fa-solid fa-cloud-arrow-up"></i>{" "}
          {guardando ? "Guardando..." : "CONFIRMAR E IMPORTAR"}
        </button>
      </div>

      <p className={`mensaje-estado ${mensajeTipo ? `mensaje-${mensajeTipo}` : ""}`}>
        {mensajeEstado}
      </p>
    </div>
  );
}