import { createBrowserClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from "./config";

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

/** Returns a browser Supabase client, or null when no project is configured yet (demo mode). */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  if (!cachedClient) {
    cachedClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
  }
  return cachedClient;
}
