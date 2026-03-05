import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import IngresarProductoPage from "./pages/IngresarProductoPage";
import InventarioPage from "./pages/InventarioPage";
import LoginPage from "./pages/LoginPage";
import InicioPage from "./pages/InicioPage";
import Recepcion from "./pages/RecepcionPage";
import DistribucionPage from "./pages/DistribucionPage";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import BajasPage from "./pages/BajasPage";
import ProveedoresPage from "./pages/ProveedoresPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login libre */}
        <Route path="/login" element={<LoginPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirección por defecto */}
          <Route index element={<Navigate to="/inicio" replace />} />

          {/* Páginas */}
          <Route path="inicio" element={<InicioPage />} />
          <Route path="recepcion" element={<Recepcion />} />
          <Route path="distribucion" element={<DistribucionPage />} />
          <Route path="inventario" element={<InventarioPage />} />
          <Route path="inventario/nuevo" element={<IngresarProductoPage />} />
          <Route path="bajas" element={<BajasPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
        </Route>

        {/* Cualquier otra ruta */}
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
    </BrowserRouter>
  );
}