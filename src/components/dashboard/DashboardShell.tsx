import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ProfileEditor } from "@/components/dashboard/ProfileEditor";

type DashboardLink = { to: string; label: string; icon: typeof LayoutDashboard };
type DashboardGroup = { label: string; items: DashboardLink[] };

const dashboardGroup = (label: string, items: DashboardLink[]): DashboardGroup => ({
  label,
  items,
});

const roleLinks: Record<string, DashboardGroup[]> = {
  customer: [
    dashboardGroup("Dashboard", [{ to: "/customer", label: "Overview", icon: LayoutDashboard }]),
    dashboardGroup("Shop", [{ to: "/shop", label: "Products & services", icon: ShoppingBag }]),
    dashboardGroup("Cart & Orders", [
      { to: "/cart", label: "Shopping cart", icon: Package },
      { to: "/orders", label: "My orders", icon: Receipt },
      { to: "/checkout", label: "Checkout", icon: CreditCard },
    ]),
    dashboardGroup("Payments", [
      { to: "/checkout", label: "Payment status", icon: Wallet },
      { to: "/customer", label: "Payment history", icon: Receipt },
    ]),
    dashboardGroup("Delivery", [{ to: "/customer", label: "Delivery status", icon: Truck }]),
    dashboardGroup("Messages", [{ to: "/support", label: "Support requests", icon: Users }]),
    dashboardGroup("Notifications", [{ to: "/customer", label: "Order updates", icon: Bell }]),
    dashboardGroup("Feedback", [
      { to: "/feedback", label: "Design and requirements survey", icon: FileText },
    ]),
    dashboardGroup("Profile", [{ to: "/customer", label: "Account settings", icon: UserRound }]),
  ],
  student: [
    dashboardGroup("Dashboard", [
      { to: "/student", label: "Academic overview", icon: LayoutDashboard },
    ]),
    dashboardGroup("My Programme", [
      { to: "/courses", label: "Courses & modules", icon: BookOpen },
      { to: "/academic-registration", label: "Programme registration", icon: GraduationCap },
    ]),
    dashboardGroup("My Progress", [{ to: "/student", label: "Progress history", icon: Activity }]),
    dashboardGroup("Results & Exams", [
      { to: "/student", label: "Results and performance", icon: ClipboardCheck },
    ]),
    dashboardGroup("Teacher", [{ to: "/student", label: "Assigned teacher", icon: Users }]),
    dashboardGroup("Payments", [{ to: "/checkout", label: "Programme payments", icon: Wallet }]),
    dashboardGroup("Certificates", [
      { to: "/verify-certificate", label: "Certificate verification", icon: ShieldCheck },
    ]),
    dashboardGroup("Shift Requests", [{ to: "/student", label: "Current shift", icon: Activity }]),
    dashboardGroup("Messages", [{ to: "/support", label: "Admin support", icon: Users }]),
    dashboardGroup("Notifications", [{ to: "/student", label: "Programme updates", icon: Bell }]),
    dashboardGroup("Feedback", [
      { to: "/feedback", label: "Design and requirements survey", icon: FileText },
    ]),
  ],
  teacher: [
    dashboardGroup("Dashboard", [
      { to: "/teacher", label: "Academic overview", icon: LayoutDashboard },
    ]),
    dashboardGroup("My Students", [{ to: "/teacher", label: "Assigned students", icon: Users }]),
    dashboardGroup("Programmes & Classes", [
      { to: "/courses", label: "Courses and shifts", icon: BookOpen },
    ]),
    dashboardGroup("Academic Management", [
      { to: "/teacher", label: "Progress and results", icon: ClipboardCheck },
    ]),
    dashboardGroup("Analytics", [{ to: "/teacher", label: "Class performance", icon: BarChart3 }]),
    dashboardGroup("Messages", [{ to: "/support", label: "Student messages", icon: Users }]),
    dashboardGroup("Notifications", [{ to: "/teacher", label: "Teaching updates", icon: Bell }]),
    dashboardGroup("Salary & Profile", [
      { to: "/teacher", label: "Profile and salary", icon: UserRound },
    ]),
    dashboardGroup("Documents", [{ to: "/teacher", label: "Academic documents", icon: FileText }]),
    dashboardGroup("Feedback", [
      { to: "/feedback", label: "Design and requirements survey", icon: FileText },
    ]),
  ],
  admin: [
    dashboardGroup("Dashboard", [
      { to: "/admin", label: "Business overview", icon: LayoutDashboard },
    ]),
    dashboardGroup("People", [{ to: "/admin", label: "Users & approvals", icon: Users }]),
    dashboardGroup("Training", [
      { to: "/courses", label: "Programmes & courses", icon: BookOpen },
      { to: "/academic-periods", label: "Academic periods", icon: GraduationCap },
      { to: "/academic-registration", label: "Student registrations", icon: ClipboardCheck },
    ]),
    dashboardGroup("Commerce", [
      { to: "/shop", label: "Products & services", icon: ShoppingBag },
      { to: "/assets", label: "Inventory & assets", icon: Boxes },
      { to: "/orders", label: "Orders & sales", icon: Receipt },
      { to: "/procurement", label: "Suppliers & procurement", icon: Truck },
    ]),
    dashboardGroup("Finance", [{ to: "/reports", label: "Payments & profit", icon: Wallet }]),
    dashboardGroup("Operations", [
      { to: "/operations", label: "Centre operations", icon: Settings },
      { to: "/approvals", label: "Approval centre", icon: ClipboardCheck },
      { to: "/work-queue", label: "System inbox", icon: ClipboardCheck },
    ]),
    dashboardGroup("Analytics & Reports", [
      { to: "/reports", label: "Live reports", icon: BarChart3 },
    ]),
    dashboardGroup("Website / Content", [
      { to: "/about", label: "Centre information", icon: FileText },
      { to: "/gallery", label: "Gallery", icon: Package },
    ]),
    dashboardGroup("Feedback", [
      { to: "/feedback", label: "Design and requirements survey", icon: FileText },
    ]),
  ],
  super_admin: [
    dashboardGroup("Executive Dashboard", [
      { to: "/super-admin", label: "Business performance", icon: LayoutDashboard },
    ]),
    dashboardGroup("Users & Access", [
      { to: "/roles", label: "Roles & permissions", icon: ShieldCheck },
    ]),
    dashboardGroup("Admin Capabilities", [
      { to: "/admin", label: "Admin command centre", icon: Settings },
    ]),
    dashboardGroup("Training Centre", [
      { to: "/courses", label: "Programmes & courses", icon: BookOpen },
      { to: "/academic-periods", label: "Academic periods", icon: GraduationCap },
    ]),
    dashboardGroup("Business", [
      { to: "/shop", label: "Products & services", icon: ShoppingBag },
      { to: "/orders", label: "Orders & sales", icon: Receipt },
      { to: "/assets", label: "Inventory", icon: Boxes },
      { to: "/procurement", label: "Suppliers & procurement", icon: Truck },
    ]),
    dashboardGroup("Finance", [{ to: "/reports", label: "Income, costs & profit", icon: Wallet }]),
    dashboardGroup("Delivery & Operations", [
      { to: "/operations", label: "Operations", icon: Truck },
      { to: "/approvals", label: "Approval centre", icon: ClipboardCheck },
      { to: "/work-queue", label: "System inbox", icon: ClipboardCheck },
    ]),
    dashboardGroup("Analytics", [{ to: "/reports", label: "Business analytics", icon: BarChart3 }]),
    dashboardGroup("Reports", [{ to: "/reports", label: "Export reports", icon: FileText }]),
    dashboardGroup("Communication", [{ to: "/support", label: "Messages", icon: Users }]),
    dashboardGroup("Feedback", [
      { to: "/feedback", label: "Design and requirements survey", icon: FileText },
    ]),
  ],
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const groups = roleLinks[role ?? "student"] ?? roleLinks.student;
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? "Account";
  const roleLabel = role?.replace("_", " ") ?? "workspace";
  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${group.label} ${item.label}`.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/", replace: true });
  };

  const closeMobileSidebar = () => setSidebarOpen(false);
  const isGroupOpen = (label: string) => expandedGroups[label] ?? true;
  const toggleGroup = (label: string) =>
    setExpandedGroups((current) => ({ ...current, [label]: !isGroupOpen(label) }));

  return (
    <div className="dashboard-shell flex min-h-[calc(100vh-1px)] bg-[#f5f8fc] text-foreground">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close dashboard navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      <aside
        className={`dashboard-sidebar fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col bg-[#0b3977] text-white shadow-2xl transition-transform lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${sidebarCollapsed ? "lg:w-20" : "lg:w-72"}`}
      >
        <div className="flex items-center gap-3 px-6 py-7">
          <img
            src="/k-lunsar-badge.jpg"
            alt="K-Lunsar Computer Training badge"
            className="h-11 w-11 rounded-full border-2 border-white/30 object-cover"
          />
          <div className={`min-w-0 ${sidebarCollapsed ? "lg:hidden" : ""}`}>
            <p className="truncate font-display text-sm font-bold">K-Lunsar</p>
            <p className="truncate text-[10px] uppercase tracking-[0.18em] text-blue-100/75">
              Business centre
            </p>
          </div>
        </div>

        <div
          className={`mx-4 rounded-xl bg-white/10 px-4 py-3 ${sidebarCollapsed ? "lg:hidden" : ""}`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/70">
            Signed in as
          </p>
          <p className="mt-1 truncate text-sm font-semibold capitalize">{roleLabel}</p>
        </div>

        <nav
          className="mt-6 flex-1 space-y-3 overflow-y-auto px-3"
          aria-label="Dashboard navigation"
        >
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={`flex w-full items-center justify-between px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/55 ${sidebarCollapsed ? "lg:justify-center" : ""}`}
              >
                <span className={sidebarCollapsed ? "lg:hidden" : ""}>{group.label}</span>
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${isGroupOpen(group.label) ? "rotate-90" : ""}`}
                />
              </button>
              {isGroupOpen(group.label) && (
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={`${group.label}-${item.to}-${item.label}`}
                        to={item.to}
                        onClick={closeMobileSidebar}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? "bg-white text-[#0b3977] shadow-sm"
                            : "text-blue-50/80 hover:bg-white/10 hover:text-white"
                        } ${sidebarCollapsed ? "lg:justify-center" : ""}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className={sidebarCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                        {active && !sidebarCollapsed && (
                          <ChevronRight className="ml-auto h-4 w-4" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/15 p-4">
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setSidebarCollapsed((current) => !current)}
            className="mb-2 hidden w-full items-center justify-center rounded-lg px-3 py-2 text-blue-50/80 transition-colors hover:bg-white/10 hover:text-white lg:flex"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-blue-50/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className={sidebarCollapsed ? "lg:hidden" : ""}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="dashboard-topbar flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-8">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0b3977]/60">
              K-Lunsar workspace
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Business analytics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center rounded-lg border border-slate-200 bg-slate-50 px-3 sm:flex">
              <Activity className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workspace"
                className="h-9 w-36 bg-transparent px-2 text-xs outline-none placeholder:text-slate-400"
                aria-label="Search workspace navigation"
              />
            </div>
            <button
              type="button"
              aria-label="Open dashboard navigation"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <ProfileEditor />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{displayName}</p>
              <p className="text-xs capitalize text-slate-500">{roleLabel}</p>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
