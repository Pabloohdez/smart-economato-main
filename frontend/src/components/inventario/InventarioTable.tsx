import { useMemo } from "react";
import type { Producto } from "../../services/productosService";

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const dt = new Date(String(d).replace(" ", "T"));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function daysFromNow(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(d: Date): string {
  return new Intl.DateTimeFormat("es-ES").format(d);
}

export default function InventarioTable({ items }: { items: Producto[] }) {
  const rows = useMemo(() => {
    return items.map((p) => {
      const stock = Number(p.stock ?? 0);
      const min = Number((p as any).stockMinimo ?? 0);
      const cad = parseDate((p as any).fechaCaducidad);
      const cadDias = cad ? daysFromNow(cad) : null;
      const alerta = stock <= min || (cadDias != null && cadDias < 0);
      return { p, stock, min, cadDias, alerta };
    });
  }, [items]);

  return (
    <div className="panel-tabla">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Caducidad</th>
              <th>Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 20, color: "#718096" }}>
                  No hay productos para mostrar.
                </td>
              </tr>
            ) : (
              rows.map(({ p, stock, min, cadDias, alerta }) => {
                const stockBajo = stock <= min;
                let cadLabel = "—";
                let cadClass = "badge-fecha-normal";
                if (cadDias != null) {
                  if (cadDias < 0) {
                    cadLabel = "⚠ CADUCADO";
                    cadClass = "badge-caducado";
                  } else if (cadDias <= 30) {
                    cadLabel = `⏰ ${cadDias}d`;
                    cadClass = "badge-proximo-caducar";
                  } else {
                    const fecha = new Date(Date.now() + cadDias * 24 * 60 * 60 * 1000);
                    cadLabel = formatShortDate(fecha);
                    cadClass = "badge-fecha-normal";
                  }
                }

                return (
                  <tr key={String(p.id)} className={alerta ? "alerta-row" : ""}>
                    <td className={alerta ? "alerta-cell" : ""}>{String(p.id ?? "")}</td>
                    <td className={alerta ? "alerta-cell" : ""}>{String(p.nombre ?? "—")}</td>
                    <td className={alerta ? "alerta-cell" : ""}>{String(p.categoria?.nombre ?? "—")}</td>
                    <td className={alerta ? "alerta-cell" : ""}>
                      <span className="precio">{Number(p.precio ?? 0).toFixed(2)} €</span>
                    </td>
                    <td className={alerta ? "alerta-cell" : ""}>
                      <span className={stockBajo ? "badge-stock-bajo" : "badge-stock-ok"}>{stock}</span>
                    </td>
                    <td className={alerta ? "alerta-cell" : ""}>
                      <span className={cadClass}>{cadLabel}</span>
                    </td>
                    <td className={alerta ? "alerta-cell" : ""}>{String(p.proveedor?.nombre ?? "—")}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="resumen-inventario">
        <div>
          Total productos: <span className="resumen-valor">{items.length}</span>
        </div>
      </div>
    </div>
  );
}