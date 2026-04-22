import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, CalendarDays, Mail, MoreHorizontal, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import Spinner from "../components/ui/Spinner";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";
import { StaggerItem, StaggerPage } from "../components/ui/PageTransition";

import { showNotification, showConfirm } from "../utils/notifications";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import { deleteProveedor, getProveedoresLista, saveProveedor } from "../services/proveedoresService";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import type { Proveedor } from "../types";
import TablePagination from "../components/ui/TablePagination";
import SearchInput from "../components/ui/SearchInput";
import BackofficeTablePanel from "../components/ui/BackofficeTablePanel";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

const paginatedBodyVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
} as const;

const paginatedRowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: "easeIn" },
  },
} as const;

function hoyES() {
  const fecha = new Date();
  return fecha.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ProveedoresPage() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [form, setForm] = useState({
    id: "",
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
  });

  const proveedoresQuery = useQuery({
    queryKey: queryKeys.proveedores,
    queryFn: getProveedoresLista,
    refetchInterval: 60_000,
  });

  const saveProveedorMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: number | string; payload: Omit<Proveedor, "id"> }) =>
      saveProveedor(payload, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores });
      broadcastQueryInvalidation(queryKeys.proveedores);
    },
  });

  const deleteProveedorMutation = useMutation({
    mutationFn: deleteProveedor,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.proveedores });
      broadcastQueryInvalidation(queryKeys.proveedores);
    },
  });

  const proveedores = proveedoresQuery.data ?? [];
  const loading = proveedoresQuery.isLoading;
  const guardandoProveedor = saveProveedorMutation.isPending;
  const proveedoresError = proveedoresQuery.error instanceof Error ? proveedoresQuery.error.message : "";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return proveedores;
    return proveedores.filter((p) => {
      return (
        String(p.nombre ?? "").toLowerCase().includes(s)
        || String(p.contacto ?? "").toLowerCase().includes(s)
        || String(p.telefono ?? "").toLowerCase().includes(s)
        || String(p.email ?? "").toLowerCase().includes(s)
      );
    });
  }, [proveedores, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visible = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  const proveedoresResumen = useMemo(() => {
    const conTelefono = proveedores.filter((p) => Boolean(String(p.telefono ?? "").trim())).length;
    const conEmail = proveedores.filter((p) => Boolean(String(p.email ?? "").trim())).length;
    return {
      total: proveedores.length,
      conTelefono,
      conEmail,
    };
  }, [proveedores]);

  useEffect(() => {
    if (proveedoresQuery.error) {
      console.error(proveedoresQuery.error);
      showNotification("Error de conexión cargando proveedores", "error");
    }
  }, [proveedoresQuery.error]);

  async function reintentarCarga() {
    await proveedoresQuery.refetch();
  }

  function abrirModal() {
    setForm({
      id: "",
      nombre: "",
      contacto: "",
      telefono: "",
      email: "",
    });

    setModalOpen(true);
  }

  function cerrarModal() {
    setModalOpen(false);
  }

  // ----------------------------
  // Guardar proveedor
  // ----------------------------

  async function guardarProveedor(e: React.FormEvent) {
    e.preventDefault();

    if (guardandoProveedor) return;

    if (!form.nombre.trim()) {
      showNotification("El nombre del proveedor es obligatorio", "warning");
      return;
    }

    if (!isValidOptionalEmail(form.email)) {
      showNotification("El email del proveedor no es válido", "warning");
      return;
    }

    const normalizedEmail = normalizeOptionalEmail(form.email);

    try {
      await saveProveedorMutation.mutateAsync({
        id: form.id || undefined,
        payload: {
          nombre: form.nombre.trim(),
          contacto: form.contacto.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          email: normalizedEmail,
        },
      });
      showNotification(
        form.id ? "Proveedor actualizado" : "Proveedor creado",
        "success",
      );
      cerrarModal();
    } catch (e) {
      console.error(e);
      showNotification("Error guardando proveedor", "error");
    }
  }

  // ----------------------------
  // Eliminar proveedor
  // ----------------------------

  async function eliminarProveedor(id: string) {
    const ok = await showConfirm(
      "¿Eliminar este proveedor?\n\nEsta acción no se puede deshacer.",
    );

    if (!ok) return;

    try {
      await deleteProveedorMutation.mutateAsync(id);
      showNotification("Proveedor eliminado", "success");
    } catch (e) {
      console.error(e);
      showNotification("Error eliminando proveedor", "error");
    }
  }

  // ----------------------------
  // ----------------------------
  // RENDER
  // ----------------------------

  return (
    <StaggerPage>
      <StaggerItem>
      <div className="mb-[30px] border-b-2 border-[var(--color-border-default)] pb-5 flex flex-wrap items-end justify-between gap-4 max-[900px]:items-stretch">
        <div>
          <h2 className="m-0 text-[28px] font-bold text-[var(--color-text-strong)] flex items-center gap-3">
            <Building2 className="h-7 w-7 text-[var(--color-brand-500)]" />
            Gestión de Proveedores
          </h2>
          <p className="mt-2 mb-0 text-[14px] text-[#50596D]">
            Directorio operativo de contactos, teléfonos y correos de suministro.
          </p>
        </div>

        <div className="flex items-center gap-[15px] flex-wrap max-[900px]:w-full">
          <div className="inline-flex items-center gap-2.5 px-4 py-3 rounded-[12px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-sm)] text-[#50596D] font-semibold max-[900px]:w-full max-[900px]:justify-center">
            <CalendarDays className="h-4 w-4 text-[var(--color-brand-500)]" />
            <span>{hoyES()}</span>
          </div>

          <button
            className="min-h-11 bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] text-white border-0 px-6 py-3 rounded-[10px] font-semibold cursor-pointer shadow-[0_4px_15px_rgba(179,49,49,0.3)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(179,49,49,0.4)] inline-flex items-center gap-2 max-[900px]:w-full max-[900px]:justify-center"
            onClick={abrirModal}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Nuevo Proveedor
          </button>
        </div>
      </div>
      </StaggerItem>

      <StaggerItem>
      <section className="grid grid-cols-3 gap-3 mb-[14px] max-[900px]:grid-cols-1" aria-label="Resumen de proveedores">
        <article className="border border-[var(--color-border-default)] rounded-[14px] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-[14px_16px] shadow-[var(--shadow-sm)] flex flex-col gap-2">
          <span className="text-[#50596D] text-[13px] font-semibold">Proveedores Totales</span>
          <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{proveedoresResumen.total}</strong>
        </article>
        <article className="border border-[var(--color-border-default)] rounded-[14px] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-[14px_16px] shadow-[var(--shadow-sm)] flex flex-col gap-2">
          <span className="text-[#50596D] text-[13px] font-semibold">Con Teléfono</span>
          <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{proveedoresResumen.conTelefono}</strong>
        </article>
        <article className="border border-[rgba(179,49,49,0.28)] rounded-[14px] bg-[linear-gradient(135deg,rgba(179,49,49,0.08)_0%,rgba(179,49,49,0.02)_100%)] p-[14px_16px] shadow-[var(--shadow-sm)] flex flex-col gap-2">
          <span className="text-[#50596D] text-[13px] font-semibold">Con Email</span>
          <strong className="text-[24px] leading-none text-[var(--color-text-strong)]">{proveedoresResumen.conEmail}</strong>
        </article>
      </section>
      </StaggerItem>

      {proveedoresError && (
        <StaggerItem>
          <div className="mb-4 flex flex-col gap-4">
            <Alert type="error" title="Error al cargar proveedores">{proveedoresError}</Alert>
            <div>
              <Button type="button" variant="secondary" onClick={reintentarCarga}>
                Reintentar carga
              </Button>
            </div>
          </div>
        </StaggerItem>
      )}

      <StaggerItem>
      <BackofficeTablePanel
        header={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="outline" className="border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                {filtered.length} proveedor(es)
              </Badge>
              <Badge variant="outline" className="border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                <Phone className="h-3.5 w-3.5" /> {proveedoresResumen.conTelefono} con teléfono
              </Badge>
              <Badge variant="outline" className="border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                <Mail className="h-3.5 w-3.5" /> {proveedoresResumen.conEmail} con email
              </Badge>
            </div>
            <div className="w-full max-w-[360px]">
              <SearchInput
                value={q}
                onChange={(value) => {
                  setQ(value);
                  setPage(1);
                }}
                placeholder="Buscar proveedor, contacto, teléfono o email..."
                ariaLabel="Buscar proveedor"
              />
            </div>
          </div>
        }
        footer={
          <TablePagination
            totalItems={filtered.length}
            page={safePage}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            label="proveedores"
          />
        }
      >
        {loading && <Spinner label="Cargando proveedores..." />}
        {!loading && (
          <>
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[840px] overflow-hidden rounded-[24px] border border-slate-100 bg-white">
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="rounded-l-2xl">Proveedor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="rounded-r-2xl text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.tbody
                    key={`proveedores-page-${safePage}-${pageSize}`}
                    variants={paginatedBodyVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    {visible.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-slate-500">
                          No hay proveedores para mostrar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visible.map((p) => (
                      <motion.tr key={String(p.id)} variants={paginatedRowVariants} className="bo-table-row">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary">
                              <Building2 className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">{p.nombre}</div>
                              <div className="mt-0.5 text-[12px] text-slate-500">Proveedor registrado</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{p.contacto || "-"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{p.telefono || "-"}</TableCell>
                        <TableCell className="text-sm text-slate-600">{p.email || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              className="bo-table-action-btn text-slate-500"
                              title="Editar"
                              onClick={() => {
                                setForm({
                                  id: String(p.id),
                                  nombre: p.nombre,
                                  contacto: p.contacto || "",
                                  telefono: p.telefono || "",
                                  email: p.email || "",
                                });
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="h-[18px] w-[18px]" strokeWidth={1.5} />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="bo-table-action-btn text-slate-500"
                                  aria-label="Más acciones"
                                >
                                  <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={1.8} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setForm({
                                      id: String(p.id),
                                      nombre: p.nombre,
                                      contacto: p.contacto || "",
                                      telefono: p.telefono || "",
                                      email: p.email || "",
                                    });
                                    setModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" /> Editar proveedor
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => eliminarProveedor(String(p.id))}>
                                  <Trash2 className="h-4 w-4" /> Eliminar proveedor
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))
                  )}
                  </motion.tbody>
                </AnimatePresence>
              </Table>
            </div>
          </>
        )}
      </BackofficeTablePanel>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] flex items-center justify-center z-[2000] p-4">
          <div className="relative w-[90%] max-w-[520px] rounded-[28px] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-[30px] shadow-[0_24px_64px_rgba(0,0,0,0.28)]">
            <button
              type="button"
              className="absolute top-3.5 right-3.5 w-[42px] h-[42px] rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] inline-flex items-center justify-center text-[#50596D] shadow-[var(--shadow-sm)] hover:text-[var(--color-brand-500)] hover:bg-[var(--color-bg-soft)]"
              onClick={cerrarModal}
              aria-label="Cerrar"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            <h2 className="m-0 mb-5 text-[20px] font-bold text-[var(--color-text-strong)]">
              {form.id ? "Editar Proveedor" : "Nuevo Proveedor"}
            </h2>

            <form onSubmit={guardarProveedor} className="grid gap-5">
              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[#50596D] text-[14px]">Nombre Empresa</label>
                <Input
                  className="h-12 rounded-xl"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[#50596D] text-[14px]">Persona de Contacto</label>
                <Input
                  className="h-12 rounded-xl"
                  value={form.contacto}
                  onChange={(e) =>
                    setForm({ ...form, contacto: e.target.value })
                  }
                />
              </div>

              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[#50596D] text-[14px]">Teléfono</label>
                <Input
                  className="h-12 rounded-xl"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                />
              </div>

              <div className="mb-5">
                <label className="block mb-2 font-semibold text-[#50596D] text-[14px]">Email</label>
                <Input
                  type="email"
                  className="h-12 rounded-xl"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="mt-2 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={cerrarModal}>
                  Cancelar
                </Button>
                <Button type="submit" loading={guardandoProveedor}>
                  Guardar Proveedor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </StaggerItem>
    </StaggerPage>
  );
}
