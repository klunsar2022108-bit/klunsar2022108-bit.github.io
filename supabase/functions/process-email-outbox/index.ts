import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const workerSecret = Deno.env.get("EMAIL_WORKER_SECRET");
  if (workerSecret && request.headers.get("x-email-worker-secret") !== workerSecret)
    return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!supabaseUrl || !serviceRoleKey || !resendKey || !fromEmail)
    return json({ error: "Email worker is not configured" }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: jobs, error: loadError } = await admin
    .from("email_outbox")
    .select("id, recipient, subject, body, attempts")
    .eq("status", "pending")
    .lt("attempts", 5)
    .order("created_at", { ascending: true })
    .limit(25);
  if (loadError) return json({ error: loadError.message }, 500);

  let sent = 0;
  for (const job of jobs ?? []) {
    await admin
      .from("email_outbox")
      .update({ status: "sending", attempts: job.attempts + 1 })
      .eq("id", job.id);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromEmail,
          to: [job.recipient],
          subject: job.subject,
          text: job.body,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      await admin
        .from("email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", job.id);
      sent += 1;
    } catch (error) {
      await admin
        .from("email_outbox")
        .update({
          status: job.attempts + 1 >= 5 ? "failed" : "pending",
          last_error: error instanceof Error ? error.message : String(error),
        })
        .eq("id", job.id);
    }
  }
  return json({ processed: jobs?.length ?? 0, sent });
});
