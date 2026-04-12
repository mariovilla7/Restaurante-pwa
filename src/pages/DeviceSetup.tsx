import { useEffect, useState } from 'react';
import { getDeviceId, getDeviceConfig, setDeviceConfig } from '@/lib/device';
import { supabase } from '@/integrations/supabase/client';
import { Monitor, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  onAssigned: () => void;
}

export default function DeviceSetup({ onAssigned }: Props) {
  const [deviceId] = useState(getDeviceId);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAssignment();
    const interval = setInterval(checkAssignment, 5000);
    return () => clearInterval(interval);
  }, []);

  async function checkAssignment() {
    const { data } = await supabase
      .from('mesas')
      .select('*')
      .eq('dispositivo_id', deviceId)
      .maybeSingle();

    if (data) {
      setDeviceConfig({ deviceId, mesaId: data.id, mesaNumero: data.numero });
      onAssigned();
    }
    setChecking(false);
  }

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
          Se verificará automáticamente cada 5 segundos.
        </p>
      </div>
    </div>
  );
}
