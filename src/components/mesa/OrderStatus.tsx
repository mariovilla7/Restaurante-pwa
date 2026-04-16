import type { Pedido, PedidoItem } from '@/types/database';
import { Clock, ChefHat, CheckCircle, type LucideIcon } from 'lucide-react';

interface Props {
  pedido: Pedido;
  items: PedidoItem[];
}

const statusConfig: Record<string, { label: string; icon: LucideIcon; container: string; accent: string }> = {
  en_espera: { label: 'En espera', icon: Clock, container: 'border-warning/30 bg-warning/10', accent: 'bg-warning text-warning-foreground' },
  preparando: { label: 'Preparándose', icon: ChefHat, container: 'border-primary/20 bg-primary/5', accent: 'bg-primary text-primary-foreground' },
  listo: { label: '¡Listo para servir!', icon: CheckCircle, container: 'border-success/30 bg-success/10', accent: 'bg-success text-success-foreground' },
  servido: { label: 'Servido', icon: CheckCircle, container: 'border-border bg-muted/40', accent: 'bg-muted text-muted-foreground' },
  pagado: { label: 'Pagado', icon: CheckCircle, container: 'border-border bg-muted/40', accent: 'bg-muted text-muted-foreground' },
};

export function OrderStatus({ pedido, items }: Props) {
  const config = statusConfig[pedido.estado] ?? statusConfig.en_espera;
  const Icon = config.icon;
  const totalPlatos = items.reduce((sum, item) => sum + item.cantidad, 0);
  const activeStep = ['en_espera', 'preparando', 'listo', 'servido'].indexOf(pedido.estado);

  return (
    <div className={`rounded-xl border p-4 ${config.container}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground">{config.label}</p>
          <p className="text-sm text-muted-foreground">{totalPlatos} plato(s) · {pedido.total.toFixed(2)} €</p>
        </div>
      </div>

      <div className="mt-3 flex gap-1">
        {(['en_espera', 'preparando', 'listo'] as const).map((step, i) => (
          <div
            key={step}
            className={`flex-1 h-2 rounded-full ${
              activeStep >= i ? config.accent.split(' ')[0] : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
