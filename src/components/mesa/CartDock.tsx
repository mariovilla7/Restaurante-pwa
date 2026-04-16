import { ScrollArea } from '@/components/ui/scroll-area';
import { Minus, Plus, ShoppingCart, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { useSharedCart } from '@/hooks/useSharedCart';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: ReturnType<typeof useSharedCart>;
  onSubmit: () => void;
}

export function CartDock({ open, onOpenChange, cart, onSubmit }: Props) {
  const hasItems = cart.items.length > 0;

  return (
    <section className="border-t bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80 flex-shrink-0">
      <button
        onClick={() => onOpenChange(!open)}
        className="touch-target flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <p className="font-semibold text-foreground">Tu pedido ({cart.itemCount})</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasItems ? `${cart.total.toFixed(2)} € en total` : 'El carrito está vacío'}
          </p>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronUp className="w-5 h-5 text-muted-foreground" />}
      </button>

      {open && (
        <ScrollArea className="max-h-[38vh] border-t">
          <div className="space-y-3 p-4">
            {hasItems ? (
              cart.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-secondary p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-foreground">{item.plato?.nombre}</h4>
                      <p className="text-sm text-muted-foreground">{(item.plato?.precio ?? 0).toFixed(2)} € c/u</p>
                    </div>
                    <button
                      onClick={() => cart.removeItem(item.id)}
                      className="touch-target rounded-md p-1 text-destructive hover:bg-background"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.cantidad - 1)}
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg border bg-card"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center text-base font-bold text-foreground">{item.cantidad}</span>
                    <button
                      onClick={() => cart.updateQuantity(item.id, item.cantidad + 1)}
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg border bg-card"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="ml-auto font-bold text-foreground">
                      {((item.plato?.precio ?? 0) * item.cantidad).toFixed(2)} €
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Notas (sin gluten, etc.)"
                    value={item.notas || ''}
                    onChange={(e) => cart.updateNotes(item.id, e.target.value)}
                    className="mt-3 w-full rounded-md border bg-card px-3 py-2 text-sm"
                  />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Todavía no has añadido platos.</p>
            )}
          </div>
        </ScrollArea>
      )}

      {hasItems && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-lg font-bold text-foreground">{cart.total.toFixed(2)} €</p>
          </div>
          <button
            onClick={onSubmit}
            className="touch-target rounded-xl bg-success px-5 py-3 font-bold text-success-foreground shadow-sm"
          >
            Confirmar pedido
          </button>
        </div>
      )}
    </section>
  );
}