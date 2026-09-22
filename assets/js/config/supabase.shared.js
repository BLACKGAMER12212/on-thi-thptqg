import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Anon key được phép xuất hiện ở frontend. Quyền thật phải được khóa bằng RLS
// và các hàm security definer có kiểm tra vai trò ở phía Supabase.
export const SUPABASE_URL = "https://foujvxpzsilshacrpslu.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvdWp2eHB6c2lsc2hhY3Jwc2x1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MzYyMzQsImV4cCI6MjEwMjAxMjIzNH0.K8_zJZjKkmU-_WdaXowkM7dLhVBP5GpMRPAsbiiDLb4";

export function createSupabaseBrowserClient(storageKey, authOverrides = {}) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      ...authOverrides,
    },
  });
}
