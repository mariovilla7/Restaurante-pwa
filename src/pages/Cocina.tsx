import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { Pedido, PedidoItem } from '@/types/database';
import { KitchenTicket } from '@/components/cocina/KitchenTicket';
import { toast } from 'sonner';

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<(Pedido & { pedido_items: (PedidoItem & { plato: any })[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    // Create audio context for notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19teleGFfRm10teleIBAAAABAAEARAAAABAAEAAQABAAEABABkYXRh');
    loadPedidos();
  }, []);

  async function loadPedidos() {
    const { data } = await supabase
      .from('pedidos')
      .select('*, mesa:mesas(*), pedido_items(*, plato:platos(*))')
      .in('estado', ['en_espera', 'preparando'])
      .order('created_at', { ascending: true });

    if (data) {
      if (data.length > prevCountRef.current && prevCountRef.current > 0) {
        playNotificationSound();
        toast.info('🔔 Nuevo pedido recibido!');
      }
      prevCountRef.current = data.length;
      setPedidos(data as any);
    }
    setLoading(false);
  }

  function playNotificationSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  const handleRealtimeChange = useCallback(() => {
    loadPedidos();
  }, []);

  useRealtimeSubscription('pedidos', '*', handleRealtimeChange);
  useRealtimeSubscription('pedido_items', '*', handleRealtimeChange);

  async function updateItemStatus(itemId: string, newStatus: 'en_cocina' | 'listo') {
    await supabase.from('pedido_items').update({ estado: newStatus }).eq('id', itemId);

    // If all items are 'listo', update the pedido status
    const pedido = pedidos.find(p => p.pedido_items.some(i => i.id === itemId));
    if (pedido && newStatus === 'listo') {
      const allReady = pedido.pedido_items.every(i =>
        i.id === itemId ? true : i.estado === 'listo'
      );
      if (allReady) {
        await supabase.from('pedidos').update({ estado: 'listo' }).eq('id', pedido.id);
      }
    }

    // If any item goes to 'en_cocina', update pedido to 'preparando'
    if (newStatus === 'en_cocina' && pedido?.estado === 'en_espera') {
      await supabase.from('pedidos').update({ estado: 'preparando' }).eq('id', pedido.id);
    }

    loadPedidos();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">🔥 Cocina - KDS</h1>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">
            {pedidos.length} pedido(s) activo(s)
          </span>
          <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-4">
        {pedidos.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xl">
            Sin pedidos pendientes 🎉
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {pedidos.map(pedido => (
              <KitchenTicket
                key={pedido.id}
                pedido={pedido}
                items={pedido.pedido_items}
                onUpdateItemStatus={updateItemStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
