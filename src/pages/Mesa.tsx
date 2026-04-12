import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/hooks/useCart';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { getDeviceConfig } from '@/lib/device';
import type { Categoria, Plato, Pedido, PedidoItem } from '@/types/database';
import { MenuGrid } from '@/components/mesa/MenuGrid';
import { CartSheet } from '@/components/mesa/CartSheet';
import { OrderStatus } from '@/components/mesa/OrderStatus';
import { FloatingActions } from '@/components/mesa/FloatingActions';
import { CategoryTabs } from '@/components/mesa/CategoryTabs';
import { toast } from 'sonner';

export default function MesaPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [pedidoActivo, setPedidoActivo] = useState<Pedido | null>(null);
  const [pedidoItems, setPedidoItems] = useState<PedidoItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const cart = useCart();
  const config = getDeviceConfig();

  useEffect(() => {
    loadMenu();
    loadActivePedido();
  }, []);

  async function loadMenu() {
    const [catRes, platRes] = await Promise.all([
      supabase.from('categorias').select('*').eq('activa', true).order('orden'),
      supabase.from('platos').select('*').eq('disponible', true).order('orden'),
    ]);
    if (catRes.data) {
      setCategorias(catRes.data);
      if (catRes.data.length > 0 && !activeCategory) {
        setActiveCategory(catRes.data[0].id);
      }
    }
    if (platRes.data) setPlatos(platRes.data);
    setLoading(false);
  }

  async function loadActivePedido() {
    if (!config?.mesaId) return;
    const { data } = await supabase
      .from('pedidos')
      .select('*, pedido_items(*, plato:platos(*))')
      .eq('mesa_id', config.mesaId)
      .in('estado', ['en_espera', 'preparando'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setPedidoActivo(data);
      setPedidoItems((data as any).pedido_items || []);
    } else {
      setPedidoActivo(null);
      setPedidoItems([]);
    }
  }

  const handlePedidoChange = useCallback(() => {
    loadActivePedido();
  }, []);

  useRealtimeSubscription('pedidos', '*', handlePedidoChange, config?.mesaId ? `mesa_id=eq.${config.mesaId}` : undefined);
  useRealtimeSubscription('pedido_items', '*', handlePedidoChange);

  async function submitOrder() {
    if (!config?.mesaId || cart.items.length === 0) return;

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .insert({ mesa_id: config.mesaId, estado: 'en_espera', total: cart.total })
      .select()
      .single();

    if (error || !pedido) {
      toast.error('Error al enviar el pedido');
      return;
    }

    const items = cart.items.map(item => ({
      pedido_id: pedido.id,
      plato_id: item.plato.id,
      cantidad: item.cantidad,
      notas: item.notas || null,
      estado: 'pendiente' as const,
    }));

    await supabase.from('pedido_items').insert(items);
    cart.clearCart();
    setCartOpen(false);
    toast.success('¡Pedido enviado!');
    loadActivePedido();
  }

  async function callWaiter() {
    if (!config?.mesaId) return;
    await supabase.from('notificaciones').insert({
      mesa_id: config.mesaId,
      tipo: 'camarero',
      atendida: false,
    });
    toast.success('Camarero notificado');
  }

  async function requestBill() {
    if (!config?.mesaId) return;
    await supabase.from('notificaciones').insert({
      mesa_id: config.mesaId,
      tipo: 'cuenta',
      atendida: false,
    });
    toast.success('Cuenta solicitada');
  }

  const filteredPlatos = platos.filter(p => p.categoria_id === activeCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b bg-card shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Menú</h1>
          {config?.mesaNumero && (
            <p className="text-xs sm:text-sm text-muted-foreground">Mesa {config.mesaNumero}</p>
          )}
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative touch-target flex items-center gap-2 bg-primary text-primary-foreground px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg font-semibold text-base sm:text-lg"
        >
          🛒 <span className="hidden sm:inline">Carrito</span>
          {cart.itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs sm:text-sm font-bold">
              {cart.itemCount}
            </span>
          )}
        </button>
      </header>

      {/* Categories */}
      <CategoryTabs
        categorias={categorias}
        activeCategory={activeCategory}
        onSelect={setActiveCategory}
      />

      {/* Menu Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <MenuGrid platos={filteredPlatos} onAddToCart={cart.addItem} />
      </div>

      {/* Order Status Banner */}
      {pedidoActivo && (
        <OrderStatus pedido={pedidoActivo} items={pedidoItems} />
      )}

      {/* Cart Sheet */}
      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        cart={cart}
        onSubmit={submitOrder}
      />

      {/* Floating Actions */}
      <FloatingActions onCallWaiter={callWaiter} onRequestBill={requestBill} />
    </div>
  );
}
