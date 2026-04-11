import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { Pedido, Notificacion } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bell, Receipt, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function AdminPedidos() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [pedRes, notRes] = await Promise.all([
      supabase.from('pedidos').select('*, mesa:mesas(*), pedido_items(*, plato:platos(*))').order('created_at', { ascending: false }).limit(50),
      supabase.from('notificaciones').select('*, mesa:mesas(*)').eq('atendida', false).order('created_at', { ascending: false }),
    ]);
    if (pedRes.data) setPedidos(pedRes.data);
    if (notRes.data) setNotificaciones(notRes.data);
    setLoading(false);
  }

  const handleChange = useCallback(() => { loadData(); }, []);
  useRealtimeSubscription('pedidos', '*', handleChange);
  useRealtimeSubscription('notificaciones', '*', handleChange);

  async function markNotificationHandled(id: string) {
    await supabase.from('notificaciones').update({ atendida: true }).eq('id', id);
    toast.success('Notificación atendida');
    loadData();
  }

  async function updatePedidoStatus(id: string, estado: string) {
    await supabase.from('pedidos').update({ estado }).eq('id', id);
    loadData();
  }

  const statusColors: Record<string, string> = {
    en_espera: 'bg-warning/10 text-warning',
    preparando: 'bg-primary/10 text-primary',
    listo: 'bg-success/10 text-success',
    servido: 'bg-muted text-muted-foreground',
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="p-6 space-y-6">
      {/* Notifications */}
      {notificaciones.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Bell className="w-5 h-5 text-warning" /> Notificaciones ({notificaciones.length})
          </h3>
          {notificaciones.map(n => (
            <div key={n.id} className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center justify-between animate-slide-in-right">
              <div className="flex items-center gap-3">
                {n.tipo === 'camarero' ? <Bell className="w-5 h-5 text-warning" /> : <Receipt className="w-5 h-5 text-primary" />}
                <div>
                  <p className="font-semibold text-foreground">
                    Mesa {n.mesa?.numero}: {n.tipo === 'camarero' ? 'Llama al camarero' : 'Pide la cuenta'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true })}
                  </p>
                </div>
              </div>
              <button onClick={() => markNotificationHandled(n.id)} className="bg-success text-success-foreground px-3 py-2 rounded-md text-sm font-medium touch-target">
                <CheckCircle className="w-4 h-4 inline mr-1" /> Atender
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Orders */}
      <h2 className="text-2xl font-bold text-foreground">Pedidos</h2>
      <div className="space-y-3">
        {pedidos.map(pedido => (
          <div key={pedido.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h4 className="font-bold text-foreground">Mesa {pedido.mesa?.numero || '?'}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[pedido.estado]}`}>
                  {pedido.estado.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(pedido.created_at), { locale: es, addSuffix: true })}
                </span>
                <span className="font-bold text-primary">{pedido.total?.toFixed(2)} €</span>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap text-sm text-muted-foreground mb-2">
              {pedido.pedido_items?.map((item: any) => (
                <span key={item.id} className="bg-secondary px-2 py-1 rounded-md">
                  {item.cantidad}x {item.plato?.nombre}
                </span>
              ))}
            </div>
            {pedido.estado !== 'servido' && (
              <div className="flex gap-2">
                {pedido.estado === 'listo' && (
                  <button onClick={() => updatePedidoStatus(pedido.id, 'servido')} className="text-sm bg-success text-success-foreground px-3 py-1 rounded-md">
                    Marcar Servido
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
