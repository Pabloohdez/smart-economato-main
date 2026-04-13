import { useMemo, useState } from "react";
import type { PedidoHistorial } from "../../types";

type Props = {
  pedidos: PedidoHistorial[];
  onIrARecepcion: (id: number | string) => void;
};

export default function PedidosGrid({ pedidos, onIrARecepcion }: Props) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pedidos;
    return pedidos.filter((p) => {
      return (
        String(p.id).toLowerCase().includes(s)
        || String(p.proveedor_nombre ?? "").toLowerCase().includes(s)
        || String(p.estado ?? "").toLowerCase().includes(s)
      );
    });
  }, [pedidos, q]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
          aria-label="Buscar pedidos"
          style={{ maxWidth: 320 }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Proveedor</th>
              <th>Estado</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#718096" }}>
                  No hay pedidos que coincidan.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const estado = String(p.estado ?? "").toUpperCase();
                const canReceive = estado === "PENDIENTE" || estado === "INCOMPLETO";
                return (
                  <tr key={String(p.id)}>
                    <td>{p.id}</td>
                    <td>{p.proveedor_nombre}</td>
                    <td>{p.estado}</td>
                    <td>{Number(p.total ?? 0).toFixed(2)} €</td>
                    <td>
                      {canReceive ? (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => onIrARecepcion(p.id)}
                        >
                          Ir a Recepción
                        </button>
                      ) : (
                        <span className="badge-success">Completado</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}