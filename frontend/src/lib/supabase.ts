import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Initialize client directly to avoid header issues with Proxy
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Create a service-role client for admin operations */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!serviceKey) return supabase;
  return createClient(supabaseUrl, serviceKey);
}
