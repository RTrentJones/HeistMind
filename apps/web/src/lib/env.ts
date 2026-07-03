// Boot-time env validation: fail the SERVER start with a message that names the missing key
// instead of a cryptic downstream error. (The browser path gets the same guarantee from
// packages/database's `requiredEnv` when the client is first created.)
const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

export function assertRequiredEnv(): void {
  const missing = REQUIRED.filter(name => {
    const value = process.env[name];
    return value === undefined || value === '';
  });
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')} — see .env.example.`
    );
  }
}
