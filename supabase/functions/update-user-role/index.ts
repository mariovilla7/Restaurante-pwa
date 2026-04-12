import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // 1. Check if the user is an admin
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (user?.app_metadata?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Acceso denegado.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  // 2. Get payload
  const { userId, newRole } = await req.json();
  if (!userId || !newRole) {
    return new Response(JSON.stringify({ error: 'Se requiere userId y newRole.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // 3. Create admin client to update user
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // 4. Update the user's role in app_metadata
  const { data: updatedUser, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { app_metadata: { role: newRole } }
  );

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify(updatedUser), { status: 200, headers: { 'Content-Type': 'application/json' } });
});