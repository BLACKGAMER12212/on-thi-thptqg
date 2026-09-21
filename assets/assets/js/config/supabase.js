import { createSupabaseBrowserClient } from "./supabase.shared.js";

export const supabase = createSupabaseBrowserClient(
  "thpt_student_auth_token",
);
