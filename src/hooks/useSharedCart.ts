import { useState, useEffect, useCallback, useRef } from 'react';
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
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve());

  const loadCart = useCallback(async () => {
    if (!mesaId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('carrito_items')
      .select('*, plato:platos(*)')
      .eq('mesa_id', mesaId)
      .order('created_at', { ascending: true });

    if (error) {
      setLoading(false);
      return;
    }

    const rawItems = (data ?? []) as SharedCartItem[];
    const mergedByPlato = new Map<string, SharedCartItem>();
    const originalById = new Map<string, { cantidad: number; notas: string | null }>();
    const duplicateIds: string[] = [];

    for (const item of rawItems) {
      const existing = mergedByPlato.get(item.plato_id);

      if (!existing) {
        mergedByPlato.set(item.plato_id, { ...item });
        originalById.set(item.id, { cantidad: item.cantidad, notas: item.notas });
        continue;
      }

      existing.cantidad += item.cantidad;
      if (!existing.notas && item.notas) {
        existing.notas = item.notas;
      }
      duplicateIds.push(item.id);
    }

    const normalizedItems = Array.from(mergedByPlato.values());
    setItems(normalizedItems);
    setLoading(false);

    if (duplicateIds.length === 0) {
      return;
    }

    await Promise.all([
      ...normalizedItems.map((item) => {
        const original = originalById.get(item.id);
        if (!original || (original.cantidad === item.cantidad && original.notas === item.notas)) {
          return Promise.resolve();
        }

        return supabase
          .from('carrito_items')
          .update({ cantidad: item.cantidad, notas: item.notas })
          .eq('id', item.id)
          .then(() => undefined);
      }),
      ...duplicateIds.map((id) =>
        supabase.from('carrito_items').delete().eq('id', id).then(() => undefined),
      ),
    ]);
  }, [mesaId]);

  const runSerializedMutation = useCallback(async (mutation: () => Promise<void>) => {
    const nextMutation = mutationQueueRef.current
      .catch(() => undefined)
      .then(mutation);

    mutationQueueRef.current = nextMutation.catch(() => undefined);
    await nextMutation;
    await loadCart();
  }, [loadCart]);

  useEffect(() => {
    void loadCart();
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
        void loadCart();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mesaId, loadCart]);

  useEffect(() => {
    if (!mesaId) return;

    const interval = window.setInterval(() => {
      void loadCart();
    }, 2000);

    return () => window.clearInterval(interval);
  }, [mesaId, loadCart]);

  const addItem = useCallback(async (plato: Plato) => {
    if (!mesaId) return;
    await runSerializedMutation(async () => {
      const { data: existing, error: existingError } = await supabase
        .from('carrito_items')
        .select('id, cantidad')
        .eq('mesa_id', mesaId)
        .eq('plato_id', plato.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { error } = await supabase
          .from('carrito_items')
          .update({ cantidad: existing.cantidad + 1 })
          .eq('id', existing.id);

        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('carrito_items').insert({
        mesa_id: mesaId,
        plato_id: plato.id,
        cantidad: 1,
        notas: null,
      });

      if (error) throw error;
    });
  }, [mesaId, runSerializedMutation]);

  const removeItem = useCallback(async (itemId: string) => {
    await runSerializedMutation(async () => {
      const { error } = await supabase.from('carrito_items').delete().eq('id', itemId);
      if (error) throw error;
    });
  }, [runSerializedMutation]);

  const updateQuantity = useCallback(async (itemId: string, cantidad: number) => {
    await runSerializedMutation(async () => {
      if (cantidad <= 0) {
        const { error } = await supabase.from('carrito_items').delete().eq('id', itemId);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from('carrito_items').update({ cantidad }).eq('id', itemId);
      if (error) throw error;
    });
  }, [runSerializedMutation]);

  const updateNotes = useCallback(async (itemId: string, notas: string) => {
    await runSerializedMutation(async () => {
      const { error } = await supabase.from('carrito_items').update({ notas }).eq('id', itemId);
      if (error) throw error;
    });
  }, [runSerializedMutation]);

  const clearCart = useCallback(async () => {
    if (!mesaId) return;
    await runSerializedMutation(async () => {
      const { error } = await supabase.from('carrito_items').delete().eq('mesa_id', mesaId);
      if (error) throw error;
    });
  }, [mesaId, runSerializedMutation]);

  const total = items.reduce((sum, i) => sum + (i.plato?.precio ?? 0) * i.cantidad, 0);
  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0);

  return { items, loading, addItem, removeItem, updateQuantity, updateNotes, clearCart, total, itemCount, reload: loadCart };
}
