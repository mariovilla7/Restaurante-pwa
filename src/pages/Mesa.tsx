import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getMesaSession, setMesaSession, clearMesaSession, refreshMesaSession } from '@/lib/mesaSession';
import { useSharedCart } from '@/hooks/useSharedCart';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import type { Mesa, Plato, Categoria, Pedido, PedidoItem } from '@/types/database';
import { Wifi, WifiOff, Loader2, Hand, Receipt, Trash2, Minus, Plus, ShoppingCart, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { OrderStatus } from '@/components/mesa/OrderStatus';

export default function MesaPage() {
  const { numero } = useParams<{ numero: string }>();
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [platos, setPlatos] = useState<Plato[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cartOpen, setCartOpen] = useState(false);
  const [activePedidos, setActivePedidos] = useState<(Pedido & { pedido_items: PedidoItem[] })[]>([]);

  const cart = useSharedCart(mesa?.id ?? null);

  // Initialize mesa: require valid session from ValidarMesa
  useEffect(() => {
    async function init() {
      const session = getMesaSession();

      if (numero) {
        const num = parseInt(numero);
        if (isNaN(num)) { setAccessDenied(true); setLoading(false); return; }

        // Must have a valid session matching this mesa numero
        if (!session || session.mesaNumero !== num) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // Verify mesa still exists and is active
        const { data } = await supabase
          .from('mesas')
          .select('*')
          .eq('id', session.mesaId)
          .eq('activa', true)
          .maybeSingle();

        if (data) {
          setMesa(data);
          refreshMesaSession();
          loadMenu();
          loadActivePedidos(data.id);
        } else {
          clearMesaSession();
          setAccessDenied(true);
        }
        setLoading(false);
        return;
      }

      // No URL param — check session
      if (session) {
        const { data } = await supabase
          .from('mesas')
          .select('*')
          .eq('id', session.mesaId)
          .eq('activa', true)
          .maybeSingle();

        if (data) {
          setMesa(data);
          refreshMesaSession();
          loadMenu();
          loadActivePedidos(data.id);
        } else {
          clearMesaSession();
          setAccessDenied(true);
        }
      } else {
        setAccessDenied(true);
      }
      setLoading(false);
    }
    init();
  }, [numero]);

  async function loadMenu() {
    const [catRes, platRes] = await Promise.all([
      supabase.from('categorias').select('*').eq('activa', true).order('orden'),
      supabase.from('platos').select('*').eq('disponible', true).order('orden'),
    ]);
    if (catRes.data) {
      setCategorias(catRes.data);
      if (catRes.data.length > 0) setActiveCategory(catRes.data[0].id);
    }
    if (platRes.data) setPlatos(platRes.data);
  }

  async function loadActivePedidos(mesaId: string) {
    const { data } = await supabase
      .from('pedidos')
      .select('*, pedido_items(*, plato:platos(*))')
      .eq('mesa_id', mesaId)
      .not('estado', 'eq', 'pagado')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setActivePedidos(data as any);
  }

  // Refresh activity on interaction
  useEffect(() => {
    const handler = () => refreshMesaSession();
    window.addEventListener('touchstart', handler);
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('click', handler);
    };
  }, []);

  // Online/offline
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handlePlatosChange = useCallback(() => { loadMenu(); }, []);
  useRealtimeSubscription('platos', '*', handlePlatosChange);

  const handlePedidosChange = useCallback(() => {
    if (mesa) loadActivePedidos(mesa.id);
  }, [mesa]);
  useRealtimeSubscription('pedidos', '*', handlePedidosChange);
  useRealtimeSubscription('pedido_items', '*', handlePedidosChange);

  async function placeOrder() {
    if (cart.items.length === 0 || !mesa) return;

    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({ mesa_id: mesa.id, total: cart.total, estado: 'en_espera' })
      .select()
      .single();

    if (pedidoError || !pedido) {
      toast.error('Error al crear el pedido: ' + (pedidoError?.message || ''));
      return;
    }

    const pedidoItems = cart.items.map(item => ({
      pedido_id: pedido.id,
      plato_id: item.plato_id,
      cantidad: item.cantidad,
      notas: item.notas || null,
      estado: 'pendiente' as const,
    }));

    const { error: itemsError } = await supabase.from('pedido_items').insert(pedidoItems);
    if (itemsError) {
      toast.error('Error al crear los items: ' + itemsError.message);
      return;
    }

    await cart.clearCart();
    setCartOpen(false);
    loadActivePedidos(mesa.id);
    toast.success('¡Pedido enviado! La cocina ya lo está preparando. 🍳');
  }

  async function callWaiter() {
    if (!mesa) return;
    await supabase.from('notificaciones').insert({ mesa_id: mesa.id, tipo: 'camarero' });
    toast.success('Camarero notificado 🔔');
  }

  async function requestBill() {
    if (!mesa) return;
    await supabase.from('notificaciones').insert({ mesa_id: mesa.id, tipo: 'cuenta' });
    toast.success('Cuenta solicitada 🧾');
  }

  const filteredPlatos = platos.filter(p => p.categoria_id === activeCategory);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Cargando mesa...</p>
      </div>
    );
  }

  if (accessDenied || !mesa) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
        <div className="bg-card p-8 rounded-xl shadow-lg border max-w-sm w-full space-y-4">
          <QrCode className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Acceso denegado</h1>
          <p className="text-muted-foreground">
            Por favor, escanea el código QR de tu mesa para acceder al menú.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold">Mesa {mesa.numero}</h1>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 text-xs ${isOnline ? 'text-success' : 'text-destructive'}`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
          <button
            onClick={() => setCartOpen(!cartOpen)}
            className="relative bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {cart.itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Active orders status */}
      {activePedidos.length > 0 && (
        <div className="flex-shrink-0">
          {activePedidos.map(p => (
            <OrderStatus key={p.id} pedido={p} items={p.pedido_items} />
          ))}
        </div>
      )}

      {/* Category Tabs */}
      {categorias.length > 0 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b bg-card flex-shrink-0">
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      )}

      {/* Menu Grid */}
      <main className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPlatos.map(plato => (
            <div key={plato.id} className="bg-card border rounded-lg p-4 flex flex-col">
              {plato.imagen_url && (
                <img src={plato.imagen_url} alt={plato.nombre} className="w-full h-32 object-cover rounded-md mb-3" />
              )}
              <h3 className="text-lg font-semibold">{plato.nombre}</h3>
              <p className="text-sm text-muted-foreground flex-1 mt-1 mb-3">{plato.descripcion}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary">{plato.precio.toFixed(2)}€</span>
                <button
                  onClick={() => { cart.addItem(plato); toast.success(`${plato.nombre} añadido`); }}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium touch-target"
                >
                  Añadir
                </button>
              </div>
            </div>
          ))}
        </div>
        {filteredPlatos.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No hay platos disponibles en esta categoría</p>
        )}
      </main>

      {/* Cart Panel */}
      {cartOpen && (
        <div className="border-t bg-card flex-shrink-0 max-h-[50vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-lg font-bold">Tu Pedido ({cart.itemCount})</h3>
            <button onClick={() => setCartOpen(false)} className="text-muted-foreground text-sm">Cerrar</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.items.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">El carrito está vacío</p>
            ) : (
              cart.items.map(item => (
                <div key={item.id} className="bg-secondary rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{item.plato?.nombre}</h4>
                      <p className="text-sm text-muted-foreground">{(item.plato?.precio ?? 0).toFixed(2)}€ c/u</p>
                    </div>
                    <button onClick={() => cart.removeItem(item.id)} className="text-destructive p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => cart.updateQuantity(item.id, item.cantidad - 1)} className="bg-card border rounded-lg w-8 h-8 flex items-center justify-center touch-target">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold">{item.cantidad}</span>
                    <button onClick={() => cart.updateQuantity(item.id, item.cantidad + 1)} className="bg-card border rounded-lg w-8 h-8 flex items-center justify-center touch-target">
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="ml-auto font-bold">{((item.plato?.precio ?? 0) * item.cantidad).toFixed(2)}€</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Notas (sin gluten, etc.)"
                    value={item.notas || ''}
                    onChange={e => cart.updateNotes(item.id, e.target.value)}
                    className="mt-2 w-full bg-card border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              ))
            )}
          </div>
          {cart.items.length > 0 && (
            <div className="border-t px-4 py-3 flex items-center justify-between">
              <span className="text-lg font-bold">Total: {cart.total.toFixed(2)}€</span>
              <button onClick={placeOrder} className="bg-success text-success-foreground font-bold px-6 py-3 rounded-lg touch-target">
                Confirmar Pedido
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <footer className="bg-card border-t px-4 py-3 flex justify-around items-center flex-shrink-0">
        <button onClick={callWaiter} className="flex flex-col items-center gap-1 text-warning touch-target">
          <Hand className="w-6 h-6" />
          <span className="text-xs font-medium">Camarero</span>
        </button>
        <button onClick={requestBill} className="flex flex-col items-center gap-1 text-primary touch-target">
          <Receipt className="w-6 h-6" />
          <span className="text-xs font-medium">La Cuenta</span>
        </button>
      </footer>
    </div>
  );
}
