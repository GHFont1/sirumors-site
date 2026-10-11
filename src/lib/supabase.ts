"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Public values: the anon key only grants what row-level security allows.
export const SUPABASE_URL = "https://qzeygvpgdlmjbmhsfunt.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6ZXlndnBnZGxtamJtaHNmdW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MjE0NTcsImV4cCI6MjEwNzI5NzQ1N30.9iaFEOa54oHxqZ-fvDeslHlBL0_XLdJzXG5i2tHT8bM";

let client: SupabaseClient | null = null;
export function sb() {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    });
  }
  return client;
}
