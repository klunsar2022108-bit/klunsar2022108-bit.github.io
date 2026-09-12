import { createClient } from "supabase";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const accounts = [
  {
    email: "milllomml2022108@gmail.com",
    role: "customer",
    accountType: "customer",
    approval: "approved",
    name: "K-Lunsar Customer",
  },
  {
    email: "kluu2022108@gmail.com",
    role: "student",
    accountType: "student",
    approval: "pending",
    name: "K-Lunsar Student",
  },
  {
    email: "millomel2022108@gmail.com",
    role: "teacher",
    accountType: "teacher",
    approval: "pending",
    name: "K-Lunsar Teacher",
  },
  {
    email: "Abuabu2022108@gmail.com",
    role: "admin",
    accountType: "admin",
    approval: "approved",
    name: "K-Lunsar Admin",
  },
  {
    email: "nmilton108@central.edu.sl",
    role: "super_admin",
    accountType: "super_admin",
    approval: "approved",
    name: "K-Lunsar Super Admin",
  },
] as const;

serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const expectedSecret = Deno.env.get("ROLE_SEED_SECRET");
  if (!expectedSecret || request.headers.get("x-role-seed-secret") !== expectedSecret)
    return new Response("Unauthorized", { status: 401 });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return new Response("Server is not configured", { status: 500 });
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const body = (await request.json()) as { password?: string };
  if (!body.password || body.password.length < 8)
    return new Response("A valid password is required", { status: 400 });
  const results: Array<{ email: string; userId?: string; role: string; status: string }> = [];

  for (const account of accounts) {
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const current = existing.users.find(
      (user) => user.email?.toLowerCase() === account.email.toLowerCase(),
    );
    let userId = current?.id;
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: account.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.name,
          role: account.role,
          approval_status: account.approval,
          account_type: account.accountType,
          seed_account: "true",
        },
      });
      if (error || !data.user) {
        results.push({
          email: account.email,
          role: account.role,
          status: `error: ${JSON.stringify(error ?? { message: "create failed" })}`,
        });
        continue;
      }
      userId = data.user.id;
    } else {
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.name,
          role: account.role,
          approval_status: account.approval,
          account_type: account.accountType,
        },
      });
      if (error) {
        results.push({
          email: account.email,
          userId,
          role: account.role,
          status: `error: ${error.message}`,
        });
        continue;
      }
    }
    await admin
      .from("profiles")
      .upsert({
        id: userId,
        email: account.email,
        full_name: account.name,
        account_type: account.accountType,
        approval_status: account.approval,
        account_status: "active",
      });
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role: account.role });
    results.push({
      email: account.email,
      userId,
      role: account.role,
      status: current ? "updated" : "created",
    });
  }
  return Response.json({ accounts: results });
});
