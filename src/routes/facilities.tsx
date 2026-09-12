import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

export const Route = createFileRoute("/facilities")({
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
  head: () => ({ meta: [{ title: "Facilities | K-Lunsar Computer Training" }] }),
  component: FacilitiesPage,
});

function FacilitiesPage() {
  const [form, setForm] = useState({ name: "", type: "classroom", capacity: "", description: "" });
  const { data: facilities = [], refetch } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () =>
      (
        await supabase
          .from("facilities")
          .select("id,name,facility_type,capacity,status,description")
          .order("name")
      ).data ?? [],
  });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase
      .from("facilities")
      .insert({
        name: form.name.trim(),
        facility_type: form.type,
        capacity: form.capacity ? Number(form.capacity) : null,
        description: form.description.trim(),
      });
    if (error) toast.error(error.message);
    else {
      toast.success("Facility added.");
      setForm({ name: "", type: "classroom", capacity: "", description: "" });
      await refetch();
    }
  };
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-14">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Operations</p>
        <h1 className="mt-2 text-4xl font-bold">Classrooms & facilities</h1>
        <p className="mt-3 text-muted-foreground">
          Manage rooms, capacity, equipment and maintenance status separately from saleable
          inventory.
        </p>
      </div>
      <Card>
        <CardHeader>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Plus className="h-5 w-5 text-primary" />
            Add facility
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-3 md:grid-cols-4">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Computer Lab 1"
              className="h-10 rounded border bg-background px-3 text-sm"
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-10 rounded border bg-background px-3 text-sm"
            >
              <option value="classroom">Classroom</option>
              <option value="computer_lab">Computer lab</option>
              <option value="office">Office</option>
              <option value="shop">Shop</option>
              <option value="store">Store</option>
              <option value="training_room">Training room</option>
            </select>
            <input
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="Capacity"
              className="h-10 rounded border bg-background px-3 text-sm"
            />
            <Button type="submit">Add facility</Button>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description and maintenance notes"
              className="rounded border bg-background px-3 py-2 text-sm md:col-span-4"
            />
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        {facilities.map((facility) => (
          <Card key={facility.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold">
                  <Building2 className="h-5 w-5 text-primary" />
                  {facility.name}
                </h2>
                <Badge>{facility.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {facility.facility_type} · Capacity: {facility.capacity ?? "Not set"}
              </p>
              <p className="mt-2 text-sm">{facility.description || "No description yet."}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
