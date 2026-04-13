import type { Categoria, Proveedor } from "../../services/productosService";
import UiSelect from "../ui/UiSelect";

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

  onScanBarcode: () => void;

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
  onScanBarcode,
  limpiarFiltros,
}: Props) {
  return (
    <div className="panel-controles">
      <div className="campo-busqueda-inventario">
        <span className="icono-busqueda" aria-hidden="true">
          <i className="fa-solid fa-magnifying-glass" />
        </span>

        <input
          className="input-busqueda-inventario"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto por nombre o código..."
          aria-label="Buscar producto por nombre o código"
        />

        <button
          id="btnEscanearInventario"
          className="btn-scan-inventario"
          type="button"
          onClick={onScanBarcode}
          aria-label="Escanear codigo de barras"
          title="Escanear codigo"
        >
          <i className="fa-solid fa-camera" />
        </button>
      </div>

      <div className="controles-filtros">
        <div className="grupo-filtro">
          <label className="label-filtro"><i className="fa-solid fa-tag" /> Categoría</label>
          <UiSelect
            value={catId}
            onChange={setCatId}
            placeholder="Todas las categorías"
            options={[
              { value: "", label: "Todas las categorías" },
              ...cats.map((c) => ({ value: String(c.id), label: c.nombre })),
            ]}
          />
        </div>

        <div className="grupo-filtro">
          <label className="label-filtro"><i className="fa-solid fa-truck" /> Proveedor</label>
          <UiSelect
            value={provId}
            onChange={setProvId}
            placeholder="Todos los proveedores"
            options={[
              { value: "", label: "Todos los proveedores" },
              ...provs.map((p) => ({ value: String(p.id), label: p.nombre })),
            ]}
          />
        </div>

        <div className="grupo-filtro">
          <label className="label-filtro"><i className="fa-solid fa-arrow-up-short-wide" /> Ordenar</label>
          <UiSelect
            value={orden}
            onChange={(v) => setOrden(v as "asc" | "desc")}
            options={[
              { value: "asc", label: "Precio: Menor a Mayor" },
              { value: "desc", label: "Precio: Mayor a Menor" },
            ]}
          />
        </div>
      </div>

      <div className="controles-acciones">
        <button
          className={`btn-accion-inventario btn-stock ${onlyStockBajo ? "is-on" : ""}`}
          type="button"
          onClick={() => setOnlyStockBajo(!onlyStockBajo)}
        >
          <i className="fa-solid fa-triangle-exclamation" /> Stock Bajo
        </button>

        <button
          className={`btn-accion-inventario btn-caducar ${onlyProximoCaducar ? "is-on" : ""}`}
          type="button"
          onClick={() => setOnlyProximoCaducar(!onlyProximoCaducar)}
        >
          <i className="fa-solid fa-clock" /> Próximo a Caducar
        </button>

        <button
          className="btn-accion-inventario btn-limpiar"
          type="button"
          onClick={limpiarFiltros}
        >
          <i className="fa-solid fa-filter-circle-xmark" /> Limpiar Filtros
        </button>
      </div>
    </div>
  );
}
