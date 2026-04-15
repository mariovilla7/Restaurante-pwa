import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { Pedido, PedidoItem, Notificacion } from '@/types/database';
import { toast } from 'sonner';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChefHat, CheckCircle, Clock, Bell, Receipt, Filter, BarChart3, Truck } from 'lucide-react';

type FullPedido = Pedido & { mesa?: any; pedido_items: (PedidoItem & { plato: any })[] };

function getUrgencyColor(createdAt: string): string {
  const mins = differenceInMinutes(new Date(), new Date(createdAt));
  if (mins < 10) return 'border-success';
  if (mins < 20) return 'border-warning';
  return 'border-destructive';
}

function getUrgencyBg(createdAt: string): string {
  const mins = differenceInMinutes(new Date(), new Date(createdAt));
  if (mins < 10) return 'bg-success/10';
  if (mins < 20) return 'bg-warning/10';
  return 'bg-destructive/10';
}

function formatTimer(createdAt: string): string {
  const mins = differenceInMinutes(new Date(), new Date(createdAt));
  return `${mins} min`;
}

// Sort priority: en_espera first, then preparando, then listo. Within same status, oldest first.
const STATUS_PRIORITY: Record<string, number> = {
  en_espera: 0,
  preparando: 1,
  listo: 2,
};

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<FullPedido[]>([]);
  const [notificaciones, setNotificaciones] = useState<(Notificacion & { mesa?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pendientes' | 'todos'>('pendientes');
  const [showTotals, setShowTotals] = useState(false);
  const prevCountRef = useRef(0);
  const [, setTick] = useState(0);

  // Timer refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    // Never show 'servido' or 'pagado' in main view
    const estados = filter === 'pendientes'
      ? ['en_espera', 'preparando']
      : ['en_espera', 'preparando', 'listo'];

    const [pedRes, notRes] = await Promise.all([
      supabase
        .from('pedidos')
        .select('*, mesa:mesas(*), pedido_items(*, plato:platos(*))')
        .in('estado', estados)
        .order('created_at', { ascending: true }),
      supabase
        .from('notificaciones')
        .select('*, mesa:mesas(*)')
        .eq('atendida', false)
        .order('created_at', { ascending: false }),
    ]);

    if (pedRes.data) {
      if (pedRes.data.length > prevCountRef.current && prevCountRef.current > 0) {
        playNotificationSound();
        toast.info('🔔 ¡Nuevo pedido recibido!');
      }
      prevCountRef.current = pedRes.data.length;

      // Sort: en_espera first (oldest first), then preparando, then listo
      const sorted = [...pedRes.data].sort((a: any, b: any) => {
        const pa = STATUS_PRIORITY[a.estado] ?? 99;
        const pb = STATUS_PRIORITY[b.estado] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setPedidos(sorted as any);
    }
    if (notRes.data) setNotificaciones(notRes.data as any);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filter]);

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

  const handleRealtimeChange = useCallback(() => { loadData(); }, [filter]);
  useRealtimeSubscription('pedidos', '*', handleRealtimeChange);
  useRealtimeSubscription('pedido_items', '*', handleRealtimeChange);
  useRealtimeSubscription('notificaciones', '*', handleRealtimeChange);

  async function updateItemStatus(itemId: string, newStatus: 'en_cocina' | 'listo') {
    await supabase.from('pedido_items').update({ estado: newStatus }).eq('id', itemId);

    const pedido = pedidos.find(p => p.pedido_items.some(i => i.id === itemId));
    if (pedido && newStatus === 'listo') {
      const allReady = pedido.pedido_items.every(i =>
        i.id === itemId ? true : i.estado === 'listo'
      );
      if (allReady) {
        await supabase.from('pedidos').update({ estado: 'listo' }).eq('id', pedido.id);
        toast.success(`¡Pedido Mesa ${pedido.mesa?.numero} listo! 🎉`);
      }
    }
    if (newStatus === 'en_cocina' && pedido?.estado === 'en_espera') {
      await supabase.from('pedidos').update({ estado: 'preparando' }).eq('id', pedido.id);
    }
    loadData();
  }

  async function updatePedidoStatus(pedidoId: string, estado: string) {
    await supabase.from('pedidos').update({ estado }).eq('id', pedidoId);
    toast.success(`Pedido marcado como "${estado.replace('_', ' ')}"`);
    loadData();
  }

  async function markNotificationHandled(id: string) {
    await supabase.from('notificaciones').update({ atendida: true }).eq('id', id);
    toast.success('Notificación atendida');
    loadData();
  }

  // Production totals
  const productionTotals = useMemo(() => {
    const totals: Record<string, { nombre: string; cantidad: number }> = {};
    pedidos.forEach(p => {
      p.pedido_items.forEach(item => {
        if (item.estado !== 'listo') {
          const key = item.plato?.id || item.plato_id;
          if (!totals[key]) totals[key] = { nombre: item.plato?.nombre || '?', cantidad: 0 };
          totals[key].cantidad += item.cantidad;
        }
      });
    });
    return Object.values(totals).sort((a, b) => b.cantidad - a.cantidad);
  }, [pedidos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">🔥 Cocina</h1>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setShowTotals(!showTotals)}
            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              showTotals ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Totales</span>
          </button>
          <button
            onClick={() => setFilter(f => f === 'pendientes' ? 'todos' : 'pendientes')}
            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              filter === 'todos' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{filter === 'pendientes' ? 'Pendientes' : 'Todo'}</span>
          </button>
          <span className="text-muted-foreground text-xs sm:text-sm">{pedidos.length} pedido(s)</span>
          <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
        </div>
      </header>

      <div className="flex-1 overflow-auto flex">
        {/* Main content */}
        <div className="flex-1 p-3 sm:p-4 overflow-auto">
          {/* Notifications bar */}
          {notificaciones.length > 0 && (
            <div className="mb-4 space-y-2">
              {notificaciones.map(n => (
                <div key={n.id} className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    {n.tipo === 'camarero' ? (
                      <Bell className="w-6 h-6 text-warning" />
                    ) : (
                      <Receipt className="w-6 h-6 text-primary" />
                    )}
                    <div>
                      <p className="font-bold text-foreground">
                        Mesa {n.mesa?.numero}: {n.tipo === 'camarero' ? '🔔 Llama al camarero' : '🧾 Pide la cuenta'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { locale: es, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => markNotificationHandled(n.id)}
                    className="bg-success text-success-foreground px-3 py-2 rounded-md text-sm font-medium touch-target"
                  >
                    <CheckCircle className="w-4 h-4 inline mr-1" /> Atender
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tickets grid */}
          {pedidos.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
              Sin pedidos pendientes 🎉
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pedidos.map(pedido => (
                <div
                  key={pedido.id}
                  className={`bg-card rounded-lg border-2 shadow-sm flex flex-col ${getUrgencyColor(pedido.created_at)}`}
                >
                  {/* Ticket header with urgency */}
                  <div className={`px-4 py-3 rounded-t-lg ${getUrgencyBg(pedido.created_at)}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-xl text-foreground">
                        Mesa {pedido.mesa?.numero || '?'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                          differenceInMinutes(new Date(), new Date(pedido.created_at)) >= 20
                            ? 'bg-destructive text-destructive-foreground'
                            : differenceInMinutes(new Date(), new Date(pedido.created_at)) >= 10
                            ? 'bg-warning text-warning-foreground'
                            : 'bg-success text-success-foreground'
                        }`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {formatTimer(pedido.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-muted-foreground">
                        {pedido.estado === 'en_espera' ? '⏳ En espera' : pedido.estado === 'preparando' ? '👨‍🍳 Preparando' : '✅ Listo'}
                      </p>
                      {/* Pedido-level actions */}
                      <div className="flex gap-1">
                        {pedido.estado === 'listo' && (
                          <button
                            onClick={() => updatePedidoStatus(pedido.id, 'servido')}
                            className="bg-success text-success-foreground text-xs px-2 py-1 rounded-md font-medium touch-target flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" /> Servido
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {pedido.pedido_items.map(item => (
                      <div
                        key={item.id}
                        className={`border-l-4 rounded-md p-3 ${
                          item.estado === 'listo' ? 'border-l-success bg-success/5' :
                          item.estado === 'en_cocina' ? 'border-l-primary bg-primary/5' :
                          'border-l-warning bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{item.cantidad}x</span>
                          <span className="font-semibold flex-1">{item.plato?.nombre}</span>
                        </div>
                        {item.notas && (
                          <p className="text-sm text-warning mt-1 font-medium bg-warning/10 rounded px-2 py-1">
                            ⚠️ {item.notas}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {item.estado === 'pendiente' && (
                            <button
                              onClick={() => updateItemStatus(item.id, 'en_cocina')}
                              className="touch-target flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-semibold"
                            >
                              <ChefHat className="w-4 h-4 inline mr-1" /> Cocinar
                            </button>
                          )}
                          {item.estado === 'en_cocina' && (
                            <button
                              onClick={() => updateItemStatus(item.id, 'listo')}
                              className="touch-target flex-1 bg-success text-success-foreground rounded-md py-2 text-sm font-semibold"
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" /> Listo
                            </button>
                          )}
                          {item.estado === 'listo' && (
                            <span className="flex items-center gap-1 text-success text-sm font-semibold">
                              <CheckCircle className="w-4 h-4" /> Listo
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Production totals sidebar */}
        {showTotals && (
          <aside className="w-64 border-l bg-card p-4 overflow-y-auto flex-shrink-0 hidden sm:block">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Producción Total
            </h3>
            {productionTotals.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todo listo 🎉</p>
            ) : (
              <div className="space-y-2">
                {productionTotals.map(item => (
                  <div key={item.nombre} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                    <span className="text-sm font-medium truncate flex-1">{item.nombre}</span>
                    <span className="font-bold text-primary ml-2">{item.cantidad}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
