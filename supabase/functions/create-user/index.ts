import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  console.log('--- create-user function invoked ---');
  
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS pre-flight request.');
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    console.log('Verifying caller identity...');
    const { data: { user }, error: getUserError } = await userClient.auth.getUser();
    
    if (getUserError) {
      console.error('Error getting user:', getUserError.message);
      return new Response(JSON.stringify({ error: 'Authentication error.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Caller identified as: ${user?.email}, role: ${user?.app_metadata?.role}`);
    if (user?.app_metadata?.role !== 'admin') {
      console.warn(`Access denied for user ${user?.email}. Required role: 'admin'.`);
      return new Response(
        JSON.stringify({ error: 'Acceso denegado: Solo los administradores pueden crear usuarios.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('Caller is an admin. Proceeding...');

    const { email, password, role } = await req.json()
    console.log('Request body parsed:', { email, role });
    if (!email || !password || !role) {
      console.error('Validation failed: Missing email, password, or role.');
      return new Response(
        JSON.stringify({ error: 'Se requiere email, contraseña y rol.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Step 1: Creating user for email: ${email}`);
    const { data: newUserData, error: newUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (newUserError) {
      console.error('Error during user creation:', newUserError.message);
      return new Response(JSON.stringify({ error: `Error al crear usuario: ${newUserError.message}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!newUserData.user) {
      console.error('User creation failed: newUserData.user is null.');
      return new Response(JSON.stringify({ error: 'El usuario no se pudo crear.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    console.log(`User created successfully with ID: ${newUserData.user.id}`);

    console.log(`Step 2: Assigning role '${role}' to user ID: ${newUserData.user.id}`);
    const { data: updatedUserData, error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
      newUserData.user.id,
      { app_metadata: { role: role } }
    )

    if (updateUserError) {
      console.error(`Error assigning role: ${updateUserError.message}. Deleting the user as a cleanup step.`);
      await supabaseAdmin.auth.admin.deleteUser(newUserData.user.id)
      return new Response(JSON.stringify({ error: `Error al asignar rol: ${updateUserError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    console.log('Role assigned successfully. Final user metadata:', updatedUserData.user.app_metadata);

    console.log('--- create-user function finished successfully ---');
    return new Response(JSON.stringify(updatedUserData.user), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('An unexpected error occurred:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
