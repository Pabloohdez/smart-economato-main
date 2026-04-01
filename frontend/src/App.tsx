import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import InicioPage from "./pages/InicioPage";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import Spinner from "./components/ui/Spinner";
import { AuthProvider } from "./contexts/AuthContext";

const IngresarProductoPage = lazy(() => import("./pages/IngresarProductoPage"));
const InventarioPage = lazy(() => import("./pages/InventarioPage"));
const Recepcion = lazy(() => import("./pages/RecepcionPage"));
const DistribucionPage = lazy(() => import("./pages/DistribucionPage"));
const BajasPage = lazy(() => import("./pages/BajasPage"));
const ProveedoresPage = lazy(() => import("./pages/ProveedoresPage"));
const PedidosPage = lazy(() => import("./pages/PedidosPage"));
const EscandallosPage = lazy(() => import("./pages/EscandallosPage"));
const RendimientoPage = lazy(() => import("./pages/RendimientoPage"));
const AvisosPage = lazy(() => import("./pages/AvisosPage"));
const ConfiguracionPage = lazy(() => import("./pages/ConfiguracionPage"));
const AuditoriaPage = lazy(() => import("./pages/AuditoriaPage"));
const CrearUsuarioPage = lazy(() => import("./pages/CrearUsuarioPage"));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <Suspense fallback={<Spinner />}>
      <Routes>
        {/* Login y registro libres */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<CrearUsuarioPage />} />
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
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="escandallos" element={<EscandallosPage />} />
          <Route path="rendimiento" element={<RendimientoPage />} />
          <Route path="avisos" element={<AvisosPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
          <Route path="auditoria" element={<AuditoriaPage />} />
        </Route>

        {/* Cualquier otra ruta */}
        <Route path="*" element={<Navigate to="/inicio" replace />} />
      </Routes>
      </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}