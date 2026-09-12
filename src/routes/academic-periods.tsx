import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

export const Route = createFileRoute("/academic-periods")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    const { data: roleRows = [] } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const userRole = pickPrimaryRole([
      normalizeRole(session.user.user_metadata?.role),
      normalizeRole(session.user.app_metadata?.role),
      ...(roleRows ?? []).map((row) => row.role),
    ]);
    if (!userRole || !["admin", "super_admin"].includes(userRole))
      throw redirect({ to: userRole ? getDashboardPath(userRole) : "/auth" });
  },
  head: () => ({ meta: [{ title: "Academic Periods | K-Lunsar" }] }),
  component: AcademicPeriodsPage,
});

function AcademicPeriodsPage() {
  const [form, setForm] = useState({
    name: "",
    year: "2026/2027",
    term: "",
    open: "",
    close: "",
    start: "",
    end: "",
  });
  const { data: periods = [], refetch } = useQuery({
    queryKey: ["academic-periods"],
    queryFn: async () =>
      (
        await supabase
          .from("academic_periods")
          .select("*")
          .order("registration_open_at", { ascending: false })
      ).data ?? [],
  });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase
      .from("academic_periods")
      .insert({
        name: form.name.trim(),
        academic_year: form.year,
        term: form.term.trim(),
        registration_open_at: form.open,
        registration_close_at: form.close,
        programme_start_at: form.start || null,
        programme_end_at: form.end || null,
      });
    if (error) toast.error(error.message);
    else {
      toast.success("Academic period created.");
      setForm({ name: "", year: "2026/2027", term: "", open: "", close: "", start: "", end: "" });
      await refetch();
    }
  };
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Academic setup
        </p>
        <h1 className="mt-2 text-4xl font-bold">Academic periods</h1>
        <p className="mt-3 text-muted-foreground">
          Control registration and programme dates without hard-coded periods.
        </p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <CalendarDays className="h-5 w-5 text-primary" />
            Create period
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="2026/2027 First Semester"
              className="h-10 rounded border bg-background px-3 text-sm"
            />
            <input
              required
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              placeholder="Academic year"
              className="h-10 rounded border bg-background px-3 text-sm"
            />
            <input
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              placeholder="Term/Semester"
              className="h-10 rounded border bg-background px-3 text-sm"
            />
            <label className="text-sm">
              Registration opens
              <input
                required
                type="datetime-local"
                value={form.open}
                onChange={(e) => setForm({ ...form, open: e.target.value })}
                className="mt-1 h-10 w-full rounded border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Registration closes
              <input
                required
                type="datetime-local"
                value={form.close}
                onChange={(e) => setForm({ ...form, close: e.target.value })}
                className="mt-1 h-10 w-full rounded border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Programme starts
              <input
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
                className="mt-1 h-10 w-full rounded border bg-background px-3"
              />
            </label>
            <label className="text-sm">
              Programme ends
              <input
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm({ ...form, end: e.target.value })}
                className="mt-1 h-10 w-full rounded border bg-background px-3"
              />
            </label>
            <Button type="submit" className="md:col-span-2">
              Create academic period
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {periods.map((period) => (
          <Card key={period.id}>
            <CardContent className="pt-6">
              <div className="flex justify-between">
                <p className="font-bold">{period.name}</p>
                <Badge>{period.active ? "Active" : "Closed"}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {period.academic_year} · {period.term}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Registration: {new Date(period.registration_open_at).toLocaleDateString()} -{" "}
                {new Date(period.registration_close_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
