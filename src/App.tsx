import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MesaPage from "./pages/Mesa";
import CocinaPage from "./pages/Cocina";
import AdminPage from "./pages/Admin";
import LoginPage from "./pages/Login";
import ValidarMesaPage from "./pages/ValidarMesa";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Navigate to="/mesa" replace />} />
          <Route path="/validar-mesa/:id" element={<ValidarMesaPage />} />
          <Route path="/mesa/:numero" element={<MesaPage />} />
          <Route path="/mesa" element={<MesaPage />} />
          <Route path="/cocina" element={
            <ProtectedRoute allowedRoles={['cocina', 'admin']}>
              <CocinaPage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
