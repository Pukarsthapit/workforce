import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export async function supabaseAuth(): Promise<SupabaseClient> {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Microsoft sign-in is not configured for this deployment. Ask an administrator to set the Supabase URL and public key.');
  client = createClient(url, key, {
    auth: {
      storage: window.sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export async function startGoogleSignIn(): Promise<void> {
  const auth = await supabaseAuth();
  const { error } = await auth.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin, scopes: 'openid email profile' },
  });
  if (error) throw new Error(`Google sign-in could not be started: ${error.message}`);
}
