import type { Pedido, PedidoItem } from '@/types/database';
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderStatus } from '@/components/mesa/OrderStatus';

type PedidoWithItems = Pedido & { pedido_items: PedidoItem[] };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidos: PedidoWithItems[];
}

export function ActiveOrdersBar({ open, onOpenChange, pedidos }: Props) {
  const statusCounts = pedidos.reduce(
    (acc, pedido) => {
      acc[pedido.estado] = (acc[pedido.estado] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const summary = [
    statusCounts.en_espera ? `${statusCounts.en_espera} en espera` : null,
    statusCounts.preparando ? `${statusCounts.preparando} preparando` : null,
    statusCounts.listo ? `${statusCounts.listo} listo` : null,
  ].filter(Boolean).join(' · ') || 'Sin pedidos activos';

  return (
    <section className="border-b bg-card/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/80 flex-shrink-0">
      <button
        onClick={() => onOpenChange(!open)}
        className="touch-target flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" />
            <p className="font-semibold text-foreground">Estado de tus pedidos</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
              {pedidos.length}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">{summary}</p>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>

      {open && (
        <ScrollArea className="max-h-[32vh] border-t">
          <div className="space-y-3 p-4">
            {pedidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no tienes pedidos activos.</p>
            ) : (
              pedidos.map((pedido) => (
                <OrderStatus key={pedido.id} pedido={pedido} items={pedido.pedido_items} />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}