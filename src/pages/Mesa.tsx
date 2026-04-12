import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId, clearDeviceConfig } from '@/lib/device';
import type { Mesa } from '@/types/database';
import { WifiOff, Wifi } from 'lucide-react';

interface MesaPageProps {
  onUnassigned: () => void;
}

export default function MesaPage({ onUnassigned }: MesaPageProps) {
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const checkMesaAssignment = useCallback(async (showLoading = true) => {
    const id = getDeviceId();
    setDeviceId(id);

    if (!id) {
      setLoading(false);
      onUnassigned(); // Informar al padre que no hay asignación
      return;
    }

    if (showLoading) setLoading(true);
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('dispositivo_id', id)
      .maybeSingle();

    if (error) {
      console.error("Error checking assignment:", error);
      setMesa(null);
    } else {
      setMesa(data || null);
    }
    
    if (showLoading) setLoading(false);

    // Si después de la comprobación, no hay mesa, limpiamos la config y notificamos al padre.
    if (!data) {
      clearDeviceConfig();
      onUnassigned(); // ¡Esta es la corrección! No más reload.
    }
  }, [onUnassigned]);

  useEffect(() => {
    checkMesaAssignment();

    const heartbeatInterval = setInterval(() => {
      checkMesaAssignment(false);
    }, 15000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkMesaAssignment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Si hay una mesa, se muestra la interfaz. Si no, el componente padre se encargará
  // de mostrar la pantalla de configuración gracias a la llamada a onUnassigned.
  if (!mesa) {
    // Este estado es temporal mientras el componente padre re-renderiza.
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <p>Dispositivo desvinculado. Redirigiendo...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b bg-card">
        <h1 className="text-2xl font-bold">Mesa {mesa.numero}</h1>
        <div className={`flex items-center gap-2 text-sm ${isOnline ? 'text-success' : 'text-destructive'}`}>
          {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
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
