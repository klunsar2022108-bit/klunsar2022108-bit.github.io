import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/support")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
  },
  head: () => ({ meta: [{ title: "Support | K-Lunsar Computer Training" }] }),
  component: SupportPage,
});

function SupportPage() {
  const [form, setForm] = useState({ subject: "", description: "", priority: "normal" });
  const { data: tickets = [], refetch } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () =>
      (
        await supabase
          .from("support_tickets")
          .select("id,ticket_number,subject,description,priority,status,created_at")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("support_tickets")
      .insert({
        ticket_number: `TKT-${Date.now()}`,
        requester_id: user.id,
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
    if (error) toast.error(error.message);
    else {
      toast.success("Support ticket created.");
      setForm({ subject: "", description: "", priority: "normal" });
      await refetch();
    }
  };
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Support</p>
        <h1 className="mt-2 text-4xl font-bold">Helpdesk tickets</h1>
        <p className="mt-3 text-muted-foreground">
          Track questions and operational support separately from live chat.
        </p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <MessageSquare className="h-5 w-5 text-primary" />
            Open a ticket
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={createTicket} className="space-y-3">
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Subject"
              className="h-10 w-full rounded border bg-background px-3 text-sm"
            />
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="h-10 w-full rounded border bg-background px-3 text-sm"
            >
              <option value="low">Low priority</option>
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent</option>
            </select>
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the issue"
              rows={5}
              className="w-full rounded border bg-background px-3 py-2 text-sm"
            />
            <Button type="submit">Create ticket</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="text-xl font-bold">My tickets</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No support tickets yet.</p>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="rounded border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {ticket.ticket_number} · {ticket.subject}
                  </p>
                  <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"}>
                    {ticket.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{ticket.description}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
