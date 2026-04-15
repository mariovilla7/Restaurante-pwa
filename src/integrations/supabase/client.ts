import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://pkcysquavhzdlwjpgajz.supabase.co';
export const supabaseKey = 'sb_publishable_48NqZbSR32V1npxYb-4gKA_TpLo7ujK';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
