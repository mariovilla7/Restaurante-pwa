import type { Pedido, PedidoItem } from '@/types/database';
import { Clock, ChefHat, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  pedido: Pedido & { mesa?: any };
  items: (PedidoItem & { plato: any })[];
  onUpdateItemStatus: (itemId: string, status: 'en_cocina' | 'listo') => void;
}

const itemStatusConfig = {
  pendiente: { label: 'Pendiente', color: 'border-l-warning', bg: 'bg-card' },
  en_cocina: { label: 'En cocina', color: 'border-l-primary', bg: 'bg-primary/5' },
  listo: { label: 'Listo', color: 'border-l-success', bg: 'bg-success/5' },
};

export function KitchenTicket({ pedido, items, onUpdateItemStatus }: Props) {
  const timeAgo = formatDistanceToNow(new Date(pedido.created_at), { locale: es, addSuffix: true });

  return (
    <div className={`bg-card rounded-lg border shadow-sm flex flex-col ${
      pedido.estado === 'en_espera' ? 'border-warning' : 'border-primary'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 rounded-t-lg ${
        pedido.estado === 'en_espera' ? 'bg-warning/10' : 'bg-primary/10'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">
            Mesa {pedido.mesa?.numero || '?'}
          </h3>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          {pedido.estado === 'en_espera' ? (
            <><Clock className="w-3 h-3" /> En espera</>
          ) : (
            <><ChefHat className="w-3 h-3" /> Preparando</>
          )}
        </p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {items.map(item => {
          const config = itemStatusConfig[item.estado];
          return (
            <div
              key={item.id}
              className={`border-l-4 ${config.color} ${config.bg} rounded-md p-3`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-foreground">{item.cantidad}x</span>
                    <span className="font-semibold text-foreground">{item.plato?.nombre}</span>
                  </div>
                  {item.notas && (
                    <p className="text-sm text-warning mt-1 font-medium">⚠️ {item.notas}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                {item.estado === 'pendiente' && (
                  <button
                    onClick={() => onUpdateItemStatus(item.id, 'en_cocina')}
                    className="touch-target flex-1 bg-primary text-primary-foreground rounded-md py-2 text-sm font-semibold"
                  >
                    <ChefHat className="w-4 h-4 inline mr-1" /> Cocinar
                  </button>
                )}
                {item.estado === 'en_cocina' && (
                  <button
                    onClick={() => onUpdateItemStatus(item.id, 'listo')}
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
          );
        })}
      </div>
    </div>
  );
}
