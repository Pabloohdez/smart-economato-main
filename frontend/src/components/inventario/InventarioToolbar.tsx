import type { Categoria, Proveedor } from "../../services/productosService";

type Props = {
  q: string;
  setQ: (v: string) => void;

  cats: Categoria[];
  catId: string;
  setCatId: (v: string) => void;

  provs: Proveedor[];
  provId: string;
  setProvId: (v: string) => void;

  orden: "asc" | "desc";
  setOrden: (v: "asc" | "desc") => void;

  onlyStockBajo: boolean;
  setOnlyStockBajo: (v: boolean) => void;

  onlyProximoCaducar: boolean;
  setOnlyProximoCaducar: (v: boolean) => void;

  limpiarFiltros: () => void;
};

export default function InventarioToolbar({
  q,
  setQ,
  cats,
  catId,
  setCatId,
  provs,
  provId,
  setProvId,
  orden,
  setOrden,
  onlyStockBajo,
  setOnlyStockBajo,
  onlyProximoCaducar,
  setOnlyProximoCaducar,
  limpiarFiltros,
}: Props) {
  return (
    <div className="panel-controles">
      <div className="campo-busqueda-inventario">
        <span className="icono-busqueda" aria-hidden="true">
          🔎
        </span>

        <input
          className="input-busqueda-inventario"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto por nombre o código..."
          aria-label="Buscar producto por nombre o código"
        />

        <button className="btn-buscar-inventario" type="button">
          Buscar
        </button>
      </div>

      <div className="controles-filtros">
        <div className="grupo-filtro">
          <label className="label-filtro">🏷️ Categoría</label>
          <select
            className="select-filtro-inventario"
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {cats.map((c) => (
              <option key={String(c.id)} value={String(c.id)}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grupo-filtro">
          <label className="label-filtro">🚚 Proveedor</label>
          <select
            className="select-filtro-inventario"
            value={provId}
            onChange={(e) => setProvId(e.target.value)}
          >
            <option value="">Todos los proveedores</option>
            {provs.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grupo-filtro">
          <label className="label-filtro">↕️ Ordenar</label>
          <select
            className="select-filtro-inventario"
            value={orden}
            onChange={(e) => setOrden(e.target.value as "asc" | "desc")}
          >
            <option value="asc">Precio: Menor a Mayor</option>
            <option value="desc">Precio: Mayor a Menor</option>
          </select>
        </div>
      </div>

      <div className="controles-acciones">
        <button
          className={`btn-accion-inventario btn-stock ${onlyStockBajo ? "is-on" : ""}`}
          type="button"
          onClick={() => setOnlyStockBajo(!onlyStockBajo)}
        >
          ⚠️ Stock Bajo
        </button>

        <button
          className={`btn-accion-inventario btn-caducar ${onlyProximoCaducar ? "is-on" : ""}`}
          type="button"
          onClick={() => setOnlyProximoCaducar(!onlyProximoCaducar)}
        >
          ⏰ Próximo a Caducar
        </button>

        <button className="btn-accion-inventario btn-limpiar" type="button" onClick={limpiarFiltros}>
          🧹 Limpiar Filtros
        </button>
      </div>
    </div>
  );
}
