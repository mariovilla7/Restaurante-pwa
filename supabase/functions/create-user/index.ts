import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // 1. Crea un cliente de Supabase con los permisos del usuario que hace la llamada.
  // La autorización se pasa desde el frontend.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  // 2. Verifica que el usuario que llama a la función es un administrador.
  const { data: { user } } = await userClient.auth.getUser();
  if (user?.app_metadata?.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Acceso denegado: Solo los administradores pueden crear usuarios.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. Ahora, crea un cliente con 'service_role' para poder crear un nuevo usuario.
  // Este cliente tiene permisos para saltarse cualquier política de RLS.
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { email, password, role } = await req.json();

  if (!email || !password || !role) {
    return new Response(
      JSON.stringify({ error: 'Se requiere email, contraseña y rol.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Crea el usuario en Supabase Auth, guardando el rol en app_metadata.
  const { data: newUserData, error: newUserError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // El usuario no necesita confirmar su email.
    app_metadata: { role },
  });

  if (newUserError) {
    return new Response(
      JSON.stringify({ error: newUserError.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(JSON.stringify(newUserData), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});