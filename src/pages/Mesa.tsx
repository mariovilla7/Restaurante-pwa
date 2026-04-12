import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { getDeviceId } from '@/utils/deviceId';
import type { Mesa } from '@/types/database';
import { WifiOff, Wifi } from 'lucide-react';

export default function MesaPage() {
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Función para comprobar si este dispositivo tiene una mesa asignada
  const checkMesaAssignment = useCallback(async () => {
    const id = getDeviceId();
    setDeviceId(id);

    if (!id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('mesas')
      .select('*')
      .eq('dispositivo_id', id)
      .single();

    setMesa(data || null); // Asigna la mesa si se encuentra, o null si no
    setLoading(false);
  }, []);

  // Carga inicial y listeners de estado de red
  useEffect(() => {
    checkMesaAssignment();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkMesaAssignment]);

  // --- LA SOLUCIÓN ---
  // Nos suscribimos a cualquier cambio en la tabla 'mesas'.
  // Cuando ocurra un cambio, volvemos a ejecutar la comprobación.
  useRealtimeSubscription('mesas', '*', checkMesaAssignment);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Si no hay mesa asignada, muestra la pantalla de configuración
  if (!mesa) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <div className="bg-card p-8 rounded-xl shadow-lg border w-full max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Dispositivo no asignado</h1>
          <p className="text-muted-foreground">
            Para usar esta tablet, un administrador debe vincularla a un número de mesa.
          </p>
          <div className="bg-secondary p-4 rounded-lg">
            <label className="text-sm font-medium text-muted-foreground">ID de este Dispositivo</label>
            <p className="text-lg font-mono break-all text-primary font-semibold">{deviceId}</p>
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Copia este ID y pégalo en el panel de administración en la sección 'Gestión de Mesas'.
          </p>
        </div>
      </div>
    );
  }

  // Si la mesa está asignada, muestra la interfaz de cliente
  return (
    <div className="h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-2xl font-bold">Mesa {mesa.numero}</h1>
        <div className={`flex items-center gap-2 text-sm ${isOnline ? 'text-success' : 'text-destructive'}`}>
          {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-g" />}
          {isOnline ? 'Conectado' : 'Sin conexión'}
        </div>
      </header>
      <main className="p-4">
        <h2 className="text-xl">¡Bienvenido!</h2>
        <p className="text-muted-foreground">Aquí se mostrará el menú para realizar pedidos.</p>
      </main>
    </div>
  );
}