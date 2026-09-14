import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey, supabaseServiceKey, isSupabaseConfigured } from './supabaseConfig';

export { supabaseUrl, supabaseAnonKey, supabaseServiceKey, isSupabaseConfigured };

let _clientPromise: Promise<SupabaseClient | null> | null = null;
let _adminPromise: Promise<SupabaseClient | null> | null = null;

// Synchronous references kept for backward compatibility; initialized asynchronously
export let supabase: SupabaseClient | null = null;
export let supabaseAdmin: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  if (!_clientPromise) {
    _clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      });
      supabase = client;
      return client;
    });
  }
  return _clientPromise;
}

export async function getSupabaseAdmin(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!key) return null;
  if (!_adminPromise) {
    _adminPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      const admin = createClient(supabaseUrl, key);
      supabaseAdmin = admin;
      return admin;
    });
  }
  return _adminPromise;
}

// Auto-initialize if configured in browser environment
if (isSupabaseConfigured && typeof window !== 'undefined') {
  getSupabaseClient().catch(() => {});
}

export async function testSupabaseConnection() {
  if (!isSupabaseConfigured) {
    return { success: false, message: 'SUPABASE_URL and SUPABASE_ANON_KEY environment variables are missing.' };
  }
  try {
    const sb = await getSupabaseClient();
    if (!sb) {
      return { success: false, message: 'Could not initialize Supabase client.' };
    }
    const { error } = await sb.from('_health_check').select('*').limit(1);
    if (error && error.code !== 'PGRST301' && error.code !== '42P01') {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Successfully connected to Supabase project!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to connect to Supabase.' };
  }
}

// Google Sign In via Supabase Auth
export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  const sb = await getSupabaseClient();
  if (!sb) {
    throw new Error('Failed to initialize Supabase client.');
  }
  const redirectTo = window.location.origin + '/login';
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  if (error) throw error;
  return data;
}

// Forgot Password Email via Supabase Auth
export async function sendForgotPasswordEmail(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  const sb = await getSupabaseClient();
  if (!sb) {
    throw new Error('Failed to initialize Supabase client.');
  }
  const redirectTo = window.location.origin + '/reset-password';
  const { data, error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo
  });
  if (error) throw error;
  return data;
}

// Update User Password via Supabase Auth
export async function updateSupabasePassword(newPassword: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  const sb = await getSupabaseClient();
  if (!sb) {
    throw new Error('Failed to initialize Supabase client.');
  }
  const { data, error } = await sb.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
  return data;
}

