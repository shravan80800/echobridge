import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

let serverClient: SupabaseClient | null = null;

/**
 * Creates or retrieves the singleton Supabase server client.
 * Uses SUPABASE_SERVICE_ROLE_KEY for server operations if available,
 * otherwise falls back to anon key. Returns null if not configured.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!serverClient) {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("your_supabase_service_role")
        ? process.env.SUPABASE_SERVICE_ROLE_KEY
        : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    serverClient = createClient(cleanUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClient;
}
