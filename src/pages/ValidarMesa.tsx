import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { setMesaSession } from '@/lib/mesaSession';
import { Loader2, QrCode } from 'lucide-react';

export default function ValidarMesaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function validate() {
      if (!id) { setError('Código QR inválido.'); return; }

      const { data: mesa, error: dbError } = await supabase
        .from('mesas')
        .select('*')
        .eq('id', id)
        .eq('activa', true)
        .maybeSingle();

      if (dbError || !mesa) {
        setError('Mesa no encontrada o inactiva. Por favor, escanea un código QR válido.');
        return;
      }

      // Create session and redirect
      setMesaSession(mesa.id, mesa.numero);
      navigate(`/mesa/${mesa.numero}`, { replace: true });
    }
    validate();
  }, [id, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="bg-card p-8 rounded-xl shadow-lg border max-w-sm w-full space-y-4">
          <QrCode className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="mt-2 text-muted-foreground">Validando mesa...</p>
    </div>
  );
}
