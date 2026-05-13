import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const publishableKey =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";
    const serviceKey =
      Deno.env.get("SUPABASE_SECRET_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "";

    if (!supabaseUrl || !publishableKey || !serviceKey) {
      throw new Error("Missing Supabase function environment variables.");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) throw new Error("Unauthorized.");

    const { data: caller, error: profileError } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || caller?.role !== "admin") {
      throw new Error("Admin access required.");
    }

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.full_name ?? body.name ?? "").trim();

    if (!email || !fullName) {
      throw new Error("Employee name and email are required.");
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: invited, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        data: {
          full_name: fullName,
          department: body.department ?? null,
          position: body.position ?? null,
        },
      });

    if (inviteError) throw inviteError;

    const userId = invited.user?.id;
    if (!userId) throw new Error("Invite did not return a user id.");

    const { error: upsertError } = await adminClient.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
      department: body.department ?? "Unassigned",
      position: body.position ?? null,
      role: body.role === "admin" ? "admin" : "employee",
      is_active: body.is_active !== false,
    });

    if (upsertError) throw upsertError;

    return new Response(JSON.stringify({ user_id: userId, email }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
