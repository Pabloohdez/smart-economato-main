import { useEffect, useRef } from "react";
import { Grid, html } from "gridjs";
import "gridjs/dist/theme/mermaid.css";
import type { PedidoHistorial } from "../../types";

type Props = {
  pedidos: PedidoHistorial[];
  onIrARecepcion: (id: number | string) => void;
};

export default function PedidosGrid({ pedidos, onIrARecepcion }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<Grid | null>(null);

  useEffect(() => {
    if (!wrapperRef.current) return;

    if (gridRef.current) {
      gridRef.current.destroy();
      gridRef.current = null;
    }

    const grid = new Grid({
      columns: [
        "ID",
        "Proveedor",
        "Estado",
        "Total",
        {
          name: "Acciones",
          formatter: (_cell, row) => {
            const id = row.cells[0].data;
            const estado = String(row.cells[2].data ?? "").toUpperCase();

            if (estado === "PENDIENTE" || estado === "INCOMPLETO") {
              return html(
                `<button class="btn-grid-recepcion" data-id="${id}">Ir a Recepción</button>`
              );
            }

            return html(`<span class="badge-success">Completado</span>`);
          },
        },
      ],
      data: pedidos.map((p) => [
        p.id,
        p.proveedor_nombre,
        p.estado,
        `${Number(p.total).toFixed(2)} €`,
        null,
      ]),
      pagination: {
        limit: 5,
      },
      sort: true,
      search: true,
      language: {
        search: {
          placeholder: "Buscar...",
        },
        pagination: {
          previous: "Ant",
          next: "Sig",
          showing: "Mostrando",
          results: () => "resultados",
        },
      },
      className: {
        table: "gridjs-table",
      },
    });

    grid.render(wrapperRef.current);
    gridRef.current = grid;

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const btn = target.closest(".btn-grid-recepcion") as HTMLButtonElement | null;
      if (!btn) return;
      const id = btn.dataset.id;
      if (id) onIrARecepcion(id);
    };

    wrapperRef.current.addEventListener("click", handleClick);

    return () => {
      wrapperRef.current?.removeEventListener("click", handleClick);
      if (gridRef.current) {
        gridRef.current.destroy();
        gridRef.current = null;
      }
    };
  }, [pedidos, onIrARecepcion]);

  return <div ref={wrapperRef} />;
}