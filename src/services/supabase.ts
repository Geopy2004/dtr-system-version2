import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as supabaseClient } from "./supabase.js";

export const supabase: SupabaseClient = supabaseClient as unknown as SupabaseClient;

export default supabase;
