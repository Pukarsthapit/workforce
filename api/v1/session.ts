import { Session } from '../../src/contract/session';

interface VercelRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponse;
  json(body: unknown): void;
}

interface SupabaseUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  app_metadata?: { providers?: string[] };
}

interface LoginProfile {
  person_code: string;
  name: string;
  user_type: 'employee' | 'manager' | 'admin';
  capabilities: string[];
  state: string;
  location_name: string;
}

const refusal = (code: string, message: string, next: string) => ({ code, message, next });

function config() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) throw new Error('Supabase server environment is incomplete.');
  return { url: url.replace(/\/+$/, ''), anonKey, serviceRoleKey };
}

function bearerToken(req: VercelRequest): string | null {
  const value = req.headers.authorization;
  const header = Array.isArray(value) ? value[0] : value;
  const match = header?.match(/^Bearer ([A-Za-z0-9._-]+)$/);
  return match?.[1] ?? null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json(refusal('method-not-allowed', 'This sign-in endpoint only accepts GET.', 'Sign in again.'));
  }

  const token = bearerToken(req);
  if (!token) return res.status(401).json(refusal('signed-out', 'You are signed out.', 'Sign in again to continue.'));

  let settings: ReturnType<typeof config>;
  try {
    settings = config();
  } catch {
    return res.status(503).json(refusal('identity-unavailable', 'Google sign-in is not configured for this deployment.', 'Ask an administrator to configure Supabase Auth.'));
  }

  try {
    const userResponse = await fetch(`${settings.url}/auth/v1/user`, {
      headers: { apikey: settings.anonKey, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!userResponse.ok) return res.status(401).json(refusal('signed-out', 'Your Google sign-in session is invalid or expired.', 'Sign in again to continue.'));

    const user = await userResponse.json() as SupabaseUser;
    const email = user.email?.trim().toLowerCase();
    if (!user.id || !email || !user.email_confirmed_at || !user.app_metadata?.providers?.includes('google')) {
      return res.status(403).json(refusal('unverified-email', 'A verified Google email is required.', 'Verify your Google account email, then sign in again.'));
    }

    const rpcResponse = await fetch(`${settings.url}/rest/v1/rpc/resolve_workforce_login`, {
      method: 'POST',
      headers: {
        apikey: settings.serviceRoleKey,
        Authorization: `Bearer ${settings.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_user_id: user.id,
        p_email: email,
        p_super_admin_email: (process.env.WORKFORCE_SUPER_ADMIN_EMAIL ?? 'pukarsthapit91@gmail.com').trim().toLowerCase(),
      }),
      cache: 'no-store',
    });
    if (!rpcResponse.ok) {
      const details = await rpcResponse.text();
      if (details.includes('employee-not-found-or-ambiguous')) {
        return res.status(403).json(refusal('employee-not-found', 'No single active employee record matches this Google email.', 'Ask your administrator to add this email to your employee details.'));
      }
      if (details.includes('account-disabled')) {
        return res.status(403).json(refusal('account-disabled', 'This workforce account is disabled.', 'Contact your administrator.'));
      }
      if (details.includes('employee-account-already-linked')) {
        return res.status(403).json(refusal('account-linked', 'This employee record is already linked to another Google account.', 'Contact your administrator.'));
      }
      const errorCode = details.match(/"code"\s*:\s*"([^"]+)"/)?.[1] ?? 'unknown';
      console.error('Workforce login provisioning failed', rpcResponse.status, errorCode);
      return res.status(503).json(refusal('identity-unavailable', 'Your workforce account could not be loaded.', 'Try again later. If the problem continues, contact your administrator.'));
    }

    const profile = await rpcResponse.json() as LoginProfile;
    const userType = profile.user_type;
    const stateIsOnboarding = profile.state === 'candidate' || profile.state === 'preboard';
    const session = Session.safeParse({
      token,
      account: {
        email,
        userType,
        personCode: profile.person_code,
        name: profile.name,
        roleName: userType === 'admin' ? 'Admin' : userType === 'manager' ? 'Manager' : 'Employee',
        roleDescription: userType === 'admin' ? 'Configure how this workforce operates' : '',
        locationName: profile.location_name,
      },
      capabilities: profile.capabilities,
      onboarding: userType === 'employee' && stateIsOnboarding,
      simulated: false,
    });
    if (!session.success) {
      console.error('Workforce session response contract failed', session.error.issues.map(issue => issue.path.join('.')));
      return res.status(503).json(refusal('identity-unavailable', 'Your workforce account could not be loaded.', 'Contact your administrator.'));
    }
    return res.status(200).json(session.data);
  } catch (error) {
    console.error('Workforce sign-in endpoint failed', error);
    return res.status(503).json(refusal('identity-unavailable', 'The sign-in service could not be reached.', 'Try again later.'));
  }
}
