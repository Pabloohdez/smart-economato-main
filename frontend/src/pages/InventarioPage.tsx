import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductos, type Producto } from "../services/productosService";
import { useNavigate } from "react-router-dom";
import InventarioTable from "../components/inventario/InventarioTable";
import InventarioToolbar from "../components/inventario/InventarioToolbar";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import { showNotification } from "../utils/notifications";
import { scanBarcodeFromCamera } from "../utils/barcodeScanner";
import { queryKeys } from "../lib/queryClient";
import "../styles/inventario.css";

function parseFechaCaducidad(raw: unknown): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.includes(" ") && !s.includes("T") ? s.replace(" ", "T") : s;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date: Date): number {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

export default function InventarioPage() {
  const nav = useNavigate();

  // filtros toolbar
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");   // en tu toolbar es string, lo usamos por nombre (simple)
  const [provId, setProvId] = useState(""); // igual
  const [orden, setOrden] = useState<"asc" | "desc">("asc");
  const [onlyStockBajo, setOnlyStockBajo] = useState(false);
  const [onlyProximoCaducar, setOnlyProximoCaducar] = useState(false);

  const LOW_STOCK_THRESHOLD = 5;
  const EXPIRING_DAYS_THRESHOLD = 30;

  const productosQuery = useQuery({
    queryKey: queryKeys.productos,
    queryFn: getProductos,
    refetchInterval: 45_000,
  });

  const items: Producto[] = productosQuery.data ?? [];
  const loading = productosQuery.isLoading;
  const err = productosQuery.error instanceof Error ? productosQuery.error.message : "";

  // “cats” y “provs” para el toolbar (con id fake = nombre)
  const cats = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    items.forEach((p) => {
      const nombre = String(p.categoria?.nombre ?? "").trim();
      if (!nombre) return;
      const key = nombre.toLowerCase();
      if (!map.has(key)) map.set(key, { id: key, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [items]);

  const provs = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    items.forEach((p) => {
      const nombre = String(p.proveedor?.nombre ?? "").trim();
      if (!nombre) return;
      const key = nombre.toLowerCase();
      if (!map.has(key)) map.set(key, { id: key, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = items.slice();

    if (onlyStockBajo) {
      list = list.filter((p) => Number(p.stock ?? 0) <= Number((p as any).stockMinimo ?? LOW_STOCK_THRESHOLD));
    }

    if (onlyProximoCaducar) {
      list = list.filter((p) => {
        const d = parseFechaCaducidad((p as any).fechaCaducidad);
        if (!d) return false;
        const diff = daysUntil(d);
        return diff <= EXPIRING_DAYS_THRESHOLD;
      });
    }

    if (s) {
      list = list.filter((p) => {
        const nombre = String(p.nombre ?? "").toLowerCase();
        const id = String(p.id ?? "").toLowerCase();
        return nombre.includes(s) || id.includes(s);
      });
    }

    if (catId) {
      list = list.filter((p) => String(p.categoria?.nombre ?? "").toLowerCase() === catId);
    }

    if (provId) {
      list = list.filter((p) => String(p.proveedor?.nombre ?? "").toLowerCase() === provId);
    }

    // tu orden actual por precio
    list.sort((a, b) => {
      const pa = Number(a.precio ?? 0);
      const pb = Number(b.precio ?? 0);
      return orden === "asc" ? pa - pb : pb - pa;
    });

    return list;
  }, [items, q, catId, provId, orden, onlyStockBajo, onlyProximoCaducar]);

  function limpiarFiltros() {
    setQ("");
    setCatId("");
    setProvId("");
    setOrden("asc");
    setOnlyStockBajo(false);
    setOnlyProximoCaducar(false);
  }

  async function escanearCodigoBarras() {
    const code = await scanBarcodeFromCamera();
    if (!code) {
      showNotification("No se pudo leer un codigo de barras. Intenta de nuevo.", "warning");
      return;
    }
    setQ(code);
    showNotification(`Codigo leido: ${code}`, "success");
  }

  return (
    <div>
      {/* Header como el compi */}
      <div className="header-inventario">
        <div>
          <h1 className="titulo-inventario">
            <i className="fa-solid fa-boxes-stacked"></i> INVENTARIO
          </h1>
          <p className="subtitulo">Gestiona y consulta el stock de productos</p>
        </div>

        <button className="btn-ingresar-header" type="button" onClick={() => nav("/inventario/nuevo")}>
          <i className="fa-solid fa-plus"></i> Ingresar Producto
        </button>
      </div>

      <InventarioToolbar
        q={q}
        setQ={setQ}
        cats={cats as any}
        catId={catId}
        setCatId={setCatId}
        provs={provs as any}
        provId={provId}
        setProvId={setProvId}
        orden={orden}
        setOrden={setOrden}
        onlyStockBajo={onlyStockBajo}
        setOnlyStockBajo={setOnlyStockBajo}
        onlyProximoCaducar={onlyProximoCaducar}
        setOnlyProximoCaducar={setOnlyProximoCaducar}
        onScanBarcode={escanearCodigoBarras}
        limpiarFiltros={limpiarFiltros}
      />

      {loading && <Spinner label="Cargando productos..." />}
      {err && <Alert type="error" title="Error al cargar">{err}</Alert>}

      {!loading && !err && <InventarioTable items={filtered} />}
    </div>
  );
}