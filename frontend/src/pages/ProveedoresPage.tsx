import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Grid, html } from "gridjs";
import "gridjs/dist/theme/mermaid.css";
import "../styles/proveedores.css";
import Spinner from "../components/ui/Spinner";

import { showNotification, showConfirm } from "../utils/notifications";
import { isValidOptionalEmail, normalizeOptionalEmail } from "../utils/email";
import { deleteProveedor, getProveedoresLista, saveProveedor } from "../services/proveedoresService";
import { queryKeys } from "../lib/queryClient";
import { broadcastQueryInvalidation } from "../lib/realtimeSync";
import type { Proveedor } from "../types";

export default function ProveedoresPage() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridInstance = useRef<Grid | null>(null);
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);

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

  useEffect(() => {
    if (proveedoresQuery.error) {
      console.error(proveedoresQuery.error);
      showNotification("Error de conexión cargando proveedores", "error");
    }
  }, [proveedoresQuery.error]);

  // ----------------------------
  // Crear / refrescar GRID
  // ----------------------------

  useEffect(() => {
    if (!gridRef.current || loading || gridInstance.current) return;

    gridInstance.current = new Grid({
      columns: [
        { name: "id", hidden: true }, // 👈 oculta, pero existe
        "Nombre",
        "Contacto",
        "Teléfono",
        "Email",
        {
          name: "Acciones",
          formatter: (_, row) => {
            const id = String(row.cells[0].data); // 👈 pillo el ID real
            return html(`
        <button class="btn-editar" data-id="${id}" title="Editar">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-eliminar" data-id="${id}" title="Eliminar">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `);
          },
        },
      ],

      data: [],

      search: true,

      pagination: {
        limit: 10,
      },

      language: {
        search: { placeholder: "Buscar proveedor..." },
        pagination: {
          previous: "Anterior",
          next: "Siguiente",
          showing: "Mostrando",
          results: () => "resultados",
        },
      },
    }).render(gridRef.current);

    return () => {
      if (gridInstance.current) {
        gridInstance.current.destroy();
        gridInstance.current = null;
      }
    };
  }, [loading]);

  useEffect(() => {
    if (!gridInstance.current || loading) return;

    gridInstance.current
      .updateConfig({
        data: proveedores.map((p) => [
          p.id,
          p.nombre,
          p.contacto || "-",
          p.telefono || "-",
          p.email || "-",
        ]),
      })
      .forceRender();
  }, [proveedores, loading]);

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
  // Detectar clicks en botones grid
  // ----------------------------

  useEffect(() => {
    function handler(e: any) {
      const btn = e.target.closest("button");

      if (!btn) return;

      const id = btn.dataset.id;

      if (btn.classList.contains("btn-eliminar")) {
        eliminarProveedor(id);
      }

      if (btn.classList.contains("btn-editar")) {
        const p = proveedores.find((x) => x.id === id);

        if (!p) return;

        setForm({
          id: String(p.id),
          nombre: p.nombre,
          contacto: p.contacto || "",
          telefono: p.telefono || "",
          email: p.email || "",
        });

        setModalOpen(true);
      }
    }

    document.addEventListener("click", handler);

    return () => document.removeEventListener("click", handler);
  }, [proveedores]);

  // ----------------------------
  // RENDER
  // ----------------------------

  return (
    <div>
      <div className="content-header">
        <h2>Gestión de Proveedores</h2>

        <div className="header-actions">
          <button className="btn-primary" onClick={abrirModal}>
            <i className="fa-solid fa-plus"></i>
            Nuevo Proveedor
          </button>
        </div>
      </div>

      <div className="card">
        {loading && <Spinner label="Cargando proveedores..." />}
        <div ref={gridRef} style={loading ? { display: "none" } : {}}></div>
      </div>

      {modalOpen && (
        <div className="modal">
          <div className="modal-content">
            <button className="close" onClick={cerrarModal}>
              &times;
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
