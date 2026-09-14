import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AlertTriangle, Boxes, History, Plus, Send, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/assets")({
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
    if (!userRole || !["teacher", "admin", "super_admin"].includes(userRole))
      throw redirect({ to: userRole ? getDashboardPath(userRole) : "/auth" });
  },
  head: () => ({ meta: [{ title: "Assets & Equipment | K-Lunsar Computer Training" }] }),
  component: AssetsPage,
});

function AssetsPage() {
  const [assetForm, setAssetForm] = useState({
    name: "",
    assetType: "",
    categoryId: "",
    locationId: "",
    serialNumber: "",
    condition: "good",
    description: "",
  });
  const [transferForm, setTransferForm] = useState({
    assetId: "",
    recipientId: "",
    reason: "",
    condition: "good",
    type: "person_handover",
  });
  const [incidentForm, setIncidentForm] = useState({
    assetId: "",
    type: "damage",
    description: "",
  });
  const { data: assets = [], refetch: refetchAssets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select(
          "id, asset_id, name, asset_type, serial_number, condition, status, description, current_custodian_id, asset_locations(name), asset_categories(name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["asset-categories"],
    queryFn: async () =>
      (await supabase.from("asset_categories").select("id,name").order("name")).data ?? [],
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["asset-locations"],
    queryFn: async () =>
      (await supabase.from("asset_locations").select("id,name").eq("active", true).order("name"))
        .data ?? [],
  });
  const { data: users = [] } = useQuery({
    queryKey: ["asset-users"],
    queryFn: async () =>
      (
        await supabase
          .from("profiles")
          .select("id,full_name,account_type")
          .in("account_type", ["teacher", "admin"])
          .order("full_name")
      ).data ?? [],
  });
  const { data: transfers = [], refetch: refetchTransfers } = useQuery({
    queryKey: ["asset-transfers"],
    queryFn: async () =>
      (
        await supabase
          .from("asset_transfers")
          .select("id, asset_id, transfer_type, reason, status, created_at, assets(asset_id,name)")
          .in("status", ["pending", "awaiting_recipient_confirmation", "disputed"])
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const addAsset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    const assetId = `AST-${assetForm.assetType.toUpperCase().slice(0, 3) || "GEN"}-${Date.now().toString().slice(-4)}`;
    const { error } = await supabase.from("assets").insert({
      asset_id: assetId,
      name: assetForm.name.trim(),
      asset_type: assetForm.assetType.trim(),
      category_id: assetForm.categoryId || null,
      location_id: assetForm.locationId || null,
      serial_number: assetForm.serialNumber.trim() || null,
      condition: assetForm.condition,
      description: assetForm.description.trim(),
      created_by: user.user?.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Asset registered.");
      setAssetForm({
        name: "",
        assetType: "",
        categoryId: "",
        locationId: "",
        serialNumber: "",
        condition: "good",
        description: "",
      });
      await refetchAssets();
    }
  };

  const requestTransfer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    const asset = assets.find((item) => item.id === transferForm.assetId);
    if (!asset || !user.user) return;
    const { error } = await supabase.from("asset_transfers").insert({
      asset_id: asset.id,
      from_custodian_id: asset.current_custodian_id ?? user.user.id,
      to_custodian_id: transferForm.type === "return_to_admin" ? null : transferForm.recipientId,
      transfer_type: transferForm.type,
      reason: transferForm.reason.trim(),
      condition_at_handover: transferForm.condition,
      created_by: user.user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Transfer request submitted for Admin review.");
      setTransferForm({
        assetId: "",
        recipientId: "",
        reason: "",
        condition: "good",
        type: "person_handover",
      });
      await refetchTransfers();
    }
  };

  const reportIncident = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("asset_incidents").insert({
      asset_id: incidentForm.assetId,
      incident_type: incidentForm.type,
      description: incidentForm.description.trim(),
      reported_by: user.user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Asset incident reported.");
      setIncidentForm({ assetId: "", type: "damage", description: "" });
    }
  };

  const reviewTransfer = async (id: string, approved: boolean) => {
    const reason = approved ? "" : (window.prompt("Rejection reason") ?? "");
    const { error } = await supabase.rpc("approve_asset_transfer", {
      _transfer_id: id,
      _approved: approved,
      _reason: reason,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(approved ? "Transfer approved." : "Transfer rejected.");
      await refetchTransfers();
      await refetchAssets();
    }
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-8 sm:py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Operations</p>
          <h1 className="mt-2 text-4xl font-bold">Assets & equipment</h1>
          <p className="mt-3 text-muted-foreground">
            Track organisational equipment separately from saleable product inventory.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Plus className="h-5 w-5 text-primary" />
                Register asset
              </h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={addAsset} className="space-y-2">
                <input
                  required
                  value={assetForm.name}
                  onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  placeholder="Asset name"
                  className="h-9 w-full rounded border bg-background px-3 text-sm"
                />
                <input
                  required
                  value={assetForm.assetType}
                  onChange={(e) => setAssetForm({ ...assetForm, assetType: e.target.value })}
                  placeholder="Asset type"
                  className="h-9 w-full rounded border bg-background px-3 text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={assetForm.categoryId}
                    onChange={(e) => setAssetForm({ ...assetForm, categoryId: e.target.value })}
                    className="h-9 rounded border bg-background px-2 text-sm"
                  >
                    <option value="">Category</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={assetForm.locationId}
                    onChange={(e) => setAssetForm({ ...assetForm, locationId: e.target.value })}
                    className="h-9 rounded border bg-background px-2 text-sm"
                  >
                    <option value="">Location</option>
                    {locations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={assetForm.serialNumber}
                  onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                  placeholder="Serial number"
                  className="h-9 w-full rounded border bg-background px-3 text-sm"
                />
                <textarea
                  value={assetForm.description}
                  onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                  placeholder="Description"
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                />
                <Button type="submit">Register asset</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Send className="h-5 w-5 text-primary" />
                Return or hand over
              </h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={requestTransfer} className="space-y-2">
                <select
                  required
                  value={transferForm.assetId}
                  onChange={(e) => setTransferForm({ ...transferForm, assetId: e.target.value })}
                  className="h-9 w-full rounded border bg-background px-2 text-sm"
                >
                  <option value="">Asset</option>
                  {assets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.asset_id} · {item.name}
                    </option>
                  ))}
                </select>
                <select
                  value={transferForm.type}
                  onChange={(e) => setTransferForm({ ...transferForm, type: e.target.value })}
                  className="h-9 w-full rounded border bg-background px-2 text-sm"
                >
                  <option value="person_handover">Hand over to staff</option>
                  <option value="return_to_admin">Return to Admin</option>
                </select>
                <select
                  value={transferForm.recipientId}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, recipientId: e.target.value })
                  }
                  disabled={transferForm.type === "return_to_admin"}
                  className="h-9 w-full rounded border bg-background px-2 text-sm"
                >
                  <option value="">New custodian</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.full_name}
                    </option>
                  ))}
                </select>
                <textarea
                  required
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  placeholder="Reason"
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
                />
                <Button type="submit">Submit transfer request</Button>
              </form>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Boxes className="h-5 w-5 text-primary" />
                Asset register
              </h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {assets.map((asset) => (
                <div key={asset.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {asset.asset_id} · {asset.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {asset.asset_type} ·{" "}
                        {(asset.asset_locations as { name?: string } | null)?.name ?? "No location"}
                      </p>
                    </div>
                    <Badge variant={asset.status === "missing" ? "destructive" : "secondary"}>
                      {asset.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Custodian: {asset.current_custodian_id ?? "Organisation"} · Condition:{" "}
                    {asset.condition}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <History className="h-5 w-5 text-primary" />
                Pending transfers
              </h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {transfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending transfers.</p>
              ) : (
                transfers.map((transfer) => (
                  <div key={transfer.id} className="rounded border p-3">
                    <p className="font-medium">
                      {(transfer.assets as { asset_id?: string; name?: string } | null)?.asset_id} ·{" "}
                      {(transfer.assets as { name?: string } | null)?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {transfer.transfer_type} · {transfer.reason}
                    </p>
                    <Badge
                      className="mt-2"
                      variant={transfer.status === "disputed" ? "destructive" : "secondary"}
                    >
                      {transfer.status}
                    </Badge>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => void reviewTransfer(transfer.id, true)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void reviewTransfer(transfer.id, false)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Wrench className="h-5 w-5 text-primary" />
              Report damage or loss
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={reportIncident} className="grid gap-2 sm:grid-cols-3">
              <select
                required
                value={incidentForm.assetId}
                onChange={(e) => setIncidentForm({ ...incidentForm, assetId: e.target.value })}
                className="h-9 rounded border bg-background px-2 text-sm"
              >
                <option value="">Asset</option>
                {assets.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.asset_id}
                  </option>
                ))}
              </select>
              <select
                value={incidentForm.type}
                onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
                className="h-9 rounded border bg-background px-2 text-sm"
              >
                <option value="damage">Damage</option>
                <option value="missing">Missing</option>
                <option value="lost">Lost</option>
                <option value="stolen">Stolen</option>
                <option value="fault">Fault</option>
              </select>
              <input
                required
                value={incidentForm.description}
                onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                placeholder="Describe incident"
                className="h-9 rounded border bg-background px-3 text-sm"
              />
              <Button type="submit" className="sm:col-span-3">
                Report incident
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
