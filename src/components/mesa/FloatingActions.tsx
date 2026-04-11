import { Bell, Receipt } from 'lucide-react';

interface Props {
  onCallWaiter: () => void;
  onRequestBill: () => void;
}

export function FloatingActions({ onCallWaiter, onRequestBill }: Props) {
  return (
    <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-50">
      <button
        onClick={onCallWaiter}
        className="touch-target bg-warning text-warning-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
        title="Llamar camarero"
      >
        <Bell className="w-6 h-6" />
      </button>
      <button
        onClick={onRequestBill}
        className="touch-target bg-secondary text-secondary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg border hover:opacity-90 transition-opacity"
        title="Pedir cuenta"
      >
        <Receipt className="w-6 h-6" />
      </button>
    </div>
  );
}
