import { useEffect, useState, useCallback } from 'react';
import { getDeviceId, setDeviceConfig } from '@/lib/device';
import { supabase } from '@/integrations/supabase/client';
import { Monitor, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onAssigned: () => void;
}

export default function DeviceSetup({ onAssigned }: Props) {
  const [deviceId] = useState(getDeviceId);
  const [checking, setChecking] = useState(true);

  const checkAssignment = useCallback(async () => {
    console.log('Checking assignment for device:', deviceId);
    const { data } = await supabase
      .from('mesas')
      .select('*')
      .eq('dispositivo_id', deviceId)
      .maybeSingle();

    if (data) {
      console.log('Device assigned to mesa:', data.numero);
      setDeviceConfig({ deviceId, mesaId: data.id, mesaNumero: data.numero });
      onAssigned();
    }
    setChecking(false);
  }, [deviceId, onAssigned]);

  useEffect(() => {
    // Comprobación inicial
    checkAssignment();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel(`device-assign-${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mesas',
          filter: `dispositivo_id=eq.${deviceId}`,
        },
        (payload) => {
          console.log('Realtime update received for this device:', payload);
          checkAssignment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [deviceId, checkAssignment]);

  function copyId() {
    navigator.clipboard.writeText(deviceId);
    toast.success('ID copiado al portapapeles');
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <div className="bg-card p-6 sm:p-8 rounded-xl shadow-lg border max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <Monitor className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dispositivo no asignado</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Comunica este ID al administrador para vincular este dispositivo a una mesa.
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">ID del Dispositivo</p>
          <div className="flex items-center justify-center gap-2">
            <div className="flex-1 min-w-0">
              <code className="text-sm sm:text-lg font-mono font-bold text-foreground break-all select-all">{deviceId}</code>
            </div>
            <button onClick={copyId} className="p-2 hover:bg-muted rounded-md touch-target flex-shrink-0">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        {checking && (
          <p className="text-sm text-muted-foreground animate-pulse">Verificando asignación...</p>
        )}
        <p className="text-xs text-muted-foreground">
          La pantalla se actualizará automáticamente al vincular el dispositivo.
        </p>
      </div>
    </div>
  );
}
