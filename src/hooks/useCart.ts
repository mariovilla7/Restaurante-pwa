import { useState, useCallback } from 'react';
import type { CartItem, Plato } from '@/types/database';

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((plato: Plato) => {
    setItems(prev => {
      const existing = prev.find(i => i.plato.id === plato.id);
      if (existing) {
        return prev.map(i =>
          i.plato.id === plato.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { plato, cantidad: 1, notas: '' }];
    });
  }, []);

  const removeItem = useCallback((platoId: string) => {
    setItems(prev => prev.filter(i => i.plato.id !== platoId));
  }, []);

  const updateQuantity = useCallback((platoId: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems(prev => prev.filter(i => i.plato.id !== platoId));
      return;
    }
    setItems(prev =>
      prev.map(i => (i.plato.id === platoId ? { ...i, cantidad } : i))
    );
  }, []);

  const updateNotes = useCallback((platoId: string, notas: string) => {
    setItems(prev =>
      prev.map(i => (i.plato.id === platoId ? { ...i, notas } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.plato.precio * i.cantidad, 0);
  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0);

  return { items, addItem, removeItem, updateQuantity, updateNotes, clearCart, total, itemCount };
}
