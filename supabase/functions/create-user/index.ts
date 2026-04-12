import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Esto es necesario para las llamadas desde el navegador (pre-flight request).
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Crea un cliente de Supabase con el contexto de autenticación del usuario que hace la llamada.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 2. Verifica que el usuario que llama a la función es un administrador. ¡Paso de seguridad CRÍTICO!
    const { data: { user } } = await userClient.auth.getUser()
    if (user?.app_metadata?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado: Solo los administradores pueden crear usuarios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Obtiene los detalles del nuevo usuario del cuerpo de la petición.
    const { email, password, role } = await req.json()
    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Se requiere email, contraseña y rol.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Crea un cliente de Supabase con la 'service_role' para poder realizar acciones de administrador.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 5. Crea el nuevo usuario y, lo más importante, guarda el rol en `app_metadata`.
    const { data: newUserData, error: newUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma el email automáticamente.
      app_metadata: { role: role }, // ¡¡AQUÍ ESTÁ LA MAGIA!!
    })

    if (newUserError) {
      return new Response(JSON.stringify({ error: newUserError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify(newUserData.user), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})