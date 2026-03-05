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

export default function InventarioTable({ items }: { items: Producto[] }) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridInstance = useRef<Grid | null>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    // destruir grid anterior
    if (gridInstance.current) {
      try {
        gridInstance.current.destroy();
      } catch {
        // ignore
      }
      gridInstance.current = null;
    }

    // ✅ IMPORTANTE: Data con números puros, y el HTML lo metemos en formatter
    // Estructura de cada fila:
    // [id, nombre, categoria, precioNum, stockNum, stockMinNum, cadDiasNum(999999 si no hay), proveedor, alertaFlag]
    const data = items.map((p) => {
      const stock = Number(p.stock ?? 0);
      const min = Number((p as any).stockMinimo ?? 0);

      const cad = parseDate((p as any).fechaCaducidad);
      const cadDias = cad ? daysFromNow(cad) : 999999; // sin fecha -> al final al ordenar

      const caducado = cadDias < 0;
      const stockBajo = stock <= min;
      const alertaFlag = stockBajo || caducado ? 1 : 0;

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

    gridInstance.current = new Grid({
      columns: [
        { name: "ID", sort: true },

        { name: "Producto", sort: true },

        { name: "Categoría", sort: true },

        {
          name: "Precio",
          sort: true,
          formatter: (precio) => {
            const n = Number(precio ?? 0);
            return html(`<span class="precio">${n.toFixed(2)} €</span>`);
          },
        },

        {
          name: "Stock",
          sort: true,
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

        { name: "Proveedor", sort: true },

        // Columna oculta: alertaFlag (para pintar fila)
        { name: "alerta", hidden: true },
      ],

      data,

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

    // Pintar filas alerta (según alertaFlag oculto)
    const paintAlertRows = () => {
      const root = gridRef.current;
      if (!root) return;
      const trs = root.querySelectorAll("tbody tr");

      trs.forEach((tr) => {
        // la columna oculta sigue existiendo en row.cells, pero en DOM no hay td.
        // así que detectamos alerta leyendo la fila GridJS (más robusto con dataset):
        // ✅ truco: si badge caducado o stock-bajo existe, marcamos alerta.
        const isAlert =
          tr.querySelector(".badge-caducado") ||
          tr.querySelector(".badge-stock-bajo");

        if (isAlert) tr.classList.add("alerta");
        else tr.classList.remove("alerta");
      });
    };

    const obs = new MutationObserver(() => paintAlertRows());
    obs.observe(gridRef.current, { childList: true, subtree: true });
    paintAlertRows();

    return () => {
      obs.disconnect();
      if (gridInstance.current) {
        try {
          gridInstance.current.destroy();
        } catch {
          // ignore
        }
        gridInstance.current = null;
      }
    };
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