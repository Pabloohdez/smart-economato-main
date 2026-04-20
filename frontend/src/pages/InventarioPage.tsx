import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProductos, type Producto } from "../services/productosService";
import { useNavigate } from "react-router-dom";
import { Boxes } from "lucide-react";
import InventarioTable from "../components/inventario/InventarioTable";
import InventarioToolbar from "../components/inventario/InventarioToolbar";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { showNotification } from "../utils/notifications";
import { scanBarcodeFromCamera } from "../utils/barcodeScanner";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";
import { queryKeys } from "../lib/queryClient";
import { getLotesProducto, type LoteProducto } from "../services/lotesService";

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

function hoyES() {
  const fecha = new Date();
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

  const lotesQuery = useQuery<LoteProducto[]>({
    queryKey: queryKeys.lotesProducto,
    queryFn: getLotesProducto,
    refetchInterval: 45_000,
  });

  const items: Producto[] = productosQuery.data ?? [];
  const activeItems = useMemo(
    () => items.filter((item) => (item as any).activo !== false),
    [items],
  );
  const loading = productosQuery.isLoading;
  const productosError = productosQuery.error instanceof Error ? productosQuery.error.message : "";
  const lotesError = lotesQuery.error instanceof Error ? lotesQuery.error.message : "";

  // “cats” y “provs” para el toolbar (con id fake = nombre)
  const cats = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    activeItems.forEach((p) => {
      const nombre = String(p.categoria?.nombre ?? "").trim();
      if (!nombre) return;
      const key = nombre.toLowerCase();
      if (!map.has(key)) map.set(key, { id: key, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [activeItems]);

  const provs = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string }>();
    activeItems.forEach((p) => {
      const nombre = String(p.proveedor?.nombre ?? "").trim();
      if (!nombre) return;
      const key = nombre.toLowerCase();
      if (!map.has(key)) map.set(key, { id: key, nombre });
    });
    return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [activeItems]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let list = activeItems.slice();

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
  }, [activeItems, q, catId, provId, orden, onlyStockBajo, onlyProximoCaducar]);

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

  async function reintentarCarga() {
    await Promise.all([productosQuery.refetch(), lotesQuery.refetch()]);
  }

  const resumenInventario = useMemo(() => {
    const total = activeItems.length;
    const stockBajo = activeItems.filter((item) => Number(item.stock ?? 0) <= Number((item as any).stockMinimo ?? LOW_STOCK_THRESHOLD)).length;
    const proximosCaducar = activeItems.filter((item) => {
      const d = parseFechaCaducidad((item as any).fechaCaducidad);
      if (!d) return false;
      const diff = daysUntil(d);
      return diff >= 0 && diff <= EXPIRING_DAYS_THRESHOLD;
    }).length;
    const valorCatalogo = activeItems.reduce((sum, item) => sum + Number(item.precio ?? 0) * Number(item.stock ?? 0), 0);

    return { total, stockBajo, proximosCaducar, valorCatalogo };
  }, [activeItems]);

  function exportarProductos() {
    const rows = filtered.map((item) => ({
      Producto: String(item.nombre ?? ""),
      Categoria: String(item.categoria?.nombre ?? ""),
      Precio: Number(item.precio ?? 0),
      Stock: Number(item.stock ?? 0),
      Caducidad: String((item as any).fechaCaducidad ?? ""),
      Proveedor: String(item.proveedor?.nombre ?? ""),
    }));

    const csv = [
      Object.keys(rows[0] ?? { Producto: "", Categoria: "", Precio: "", Stock: "", Caducidad: "", Proveedor: "" }).join(";"),
      ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification("Inventario exportado correctamente.", "success");
  }

  useEffect(() => {
    void reintentarCarga();

    const onOnline = () => {
      void reintentarCarga();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void reintentarCarga();
      }
    };
    const onPageShow = () => {
      void reintentarCarga();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <StaggerPage className="mx-auto w-full max-w-[1440px] px-0 pb-8 pt-0">
      <StaggerItem>
        <div className="mb-7">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] border border-[rgba(179,49,49,0.14)] bg-[linear-gradient(145deg,rgba(179,49,49,0.12),rgba(255,255,255,0.96))] text-[var(--color-brand-500)] shadow-[0_8px_20px_rgba(179,49,49,0.12)]">
              <Boxes className="h-6 w-6" strokeWidth={1.8} />
            </div>
            <h1 className="text-[32px] font-extrabold leading-none tracking-[-0.04em] text-slate-900 max-[768px]:text-[26px]">
              Inventario
            </h1>
          </div>
          <p className="mt-1.5 pl-[3.875rem] text-[13.5px] leading-snug text-slate-500">
            Gestiona los productos del catálogo, el stock y su presentación comercial.
          </p>
        </div>
      </StaggerItem>

      <StaggerItem>
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
          onExportProducts={exportarProductos}
          onCreateProduct={() => nav("/inventario/nuevo")}
          limpiarFiltros={limpiarFiltros}
        />
      </StaggerItem>

      {loading && (
        <StaggerItem>
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(420px,1.8fr)_210px_190px_auto_auto]">
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
              <Skeleton className="h-11 rounded-2xl" />
            </div>
            <Skeleton className="h-[560px] rounded-[28px]" />
          </div>
        </StaggerItem>
      )}
      {productosError && (
        <StaggerItem>
          <div className="flex flex-col gap-4">
            <Alert type="error" title="Error al cargar inventario">{productosError}</Alert>
            <div>
              <Button type="button" variant="secondary" onClick={reintentarCarga}>
                Reintentar carga
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      {!loading && !productosError && lotesError && (
        <StaggerItem>
          <div className="flex flex-col gap-4">
            <Alert type="warning" title="Lotes no disponibles">
              {lotesError}. El inventario base sigue disponible, pero la informacion de lotes puede estar incompleta.
            </Alert>
            <div>
              <Button type="button" variant="secondary" onClick={() => lotesQuery.refetch()}>
                Reintentar lotes
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      {!loading && !productosError && (
        <StaggerItem>
          <InventarioTable items={filtered} lotes={lotesQuery.data ?? []} />
        </StaggerItem>
      )}
    </StaggerPage>
  );
}