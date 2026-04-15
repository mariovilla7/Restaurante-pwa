import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Authorization header missing' }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    const claims = claimsData?.claims as { sub?: string; app_metadata?: { role?: string } } | undefined;

    if (claimsError || !claims?.sub) {
      return jsonResponse({ error: 'Token inválido.' }, 401);
    }

    if (claims.app_metadata?.role !== 'admin') {
      return jsonResponse({ error: 'Acceso denegado.' }, 403);
    }

    const body = await req.json().catch(() => null);
    const userId = typeof body?.userId === 'string' ? body.userId : '';

    if (!userId) {
      return jsonResponse({ error: 'Se requiere userId.' }, 400);
    }

    if (userId === claims.sub) {
      return jsonResponse({ error: 'No puedes eliminar tu propia cuenta.' }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
});
