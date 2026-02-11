import type { Producto } from "../../services/productosService";

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const dt = new Date(d.replace(" ", "T"));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function daysFromNow(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(d: Date): string {
  return new Intl.DateTimeFormat("es-ES").format(d);
}

export default function InventarioTable({ items }: { items: Producto[] }) {
  return (
    <div className="tabla-wrapper">
      <table className="inv-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Caducidad</th>
            <th>Proveedor</th>
          </tr>
        </thead>

        <tbody>
          {items.map((p) => {
            const stock = Number(p.stock ?? 0);
            const min = Number(p.stockMinimo ?? 0);
            const stockBajo = stock <= min;

            const cad = parseDate(p.fechaCaducidad);
            const cadDias = cad ? daysFromNow(cad) : null;

            const caducado = cadDias != null && cadDias < 0;
            const proximo = cadDias != null && cadDias >= 0 && cadDias <= 30;

            const rowAlert = stockBajo || caducado;

            return (
              <tr key={p.id} className={rowAlert ? "alerta" : ""}>
                <td>{p.id}</td>
                <td>{p.nombre}</td>
                <td>{p.categoria?.nombre ?? "—"}</td>
                <td className="precio">{Number(p.precio ?? 0).toFixed(2)} €</td>

                <td>
                  <span className={stockBajo ? "badge-stock-bajo" : "badge-stock-ok"}>
                    {stock}
                  </span>
                </td>

                <td>
                  {caducado && <span className="badge-caducado">⚠ CADUCADO</span>}
                  {!caducado && proximo && (
                    <span className="badge-proximo-caducar">⏰ {cadDias}d</span>
                  )}
                  {!caducado && !proximo && cad && (
                    <span className="badge-fecha-normal">{formatShortDate(cad)}</span>
                  )}
                  {!cad && <span className="badge-fecha-normal">—</span>}
                </td>

                <td>{p.proveedor?.nombre ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="resumen-inventario">
        <div>Total productos: <span className="resumen-valor">{items.length}</span></div>
      </div>
    </div>
  );
}
