// These are the headers that will be sent with every response from our Edge Functions.
// They are crucial for security and for allowing the browser to make requests.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
