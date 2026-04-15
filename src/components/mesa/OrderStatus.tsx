import type { Pedido, PedidoItem } from '@/types/database';
import { Clock, ChefHat, CheckCircle } from 'lucide-react';

interface Props {
  pedido: Pedido;
  items: PedidoItem[];
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  en_espera: { label: 'En espera', icon: Clock, color: 'bg-warning text-warning-foreground' },
  preparando: { label: 'Preparándose', icon: ChefHat, color: 'bg-primary text-primary-foreground' },
  listo: { label: '¡Listo para servir!', icon: CheckCircle, color: 'bg-success text-success-foreground' },
  servido: { label: 'Servido', icon: CheckCircle, color: 'bg-muted text-muted-foreground' },
  pagado: { label: 'Pagado', icon: CheckCircle, color: 'bg-muted text-muted-foreground' },
};

export function OrderStatus({ pedido, items }: Props) {
  const config = statusConfig[pedido.estado];
  const Icon = config.icon;

  return (
    <div className={`mx-4 mb-4 rounded-lg p-4 ${config.color}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6" />
        <div className="flex-1">
          <p className="font-bold text-lg">{config.label}</p>
          <p className="text-sm opacity-90">{items.length} plato(s) · {pedido.total.toFixed(2)} €</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1">
        {(['en_espera', 'preparando', 'listo'] as const).map((step, i) => (
          <div
            key={step}
            className={`flex-1 h-2 rounded-full ${
              (['en_espera', 'preparando', 'listo', 'servido'].indexOf(pedido.estado) >= i)
                ? 'bg-current opacity-80'
                : 'bg-current opacity-20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
