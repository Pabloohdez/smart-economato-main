import { NavLink, Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", minHeight: "100vh" }}>
      <aside style={{ padding: 16, borderRight: "1px solid #eee" }}>
        <h2 style={{ marginTop: 0 }}>Smart-Economato</h2>
        <nav style={{ display: "grid", gap: 8 }}>
          <NavLink to="/inicio">Inicio</NavLink>
          {/* Luego añadimos: pedidos, recepción, almacén... */}
        </nav>

        <button
          style={{ marginTop: 16 }}
          onClick={() => {
            localStorage.removeItem("usuarioActivo");
            location.href = "/login";
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
