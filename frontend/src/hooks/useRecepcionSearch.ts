import { useMemo, useState } from "react";
import type { Producto } from "../types";
import { useDebouncedValue } from "./useDebouncedValue";

type Params = {
  productos: Producto[];
};

export function useRecepcionSearch({ productos }: Params) {
  const [term, setTerm] = useState("");
  const [provFiltro, setProvFiltro] = useState<string>("");
  const [catFiltro, setCatFiltro] = useState<string>("");
  const debouncedTerm = useDebouncedValue(term, 250);

  const resultadosAutocomplete = useMemo(() => {
    const t = debouncedTerm.trim().toLowerCase();
    if (!t) return [];

    return productos.filter((p) => {
      const matchText = String(p.nombre ?? "").toLowerCase().includes(t);
      const matchProv = !provFiltro || String(p.proveedorId ?? "") === String(provFiltro);
      const matchCat = !catFiltro || String(p.categoriaId ?? "") === String(catFiltro);
      return matchText && matchProv && matchCat;
    });
  }, [catFiltro, debouncedTerm, productos, provFiltro]);

  return {
    term,
    setTerm,
    provFiltro,
    setProvFiltro,
    catFiltro,
    setCatFiltro,
    resultadosAutocomplete,
  };
}