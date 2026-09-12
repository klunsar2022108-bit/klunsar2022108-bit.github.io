import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { siteContentQuery } from "@/lib/queries";
import { getDashboardPath } from "@/lib/workflow";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses & Shifts" },
  { to: "/shop", label: "Shop" },
  { to: "/services", label: "Services" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const { user, role, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { data: site } = useQuery(siteContentQuery);

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    void navigate({ to: "/", replace: true });
  };

  const dashboardPath = getDashboardPath(role ?? (isAdmin ? "admin" : "student"));
  const dashboardLabel =
    role === "super_admin"
      ? "Super Admin dashboard"
      : role === "admin"
        ? "Admin dashboard"
        : role === "teacher"
          ? "Teacher dashboard"
          : role === "customer"
            ? "Customer dashboard"
            : "Student dashboard";

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <img
            src="/k-lunsar-badge.jpg"
            alt="K-Lunsar Computer Training badge"
            className="h-10 w-10 rounded-full border border-primary/20 object-cover"
          />
          <span className="leading-tight">
            <span className="block font-display text-sm font-bold">
              {site?.["centre_name"] ?? "K-Lunsar Computer Training"}
            </span>
            <span className="block text-xs text-muted-foreground">
              {site?.["motto"] ?? "Build Your Skills"}
            </span>
          </span>
        </Link>

        {!user && (
          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
                activeOptions={{ exact: item.to === "/" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {!user && (
            <Link to="/cart" className="relative" aria-label={`Cart, ${count} items`}>
              <Button variant="outline" size="icon">
                <ShoppingCart className="h-4 w-4" />
              </Button>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          )}

          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void navigate({ to: dashboardPath, replace: false })}
                >
                  Dashboard
                </Button>
                <span className="text-xs font-medium text-muted-foreground">{dashboardLabel}</span>
                <Button variant="outline" size="sm" onClick={() => setConfirmSignOut(true)}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link to="/shop">
                  <Button size="sm">Enrol now</Button>
                </Link>
              </>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col p-4">
            {!user &&
              NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-foreground" }}
                  activeOptions={{ exact: item.to === "/" }}
                >
                  {item.label}
                </Link>
              ))}
            <div className="mt-3 flex gap-2">
              {user ? (
                <>
                  <Button
                    className="flex-1"
                    onClick={() => void navigate({ to: dashboardPath, replace: false })}
                  >
                    Dashboard
                  </Button>
                  <span className="flex-1 py-2 text-sm font-medium text-muted-foreground">
                    {dashboardLabel}
                  </span>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => setConfirmSignOut(true)}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/auth" className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/shop" className="flex-1" onClick={() => setOpen(false)}>
                    <Button className="w-full">Enrol now</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {confirmSignOut && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-out-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2 id="sign-out-title" className="text-xl font-bold">
              Sign out?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You will need to sign in again to access your dashboard.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmSignOut(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmSignOut(false);
                  void handleSignOut();
                }}
              >
                Yes, sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
