import { useEffect, useMemo, useState } from "react";
import { getProductos, type Producto } from "../services/productosService";
import "../styles/inventario.css";

type QuickFilter = "all" | "lowStock" | "expiring";

function parseFechaCaducidad(raw: unknown): Date | null {
  if (!raw) return null;

  // Si viene tipo "2026-03-01 00:00:00" (Postgres), lo pasamos a ISO
  const s = String(raw).trim();
  if (!s) return null;

  // Normaliza "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm:ss"
  const normalized = s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;

  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date: Date): number {
  const now = new Date();
  // quitamos horas para no tener desfases raros
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function formatEuro(n: unknown): string {
  const num = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(num)) return "-";
  return `${num.toFixed(2)} €`;
}

export default function InventarioPage() {
  const [items, setItems] = useState<Producto[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [prov, setProv] = useState("");
  const [orden, setOrden] = useState<"asc" | "desc">("asc");
  const [quick, setQuick] = useState<QuickFilter>("all");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // Ajusta estos umbrales si quieres
  const LOW_STOCK_THRESHOLD = 5;
  const EXPIRING_DAYS_THRESHOLD = 30;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const data = await getProductos();
        if (alive) setItems(data);
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const categorias = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of items) {
      const nombre = p.categoria?.nombre?.toString().trim();
      if (nombre) map.set(nombre.toLowerCase(), nombre);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const proveedores = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of items) {
      const nombre = p.proveedor?.nombre?.toString().trim();
      if (nombre) map.set(nombre.toLowerCase(), nombre);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = items.slice();

    // Quick filters (no destruyen la lista)
    if (quick === "lowStock") {
      list = list.filter((p) => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD);
    } else if (quick === "expiring") {
      list = list.filter((p) => {
        const d = parseFechaCaducidad((p as any).fechaCaducidad);
        if (!d) return false;
        const diff = daysUntil(d);
        return diff <= EXPIRING_DAYS_THRESHOLD; // incluye caducados (diff < 0)
      });
    }

    // Search
    if (s) {
      list = list.filter((p) => {
        const nombre = (p.nombre ?? "").toString().toLowerCase();
        const id = (p.id ?? "").toString().toLowerCase();
        return nombre.includes(s) || id.includes(s);
      });
    }

    // Select filters
    if (cat) {
      list = list.filter(
        (p) => (p.categoria?.nombre ?? "").toString().toLowerCase() === cat
      );
    }

    if (prov) {
      list = list.filter(
        (p) => (p.proveedor?.nombre ?? "").toString().toLowerCase() === prov
      );
    }

    // Sort by price
    list.sort((a, b) => {
      const pa = Number(a.precio ?? 0);
      const pb = Number(b.precio ?? 0);
      return orden === "asc" ? pa - pb : pb - pa;
    });

    return list;
  }, [items, q, cat, prov, orden, quick]);

  function stockBajo() {
    setQuick("lowStock");
  }

  function proximoCaducar() {
    setQuick("expiring");
  }

  function limpiarFiltros() {
    setQ("");
    setCat("");
    setProv("");
    setOrden("asc");
    setQuick("all");
  }

  return (
    <div>
      <div className="inv-header">
        <div>
          <h1 className="inv-title">INVENTARIO</h1>
          <p className="inv-subtitle">Gestiona y consulta el stock de productos</p>
        </div>

        <button className="inv-btn-primary" type="button">
          + Ingresar Producto
        </button>
      </div>

      <div className="inv-panel">
        <div className="inv-row">
          <div className="inv-search">
            <input
              className="inv-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto por nombre o código..."
            />
            <button className="inv-btn" type="button">
              Buscar
            </button>
          </div>

          <select
            className="inv-select"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">Categoría (todas)</option>
            {categorias.map((c) => (
              <option key={c} value={c.toLowerCase()}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="inv-select"
            value={prov}
            onChange={(e) => setProv(e.target.value)}
          >
            <option value="">Proveedor (todos)</option>
            {proveedores.map((p) => (
              <option key={p} value={p.toLowerCase()}>
                {p}
              </option>
            ))}
          </select>

          <select
            className="inv-select"
            value={orden}
            onChange={(e) => setOrden(e.target.value as "asc" | "desc")}
          >
            <option value="asc">Precio: Menor a Mayor</option>
            <option value="desc">Precio: Mayor a Menor</option>
          </select>

          <div className="inv-actions">
            <button className="inv-btn" type="button" onClick={stockBajo}>
              Stock Bajo
            </button>
            <button className="inv-btn" type="button" onClick={proximoCaducar}>
              Próximo a Caducar
            </button>
            <button className="inv-btn" type="button" onClick={limpiarFiltros}>
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="inv-muted">Cargando productos...</p>}
      {err && <p className="inv-muted">Error: {err}</p>}

      {!loading && !err && (
        <table className="inv-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Proveedor</th>
              <th>Stock</th>
              <th>Caducidad</th>
              <th>Precio</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => {
              const low = (p.stock ?? 0) <= LOW_STOCK_THRESHOLD;

              const cadDate = parseFechaCaducidad((p as any).fechaCaducidad);
              const cadDiff = cadDate ? daysUntil(cadDate) : null;

              let cadEl: React.ReactNode = "-";
              if (cadDate && cadDiff !== null) {
                if (cadDiff < 0) {
                  cadEl = <span className="inv-badge inv-caducado">CADUCADO</span>;
                } else if (cadDiff <= EXPIRING_DAYS_THRESHOLD) {
                  cadEl = (
                    <span className="inv-badge inv-proximo">
                      ⏱ {cadDiff}d
                    </span>
                  );
                } else {
                  cadEl = (
                    <span className="inv-date">
                      {cadDate.toLocaleDateString("es-ES")}
                    </span>
                  );
                }
              }

              return (
                <tr key={`${p.id ?? ""}-${p.nombre ?? ""}`}>
                  <td>{p.id ?? "-"}</td>
                  <td>{p.nombre ?? "-"}</td>

                  <td>
                    <span className="inv-badge">{p.categoria?.nombre ?? "-"}</span>
                  </td>

                  <td>{p.proveedor?.nombre ?? "-"}</td>

                  <td>
                    <span className={`inv-badge ${low ? "inv-danger" : ""}`}>
                      {p.stock ?? "-"}
                    </span>
                  </td>

                  <td>{cadEl}</td>

                  <td>{formatEuro(p.precio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
