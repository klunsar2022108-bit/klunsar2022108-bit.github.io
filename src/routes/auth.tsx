import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getDashboardPath,
  normalizeRole,
  pickPrimaryRole,
  roleOptions,
  type WorkflowRole,
} from "@/lib/workflow";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In / Register | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Create your student account or sign in to manage enrolments, track progress and complete your checkout securely.",
      },
      { property: "og:title", content: "Sign In / Register | K-Lunsar Computer Training" },
      {
        property: "og:description",
        content: "Access your learning dashboard and continue your enrolment journey.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<WorkflowRole>("student");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (!user || authLoading) return;
    const targetRole =
      role ??
      normalizeRole(user.user_metadata?.role) ??
      normalizeRole(user.app_metadata?.role) ??
      "student";
    void navigate({ to: getDashboardPath(targetRole), replace: true });
  }, [navigate, user, role, authLoading]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setMessage("Please provide both your email address and password.");
      setIsError(true);
      return;
    }

    if (trimmedPassword.length < 6) {
      setMessage("Your password must be at least 6 characters long.");
      setIsError(true);
      return;
    }

    if (mode === "register" && !trimmedFullName) {
      setMessage("Please add your full name before creating an account.");
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage(null);
    setIsError(false);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) throw error;

        if (data.session) {
          toast.success("Login successful.");
          const roleRows = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.session.user.id);
          const rawRole =
            pickPrimaryRole([
              normalizeRole(data.session.user?.user_metadata?.role),
              normalizeRole(data.session.user?.app_metadata?.role),
              ...(roleRows.data ?? []).map((row) => row.role),
            ]) ?? "student";

          const effectiveApprovalStatus =
            rawRole === "admin" || rawRole === "super_admin" ? "approved" : "pending";

          if (typeof window !== "undefined") {
            window.localStorage.setItem("klunsar-user-role", rawRole);
            window.localStorage.setItem("klunsar-approval-status", effectiveApprovalStatus);
          }

          void navigate({ to: getDashboardPath(rawRole), replace: true });
          return;
        }

        throw new Error(
          "We could not sign you in. Please check your email and password and try again.",
        );
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
        options: {
          data: {
            full_name: trimmedFullName,
            role: selectedRole,
            approval_status: "pending",
            phone: "",
          },
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined,
        },
      });

      if (error) throw error;

      if (data.session) {
        const nextRole = normalizeRole(data.session.user?.user_metadata?.role) ?? selectedRole;
        if (typeof window !== "undefined") {
          window.localStorage.setItem("klunsar-user-role", nextRole);
          window.localStorage.setItem("klunsar-approval-status", "pending");
        }
        toast.success("Account created successfully.");
        void navigate({ to: getDashboardPath(nextRole), replace: true });
        return;
      }

      setMessage(
        "Account created. Please check your email to confirm the registration link before signing in.",
      );
      setFullName("");
      setPassword("");
      setMode("login");
    } catch (error) {
      const err = error as Error;
      setMessage(err.message || "Something went wrong. Please try again.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" aria-busy="true">
        <LoaderCircle
          className="h-6 w-6 animate-spin text-primary"
          aria-label="Loading dashboard"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <div className="flex gap-2">
              <Button
                variant={mode === "login" ? "default" : "outline"}
                onClick={() => setMode("login")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Button>
              <Button
                variant={mode === "register" ? "default" : "outline"}
                onClick={() => setMode("register")}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Register
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Full name</label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Your full name"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium">I am joining as</label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {roleOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSelectedRole(option.value)}
                          className={[
                            "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                            selectedRole === option.value
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-background text-muted-foreground hover:bg-secondary",
                          ].join(" ")}
                        >
                          <span className="block font-medium">{option.label}</span>
                          <span className="mt-1 block text-[11px] leading-relaxed opacity-80">
                            {option.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Password"
                  required
                />
              </div>

              {message && (
                <p
                  className={[
                    "rounded-md border px-3 py-2 text-sm",
                    isError
                      ? "border-destructive/40 bg-destructive/5 text-destructive"
                      : "border-border bg-secondary/40 text-foreground",
                  ].join(" ")}
                >
                  {message}
                </p>
              )}

              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-label="Signing in" />
                ) : (
                  <>
                    {mode === "login" ? "Sign in to my account" : "Create my account"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-secondary/40">
          <CardHeader>
            <h2 className="font-display text-2xl font-bold">Why create an account?</h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Save your cart, continue a checkout and keep track of your exam progress and
              certificates.
            </p>
            <ul className="space-y-2">
              <li>• Track course enrolments and shift choices</li>
              <li>• View exam results and certificate status</li>
              <li>• Revisit your account at any time</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link to="/shop">
                <Button variant="outline">Continue to shop</Button>
              </Link>
              <Link to="/academic-registration">
                <Button>Start student registration</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
