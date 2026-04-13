import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: getUserError } = await userClient.auth.getUser();
    
    if (getUserError) {
      return new Response(JSON.stringify({ error: 'Authentication error.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (user?.app_metadata?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado: Solo los administradores pueden crear usuarios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, role } = await req.json()
    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Se requiere email, contraseña y rol.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: newUserData, error: newUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (newUserError) {
      return new Response(JSON.stringify({ error: `Error al crear usuario: ${newUserError.message}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!newUserData.user) {
      return new Response(JSON.stringify({ error: 'El usuario no se pudo crear.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: updatedUserData, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      newUserData.user.id,
      { app_metadata: { role: role } }
    )

    if (updateUserError) {
      await supabaseAdmin.auth.admin.deleteUser(newUserData.user.id)
      return new Response(JSON.stringify({ error: `Error al asignar rol: ${updateUserError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify(updatedUserData.user), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
