import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import "../styles/proveedores.css";
import Spinner from "../components/ui/Spinner";

import { showNotification, showConfirm } from "../utils/notifications";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import { deleteProveedor, getProveedoresLista, saveProveedor } from "../services/proveedoresService";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import type { Proveedor } from "../types";
import TablePagination from "../components/ui/TablePagination";

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
    <div>
      <div className="content-header content-header--split">
        <div>
          <h2>
            <i className="fa-solid fa-truck-field"></i>
            Gestión de Proveedores
          </h2>
          <p className="content-subtitle">Directorio operativo de contactos, teléfonos y correos de suministro.</p>
        </div>

        <div className="header-actions">
          <div className="header-date-chip">
            <i className="fa-solid fa-calendar"></i>
            <span>{hoyES()}</span>
          </div>

          <button className="btn-primary" onClick={abrirModal}>
            <i className="fa-solid fa-plus"></i>
            Nuevo Proveedor
          </button>
        </div>
      </div>

      <section className="proveedores-kpi-grid" aria-label="Resumen de proveedores">
        <article className="proveedores-kpi-card">
          <span>Proveedores Totales</span>
          <strong>{proveedoresResumen.total}</strong>
        </article>
        <article className="proveedores-kpi-card">
          <span>Con Teléfono</span>
          <strong>{proveedoresResumen.conTelefono}</strong>
        </article>
        <article className="proveedores-kpi-card proveedores-kpi-card--accent">
          <span>Con Email</span>
          <strong>{proveedoresResumen.conEmail}</strong>
        </article>
      </section>

      <div className="card">
        {loading && <Spinner label="Cargando proveedores..." />}
        {!loading && (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
              <input
                type="text"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar proveedor..."
                aria-label="Buscar proveedor"
                style={{ maxWidth: 360 }}
              />
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Contacto</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th style={{ textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#718096" }}>
                        No hay proveedores para mostrar.
                      </td>
                    </tr>
                  ) : (
                    visible.map((p) => (
                      <tr key={String(p.id)}>
                        <td style={{ fontWeight: 700 }}>{p.nombre}</td>
                        <td>{p.contacto || "-"}</td>
                        <td>{p.telefono || "-"}</td>
                        <td>{p.email || "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 8 }}>
                            <button
                              type="button"
                              className="btn-secondary"
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
                              <i className="fa-solid fa-pen" />
                            </button>
                            <button
                              type="button"
                              className="btn-warning"
                              title="Eliminar"
                              onClick={() => eliminarProveedor(String(p.id))}
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              totalItems={filtered.length}
              page={safePage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 25, 50]}
              label="proveedores"
            />
          </>
        )}
      </div>

      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <button type="button" className="close close--icon" onClick={cerrarModal} aria-label="Cerrar">
              <i className="fa-solid fa-xmark" />
            </button>

            <h2>{form.id ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>

            <form onSubmit={guardarProveedor}>
              <div className="form-group">
                <label>Nombre Empresa</label>
                <input
                  className="form-control"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Persona de Contacto</label>
                <input
                  className="form-control"
                  value={form.contacto}
                  onChange={(e) =>
                    setForm({ ...form, contacto: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input
                  className="form-control"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button className="btn-primary" type="submit">
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
