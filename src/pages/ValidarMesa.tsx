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
    let cancelled = false;

    async function validate() {
      if (!id) { setError('Código QR inválido.'); return; }

      // Wait for auth session to be restored (important for RLS)
      const { data: { session } } = await supabase.auth.getSession();
      
      // Try fetching the mesa - if RLS blocks anon, retry after a brief wait
      let mesa: any = null;
      let dbError: any = null;

      const result = await supabase
        .from('mesas')
        .select('*')
        .eq('id', id)
        .eq('activa', true)
        .maybeSingle();

      mesa = result.data;
      dbError = result.error;

      // If no result and no session, it might be RLS blocking anon access
      // Try listening for auth state change briefly
      if (!mesa && !session) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 2000);
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession) {
              clearTimeout(timeout);
              subscription.unsubscribe();
              const retry = await supabase
                .from('mesas')
                .select('*')
                .eq('id', id)
                .eq('activa', true)
                .maybeSingle();
              mesa = retry.data;
              dbError = retry.error;
              resolve();
            }
          });
          // Also resolve on timeout
        });
      }

      if (cancelled) return;

      if (dbError || !mesa) {
        setError('Mesa no encontrada o inactiva. Esto puede deberse a permisos. Asegúrate de que la tabla "mesas" tenga una política RLS que permita SELECT público.');
        return;
      }

      setMesaSession(mesa.id, mesa.numero);
      navigate(`/mesa/${mesa.numero}`, { replace: true });
    }
    validate();

    return () => { cancelled = true; };
  }, [id, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="bg-card p-8 rounded-xl shadow-lg border max-w-sm w-full space-y-4">
          <QrCode className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-4">
            Ejecuta en Supabase SQL Editor:<br />
            <code className="bg-muted p-1 rounded text-xs">
              CREATE POLICY "Public read mesas" ON public.mesas FOR SELECT USING (true);
            </code>
          </p>
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
