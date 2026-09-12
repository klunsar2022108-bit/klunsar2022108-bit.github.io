import { createClient } from "supabase";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return new Response("Server is not configured", { status: 500 });
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Unauthorized", { status: 401 });
  const {
    data: { user: actor },
  } = await admin.auth.getUser(token);
  if (!actor) return new Response("Unauthorized", { status: 401 });
  const { data: superAdmin } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", actor.id)
    .in("role", ["admin", "super_admin"])
    .maybeSingle();
  if (!superAdmin) return new Response("Admin access required", { status: 403 });
  const body = (await request.json()) as { email?: string; name?: string; title?: string };
  if (!body.email || !body.name)
    return new Response("email and name are required", { status: 400 });
  const { data: created, error: createError } = await admin.auth.admin.inviteUserByEmail(
    body.email,
    { data: { full_name: body.name, role: "teacher", approval_status: "pending" } },
  );
  if (createError || !created.user)
    return new Response(createError?.message ?? "Teacher account could not be created", {
      status: 400,
    });
  const { error: tutorError } = await admin
    .from("tutors")
    .insert({
      user_id: created.user.id,
      name: body.name,
      title: body.title ?? "Teacher",
      active: true,
    });
  if (tutorError) return new Response(tutorError.message, { status: 400 });
  await admin
    .from("admin_audit_events")
    .insert({
      actor_id: actor.id,
      action: "teacher_account_created",
      target_user_id: created.user.id,
      resource_type: "tutors",
      details: { email: body.email, name: body.name },
    });
  return Response.json({ ok: true, userId: created.user.id });
});
