import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthenticatedDeviceId, clearDeviceConfig, getDeviceConfig } from '@/lib/device';
import type { Mesa, Plato } from '@/types/database';
import { WifiOff, Wifi, Loader2, Hand, Receipt, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// Define el tipo para un item en el carrito
type CartItem = {
  plato_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
};

interface MesaPageProps {
  onUnassigned: () => void;
}

export default function MesaPage({ onUnassigned }: MesaPageProps) {
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [menu, setMenu] = useState<Plato[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- Device & Menu Loading ---
  const checkMesaAssignment = useCallback(async (deviceId: string) => {
    const { data, error } = await supabase.from('mesas').select('*').eq('dispositivo_id', deviceId).maybeSingle();
    if (error) { onUnassigned(); }
    else if (data) { setMesa(data); loadMenu(); }
    else { clearDeviceConfig(); onUnassigned(); }
    setLoading(false);
  }, [onUnassigned]);

  const initializeDevice = useCallback(async () => {
    const deviceId = await getAuthenticatedDeviceId();
    if (!deviceId) { onUnassigned(); return; }
    const localConfig = getDeviceConfig();
    if (localConfig?.mesaId) { checkMesaAssignment(deviceId); }
    else { onUnassigned(); }
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

  // --- Cart Logic ---
  const addToCart = (plato: Plato) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.plato_id === plato.id);
      if (existingItem) {
        return currentCart.map(item =>
          item.plato_id === plato.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...currentCart, { plato_id: plato.id, nombre: plato.nombre, precio: plato.precio, cantidad: 1 }];
    });
    toast.success(`${plato.nombre} añadido al pedido.`);
  };

  const removeFromCart = (plato_id: string) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.plato_id === plato_id);
      if (existingItem && existingItem.cantidad > 1) {
        return currentCart.map(item =>
          item.plato_id === plato_id ? { ...item, cantidad: item.cantidad - 1 } : item
        );
      }
      return currentCart.filter(item => item.plato_id !== plato_id);
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.precio * item.cantidad, 0);
  }, [cart]);

  // --- Order Placement ---
  const placeOrder = async () => {
    if (cart.length === 0 || !mesa) return;

    const pedidoContent = cart.map(({ plato_id, nombre, cantidad, precio }) => ({ plato_id, nombre, cantidad, precio }));
    
    const { error } = await supabase.from('pedidos').insert({
      mesa_id: mesa.id,
      contenido: pedidoContent,
      total: cartTotal,
    });

    if (error) {
      toast.error('Error al realizar el pedido: ' + error.message);
    } else {
      toast.success('¡Pedido realizado! La cocina ya lo está preparando.');
      setCart([]);
    }
  };

  // --- Loading and Fallback UI ---
  if (loading) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /><p>Cargando mesa...</p></div>;
  if (!mesa) return <div className="flex items-center justify-center h-screen"><p>Dispositivo desvinculado. Redirigiendo...</p></div>;

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between p-4 border-b bg-card flex-shrink-0">
        <h1 className="text-2xl font-bold">Mesa {mesa.numero}</h1>
        <div className={`flex items-center gap-2 text-sm ${isOnline ? 'text-success' : 'text-destructive'}`}>
          {isOnline ? <Wifi /> : <WifiOff />} {isOnline ? 'Conectado' : 'Sin conexión'}
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 min-h-0">
        <h2 className="text-3xl font-bold mb-4">Menú</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {menu.map(plato => (
            <div key={plato.id} className="bg-card border rounded-lg p-4 flex flex-col">
              <h3 className="text-xl font-semibold">{plato.nombre}</h3>
              <p className="text-muted-foreground flex-1 mt-1 mb-3">{plato.descripcion}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{plato.precio.toFixed(2)}€</span>
                <button onClick={() => addToCart(plato)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg">Añadir</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {cart.length > 0 && (
        <div className="bg-card border-t p-4 flex-shrink-0">
          <h3 className="text-xl font-bold mb-2">Tu Pedido</h3>
          <div className="max-h-32 overflow-y-auto space-y-2 mb-3">
            {cart.map(item => (
              <div key={item.plato_id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{item.nombre}</p>
                  <p className="text-sm text-muted-foreground">{item.cantidad} x {item.precio.toFixed(2)}€</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{(item.cantidad * item.precio).toFixed(2)}€</span>
                  <button onClick={() => removeFromCart(item.plato_id)} className="p-1 text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 flex items-center justify-between">
            <span className="text-lg font-bold">Total: {cartTotal.toFixed(2)}€</span>
            <button onClick={placeOrder} className="bg-success text-success-foreground font-bold px-6 py-3 rounded-lg">Realizar Pedido</button>
          </div>
        </div>
      )}

      <footer className="bg-card border-t p-4 flex justify-around items-center flex-shrink-0">
        <button className="flex flex-col items-center gap-1 text-primary touch-target"><Hand className="w-6 h-6" /><span className="text-sm font-medium">Llamar Camarero</span></button>
        <button className="flex flex-col items-center gap-1 text-primary touch-target"><Receipt className="w-6 h-6" /><span className="text-sm font-medium">Pedir la Cuenta</span></button>
      </footer>
    </div>
  );
}
