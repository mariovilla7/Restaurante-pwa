import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthenticatedDeviceId, clearDeviceConfig, getDeviceConfig } from '@/lib/device';
import type { Mesa, Plato } from '@/types/database';
import { WifiOff, Wifi, Loader2, Hand, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface MesaPageProps {
  onUnassigned: () => void;
}

export default function MesaPage({ onUnassigned }: MesaPageProps) {
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [menu, setMenu] = useState<Plato[]>([]);
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
      loadMenu();
    } else {
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
    const localConfig = getDeviceConfig();
    if (localConfig?.mesaId) {
      checkMesaAssignment(deviceId);
    } else {
      onUnassigned();
    }
  }, [onUnassigned, checkMesaAssignment]);

  async function loadMenu() {
    const { data, error } = await supabase.from('platos').select('*').order('nombre');
    if (error) toast.error('No se pudo cargar el menú.');
    else setMenu(data || []);
  }

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
      .on<any>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mesas', filter: `id=eq.${mesa.id}` },
        (payload) => {
          if (payload.new.dispositivo_id !== mesa.dispositivo_id) {
            clearDeviceConfig();
            onUnassigned();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    <div className="h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between p-4 border-b bg-card flex-shrink-0">
        <h1 className="text-2xl font-bold">Mesa {mesa.numero}</h1>
        <div className={`flex items-center gap-2 text-sm ${isOnline ? 'text-success' : 'text-destructive'}`}>
          {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          {isOnline ? 'Conectado' : 'Sin conexión'}
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 min-h-0">
        <h2 className="text-3xl font-bold mb-4">Menú</h2>
        {menu.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menu.map(plato => (
              <div key={plato.id} className="bg-card border rounded-lg p-4 flex flex-col">
                <h3 className="text-xl font-semibold mb-2">{plato.nombre}</h3>
                <p className="text-muted-foreground flex-1">{plato.descripcion}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-lg font-bold">{plato.precio}€</span>
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">
                    Añadir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No hay platos disponibles en el menú en este momento.</p>
        )}
      </main>

      <footer className="bg-card border-t p-4 flex justify-around items-center flex-shrink-0">
        <button className="flex flex-col items-center gap-1 text-primary touch-target">
          <Hand className="w-6 h-6" />
          <span className="text-sm font-medium">Llamar Camarero</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-primary touch-target">
          <Receipt className="w-6 h-6" />
          <span className="text-sm font-medium">Pedir la Cuenta</span>
        </button>
      </footer>
    </div>
  );
}
