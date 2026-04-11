import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pkcysquavhzdlwjpgajz.supabase.co';
const supabaseKey = 'sb_publishable_48NqZbSR32V1npxYb-4gKA_TpLo7ujK';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
