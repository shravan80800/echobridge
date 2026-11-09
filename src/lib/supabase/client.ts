import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Validates whether Supabase environment variables are properly configured.
 * Returns false if missing or left as default template placeholders.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  if (url.includes("your-project-id") || anonKey.includes("your_supabase_anon")) {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

let browserClient: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase browser client.
 * Returns null if Supabase is not configured (triggering dual-mode fallback).
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");

    browserClient = createClient(
      cleanUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }

  return browserClient;
}
