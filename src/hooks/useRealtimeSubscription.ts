import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Event = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export function useRealtimeSubscription<T extends { [key: string]: any }>(
  table: string,
  event: Event,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  filter?: string
) {
  useEffect(() => {
    const channelConfig: any = {
      event,
      schema: 'public',
      table,
    };
    if (filter) channelConfig.filter = filter;

    const channel = supabase
      .channel(`${table}-${event}-${filter || 'all'}`)
      .on('postgres_changes', channelConfig, callback)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, callback, filter]);
}
