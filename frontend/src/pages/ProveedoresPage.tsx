import { useEffect, useRef, useState } from "react";
import { Grid, html } from "gridjs";
import "gridjs/dist/theme/mermaid.css";
import "../styles/proveedores.css";
import Spinner from "../components/ui/Spinner";

import { showNotification, showConfirm } from "../utils/notifications";
import { apiFetch } from "../services/apiClient";

type Proveedor = {
  id: string;
  nombre: string;
  contacto?: string;
  telefono?: string;
  email?: string;
};

export default function ProveedoresPage() {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const gridInstance = useRef<Grid | null>(null);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    id: "",
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
  });

  // ----------------------------
  // Cargar proveedores
  // ----------------------------

  async function cargarProveedores() {
    try {
      setLoading(true);
      const json = await apiFetch<{ success: boolean; data: Proveedor[] }>("/proveedores", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      setProveedores(json.data ?? []);
    } catch (e) {
      console.error(e);
      showNotification("Error de conexión cargando proveedores", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarProveedores();
  }, []);

  // ----------------------------
  // Crear / refrescar GRID
  // ----------------------------

  useEffect(() => {
    if (!gridRef.current || loading) return;

    if (gridInstance.current) {
      gridInstance.current.destroy();
    }

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

      data: proveedores.map((p) => [
        p.id, //columna oculta
        p.nombre,
        p.contacto || "-",
        p.telefono || "-",
        p.email || "-",
      ]),

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

    if (!form.nombre) {
      showNotification("El nombre del proveedor es obligatorio", "warning");
      return;
    }

    const method = form.id ? "PUT" : "POST";
    const path = form.id ? `/proveedores/${form.id}` : "/proveedores";

    try {
      await apiFetch(path, {
        method,
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          nombre: form.nombre,
          contacto: form.contacto,
          telefono: form.telefono,
          email: form.email,
        }),
      });
      showNotification(
        form.id ? "Proveedor actualizado" : "Proveedor creado",
        "success",
      );
      cerrarModal();
      cargarProveedores();
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
      await apiFetch(`/proveedores/${id}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      showNotification("Proveedor eliminado", "success");
      cargarProveedores();
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
          id: p.id,
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
