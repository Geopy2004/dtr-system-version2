import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const exposedServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase browser environment variables.");
}

if (exposedServiceRoleKey) {
  throw new Error("Do not expose SUPABASE_SERVICE_ROLE_KEY with a VITE_ prefix.");
}

const clearPersistentAuthStorage = () => {
  if (typeof window === "undefined") return;

  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    .forEach((key) => window.localStorage.removeItem(key));
};

const clearSessionAuthStorage = () => {
  if (typeof window === "undefined") return;

  Object.keys(window.sessionStorage)
    .filter((key) => key.startsWith("sb-") && key.endsWith("-auth-token"))
    .forEach((key) => window.sessionStorage.removeItem(key));
};

clearPersistentAuthStorage();

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", clearSessionAuthStorage);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage:
      typeof window === "undefined" ? undefined : window.sessionStorage,
  },
});
