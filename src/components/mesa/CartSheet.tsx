import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { useCart } from '@/hooks/useCart';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: ReturnType<typeof useCart>;
  onSubmit: () => void;
}

export function CartSheet({ open, onOpenChange, cart, onSubmit }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[450px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-xl">Tu Pedido</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {cart.items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">El carrito está vacío</p>
          ) : (
            cart.items.map(item => (
              <div key={item.plato.id} className="bg-secondary rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{item.plato.nombre}</h4>
                    <p className="text-sm text-muted-foreground">{item.plato.precio.toFixed(2)} € c/u</p>
                  </div>
                  <button
                    onClick={() => cart.removeItem(item.plato.id)}
                    className="text-destructive hover:opacity-70 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => cart.updateQuantity(item.plato.id, item.cantidad - 1)}
                    className="touch-target bg-card border rounded-lg w-10 h-10 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold w-8 text-center">{item.cantidad}</span>
                  <button
                    onClick={() => cart.updateQuantity(item.plato.id, item.cantidad + 1)}
                    className="touch-target bg-card border rounded-lg w-10 h-10 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <span className="ml-auto font-bold text-foreground">
                    {(item.plato.precio * item.cantidad).toFixed(2)} €
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Notas (sin gluten, etc.)"
                  value={item.notas}
                  onChange={e => cart.updateNotes(item.plato.id, e.target.value)}
                  className="mt-2 w-full bg-card border rounded-md px-3 py-2 text-sm"
                />
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span className="text-primary">{cart.total.toFixed(2)} €</span>
            </div>
            <button
              onClick={onSubmit}
              className="touch-target w-full bg-primary text-primary-foreground rounded-lg py-4 text-lg font-bold hover:opacity-90 transition-opacity"
            >
              Confirmar Pedido
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
