import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MesaPage from "./pages/Mesa";
import CocinaPage from "./pages/Cocina";
import AdminPage from "./pages/Admin";
import LoginPage from "./pages/Login";
import DeviceSetup from "./pages/DeviceSetup";
import NotFound from "./pages/NotFound";
import { isDeviceAssigned } from "./lib/device";
import { useState } from "react";

const queryClient = new QueryClient();

function MesaRoute() {
  const [assigned, setAssigned] = useState(isDeviceAssigned());

  if (!assigned) {
    return <DeviceSetup onAssigned={() => setAssigned(true)} />;
  }
  
  // Cuando la MesaPage detecte que ha sido desasignada, llamará a esta función.
  const handleUnassigned = () => {
    setAssigned(false);
  };

  return <MesaPage onUnassigned={handleUnassigned} />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Navigate to="/mesa" replace />} />
          <Route path="/mesa" element={<MesaRoute />} />
          <Route path="/cocina" element={<CocinaPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
