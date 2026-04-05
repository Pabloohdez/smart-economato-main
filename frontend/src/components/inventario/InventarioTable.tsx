import { useEffect, useRef } from "react";
import { Grid, html } from "gridjs";
import "gridjs/dist/theme/mermaid.css";
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

function buildGridData(items: Producto[]) {
  return items.map((p) => {
    const stock = Number(p.stock ?? 0);
    const min = Number((p as any).stockMinimo ?? 0);
    const cad = parseDate((p as any).fechaCaducidad);
    const cadDias = cad ? daysFromNow(cad) : 999999;
    const alertaFlag = stock <= min || cadDias < 0 ? 1 : 0;

    return [
      String(p.id ?? ""),
      String(p.nombre ?? "—"),
      String(p.categoria?.nombre ?? "—"),
      Number(p.precio ?? 0),
      stock,
      min,
      cadDias,
      String(p.proveedor?.nombre ?? "—"),
      alertaFlag,
    ];
  });
}

export default function InventarioTable({ items }: { items: Producto[] }) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridInstance = useRef<Grid | null>(null);

  function getAlertCellAttributes(_cell: unknown, row: any) {
    const isAlertRow = Number(row?.cells?.[8]?.data ?? 0) === 1;
    return isAlertRow ? { className: "alerta-cell" } : {};
  }

  useEffect(() => {
    if (!gridRef.current || gridInstance.current) return;

    gridInstance.current = new Grid({
      columns: [
        { name: "ID", sort: true, attributes: getAlertCellAttributes },

        { name: "Producto", sort: true, attributes: getAlertCellAttributes },

        { name: "Categoría", sort: true, attributes: getAlertCellAttributes },

        {
          name: "Precio",
          sort: true,
          attributes: getAlertCellAttributes,
          formatter: (precio) => {
            const n = Number(precio ?? 0);
            return html(`<span class="precio">${n.toFixed(2)} €</span>`);
          },
        },

        {
          name: "Stock",
          sort: true,
          attributes: getAlertCellAttributes,
          formatter: (stockCell, row) => {
            const stock = Number(stockCell ?? 0);
            const min = Number(row.cells[5].data ?? 0); // stockMin
            const stockBajo = stock <= min;

            return html(
              stockBajo
                ? `<span class="badge-stock-bajo">${stock}</span>`
                : `<span class="badge-stock-ok">${stock}</span>`,
            );
          },
        },

        {
          name: "Caducidad",
          sort: true,
          attributes: getAlertCellAttributes,
          formatter: (_cadDiasCell, row) => {
            const cadDias = Number(row.cells[6].data ?? 999999);

            // sin fecha
            if (cadDias === 999999) {
              return html(`<span class="badge-fecha-normal">—</span>`);
            }

            if (cadDias < 0) {
              return html(`<span class="badge-caducado">⚠ CADUCADO</span>`);
            }

            if (cadDias <= 30) {
              return html(
                `<span class="badge-proximo-caducar">⏰ ${cadDias}d</span>`,
              );
            }

            // si es > 30 días, mostramos fecha aproximada
            // (si quieres exacta, necesitaríamos pasar la fecha original en otra columna oculta)
            const fecha = new Date(Date.now() + cadDias * 24 * 60 * 60 * 1000);
            return html(
              `<span class="badge-fecha-normal">${formatShortDate(fecha)}</span>`,
            );
          },
        },

        { name: "Proveedor", sort: true, attributes: getAlertCellAttributes },

        // Columna oculta: alertaFlag (para pintar fila)
        { name: "alerta", hidden: true },
      ],

      data: [],

      search: true,
      sort: true,
      pagination: { limit: 10 },

      language: {
        search: { placeholder: "Buscar producto..." },
        pagination: {
          previous: "Anterior",
          next: "Siguiente",
          showing: "Mostrando",
          results: () => "resultados",
        },
      },
    });

    gridInstance.current.render(gridRef.current);

    return () => {
      if (gridInstance.current) {
        try {
          gridInstance.current.destroy();
        } catch {
          // ignore
        }
        gridInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!gridInstance.current) return;

    gridInstance.current.updateConfig({ data: buildGridData(items) }).forceRender();
  }, [items]);

  return (
    <div className="panel-tabla">
      <div ref={gridRef} />
      <div className="resumen-inventario">
        <div>
          Total productos: <span className="resumen-valor">{items.length}</span>
        </div>
      </div>
    </div>
  );
}