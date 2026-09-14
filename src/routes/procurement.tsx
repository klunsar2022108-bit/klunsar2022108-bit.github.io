import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

export const Route = createFileRoute("/procurement")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    const { data: roleRows = [] } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const role = pickPrimaryRole([
      normalizeRole(session.user.user_metadata?.role),
      normalizeRole(session.user.app_metadata?.role),
      ...(roleRows ?? []).map((row) => row.role),
    ]);
    if (!role || !["admin", "super_admin"].includes(role))
      throw redirect({ to: role ? getDashboardPath(role) : "/auth" });
  },
  head: () => ({ meta: [{ title: "Procurement | K-Lunsar Computer Training" }] }),
  component: ProcurementPage,
});

function ProcurementPage() {
  const queryClient = useQueryClient();
  const [supplier, setSupplier] = useState({ name: "", phone: "", email: "", address: "" });
  const [request, setRequest] = useState({ supplierId: "", description: "", amount: "" });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () =>
      (
        await supabase
          .from("suppliers")
          .select("id,name,phone,email,address,active")
          .eq("active", true)
          .order("name")
      ).data ?? [],
  });
  const { data: requests = [] } = useQuery({
    queryKey: ["purchase-requests"],
    queryFn: async () =>
      (
        await supabase
          .from("purchase_requests")
          .select("id,description,amount,status,created_at,suppliers(name)")
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const addSupplier = async (event: FormEvent) => {
    event.preventDefault();
    const { error } = await supabase.from("suppliers").insert(supplier);
    if (error) toast.error(error.message);
    else {
      toast.success("Supplier added.");
      setSupplier({ name: "", phone: "", email: "", address: "" });
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    }
  };
  const createRequest = async (event: FormEvent) => {
    event.preventDefault();
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;
    const { error } = await supabase.from("purchase_requests").insert({
      supplier_id: request.supplierId || null,
      requested_by: userId,
      description: request.description.trim(),
      amount: Number(request.amount) || 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Purchase request submitted for approval.");
      setRequest({ supplierId: "", description: "", amount: "" });
      await queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    }
  };
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-8 sm:py-12">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Truck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Commerce</p>
            <h1 className="mt-2 text-4xl font-bold">Suppliers & procurement</h1>
            <p className="mt-2 text-muted-foreground">
              Low stock can become an approved purchase request, then a supplier order and goods
              receipt.
            </p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Add supplier</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={addSupplier} className="space-y-2">
                {(["name", "phone", "email", "address"] as const).map((field) => (
                  <input
                    key={field}
                    required={field === "name"}
                    value={supplier[field]}
                    onChange={(event) =>
                      setSupplier((current) => ({ ...current, [field]: event.target.value }))
                    }
                    placeholder={field[0].toUpperCase() + field.slice(1)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                ))}
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  Save supplier
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold">Purchase request</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={createRequest} className="space-y-2">
                <select
                  value={request.supplierId}
                  onChange={(event) =>
                    setRequest((current) => ({ ...current, supplierId: event.target.value }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <input
                  required
                  value={request.description}
                  onChange={(event) =>
                    setRequest((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Items and quantities required"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  required
                  type="number"
                  min="0"
                  value={request.amount}
                  onChange={(event) =>
                    setRequest((current) => ({ ...current, amount: event.target.value }))
                  }
                  placeholder="Estimated amount"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
                <Button type="submit">Submit purchase request</Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <h2 className="text-xl font-bold">Purchase requests</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchase requests yet.</p>
            ) : (
              requests.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {(item.suppliers as { name?: string } | null)?.name ?? "Supplier pending"} ·
                      Le {Number(item.amount).toLocaleString()}
                    </p>
                  </div>
                  <Badge>{item.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
