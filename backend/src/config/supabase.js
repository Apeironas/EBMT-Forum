require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) throw new Error('Missing env: SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('Missing env: SUPABASE_ANON_KEY');

if (!SUPABASE_SERVICE_ROLE_KEY) {
  // Still usable for user-scoped operations, but admin ops (upserts etc.) will be limited.
  console.warn('[supabase] Missing SUPABASE_SERVICE_ROLE_KEY (admin ops may fail).');
}

const commonOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
};

// Admin client (bypasses RLS). Use ONLY on backend.
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, commonOptions)
  : null;

// User-scoped client (enforces RLS) by passing user's JWT.
function createSupabaseUserClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...commonOptions,
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    }
  });
}

module.exports = { supabaseAdmin, createSupabaseUserClient };

