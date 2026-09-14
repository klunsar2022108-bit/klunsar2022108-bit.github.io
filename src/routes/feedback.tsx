import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getDashboardPath, normalizeRole, pickPrimaryRole } from "@/lib/workflow";

export const Route = createFileRoute("/feedback")({
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
    if (!role) {
      throw redirect({ to: role ? getDashboardPath(role) : "/auth" });
    }
  },
  head: () => ({
    meta: [{ title: "Customer Requirements Survey | K-Lunsar Computer Training" }],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  const { user } = useAuth();
  const [designRating, setDesignRating] = useState("5");
  const [likedDesign, setLikedDesign] = useState("yes");
  const [recommendations, setRecommendations] = useState("");
  const [concerns, setConcerns] = useState("");
  const [workflow, setWorkflow] = useState("");
  const [missing, setMissing] = useState("");
  const [creditTerms, setCreditTerms] = useState("");
  const [contactPermission, setContactPermission] = useState("yes");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const message = JSON.stringify(
      {
        survey_version: "customer-requirements-2026-09",
        liked_design: likedDesign,
        design_rating: Number(designRating),
        recommendations: recommendations.trim(),
        concerns: concerns.trim(),
        current_workflow: workflow.trim(),
        missing_features: missing.trim(),
        credit_or_business_terms: creditTerms.trim(),
        contact_permission: contactPermission,
      },
      null,
      2,
    );
    const { error } = await supabase.from("customer_feedback").insert({
      user_id: user.id,
      title: "Customer requirements and dashboard design survey",
      message,
      rating: Number(designRating),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmitted(true);
    toast.success("Thank you. Your recommendations were submitted.");
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-12">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </span>
          <div>
            <Badge variant="secondary">Customer research</Badge>
            <h1 className="mt-2 text-3xl font-bold">Help shape K-Lunsar Connect</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Tell us whether the dashboard design works for you, what feels difficult, and what
              would make purchasing, payments, delivery and support easier.
            </p>
          </div>
        </div>

        {submitted ? (
          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-6">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Response received</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your feedback has been saved for the K-Lunsar team to review.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">Design review</h2>
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <Field label="Do you like the dashboard design?">
                  <select
                    value={likedDesign}
                    onChange={(event) => setLikedDesign(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                  >
                    <option value="yes">Yes</option>
                    <option value="mostly">Mostly, with some changes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
                <Field label="How would you rate the design?">
                  <select
                    value={designRating}
                    onChange={(event) => setDesignRating(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                  >
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Needs work</option>
                    <option value="1">1 - Poor</option>
                  </select>
                </Field>
                <TextArea
                  label="What do you recommend we add or change?"
                  value={recommendations}
                  onChange={setRecommendations}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">Your customer workflow</h2>
              </CardHeader>
              <CardContent className="space-y-5">
                <TextArea
                  label="How do you currently buy products or request services?"
                  value={workflow}
                  onChange={setWorkflow}
                  required
                />
                <TextArea
                  label="What is difficult, confusing, or concerning about the system?"
                  value={concerns}
                  onChange={setConcerns}
                  required
                />
                <TextArea
                  label="What feature or information is missing?"
                  value={missing}
                  onChange={setMissing}
                />
                <TextArea
                  label="Do you have questions about credit, payment timing, balances, or business terms?"
                  value={creditTerms}
                  onChange={setCreditTerms}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold">Follow-up</h2>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field label="May the K-Lunsar team contact you about your response?">
                  <select
                    value={contactPermission}
                    onChange={(event) => setContactPermission(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit customer feedback"}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-foreground">
      {label}
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-normal outline-none ring-primary/20 focus:ring-2"
      />
    </label>
  );
}
