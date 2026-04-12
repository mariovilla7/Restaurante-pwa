import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthenticatedDeviceId, clearDeviceConfig, getDeviceConfig } from '@/lib/device';
import type { Mesa } from '@/types/database';
import { WifiOff, Wifi, Loader2 } from 'lucide-react';

interface MesaPageProps {
  onUnassigned: () => void;
}

export default function MesaPage({ onUnassigned }: MesaPageProps) {
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const checkMesaAssignment = useCallback(async (deviceId: string) => {
    const { data, error } = await supabase
      .from('mesas')
      .select('*')
      .eq('dispositivo_id', deviceId)
      .maybeSingle();

    if (error) {
      console.error("Error checking assignment:", error);
      onUnassigned();
    } else if (data) {
      setMesa(data);
    } else {
      // No data means this device is no longer assigned to this mesa
      clearDeviceConfig();
      onUnassigned();
    }
    setLoading(false);
  }, [onUnassigned]);

  const initializeDevice = useCallback(async () => {
    const deviceId = await getAuthenticatedDeviceId();
    if (!deviceId) {
      toast.error("No se pudo inicializar el dispositivo. Revisa la conexión.");
      onUnassigned();
      return;
    }
    
    // Check local storage first for a quick load
    const localConfig = getDeviceConfig();
    if (localConfig?.mesaId) {
      checkMesaAssignment(deviceId);
    } else {
      onUnassigned();
    }
  }, [onUnassigned, checkMesaAssignment]);

  useEffect(() => {
    initializeDevice();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [initializeDevice]);

  useEffect(() => {
    if (!mesa) return;

    const channel = supabase
      .channel(`mesa-updates-${mesa.id}`)
      .on<any>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mesas',
          filter: `id=eq.${mesa.id}`,
        },
        (payload) => {
          // If the device ID has changed, this device has been unlinked.
          if (payload.new.dispositivo_id !== mesa.dispositivo_id) {
            clearDeviceConfig();
            onUnassigned();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mesa, onUnassigned]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Cargando mesa...</p>
      </div>
    );
  }

  if (!mesa) {
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
