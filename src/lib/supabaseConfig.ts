const getEnvVar = (key: string): string => {
  try {
    const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any)?.env ? (import.meta as any).env : undefined;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch (_) {}
  if (typeof process !== 'undefined' && process?.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

export const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL') || '';
export const supabaseAnonKey = getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY') || '';
export const supabaseServiceKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('example.supabase.co')
);
