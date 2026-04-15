import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Plato } from '@/types/database';

export interface SharedCartItem {
  id: string;
  mesa_id: string;
  plato_id: string;
  cantidad: number;
  notas: string | null;
  created_at: string;
  plato?: Plato;
}

export function useSharedCart(mesaId: string | null) {
  const [items, setItems] = useState<SharedCartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCart = useCallback(async () => {
    if (!mesaId) return;
    const { data } = await supabase
      .from('carrito_items')
      .select('*, plato:platos(*)')
      .eq('mesa_id', mesaId)
      .order('created_at', { ascending: true });
    if (data) setItems(data as any);
    setLoading(false);
  }, [mesaId]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Realtime subscription
  useEffect(() => {
    if (!mesaId) return;
    const channel = supabase
      .channel(`carrito-${mesaId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'carrito_items',
        filter: `mesa_id=eq.${mesaId}`,
      }, () => {
        loadCart();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mesaId, loadCart]);

  const addItem = useCallback(async (plato: Plato) => {
    if (!mesaId) return;
    // Always check DB for existing item to avoid stale state duplicates
    const { data: existing } = await supabase
      .from('carrito_items')
      .select('id, cantidad')
      .eq('mesa_id', mesaId)
      .eq('plato_id', plato.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('carrito_items')
        .update({ cantidad: existing.cantidad + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('carrito_items').insert({
        mesa_id: mesaId,
        plato_id: plato.id,
        cantidad: 1,
        notas: null,
      });
    }
  }, [mesaId]);

  const removeItem = useCallback(async (itemId: string) => {
    await supabase.from('carrito_items').delete().eq('id', itemId);
  }, []);

  const updateQuantity = useCallback(async (itemId: string, cantidad: number) => {
    if (cantidad <= 0) {
      await supabase.from('carrito_items').delete().eq('id', itemId);
    } else {
      await supabase.from('carrito_items').update({ cantidad }).eq('id', itemId);
    }
  }, []);

  const updateNotes = useCallback(async (itemId: string, notas: string) => {
    await supabase.from('carrito_items').update({ notas }).eq('id', itemId);
  }, []);

  const clearCart = useCallback(async () => {
    if (!mesaId) return;
    await supabase.from('carrito_items').delete().eq('mesa_id', mesaId);
  }, [mesaId]);

  const total = items.reduce((sum, i) => sum + (i.plato?.precio ?? 0) * i.cantidad, 0);
  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0);

  return { items, loading, addItem, removeItem, updateQuantity, updateNotes, clearCart, total, itemCount, reload: loadCart };
}
