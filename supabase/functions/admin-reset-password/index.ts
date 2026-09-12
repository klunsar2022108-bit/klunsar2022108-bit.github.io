import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey)
    return new Response("Server is not configured", { status: 500 });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: userError,
  } = await adminClient.auth.getUser(token);
  if (userError || !user) return new Response("Unauthorized", { status: 401 });

  const { data: role } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!role) return new Response("Super Admin access required", { status: 403 });

  const payload = (await request.json()) as { userId?: string; redirectTo?: string };
  if (!payload.userId) return new Response("userId is required", { status: 400 });
  const { data: target, error: targetError } = await adminClient.auth.admin.getUserById(
    payload.userId,
  );
  if (targetError || !target.user?.email)
    return new Response("Target user not found", { status: 404 });

  const { error } = await adminClient.auth.resetPasswordForEmail(target.user.email, {
    redirectTo: payload.redirectTo,
  });
  if (error) return new Response(error.message, { status: 400 });
  await adminClient
    .from("admin_audit_events")
    .insert({
      actor_id: user.id,
      action: "password_reset_requested",
      target_user_id: payload.userId,
      resource_type: "auth.users",
      details: { email: target.user.email },
    });
  return Response.json({ ok: true });
});
