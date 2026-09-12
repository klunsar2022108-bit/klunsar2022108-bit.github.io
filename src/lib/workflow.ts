export type WorkflowRole = "customer" | "student" | "teacher" | "admin" | "super_admin";

const rolePriority: Record<WorkflowRole, number> = {
  super_admin: 5,
  admin: 4,
  teacher: 3,
  student: 2,
  customer: 1,
};

export function isSuperAdminRole(role: WorkflowRole | null | undefined): boolean {
  return role === "super_admin";
}

export function isAdminRole(role: WorkflowRole | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function resolveEffectiveRole(values: Array<unknown>): WorkflowRole | null {
  const roles = values
    .map((value) => normalizeRole(value))
    .filter((value): value is WorkflowRole => Boolean(value));

  if (roles.length === 0) return null;

  return [...roles].sort(
    (left, right) => (rolePriority[right] ?? 0) - (rolePriority[left] ?? 0),
  )[0];
}

export function getDashboardPath(role: WorkflowRole | null | undefined): string {
  switch (role) {
    case "customer":
      return "/customer";
    case "student":
      return "/student";
    case "teacher":
      return "/teacher";
    case "admin":
      return "/admin";
    case "super_admin":
      return "/super-admin";
    default:
      return "/student";
  }
}

export function normalizeRole(value: unknown): WorkflowRole | null {
  if (typeof value !== "string") return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_")
    .replace(/[^a-z_]/g, "");

  const aliases: Record<string, WorkflowRole> = {
    customer: "customer",
    student: "student",
    teacher: "teacher",
    admin: "admin",
    super_admin: "super_admin",
    superadmin: "super_admin",
  };

  return aliases[normalized] ?? null;
}

export function requiresApproval(role: WorkflowRole | null | undefined): boolean {
  return role !== "admin" && role !== "super_admin";
}

export function normalizeApprovalStatus(
  value: unknown,
  role: WorkflowRole | null | undefined = null,
): string {
  if (role === "admin" || role === "super_admin") return "approved";

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return "pending";
  return normalized;
}

export function pickPrimaryRole(values: Array<unknown>): WorkflowRole | null {
  return resolveEffectiveRole(values);
}

export const roleOptions: Array<{ value: WorkflowRole; label: string; description: string }> = [
  {
    value: "customer",
    label: "Customer",
    description: "Browse, buy and track orders, payments and deliveries.",
  },
  {
    value: "student",
    label: "Student",
    description: "Register for programmes, monitor progress and receive results.",
  },
  {
    value: "teacher",
    label: "Teacher",
    description: "Manage classes, results and student progression.",
  },
];

export const approvalQueue = [
  {
    id: "apr-102",
    type: "Student registration",
    name: "Mariam Koroma",
    item: "Regular Path",
    status: "pending",
    date: "2026-09-08",
  },
  {
    id: "apr-103",
    type: "Payment review",
    name: "Joseph Fofana",
    item: "Word + Excel bundle",
    status: "pending",
    date: "2026-09-07",
  },
  {
    id: "apr-104",
    type: "Teacher approval",
    name: "Abdul Rahman Jalloh",
    item: "School programme tutor",
    status: "pending",
    date: "2026-09-06",
  },
];

export const workflowNotifications = [
  {
    id: "n-1",
    title: "Registration approved",
    detail: "Your student account has been activated and your dashboard is ready.",
    time: "Today",
  },
  {
    id: "n-2",
    title: "Payment verification",
    detail: "The office reviewed your payment proof and marked the enrolment as approved.",
    time: "Yesterday",
  },
  {
    id: "n-3",
    title: "Teacher allocation",
    detail: "Your shift has been assigned and the tutor dashboard has been updated.",
    time: "2 days ago",
  },
];

export const deliveryStatuses = [
  { id: "del-1", label: "Pending approval", state: "pending" },
  { id: "del-2", label: "Packed and ready", state: "processing" },
  { id: "del-3", label: "Out for delivery", state: "shipping" },
  { id: "del-4", label: "Delivered", state: "delivered" },
];

export const analyticsCards = [
  { label: "Sales this month", value: "Le 3.2M", change: "+18%" },
  { label: "Approved registrations", value: "146", change: "+9%" },
  { label: "Pending approvals", value: "12", change: "-4" },
  { label: "Active deliveries", value: "28", change: "+6" },
];

export const teacherAssignments = [
  {
    id: "t-1",
    student: "Fatima B. Conteh",
    group: "Morning Shift",
    course: "Excel",
    status: "On track",
  },
  {
    id: "t-2",
    student: "Saidu Kamara",
    group: "Evening Shift",
    course: "Word",
    status: "Needs revision",
  },
  {
    id: "t-3",
    student: "Abu Mansaray",
    group: "Afternoon Shift",
    course: "PowerPoint",
    status: "Ready for exam",
  },
];

export const supportThreads = [
  {
    id: "msg-1",
    from: "Admin",
    message: "Your payment proof has been approved and you can continue with the programme.",
  },
  {
    id: "msg-2",
    from: "Tutor",
    message: "Please review the Excel practice sheet before your next class.",
  },
  {
    id: "msg-3",
    from: "Student",
    message: "I need help changing my shift from evening to morning.",
  },
];
