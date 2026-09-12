import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  MessageSquareText,
  MessageCircle,
  Send,
  X,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Eye,
  CheckCheck,
  Settings,
  Shield,
  Lock,
  Unlock,
  Activity,
  Globe,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { examsQuery, siteContentQuery, userOrdersQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { findOrCreateSupportThread, loadOwnChatMessages, sendChatMessage } from "@/lib/chat";
import {
  analyticsCards,
  approvalQueue,
  deliveryStatuses,
  getDashboardPath,
  normalizeRole,
  pickPrimaryRole,
  supportThreads,
  teacherAssignments,
  workflowNotifications,
} from "@/lib/workflow";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await import("@/integrations/supabase/client").then(({ supabase }) =>
      supabase.auth.getSession(),
    );

    if (!session) {
      throw redirect({ to: "/auth" });
    }

    const { data: profile } = await import("@/integrations/supabase/client").then(({ supabase }) =>
      supabase.from("profiles").select("account_status").eq("id", session.user.id).maybeSingle(),
    );
    if (profile?.account_status === "deactivated") {
      throw redirect({ to: "/auth" });
    }

    const { data: roleRows = [] } = await import("@/integrations/supabase/client").then(
      ({ supabase }) => supabase.from("user_roles").select("role").eq("user_id", session.user.id),
    );

    const userRole = pickPrimaryRole([
      normalizeRole(session.user.user_metadata?.role),
      normalizeRole(session.user.app_metadata?.role),
      ...(roleRows ?? []).map((row) => row.role),
    ]);

    if (userRole) {
      throw redirect({ to: getDashboardPath(userRole) });
    }
  },
  head: () => ({
    meta: [
      { title: "Student Dashboard | K-Lunsar Computer Training" },
      {
        name: "description",
        content:
          "Track your student progress, exam results, enrolments and graduation status at K-Lunsar Computer Training.",
      },
    ],
  }),
  component: DashboardPage,
});

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, role, approvalStatus } = useAuth();
  const { data: site } = useQuery(siteContentQuery);
  const { data: exams = [] } = useQuery(examsQuery);
  const { data: orders = [] } = useQuery(userOrdersQuery(user?.id));
  const { data: storedNotifications = [] } = useQuery({
    queryKey: ["user-notifications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_notifications")
        .select("id, title, message, type, created_at, read_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: profile } = useQuery({
    queryKey: ["student-profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, username, phone")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const { data: enrollment } = useQuery({
    queryKey: ["student-enrollment", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, path, shift_id, status, start_date, notes, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const { data: studentResults = [] } = useQuery({
    queryKey: ["student-results", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_results")
        .select("id, score, status, taken_on, remarks, exam_id")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: enrollmentCourses = [] } = useQuery({
    queryKey: ["student-enrollment-courses", enrollment?.id],
    enabled: Boolean(enrollment?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollment_courses")
        .select("id, progress, status, courses(title, level, duration_weeks)")
        .eq("enrollment_id", enrollment!.id)
        .order("created_at");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: assignedTeachers = [] } = useQuery({
    queryKey: ["student-teacher-assignments", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select("id, programme, status, tutors(name, title), shifts(name, start_time, end_time)")
        .eq("student_id", user!.id)
        .eq("status", "active");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: certificates = [] } = useQuery({
    queryKey: ["student-certificates", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("id, title, certificate_no, graduation_date, status")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: shiftRequests = [] } = useQuery({
    queryKey: ["student-shift-requests", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_requests")
        .select("id, reason, status, rejection_reason, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: teacherRecord } = useQuery({
    queryKey: ["teacher-record", user?.id],
    enabled: Boolean(user?.id && role === "teacher"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutors")
        .select("id, name, title, user_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const { data: teacherStudentAssignments = [] } = useQuery({
    queryKey: ["teacher-live-assignments", teacherRecord?.id],
    enabled: Boolean(teacherRecord?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_assignments")
        .select(
          "id, student_id, programme, status, shifts(name, start_time, end_time), profiles(full_name)",
        )
        .eq("teacher_id", teacherRecord!.id)
        .eq("status", "active");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: teacherPayments = [] } = useQuery({
    queryKey: ["teacher-payments", teacherRecord?.id],
    enabled: Boolean(teacherRecord?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teacher_payments")
        .select("id, amount, period, status, approved_at")
        .eq("teacher_id", teacherRecord!.id)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const [profileForm, setProfileForm] = useState({
    fullName: user?.user_metadata?.full_name ?? "",
    phone: user?.phone ?? "",
  });
  const [profileMessage, setProfileMessage] = useState("");
  const [shiftRequest, setShiftRequest] = useState("");
  const [shiftRequestStatus, setShiftRequestStatus] = useState<string | null>(null);
  const [roleRequestDrafts, setRoleRequestDrafts] = useState<Record<string, string>>({});
  const [teacherProfileOpen, setTeacherProfileOpen] = useState(false);
  const [teacherResultForm, setTeacherResultForm] = useState({
    student: "",
    programme: "",
    score: "",
    feedback: "",
  });
  const [teacherAnnouncement, setTeacherAnnouncement] = useState("");
  const [salaryReviewRequested, setSalaryReviewRequested] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ title: "", message: "", rating: 5 });
  const [customerFeedback, setCustomerFeedback] = useState<
    Array<{ title: string; message: string; rating: number; createdAt: string }>
  >(() => {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem("klunsar-customer-feedback");
      return raw
        ? (JSON.parse(raw) as Array<{
            title: string;
            message: string;
            rating: number;
            createdAt: string;
          }>)
        : [];
    } catch {
      return [];
    }
  });

  // Messaging state
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<{
    id: string;
    name: string;
    role: "admin" | "teacher";
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<
    Array<{ from: string; message: string; timestamp: string }>
  >([]);
  const [messageText, setMessageText] = useState("");
  const [adminChatMessages, setAdminChatMessages] = useState<
    Array<{
      id: string;
      studentId: string;
      studentName: string;
      studentApprovalStatus: string;
      from: "student" | "admin";
      message: string;
      timestamp: string;
    }>
  >(() => {
    return [];
  });

  useEffect(() => {
    if (!user?.id) return;
    void loadOwnChatMessages(user.id)
      .then((messages) => {
        setAdminChatMessages(
          messages.map((message) => ({
            id: message.id,
            studentId: user.id,
            studentName: user.user_metadata?.full_name ?? user.email ?? "Student",
            studentApprovalStatus: approvalStatus,
            from: message.sender_id === user.id ? "student" : "admin",
            message: message.message,
            timestamp: message.created_at,
          })),
        );
      })
      .catch(() => undefined);
  }, [user?.id, approvalStatus]);

  // Teachers list
  const teachers = [
    {
      id: "tutor-1",
      name: "Musa S. Kamara",
      title: "Computer Literacy Tutor",
      teaches: "Windows Essentials",
      isCurrentTeacher: false,
    },
    {
      id: "tutor-2",
      name: "Fatmata J. Conteh",
      title: "Office Skills Instructor",
      teaches: "Excel for Work",
      isCurrentTeacher: true, // Teaching current program
    },
    {
      id: "tutor-3",
      name: "Abdulai K. Bangura",
      title: "Database & Presentation Tutor",
      teaches: "PowerPoint Presentation",
      isCurrentTeacher: false,
    },
    {
      id: "tutor-4",
      name: "Hawa B. Sesay",
      title: "Digital Skills Coach",
      teaches: "Internet & Communication",
      isCurrentTeacher: false,
    },
  ];

  const latestResults = [
    {
      program: "Windows",
      status: "Passed",
      score: "88%",
      note: "Excellent practice and keyboard confidence.",
    },
    {
      program: "Word",
      status: "Passed",
      score: "92%",
      note: "Strong document formatting and layout skills.",
    },
    {
      program: "Excel",
      status: "In progress",
      score: "Pending",
      note: "Continue with formulas and charts.",
    },
  ];

  const recentOrders = Array.isArray(orders) ? orders : [];
  const effectiveApprovalStatus = isAdmin || isSuperAdmin ? "approved" : approvalStatus;
  const isApprovedStudent = effectiveApprovalStatus === "approved";
  const persistedShiftRequest = shiftRequests[0]?.status ?? null;
  const liveProgress = enrollmentCourses.map((item) => ({
    program: (item.courses as { title?: string } | null)?.title ?? "Programme course",
    status: String(item.status ?? "not_started"),
    score: `${Number(item.progress ?? 0)}%`,
    note: `${(item.courses as { level?: string } | null)?.level ?? "Course"} progress`,
  }));
  const liveTeacherAssignments =
    teacherStudentAssignments.length > 0
      ? teacherStudentAssignments.map((item) => ({
          id: item.id,
          student: (item.profiles as { full_name?: string } | null)?.full_name ?? item.student_id,
          group: (item.shifts as { name?: string } | null)?.name ?? "Shift pending",
          course: item.programme,
          status: "On track",
        }))
      : teacherAssignments;
  const teacherShiftSummary = liveTeacherAssignments.reduce<
    Record<string, { students: number; programmes: Set<string>; revenue: number }>
  >((summary, item) => {
    const groupName = item.group || "Unassigned";
    const programmeName = item.course || "General";
    const current = summary[groupName] ?? {
      students: 0,
      programmes: new Set<string>(),
      revenue: 0,
    };
    current.students += 1;
    current.programmes.add(programmeName);
    current.revenue += 78000;
    summary[groupName] = current;
    return summary;
  }, {});
  const teacherProgrammeSummary = liveTeacherAssignments.reduce<
    Record<string, { students: number; revenue: number }>
  >((summary, item) => {
    const courseName = item.course || "General";
    const current = summary[courseName] ?? { students: 0, revenue: 0 };
    current.students += 1;
    current.revenue += 78000;
    summary[courseName] = current;
    return summary;
  }, {});
  const teacherRevenueEstimate = Object.values(teacherProgrammeSummary).reduce(
    (sum, item) => sum + item.revenue,
    0,
  );
  const displayResults =
    liveProgress.length > 0
      ? liveProgress
      : studentResults.length > 0
        ? studentResults.map((result) => ({
            program: `Exam ${String(result.exam_id).slice(0, 8)}`,
            status: String(result.status ?? "scheduled"),
            score: result.score == null ? "Pending" : `${result.score}%`,
            note: result.remarks || "Recorded exam result",
          }))
        : latestResults;
  const scoredResults = studentResults.filter((result) => result.score != null);
  const averageScore = scoredResults.length
    ? Math.round(
        scoredResults.reduce((sum, result) => sum + Number(result.score), 0) / scoredResults.length,
      )
    : 0;
  const activeRole = role ?? "student";
  const isCustomer = activeRole === "customer";
  const isTeacher = activeRole === "teacher";
  const isAdmin = activeRole === "admin";
  const isSuperAdmin = activeRole === "super_admin";
  const { data: roleManagementUsers = [], refetch: refetchRoleManagementUsers } = useQuery({
    queryKey: ["dashboard-role-management"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, account_status, approval_status, user_roles(role)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: liveAdminKpis } = useQuery({
    queryKey: ["dashboard-admin-kpis", activeRole],
    enabled: isAdmin || isSuperAdmin,
    queryFn: async () => {
      const [{ count: userCount }, { count: pendingCount }, financial] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "pending_approval"]),
        supabase.rpc("get_financial_summary"),
      ]);
      return {
        userCount: userCount ?? 0,
        pendingCount: pendingCount ?? 0,
        financial: financial.data?.[0] ?? null,
      };
    },
  });

  const roleTitle = isSuperAdmin
    ? "Super Admin dashboard"
    : isTeacher
      ? "Teacher dashboard"
      : isCustomer
        ? "Customer dashboard"
        : isAdmin
          ? "Admin dashboard"
          : "Student dashboard";

  const dashboardMetrics = isSuperAdmin
    ? [
        {
          label: "Total system revenue",
          value: `Le ${Number(liveAdminKpis?.financial?.income ?? 0).toLocaleString()}`,
          icon: BarChart3,
        },
        { label: "All user accounts", value: String(liveAdminKpis?.userCount ?? 0), icon: Globe },
        { label: "System health", value: "100%", icon: Activity },
        { label: "Security level", value: "High", icon: Shield },
      ]
    : isTeacher
      ? [
          { label: "Assigned students", value: "18", icon: Users },
          { label: "Classes today", value: "3", icon: BookOpen },
          { label: "Results pending", value: "5", icon: ClipboardCheck },
          { label: "Approval", value: "Verified", icon: Award },
        ]
      : isCustomer
        ? [
            { label: "Open orders", value: "2", icon: ShoppingBag },
            { label: "Delivery status", value: "In transit", icon: Truck },
            { label: "Payments", value: "2 approved", icon: ShieldCheck },
            { label: "Support", value: "Live", icon: MessageSquareText },
          ]
        : isAdmin
          ? [
              {
                label: "Sales total",
                value: `Le ${Number(liveAdminKpis?.financial?.income ?? 0).toLocaleString()}`,
                icon: TrendingUp,
              },
              {
                label: "Pending approvals",
                value: String(liveAdminKpis?.pendingCount ?? 0),
                icon: AlertCircle,
              },
              {
                label: "Registered users",
                value: String(liveAdminKpis?.userCount ?? 0),
                icon: Users,
              },
              { label: "Active deliveries", value: "28", icon: Truck },
            ]
          : [
              { label: "Active enrolment", value: "Regular Path", icon: BookOpen },
              { label: "Current program", value: "Excel", icon: ClipboardCheck },
              { label: "Progress", value: "3/6", icon: CheckCircle2 },
              { label: "Certificate status", value: "On track", icon: Award },
            ];

  const [selectedMetric, setSelectedMetric] = useState<string | null>(
    dashboardMetrics[0]?.label ?? null,
  );
  const [analysisInput, setAnalysisInput] = useState("");
  const [analysisChat, setAnalysisChat] = useState<
    Record<string, Array<{ from: "Analyst" | "You"; message: string }>>
  >({});

  useEffect(() => {
    if (dashboardMetrics.length > 0 && !selectedMetric) {
      setSelectedMetric(dashboardMetrics[0].label);
    }
  }, [dashboardMetrics, selectedMetric]);

  const getMetricAnalysis = (label: string) => {
    const summaryMap: Record<
      string,
      {
        summary: string;
        details: string[];
        starterMessages: Array<{ from: "Analyst" | "You"; message: string }>;
      }
    > = {
      "Total system revenue": {
        summary:
          "Revenue is holding above target and remains healthy across the centre network, suggesting strong commercial performance and stable demand for programmes.",
        details: [
          "Income is trending above the operating baseline, with the strongest performance coming from sustained registration and service demand.",
          "The financial mix indicates healthy programme value and controlled operational overhead across the major centres.",
          "Monitoring weekly collections and delivery-linked sales will help maintain the current momentum without overspending.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "This is a strong revenue period. The current trend supports increased investment in outreach and tutor capacity.",
          },
          {
            from: "Analyst",
            message:
              "A focus on repeat customers and payment follow-up could protect the margin as the term continues.",
          },
        ],
      },
      "All user accounts": {
        summary:
          "The account base continues to expand in a healthy mix of students, customers, tutors and admin users, which strengthens centre operations and support coverage.",
        details: [
          "New signups are improving engagement across the platform and increasing the demand for onboarding support.",
          "A clean user base makes approvals and role assignment easier to manage without creating operational bottlenecks.",
          "Keeping account health and role clarity consistent will protect service quality and reduce duplicate access issues.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "User volume is growing in a healthy way. The next priority is keeping role access and account approval accurate.",
          },
          {
            from: "You",
            message:
              "We should review the inactive accounts and approval queue before the next intake.",
          },
        ],
      },
      "System health": {
        summary:
          "The platform is operating with excellent stability and the key service layers remain responsive for admissions, sales and communication workflows.",
        details: [
          "The system uptime, support tools and user flows are aligned for busy periods, especially during enrolment windows.",
          "Operational reliability is strongest when approvals, payments and student records are updated quickly.",
          "Ongoing monitoring of access latency and account issues will help maintain this level of service quality.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "System monitoring is stable. The environment is currently able to support peak registration demand without congestion.",
          },
          {
            from: "You",
            message: "Good. We should keep backup checks in place for the next intake cycle.",
          },
        ],
      },
      "Security level": {
        summary:
          "Access controls and role separation are well structured, supporting a secure operating model across the centre and admin workflows.",
        details: [
          "The main risk area is user access consistency, especially during role changes and approval events.",
          "Maintaining strong permission boundaries reduces the chance of accidental exposure across sensitive workflows.",
          "Reviewing role requests and session patterns regularly keeps the operation secure and dependable.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "Security posture is strong. The main value is to keep access control and approvals tightly reviewed.",
          },
          {
            from: "You",
            message: "Yes, particularly for super-admin and financial approval access.",
          },
        ],
      },
      "Assigned students": {
        summary:
          "The teacher is currently supporting a manageable classroom load, with enough capacity to monitor progress and intervene early where students need extra support.",
        details: [
          "The teaching load allows for follow-up on weak learning areas before results fall behind schedule.",
          "Maintaining regular attendance checks and lesson feedback will keep students on track for their next assessments.",
          "One-on-one guidance should be prioritised where students are still struggling with practical exercises.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "Your student roster is balanced enough for focused coaching and targeted revision.",
          },
          {
            from: "You",
            message: "I will prioritise the students whose scores are still below expectation.",
          },
        ],
      },
      "Classes today": {
        summary:
          "The teaching schedule is active and distributed well across the day, which creates room for practical guidance and stronger class engagement.",
        details: [
          "The current timetable supports enough time for demonstrations, individual practice and assessment review.",
          "Class density is acceptable for a teaching day and leaves room for intervention when certain students fall behind.",
          "Keeping practical sessions consistent will improve completion and confidence across all programmes.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "The classroom rhythm is healthy. Active follow-up in the afternoon block may improve completion rates.",
          },
          {
            from: "You",
            message:
              "I will use the session break to review the most difficult exercises with the class.",
          },
        ],
      },
      "Results pending": {
        summary:
          "A small number of learner assessments are still pending, which is manageable but should be cleared promptly to prevent backlog and confusion.",
        details: [
          "The pending results are not yet a major issue, but unresolved marks can delay student progression and reduce motivation.",
          "Fast review of pending work will help keep the academic path moving smoothly.",
          "Students with incomplete results should be contacted directly to reassure them and confirm the next step.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message: "This backlog is small but should be cleared quickly to protect progression.",
          },
          {
            from: "You",
            message:
              "I will review the pending results and notify the students who need follow-up.",
          },
        ],
      },
      Approval: {
        summary:
          "Teacher approvals are in a healthy state, confirming that quality assurance and staff validation are working as expected.",
        details: [
          "The current status supports confidence that tutoring standards are being checked consistently.",
          "Clear approval records help maintain accountability and protect student learning quality.",
          "Final review should remain routine so the teaching team stays aligned with centre standards.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message: "Approval status is clear and consistent with a stable teaching environment.",
          },
          {
            from: "You",
            message:
              "Good. I will keep the follow-up process as it is and stay focused on student results.",
          },
        ],
      },
      "Open orders": {
        summary:
          "Customer order flow remains active and there are enough open purchases to keep fulfilment attention high across processing and tracking.",
        details: [
          "Open orders should be reviewed in order of urgency so customers receive timely updates and delivery expectations remain realistic.",
          "The current pipeline suggests good demand and a stable conversion rate that should be maintained with clear communication.",
          "Follow-up on incomplete checkouts and delays can reduce drop-off risk before fulfilment begins.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "Your active orders are healthy and should be processed in a time-sensitive order.",
          },
          {
            from: "You",
            message: "I will keep customer updates current so delivery expectations stay clear.",
          },
        ],
      },
      "Delivery status": {
        summary:
          "Delivery activity is operationally active, with logistics currently in motion and the customer experience depending on timely communication.",
        details: [
          "Live tracking is important to prevent missed expectations and maintain confidence during handover periods.",
          "It is useful to review the distribution of deliveries by route and status before the next wave of customers is served.",
          "Proactive updates reduce support load and make the fulfilment process more predictable.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "The logistics flow is active and needs regular updates to keep customers informed.",
          },
          {
            from: "You",
            message:
              "I will send reminders to customers whose items have not yet been confirmed as received.",
          },
        ],
      },
      Payments: {
        summary:
          "Payments are moving in a healthy pattern, with a strong share of completed and verified transactions supporting the centre’s financial confidence.",
        details: [
          "Approved payments protect programme access and keep the cash flow predictable for operations and service delivery.",
          "The main focus should remain on confirmation speed and follow-up for any outstanding verification cases.",
          "A clean payment track also improves customer trust and reduces service delays.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "Payment verification is generally healthy. A timely follow-up on pending approvals will keep service smooth.",
          },
          {
            from: "You",
            message: "I will check the outstanding payment proofs and confirm the next batch.",
          },
        ],
      },
      Support: {
        summary:
          "Support activity is active and responsive, which is positive for retention and customer satisfaction during busy service periods.",
        details: [
          "Support quality is strongest when the team answers quickly, resolves issues clearly and follows up on delivery or registration concerns.",
          "The live support channel is useful for keeping customers informed and building trust before issues escalate.",
          "Reviewing recurring questions can help reduce repeated tickets and improve the self-service experience.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "The support model is active and responsive, which helps maintain customer confidence.",
          },
          {
            from: "You",
            message:
              "We should continue to log the most common questions so the office can respond faster.",
          },
        ],
      },
      "Sales total": {
        summary:
          "The sales base remains strong and consistent with expected student and customer demand, which supports operational planning and investment decisions.",
        details: [
          "Sales performance is healthy when registrations, programme sales and support services all maintain steady volume.",
          "The next step is to compare revenue against the previous month so working priorities can be aligned to demand trends.",
          "Maintaining consistent sales reporting will help the team identify where acquisition efforts are most effective.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "Sales remain steady and the results are strong enough to support future outreach investments.",
          },
          {
            from: "You",
            message: "We can compare the current month to last month to guide the next campaign.",
          },
        ],
      },
      "Pending approvals": {
        summary:
          "Pending approvals are present but not excessive, which suggests the approval process is active without creating a serious operational backlog.",
        details: [
          "The queue should be reviewed regularly to keep approval times predictable and reduce uncertainty for customers and students.",
          "Fast action on the most urgent requests creates a smoother user experience and prevents manual follow-up later.",
          "Clear owner assignments make it easier to keep the pipeline moving without missing key records.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message: "The queue is manageable but should not be left idle for too long.",
          },
          {
            from: "You",
            message: "I will clear the priority approvals and keep the rest moving in sequence.",
          },
        ],
      },
      "Registered users": {
        summary:
          "The registration base is healthy and growing, which gives the centre a stronger foundation for teaching delivery and customer support.",
        details: [
          "User growth creates operational demand across onboarding, scheduling and communications.",
          "It is important to keep role mapping and group assignments consistent so the centre remains organised during intake peaks.",
          "The next stage is to convert this growth into strong retention and course completion.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "Growth is healthy and should continue to be matched with strong onboarding and support follow-up.",
          },
          {
            from: "You",
            message:
              "We should also monitor completion and attendance to ensure the growth is translating into outcomes.",
          },
        ],
      },
      "Active deliveries": {
        summary:
          "Delivery activity is a useful sign of customer momentum, but it requires close monitoring to maintain quality and customer confidence.",
        details: [
          "A fast delivery flow can improve satisfaction, but only when communication and confirmation remain accurate.",
          "The operational risk is lower when routes are reviewed regularly and customers receive timely progress updates.",
          "Maintaining a clear delivery status process will keep the centre’s service level visible and reliable.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "The delivery pipeline is active and manageable, but needs good communication to stay smooth.",
          },
          {
            from: "You",
            message:
              "I will coordinate with the logistics team to keep the customers informed in real time.",
          },
        ],
      },
      "Active enrolment": {
        summary:
          "The enrolment path is stable and clearly progressing, which supports the student journey and keeps the programme structure predictable.",
        details: [
          "A consistent enrolment path improves planning across shifts, teaching resources and registration support.",
          "The current structure supports steady progression and helps new learners understand what they need to do next.",
          "Tracking attendance and early engagement will keep the path moving without delays.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message: "Your enrolment path is stable and should continue to support early momentum.",
          },
          {
            from: "You",
            message:
              "I will stay focused on regular attendance and early follow-up when support is needed.",
          },
        ],
      },
      "Current program": {
        summary:
          "The current learning plan remains focused and practical, which is ideal for building real confidence through regular practice and assessment.",
        details: [
          "This stage is where consistent effort matters most, especially for practical digital tasks and applied exercises.",
          "The strongest outcome comes from consistent practice rather than rushed coverage of content.",
          "A short review cycle can improve retention before the next exam or assessment checkpoint.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message: "This is a good learning stage for practical application and skill retention.",
          },
          {
            from: "You",
            message:
              "I will spend extra time on the sections that still feel weak before the next assessment.",
          },
        ],
      },
      Progress: {
        summary:
          "Progress is advancing within the expected learning timeline, showing that the learner is building skills in a steady and manageable way.",
        details: [
          "The learner is moving through the course in a consistent pattern, which is ideal for confidence and long-term retention.",
          "The key risk is losing momentum when tasks become more complex or less familiar.",
          "Short review sessions and guided practice can help maintain pace without creating stress.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "The student is progressing well and should continue through the next topic with regular revision.",
          },
          {
            from: "You",
            message:
              "I will keep the momentum by reviewing the most difficult tasks before the next class.",
          },
        ],
      },
      "Certificate status": {
        summary:
          "The certificate path remains on track, which indicates that the learner is building toward the required qualification and completion milestones.",
        details: [
          "Staying aligned with the programme milestones will improve the chance of a clean finish and timely certification.",
          "Ongoing assessment and completion review help confirm that the learner remains eligible for graduation.",
          "The final stage should focus on close-out checks so the certificate is awarded without delays.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "Your graduation path is on track and should remain stable with consistent progress.",
          },
          {
            from: "You",
            message:
              "I will stay focused on the remaining milestones and keep the final review checklist in order.",
          },
        ],
      },
    };

    return (
      summaryMap[label] ?? {
        summary:
          "This dashboard item is active and should be reviewed regularly so performance stays aligned with the wider centre plan.",
        details: [
          "The current status is stable and should be monitored to confirm continued progress.",
          "The next step is to review the supporting activity and keep updates clear for the connected user group.",
          "A simple follow-up cycle is enough to keep this metric moving in the right direction.",
        ],
        starterMessages: [
          {
            from: "Analyst",
            message:
              "The current signal is stable and worth monitoring over the next reporting period.",
          },
          {
            from: "You",
            message: "I will keep an eye on this metric and review any changes in the next update.",
          },
        ],
      }
    );
  };

  const selectedMetricData =
    dashboardMetrics.find((metric) => metric.label === selectedMetric) ?? dashboardMetrics[0];
  const selectedMetricAnalysis = selectedMetricData
    ? getMetricAnalysis(selectedMetricData.label)
    : null;
  const selectedChatMessages = selectedMetricAnalysis
    ? (analysisChat[selectedMetricData.label] ?? selectedMetricAnalysis.starterMessages)
    : [];

  const handleSendMetricMessage = () => {
    if (!selectedMetricData || !selectedMetricAnalysis || !analysisInput.trim()) return;

    const message = analysisInput.trim();
    setAnalysisChat((current) => ({
      ...current,
      [selectedMetricData.label]: [
        ...(current[selectedMetricData.label] ?? selectedMetricAnalysis.starterMessages),
        { from: "You", message },
      ],
    }));
    setAnalysisInput("");
  };

  const handleFeedbackSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!feedbackForm.title.trim() || !feedbackForm.message.trim()) {
      return;
    }

    const entry = {
      title: feedbackForm.title.trim(),
      message: feedbackForm.message.trim(),
      rating: Math.min(5, Math.max(1, feedbackForm.rating)),
      createdAt: new Date().toISOString(),
    };

    const nextFeedback = [entry, ...customerFeedback].slice(0, 5);
    if (user) {
      const { error } = await supabase
        .from("customer_feedback")
        .insert({
          user_id: user.id,
          title: entry.title,
          message: entry.message,
          rating: entry.rating,
        });
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    setCustomerFeedback(nextFeedback);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("klunsar-customer-feedback", JSON.stringify(nextFeedback));
    }
    setFeedbackForm({ title: "", message: "", rating: 5 });
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profileForm.fullName.trim(), phone: profileForm.phone.trim() })
      .eq("id", user.id);
    if (error) {
      setProfileMessage(error.message);
      return;
    }
    setProfileMessage("Profile updated successfully.");
  };

  const handleGrantRole = async (userId: string) => {
    const role = roleRequestDrafts[userId];
    if (!role) {
      toast.error("Select a role before granting access.");
      return;
    }

    const { error } = await supabase.rpc("set_user_role", { _user_id: userId, _role: role });
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Role updated to ${role}.`);
    setRoleRequestDrafts((current) => ({ ...current, [userId]: "" }));
    await refetchRoleManagementUsers();
  };

  const handleDenyRole = async (userId: string, currentRole: string | null) => {
    if (!currentRole) {
      toast.info("There is no current role to remove for this user.");
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", currentRole);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Role ${currentRole} removed.`);
    await refetchRoleManagementUsers();
  };

  const handleExportData = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, account_type, approval_status, account_status")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    const headers = [
      "id",
      "full_name",
      "email",
      "account_type",
      "approval_status",
      "account_status",
    ];
    const rows = (data ?? []).map((row) =>
      headers
        .map((header) => JSON.stringify((row as Record<string, unknown>)[header] ?? ""))
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "klunsar-user-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("User data export downloaded.");
  };

  const handleShiftRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shiftRequest.trim() || !user) return;
    const { error } = await supabase
      .from("shift_requests")
      .insert({ user_id: user.id, reason: shiftRequest.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    setShiftRequestStatus("Pending admin review");
    setShiftRequest("");
  };

  const printStudentRecord = () => window.print();

  const handleTeacherResultSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const score = Number(teacherResultForm.score);
    if (
      !teacherResultForm.student ||
      !teacherResultForm.programme ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100
    ) {
      toast.error("Select a student, programme, and score from 0 to 100.");
      return;
    }
    if (!user) return;
    const { data: teacher } = await supabase
      .from("tutors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: student } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", teacherResultForm.student)
      .maybeSingle();
    if (!teacher?.id || !student?.id) {
      toast.error(
        "Your teacher profile or selected student is not linked to a database record yet.",
      );
      return;
    }
    const { error } = await supabase
      .from("result_submissions")
      .insert({
        teacher_id: teacher.id,
        student_id: student.id,
        score,
        feedback: teacherResultForm.feedback.trim(),
        status: "pending_review",
      });
    if (error) {
      toast.error(error.message);
      return;
    }
    setTeacherResultForm({ student: "", programme: "", score: "", feedback: "" });
    toast.success("Result submitted for academic review.");
  };

  const handleTeacherAnnouncement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!teacherAnnouncement.trim()) return;
    if (!user) return;
    const { error } = await supabase
      .from("message_broadcasts")
      .insert({
        sender_id: user.id,
        audience: "assigned_students",
        message: teacherAnnouncement.trim(),
      });
    if (error) {
      toast.error(error.message);
      return;
    }
    setTeacherAnnouncement("");
    toast.success("Message sent to assigned students.");
  };

  const handleSalaryReview = () => {
    if (user) void supabase.from("salary_review_requests").insert({ teacher_user_id: user.id });
    setSalaryReviewRequested(true);
    toast.success("Salary review request sent to admin.");
  };

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageText.trim() || (!selectedContact && isApprovedStudent)) return;

    const newMessage = {
      from: "You",
      message: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    if (user) {
      try {
        const threadId = await findOrCreateSupportThread(user.id, approvalStatus);
        const saved = await sendChatMessage(threadId, user.id, messageText);
        setChatMessages((current) => [...current, { ...newMessage, timestamp: saved.created_at }]);
        setAdminChatMessages((current) => [
          ...current,
          {
            id: saved.id,
            studentId: user.id,
            studentName: user.user_metadata?.full_name ?? user.email ?? "Student",
            studentApprovalStatus: approvalStatus,
            from: "student",
            message: saved.message,
            timestamp: saved.created_at,
          },
        ]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Message could not be sent.");
        return;
      }
    }
    setMessageText("");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {roleTitle}
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            Welcome back
            {user?.user_metadata?.full_name ? `, ${String(user.user_metadata.full_name)}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{site?.["centre_name"] ?? "K-Lunsar Computer Training"}</Badge>
          <Badge variant={effectiveApprovalStatus === "approved" ? "default" : "secondary"}>
            {effectiveApprovalStatus}
          </Badge>
        </div>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {dashboardMetrics.map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className={`border-border/70 transition-all ${selectedMetric === label ? "ring-2 ring-primary/30" : ""}`}
          >
            <button
              type="button"
              onClick={() => setSelectedMetric(label)}
              className="w-full text-left"
            >
              <CardContent className="flex items-center gap-3 py-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-display text-lg font-semibold">{value}</p>
                </div>
              </CardContent>
            </button>
          </Card>
        ))}
      </div>

      {selectedMetricData && selectedMetricAnalysis && (
        <Card className="mt-8 border-border/70">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Analysis
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">{selectedMetricData.label}</h2>
              </div>
              <Badge variant="secondary" className="self-start md:self-auto">
                {selectedMetricData.value}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Summary
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground/90">
                  {selectedMetricAnalysis.summary}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Detailed analysis
                </p>
                <ul className="mt-3 space-y-3 text-sm text-foreground/90">
                  {selectedMetricAnalysis.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-primary/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Analysis chat
              </p>
              <div className="mt-3 space-y-3 max-h-72 overflow-y-auto pr-1">
                {selectedChatMessages.map((message, index) => (
                  <div
                    key={`${message.from}-${index}`}
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      message.from === "You"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-background text-foreground border border-border"
                    }`}
                  >
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
                      {message.from}
                    </p>
                    <p>{message.message}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <input
                  value={analysisInput}
                  onChange={(event) => setAnalysisInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSendMetricMessage();
                    }
                  }}
                  placeholder="Ask about this metric..."
                  className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none ring-0 placeholder:text-muted-foreground"
                />
                <Button type="button" onClick={handleSendMetricMessage} size="sm">
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isSuperAdmin ? (
        <>
          {/* Super Admin - Role & Permission Management */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1.5fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">User Role Management</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {(roleManagementUsers.length === 0 ? [] : roleManagementUsers).map((entry) => {
                  const currentRoles = Array.isArray(entry.user_roles)
                    ? (entry.user_roles as Array<{ role: string }>)
                        .map((item) => item.role)
                        .join(", ")
                    : "none";
                  const selectedRole = roleRequestDrafts[entry.id] ?? "";

                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{entry.full_name ?? entry.email ?? "User"}</p>
                          <p className="text-sm text-muted-foreground">
                            Current: <span className="text-primary">{currentRoles}</span>
                          </p>
                        </div>
                        <Badge
                          variant={
                            entry.account_status === "deactivated" ? "destructive" : "secondary"
                          }
                        >
                          {entry.account_status ?? "active"}
                        </Badge>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <select
                          value={selectedRole}
                          onChange={(event) =>
                            setRoleRequestDrafts((current) => ({
                              ...current,
                              [entry.id]: event.target.value,
                            }))
                          }
                          className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Grant role</option>
                          <option value="customer">Customer</option>
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => void handleGrantRole(entry.id)}
                          disabled={!selectedRole}
                        >
                          Grant Role
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() =>
                            void handleDenyRole(
                              entry.id,
                              currentRoles !== "none" ? currentRoles.split(",")[0].trim() : null,
                            )
                          }
                        >
                          Deny
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-primary/5">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">System Access & Security</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Admin Dashboard Access", status: "enabled", users: 8 },
                  { label: "Super Admin Access", status: "enabled", users: 2 },
                  { label: "Teacher Portal Access", status: "enabled", users: 18 },
                  { label: "Student Registration", status: "enabled", users: 287 },
                  { label: "Payment Processing", status: "enabled", users: "all" },
                  { label: "Data Export", status: "restricted", users: "admin+" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border bg-background p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {item.status === "enabled" ? (
                        <Unlock className="h-4 w-4 text-green-600" />
                      ) : (
                        <Lock className="h-4 w-4 text-yellow-600" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">Users: {item.users}</p>
                      </div>
                    </div>
                    <Badge variant={item.status === "enabled" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Super Admin - Business Analytics & Centre Operations */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1.3fr_1.4fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Trading Centre Overview</h2>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { centre: "Main", revenue: 3200, users: 287, active: true },
                        { centre: "West Wing", revenue: 2100, users: 156, active: true },
                        { centre: "East Wing", revenue: 1800, users: 134, active: true },
                        { centre: "Satellite", revenue: 1600, users: 112, active: false },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="centre" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip className="rounded-lg border border-border bg-background text-foreground" />
                      <Legend />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue (×100K)" />
                      <Bar dataKey="users" fill="hsl(var(--secondary))" name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Business Performance</h2>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Monthly Revenue Target</span>
                    <span className="font-semibold">108.75%</span>
                  </div>
                  <div className="w-full rounded-full bg-border h-2">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: "108.75%" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Le 8.7M / Le 8M target</p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Student Retention Rate</span>
                    <span className="font-semibold">87%</span>
                  </div>
                  <div className="w-full rounded-full bg-border h-2">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: "87%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Teacher Satisfaction</span>
                    <span className="font-semibold">94%</span>
                  </div>
                  <div className="w-full rounded-full bg-border h-2">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: "94%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">System Uptime</span>
                    <span className="font-semibold">99.98%</span>
                  </div>
                  <div className="w-full rounded-full bg-border h-2">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: "99.98%" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-secondary/40">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Super Admin KPIs</h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { label: "Total Revenue (YTD)", value: "Le 78.5M", trend: "+22%" },
                  { label: "Active Centres", value: "4 of 4", trend: "100%" },
                  { label: "Total Users", value: "1,247", trend: "+18%" },
                  { label: "System Health", value: "99.98%", trend: "+0.2%" },
                  { label: "Avg Customer Satisfaction", value: "4.6/5.0", trend: "+0.3" },
                  { label: "Security Incidents", value: "0 active", trend: "Safe" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{kpi.label}</span>
                      <div className="text-right">
                        <p className="font-semibold">{kpi.value}</p>
                        <p
                          className={`text-xs ${kpi.trend.includes("+") ? "text-green-600" : kpi.trend === "Safe" ? "text-green-600" : "text-yellow-600"}`}
                        >
                          {kpi.trend}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Super Admin - Financial & Operational Control */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1.3fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">
                  Financial Overview (Year-to-Date)
                </h2>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { month: "Jan", revenue: 6200, expenses: 4100, profit: 2100 },
                        { month: "Feb", revenue: 6800, expenses: 4300, profit: 2500 },
                        { month: "Mar", revenue: 7100, expenses: 4500, profit: 2600 },
                        { month: "Apr", revenue: 7400, expenses: 4600, profit: 2800 },
                        { month: "May", revenue: 7900, expenses: 4800, profit: 3100 },
                        { month: "Jun", revenue: 8200, expenses: 5000, profit: 3200 },
                        { month: "Jul", revenue: 8500, expenses: 5200, profit: 3300 },
                        { month: "Aug", revenue: 8700, expenses: 5300, profit: 3400 },
                        { month: "Sep", revenue: 8700, expenses: 5400, profit: 3300 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip className="rounded-lg border border-border bg-background text-foreground" />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Revenue (×100K)"
                      />
                      <Line
                        type="monotone"
                        dataKey="expenses"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        name="Expenses (×100K)"
                      />
                      <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="hsl(var(--success))"
                        strokeWidth={2}
                        name="Profit (×100K)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-primary/5">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Centre Operations Control</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    centre: "Main Centre",
                    status: "operating",
                    staff: 8,
                    students: 287,
                    action: "Manage",
                  },
                  {
                    centre: "West Wing",
                    status: "operating",
                    staff: 5,
                    students: 156,
                    action: "Manage",
                  },
                  {
                    centre: "East Wing",
                    status: "operating",
                    staff: 4,
                    students: 134,
                    action: "Manage",
                  },
                  {
                    centre: "Satellite",
                    status: "closed",
                    staff: 0,
                    students: 112,
                    action: "Reopen",
                  },
                ].map((centre) => (
                  <div
                    key={centre.centre}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <p className="font-medium">{centre.centre}</p>
                        <p className="text-xs text-muted-foreground">
                          Staff: {centre.staff} • Students: {centre.students}
                        </p>
                      </div>
                      <Badge variant={centre.status === "operating" ? "default" : "outline"}>
                        {centre.status}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" className="w-full">
                      {centre.action}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Super Admin - System Settings & Alerts */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1.2fr_1.2fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Critical Alerts</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    alert: "Database backup",
                    severity: "info",
                    message: "Scheduled backup completed successfully",
                    time: "2 hours ago",
                  },
                  {
                    alert: "SSL certificate",
                    severity: "warning",
                    message: "Certificate expires in 45 days",
                    time: "1 day ago",
                  },
                  {
                    alert: "API usage",
                    severity: "info",
                    message: "API calls: 85% of monthly limit",
                    time: "30 mins ago",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border p-3 ${item.severity === "warning" ? "border-yellow-600/50 bg-yellow-50/10" : "border-border bg-background"}`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${item.severity === "warning" ? "text-yellow-600" : "text-blue-600"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.alert}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-secondary/40">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">System Configuration</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { setting: "Maintenance Mode", status: "off", icon: "⚙️" },
                  { setting: "New Registrations", status: "enabled", icon: "✓" },
                  { setting: "Payment Processing", status: "enabled", icon: "💳" },
                  { setting: "Email Notifications", status: "enabled", icon: "📧" },
                  { setting: "Backup Encryption", status: "enabled", icon: "🔐" },
                  { setting: "Two-Factor Auth", status: "required", icon: "🔒" },
                ].map((config) => (
                  <div
                    key={config.setting}
                    className="rounded-lg border border-border bg-background p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <span className="text-sm font-medium">{config.setting}</span>
                    </div>
                    <Badge
                      variant={
                        config.status === "enabled" || config.status === "required"
                          ? "default"
                          : config.status === "off"
                            ? "outline"
                            : "secondary"
                      }
                    >
                      {config.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Quick Actions</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => navigate({ to: "/reports" })}>
                  Generate System Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/reports" })}
                >
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Open live reports
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/roles" })}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Manage roles
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleExportData()}
                >
                  Export All Data
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    toast.info(
                      "API key configuration is managed in the secure deployment settings.",
                    )
                  }
                >
                  Configure API Keys
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/operations" })}
                >
                  Manage Integrations
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/reports" })}
                >
                  Review Audit Logs
                </Button>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() =>
                    toast.warning(
                      "Emergency lockdown is restricted to the secure infrastructure controls.",
                    )
                  }
                >
                  Emergency Lockdown
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : isAdmin ? (
        <>
          {/* Admin Analytics Section - Revenue Trend & Sales */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.5fr_1.5fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Revenue Trend (Last 6 Months)</h2>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { month: "Apr", revenue: 2400, target: 2400 },
                        { month: "May", revenue: 2210, target: 2210 },
                        { month: "Jun", revenue: 2290, target: 2290 },
                        { month: "Jul", revenue: 2000, target: 2000 },
                        { month: "Aug", revenue: 2808, target: 2808 },
                        { month: "Sep", revenue: 3200, target: 3200 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip className="rounded-lg border border-border bg-background text-foreground" />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Actual"
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Target"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Sales by Category</h2>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { category: "Programmes", sales: 1200, target: 1400 },
                        { category: "Shop Products", sales: 800, target: 900 },
                        { category: "Services", sales: 600, target: 700 },
                        { category: "Materials", sales: 600, target: 650 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="category" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip className="rounded-lg border border-border bg-background text-foreground" />
                      <Legend />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" name="Actual Sales" />
                      <Bar dataKey="target" fill="hsl(var(--muted-foreground))" name="Target" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Distribution & Performance Metrics */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1.2fr_1.2fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-xl font-bold">User Distribution</h2>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Students", value: 287 },
                          { name: "Teachers", value: 18 },
                          { name: "Customers", value: 247 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--secondary))" />
                        <Cell fill="hsl(var(--muted))" />
                      </Pie>
                      <Tooltip className="rounded-lg border border-border bg-background text-foreground" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Users:</span>
                    <span className="font-semibold">552</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Today:</span>
                    <span className="font-semibold text-green-600">348</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Inactive:</span>
                    <span className="font-semibold text-red-600">204</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-primary/5">
              <CardHeader>
                <h2 className="font-display text-xl font-bold">Performance Metrics</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Platform Uptime</span>
                    <span className="font-semibold">99.8%</span>
                  </div>
                  <div className="w-full rounded-full bg-border h-2">
                    <div className="h-full rounded-full bg-green-500" style={{ width: "99.8%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Approvals Processed</span>
                    <span className="font-semibold">87%</span>
                  </div>
                  <div className="w-full rounded-full bg-border h-2">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: "87%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Payment Success Rate</span>
                    <span className="font-semibold">94.5%</span>
                  </div>
                  <div className="w-full rounded-full bg-border h-2">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: "94.5%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Customer Satisfaction</span>
                    <span className="font-semibold">92%</span>
                  </div>
                  <div className="w-full rounded-full bg-border h-2">
                    <div className="h-full rounded-full bg-orange-500" style={{ width: "92%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-xl font-bold">Analytics KPIs</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Conversion Rate", value: "12.5%", icon: "📈" },
                  { label: "Avg Order Value", value: "Le 185K", icon: "💰" },
                  { label: "Repeat Customers", value: "34%", icon: "🔄" },
                  { label: "Support Tickets", value: "23 open", icon: "📧" },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{kpi.icon}</span>
                        <span className="text-sm text-muted-foreground">{kpi.label}</span>
                      </div>
                      <span className="font-semibold">{kpi.value}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Pending Approvals Section */}
          <div className="mt-10 grid gap-6">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Pending Approvals</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvalQueue.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.name} • {item.item}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(item.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={item.status === "pending" ? "secondary" : "default"}>
                        {item.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1">
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* User & Product Management Section */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1.2fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Users & Staff</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <span>Total registered users</span>
                    <span className="font-semibold">542</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <span>Active students</span>
                    <span className="font-semibold">287</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <span>Approved teachers</span>
                    <span className="font-semibold">18</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                    <span>Customer accounts</span>
                    <span className="font-semibold">247</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/roles" })}
                >
                  Manage users
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Products & Services</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium">Programmes</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      6 active programmes • 3 archived
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium">Shop Products</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      14 active products • 5 out of stock
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium">Services</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      12 services available • All active
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/operations" })}
                >
                  Manage inventory
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Orders & Payments Section */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1.2fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Recent Orders & Transactions</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    id: "ORD-5421",
                    customer: "Amara J. Sesay",
                    items: "Excel Course + Materials",
                    amount: "Le 280,000",
                    status: "completed",
                  },
                  {
                    id: "ORD-5420",
                    customer: "Ibrahim Bangura",
                    items: "Word Course",
                    amount: "Le 180,000",
                    status: "pending",
                  },
                  {
                    id: "ORD-5419",
                    customer: "Haja M. Jalloh",
                    items: "Shop Order",
                    amount: "Le 95,000",
                    status: "processing",
                  },
                  {
                    id: "ORD-5418",
                    customer: "Mohamed Sesay",
                    items: "Multiple Courses",
                    amount: "Le 450,000",
                    status: "completed",
                  },
                ].map((order) => (
                  <div key={order.id} className="rounded-lg border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{order.id}</p>
                        <p className="text-sm text-muted-foreground">{order.customer}</p>
                        <p className="text-xs text-muted-foreground mt-1">{order.items}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{order.amount}</p>
                        <Badge
                          variant={
                            order.status === "completed"
                              ? "default"
                              : order.status === "processing"
                                ? "secondary"
                                : "outline"
                          }
                          className="mt-1"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-secondary/40">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Payment Methods Distribution</h2>
              </CardHeader>
              <CardContent>
                <div style={{ width: "100%", height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { method: "Mobile Money", count: 65, percentage: 42 },
                        { method: "Bank Transfer", count: 45, percentage: 29 },
                        { method: "Card", count: 35, percentage: 22 },
                        { method: "Cash", count: 11, percentage: 7 },
                      ]}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="method" type="category" className="text-xs" width={100} />
                      <Tooltip className="rounded-lg border border-border bg-background text-foreground" />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Transactions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Revenue:</span>
                    <p className="font-semibold">Le 3.2M</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Approved:</span>
                    <p className="font-semibold text-green-600">Le 2.8M</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pending:</span>
                    <p className="font-semibold text-yellow-600">Le 400K</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Transactions:</span>
                    <p className="font-semibold">156</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View detailed reports
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Delivery & Communications Section */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_1.2fr]">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Delivery Management</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {deliveryStatuses.map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                  >
                    <span className="font-medium">{status.label}</span>
                    <Badge
                      variant={
                        status.state === "delivered"
                          ? "default"
                          : status.state === "shipping"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {status.state === "pending"
                        ? "0"
                        : status.state === "processing"
                          ? "3"
                          : status.state === "shipping"
                            ? "28"
                            : "124"}{" "}
                      active
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate({ to: "/admin" })}
                >
                  Track shipments
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-primary/5">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Notifications & Messages</h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {storedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-lg border border-primary/20 bg-background p-3"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-medium text-foreground">{notification.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {workflowNotifications.map((notif) => (
                  <div key={notif.id} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-start gap-2">
                      <CheckCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notif.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : isTeacher ? (
        approvalStatus === "approved" ? (
          <>
            {/* Teacher Overview Cards */}
            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {[
                {
                  label: "Assigned students",
                  value: String(liveTeacherAssignments.length),
                  detail: "Across all shifts",
                },
                {
                  label: "Active programmes",
                  value: String(Object.keys(teacherProgrammeSummary).length),
                  detail: "Current course load",
                },
                {
                  label: "Shift groups",
                  value: String(Object.keys(teacherShiftSummary).length),
                  detail: "Morning, afternoon, evening",
                },
                {
                  label: "Expected programme revenue",
                  value: formatPrice(teacherRevenueEstimate),
                  detail: "Reference only",
                },
              ].map((metric) => (
                <Card key={metric.label} className="border-border/70">
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-primary">
                      {metric.value}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{metric.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader>
                  <h2 className="font-display text-lg font-bold">Shift workload overview</h2>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {Object.entries(teacherShiftSummary).map(([shift, summary]) => (
                    <div key={shift} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{shift}</p>
                          <p className="text-xs text-muted-foreground">
                            {Array.from(summary.programmes).join(" • ") || "General programme"}
                          </p>
                        </div>
                        <Badge variant="secondary">{summary.students} students</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Estimated revenue: {formatPrice(summary.revenue)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <h2 className="font-display text-lg font-bold">Programme coverage</h2>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {Object.entries(teacherProgrammeSummary).map(([programme, summary]) => (
                    <div
                      key={programme}
                      className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{programme}</p>
                        <p className="text-xs text-muted-foreground">Students assigned</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{summary.students}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatPrice(summary.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <Card className="border-border/70">
                <CardHeader>
                  <h2 className="font-display text-lg font-bold">Assigned Programmes</h2>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium text-foreground">Excel for Work</p>
                    <p className="text-muted-foreground">Intermediate Level • 5 weeks</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium text-foreground">Word Processing</p>
                    <p className="text-muted-foreground">Foundation Level • 4 weeks</p>
                  </div>
                  <Link to="/courses">
                    <Button variant="outline" size="sm" className="w-full">
                      View all programmes
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <h2 className="font-display text-lg font-bold">Teaching Schedule</h2>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-2">
                      <span className="font-medium">Morning Shift</span>
                      <Badge variant="secondary">8:00 - 10:00</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-2">
                      <span className="font-medium">Afternoon Shift</span>
                      <Badge variant="secondary">12:30 - 2:30 PM</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-secondary/30 p-2">
                      <span className="font-medium">Evening Shift</span>
                      <Badge variant="secondary">5:30 - 7:30 PM</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Mon - Fri</p>
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <h2 className="font-display text-lg font-bold">Profile & Compensation</h2>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium text-foreground">Status</p>
                    <p className="text-muted-foreground">
                      {approvalStatus === "approved"
                        ? "Verified & Approved"
                        : `Account ${approvalStatus}`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <p className="font-medium text-foreground">Salary payment status</p>
                    <p className="text-muted-foreground">
                      {teacherPayments[0]
                        ? `${teacherPayments[0].period}: ${teacherPayments[0].status}`
                        : "No payment record yet"}
                    </p>
                    {teacherPayments[0]?.status === "approved" && (
                      <p className="mt-1 text-xs text-primary">
                        Approved amount: {formatPrice(Number(teacherPayments[0].amount))}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setTeacherProfileOpen((open) => !open)}
                  >
                    {teacherProfileOpen ? "Close profile editor" : "Edit profile"}
                  </Button>
                  {teacherProfileOpen && (
                    <form
                      onSubmit={handleProfileSave}
                      className="space-y-2 border-t border-border pt-3"
                    >
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={profileForm.fullName}
                        onChange={(event) =>
                          setProfileForm((current) => ({
                            ...current,
                            fullName: event.target.value,
                          }))
                        }
                        placeholder="Full name"
                      />
                      <input
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={profileForm.phone}
                        onChange={(event) =>
                          setProfileForm((current) => ({ ...current, phone: event.target.value }))
                        }
                        placeholder="Phone"
                      />
                      <Button type="submit" size="sm" className="w-full">
                        Save permitted fields
                      </Button>
                    </form>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleSalaryReview}
                    disabled={salaryReviewRequested}
                  >
                    {salaryReviewRequested ? "Salary review requested" : "Request salary review"}
                  </Button>
                  <Link to="/assets">
                    <Button variant="outline" size="sm" className="w-full">
                      My assets & custody
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Student Progress & Results Section */}
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1.2fr]">
              <Card className="border-border/70">
                <CardHeader>
                  <h2 className="font-display text-2xl font-bold">Student Progress</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  {liveTeacherAssignments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.student}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.group} • {item.course}
                          </p>
                        </div>
                        <Badge
                          variant={
                            item.status === "Ready for exam"
                              ? "default"
                              : item.status === "On track"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 rounded-full bg-border h-2">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: item.status === "Ready for exam" ? "100%" : "65%" }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.status === "Ready for exam" ? "100%" : "65%"}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border/70">
                <CardHeader>
                  <h2 className="font-display text-2xl font-bold">Submit Results</h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleTeacherResultSubmit} className="space-y-3 text-sm">
                    <div>
                      <label className="text-sm font-medium text-foreground">Student Name</label>
                      <select
                        value={teacherResultForm.student}
                        onChange={(event) =>
                          setTeacherResultForm((current) => ({
                            ...current,
                            student: event.target.value,
                          }))
                        }
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option>Select student...</option>
                        {liveTeacherAssignments.map((item) => (
                          <option key={item.id}>{item.student}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Programme</label>
                      <select
                        value={teacherResultForm.programme}
                        onChange={(event) =>
                          setTeacherResultForm((current) => ({
                            ...current,
                            programme: event.target.value,
                          }))
                        }
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option>Select programme...</option>
                        <option>Excel for Work</option>
                        <option>Word Processing</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Score (0-100)</label>
                      <input
                        type="number"
                        value={teacherResultForm.score}
                        onChange={(event) =>
                          setTeacherResultForm((current) => ({
                            ...current,
                            score: event.target.value,
                          }))
                        }
                        placeholder="Enter score"
                        min="0"
                        max="100"
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Feedback</label>
                      <textarea
                        rows={3}
                        value={teacherResultForm.feedback}
                        onChange={(event) =>
                          setTeacherResultForm((current) => ({
                            ...current,
                            feedback: event.target.value,
                          }))
                        }
                        placeholder="Provide feedback to student..."
                        className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Submit Result for Review
                    </Button>
                  </form>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={printStudentRecord}
                  >
                    Print permitted results
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Communication & Notifications Section */}
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-border/70">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-display text-2xl font-bold">
                      Student & Admin Communication
                    </h2>
                    <Button size="sm" onClick={() => setShowChatModal(true)} className="gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Chat
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form
                    onSubmit={handleTeacherAnnouncement}
                    className="rounded-lg border border-border bg-secondary/30 p-4"
                  >
                    <label className="text-sm font-medium">Broadcast to assigned students</label>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={teacherAnnouncement}
                        onChange={(event) => setTeacherAnnouncement(event.target.value)}
                        placeholder="Share a class or programme update"
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                      />
                      <Button type="submit" size="sm" disabled={!teacherAnnouncement.trim()}>
                        Send
                      </Button>
                    </div>
                  </form>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        A
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Centre Admin</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Please submit results for Excel exam by Friday.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        S
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Student: Fatima B. Conteh</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          When can I reschedule my exam?
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-primary/5">
                <CardHeader>
                  <h2 className="font-display text-lg font-bold">Notifications & Pending Tasks</h2>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {storedNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-lg border border-primary/20 bg-background p-3"
                    >
                      <p className="font-medium text-foreground">{notification.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="font-medium">Student allocation updates</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      New allocations and teacher transfers appear here for review.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">5 results pending submission</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Due by end of week</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">3 student requests</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Exam reschedule & feedback</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Teacher Communication Modal */}
            {showChatModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <Card className="w-full max-w-2xl border-border/70">
                  <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="h-5 w-5 text-primary" />
                      <h2 className="font-display text-2xl font-bold">
                        {selectedContact ? `Message ${selectedContact.name}` : "Select Recipient"}
                      </h2>
                    </div>
                    <button
                      onClick={() => {
                        setShowChatModal(false);
                        setSelectedContact(null);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </CardHeader>

                  <CardContent className="grid gap-6 p-6 lg:grid-cols-[0.7fr_1.3fr]">
                    {/* Recipients List */}
                    <div className="space-y-2 border-r border-border pr-4">
                      <p className="text-xs font-semibold text-muted-foreground">CENTRE ADMIN</p>
                      <button
                        onClick={() =>
                          setSelectedContact({ id: "admin", name: "Centre Admin", role: "admin" })
                        }
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selectedContact?.id === "admin"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-secondary/50"
                        }`}
                      >
                        <p className="font-medium">Centre Admin</p>
                        <p className="text-xs text-muted-foreground">Management & scheduling</p>
                      </button>

                      <p className="mt-4 text-xs font-semibold text-muted-foreground">
                        YOUR STUDENTS
                      </p>
                      {liveTeacherAssignments.map((student) => (
                        <button
                          key={student.id}
                          onClick={() =>
                            setSelectedContact({
                              id: student.id,
                              name: student.student,
                              role: "student",
                            })
                          }
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            selectedContact?.id === student.id
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          <p className="font-medium">{student.student}</p>
                          <p className="text-xs text-muted-foreground">{student.course}</p>
                        </button>
                      ))}
                    </div>

                    {/* Chat Area */}
                    <div className="flex flex-col gap-4">
                      {selectedContact ? (
                        <>
                          <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-4">
                            {chatMessages.length === 0 ? (
                              <p className="text-center text-sm text-muted-foreground">
                                No messages yet. Start the conversation!
                              </p>
                            ) : (
                              chatMessages.map((msg, idx) => (
                                <div
                                  key={idx}
                                  className={`flex gap-2 ${msg.from === "You" ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`rounded-lg p-3 max-w-xs ${msg.from === "You" ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}
                                  >
                                    <p className="text-sm">{msg.message}</p>
                                    <p className="text-xs mt-1 opacity-70">
                                      {new Date(msg.timestamp).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <form onSubmit={handleSendMessage} className="flex gap-2">
                            <input
                              type="text"
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Type your message..."
                              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            />
                            <Button type="submit" size="sm" disabled={!messageText.trim()}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                        </>
                      ) : (
                        <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-secondary/30">
                          <p className="text-center text-sm text-muted-foreground">
                            Select a recipient to start chatting
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <Card className="mt-10 border-amber-200 bg-amber-50">
            <CardContent className="py-10 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-amber-700" />
              <h2 className="mt-3 font-display text-2xl font-bold text-amber-950">
                Teacher account pending approval
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-amber-900">
                Your profile is awaiting admin approval. Student assignments, results, salary review
                and teaching tools will unlock after approval.
              </p>
              <Link to="/contact" className="mt-5 inline-block">
                <Button variant="outline">Contact admin</Button>
              </Link>
            </CardContent>
          </Card>
        )
      ) : isCustomer ? (
        <div className="mt-10 space-y-6">
          {/* Order Status Summary */}
          <div className="grid gap-6 lg:grid-cols-4">
            <Card className="border-border/70">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="font-display text-3xl font-bold text-primary mt-2">
                  {recentOrders.length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="font-display text-3xl font-bold text-yellow-600 mt-2">
                  {recentOrders.filter((o) => String(o.status) === "pending_approval").length}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Active Orders</p>
                <p className="font-display text-3xl font-bold text-blue-600 mt-2">
                  {
                    recentOrders.filter((o) => ["processing", "shipped"].includes(String(o.status)))
                      .length
                  }
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="font-display text-3xl font-bold text-green-600 mt-2">
                  {recentOrders.filter((o) => String(o.status) === "delivered").length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Order Tracking */}
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Your Orders & Delivery</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Track your orders from submission through delivery. Payment must be approved before
                processing begins.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentOrders.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-border bg-secondary/30 p-8 text-center">
                  <p className="text-muted-foreground">No orders yet.</p>
                  <Link to="/shop" className="mt-3 inline-block">
                    <Button size="sm">Start shopping</Button>
                  </Link>
                </div>
              ) : (
                recentOrders.map((order) => {
                  const statusMap: Record<
                    string,
                    { label: string; color: string; description: string }
                  > = {
                    pending_approval: {
                      label: "Awaiting Approval",
                      color: "bg-yellow-100 text-yellow-800",
                      description: "Your payment is being verified by the admin",
                    },
                    approved: {
                      label: "Approved",
                      color: "bg-green-100 text-green-800",
                      description: "Order approved! Processing begins shortly",
                    },
                    rejected: {
                      label: "Rejected",
                      color: "bg-red-100 text-red-800",
                      description: "Order rejected. Contact admin for details",
                    },
                    processing: {
                      label: "Processing",
                      color: "bg-blue-100 text-blue-800",
                      description: "Your order is being prepared for shipment",
                    },
                    shipped: {
                      label: "Shipped",
                      color: "bg-purple-100 text-purple-800",
                      description: "Your order is on its way to you",
                    },
                    delivered: {
                      label: "Delivered",
                      color: "bg-green-100 text-green-800",
                      description: "Order successfully delivered",
                    },
                  };

                  const orderStatus = statusMap[String(order.status)] || {
                    label: String(order.status || "unknown").toUpperCase(),
                    color: "bg-secondary text-foreground",
                    description: "Status unknown",
                  };

                  return (
                    <div
                      key={String(order.id)}
                      className="rounded-lg border border-border bg-background p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Badge className={orderStatus.color}>{orderStatus.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(String(order.created_at)).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {orderStatus.description}
                          </p>
                        </div>
                        <p className="font-display font-bold text-primary">
                          {formatPrice(Number(order.total ?? 0))}
                        </p>
                      </div>

                      {/* Order Timeline */}
                      <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                        <div
                          className={`rounded-lg p-2 text-center ${["pending_approval", "approved", "rejected", "processing", "shipped", "delivered"].indexOf(String(order.status)) >= 0 ? "bg-primary/20 text-primary font-medium" : "bg-secondary text-muted-foreground"}`}
                        >
                          📋 Submitted
                        </div>
                        <div
                          className={`rounded-lg p-2 text-center ${["approved", "processing", "shipped", "delivered"].indexOf(String(order.status)) >= 0 ? "bg-primary/20 text-primary font-medium" : "bg-secondary text-muted-foreground"}`}
                        >
                          ✓ Approved
                        </div>
                        <div
                          className={`rounded-lg p-2 text-center ${["shipped", "delivered"].indexOf(String(order.status)) >= 0 ? "bg-primary/20 text-primary font-medium" : "bg-secondary text-muted-foreground"}`}
                        >
                          📦 Shipped
                        </div>
                        <div
                          className={`rounded-lg p-2 text-center ${String(order.status) === "delivered" ? "bg-primary/20 text-primary font-medium" : "bg-secondary text-muted-foreground"}`}
                        >
                          🎉 Delivered
                        </div>
                      </div>

                      {String(order.status) === "rejected" && (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                          <p className="text-xs font-medium text-red-700">Rejection Reason:</p>
                          <p className="text-xs text-red-600 mt-1">
                            {String(
                              order.rejection_reason ??
                                "The admin rejected this order without a reason.",
                            )}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="flex-1 text-xs">
                          View Details
                        </Button>
                        {String(order.status) === "pending_approval" && (
                          <Button size="sm" variant="outline" className="flex-1 text-xs">
                            Cancel Order
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/70">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-3">Need Help?</h3>
                <Link to="/contact">
                  <Button size="sm" variant="outline" className="w-full">
                    Contact Admin
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-3">Request Service</h3>
                <Link to="/services">
                  <Button size="sm" variant="outline" className="w-full">
                    Browse Services
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border/70">
              <CardContent className="pt-6">
                <h3 className="font-medium mb-3">Continue Shopping</h3>
                <Link to="/shop">
                  <Button size="sm" className="w-full">
                    Shop Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <>
          {!isApprovedStudent && (
            <Card className="mt-10 border-amber-200 bg-amber-50">
              <CardContent className="flex items-start gap-3 py-5">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
                <div>
                  <p className="font-semibold text-amber-900">
                    Your student access is {approvalStatus}.
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Profile updates, programme browsing, payment status and support remain available
                    while the centre reviews your registration.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Student Registration & Profile Section */}
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-lg font-bold">Profile Information</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSave} className="space-y-3 text-sm">
                  <label className="block">
                    <span className="text-muted-foreground">Full name</span>
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3"
                      value={profileForm.fullName || profile?.full_name || ""}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, fullName: event.target.value }))
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="text-muted-foreground">Phone</span>
                    <input
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3"
                      value={profileForm.phone || profile?.phone || ""}
                      onChange={(event) =>
                        setProfileForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Email: {user?.email ?? "Not available"}
                  </p>
                  <Button type="submit" size="sm" className="w-full">
                    Update profile
                  </Button>
                  {profileMessage && <p className="text-xs text-primary">{profileMessage}</p>}
                </form>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-lg font-bold">Enrolment Status</h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="font-medium text-foreground">Current Programme</p>
                  <p className="text-muted-foreground">
                    {enrollment?.path ?? "No programme selected yet"}
                  </p>
                  <Badge
                    className="mt-2"
                    variant={enrollment?.status === "approved" ? "default" : "secondary"}
                  >
                    {enrollment?.status ?? approvalStatus}
                  </Badge>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="font-medium text-foreground">Shift Assignment</p>
                  <p className="text-muted-foreground">
                    {enrollment?.shift_id
                      ? `Assigned shift: ${enrollment.shift_id}`
                      : "Awaiting shift assignment"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Link to="/academic-registration">
                    <Button size="sm" className="w-full">
                      Start new registration
                    </Button>
                  </Link>
                  <Link to="/shop">
                    <Button variant="outline" size="sm" className="w-full">
                      Browse programmes and costs
                    </Button>
                  </Link>
                  <Link to="/checkout">
                    <Button variant="outline" size="sm" className="w-full">
                      Submit or review payment
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-lg font-bold">Payment History</h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">Regular Path</p>
                    <Badge
                      variant={
                        recentOrders[0]?.payment_status === "approved" ? "default" : "secondary"
                      }
                    >
                      {String(recentOrders[0]?.payment_status ?? "No payment")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {recentOrders[0]
                      ? formatPrice(Number(recentOrders[0].total ?? 0))
                      : "No registration order yet"}
                  </p>
                  {recentOrders[0] && (
                    <p className="text-xs text-muted-foreground">
                      Paid {formatPrice(Number(recentOrders[0].amount_paid ?? 0))} · Balance{" "}
                      {formatPrice(Number(recentOrders[0].balance_due ?? 0))}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">Registration Fee</p>
                    <Badge variant="secondary">
                      {recentOrders[0] ? String(recentOrders[0].status) : "Not submitted"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    Payment proof is reviewed by the centre
                  </p>
                </div>
                <Link to="/checkout">
                  <Button variant="outline" size="sm" className="w-full">
                    Complete payment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Assigned Teacher</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                {(assignedTeachers.length > 0
                  ? assignedTeachers
                  : teachers.filter((teacher) => teacher.isCurrentTeacher)
                ).map((teacher) => (
                  <div
                    key={teacher.id ?? teacher.name}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {(teacher.tutors as { name?: string; title?: string } | undefined)
                            ?.name ?? teacher.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(teacher.tutors as { title?: string } | undefined)?.title ??
                            teacher.title}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Programme: {teacher.programme ?? teacher.teaches}
                        </p>
                        {teacher.shifts && (
                          <p className="text-xs text-muted-foreground">
                            Shift: {(teacher.shifts as { name?: string }).name}
                          </p>
                        )}
                      </div>
                      <Badge>Current teacher</Badge>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Teacher or programme reallocations will appear in your notifications.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <h2 className="font-display text-2xl font-bold">Request a Shift Change</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleShiftRequest} className="space-y-3">
                  <input
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={shiftRequest}
                    onChange={(event) => setShiftRequest(event.target.value)}
                    placeholder="Requested shift and reason"
                    disabled={!isApprovedStudent}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!isApprovedStudent || !shiftRequest.trim()}
                  >
                    Submit shift request
                  </Button>
                  {(shiftRequestStatus || persistedShiftRequest) && (
                    <p className="text-xs text-muted-foreground">
                      {shiftRequestStatus ?? "Pending admin review"}
                    </p>
                  )}
                  {!isApprovedStudent && (
                    <p className="text-xs text-muted-foreground">
                      Shift changes become available after approval.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {isApprovedStudent ? (
            <>
              {/* Academic Progress & Results Section */}
              <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-border/70">
                  <CardHeader>
                    <h2 className="font-display text-2xl font-bold">Academic Progress & Results</h2>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {displayResults.map((item) => (
                      <div
                        key={item.program}
                        className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
                      >
                        <div>
                          <p className="font-medium">{item.program}</p>
                          <p className="text-sm text-muted-foreground">{item.note}</p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={
                              item.status === "Passed"
                                ? "default"
                                : item.status === "In progress"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {item.status}
                          </Badge>
                          <p className="mt-2 text-sm font-semibold text-primary">{item.score}</p>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
                      <p className="font-medium text-foreground">Progress Summary</p>
                      <p className="mt-1 text-muted-foreground">
                        {studentResults.length
                          ? `${scoredResults.length} recorded results · ${studentResults.length - scoredResults.length} pending results`
                          : "3 programmes passed · 1 in progress · 2 not yet started"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={printStudentRecord}>
                        Print results
                      </Button>
                      <Button size="sm" variant="outline" onClick={printStudentRecord}>
                        Print certificate
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-secondary/40">
                  <CardHeader>
                    <div className="flex items-center gap-2 text-primary">
                      <Award className="h-5 w-5" />
                      <span className="font-display text-lg font-semibold">Certificate Status</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    {certificates.length > 0 &&
                      certificates.map((certificate) => (
                        <div
                          key={certificate.id}
                          className="rounded-lg border border-primary/20 bg-background p-4"
                        >
                          <p className="font-medium text-foreground">{certificate.title}</p>
                          <p className="mt-1 text-xs">
                            Certificate no: {certificate.certificate_no}
                          </p>
                          <Badge className="mt-2">{certificate.status}</Badge>
                        </div>
                      ))}
                    <div className="rounded-lg border border-border bg-background p-4">
                      <p className="font-medium text-foreground">Academic performance</p>
                      <p className="mt-1 text-3xl font-bold text-primary">
                        {averageScore ? `${averageScore}%` : "Not yet available"}
                      </p>
                      <p className="mt-1 text-xs">Average across recorded exam results</p>
                    </div>
                    <p>
                      Complete all 6 programmes and receive your K-Lunsar Computer Training
                      certificate at the next graduation ceremony.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span>
                          {liveProgress.length
                            ? `${Math.round(liveProgress.reduce((sum, item) => sum + Number(item.score.replace("%", "")), 0) / liveProgress.length)}% course progress`
                            : "50% complete (3 of 6)"}
                        </span>
                      </div>
                      <div className="w-full rounded-full bg-border h-2">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${liveProgress.length ? Math.round(liveProgress.reduce((sum, item) => sum + Number(item.score.replace("%", "")), 0) / liveProgress.length) : 50}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <p className="font-medium text-foreground">Next milestone</p>
                      <p className="mt-1">Complete Excel and pass the graduation review.</p>
                    </div>
                    <p className="text-xs">
                      Certificates and result records can be printed after approval.
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Teacher Communication & Support Section */}
              <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-border/70">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display text-2xl font-bold">
                        Teacher & Admin Communication
                      </h2>
                      <Button size="sm" onClick={() => setShowChatModal(true)} className="gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Start Chat
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {supportThreads.map((thread) => (
                      <div
                        key={thread.id}
                        className="flex items-start gap-3 rounded-lg border border-border bg-background p-4"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                          {thread.from.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{thread.from}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{thread.message}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-primary/5">
                  <CardHeader>
                    <h2 className="font-display text-lg font-bold">Notifications</h2>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {!isApprovedStudent && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="font-medium text-amber-900">Account approval update</p>
                        <p className="mt-1 text-xs text-amber-800">
                          Your registration is currently {approvalStatus}. The centre will notify
                          you when it changes.
                        </p>
                      </div>
                    )}
                    {recentOrders.some((order) => String(order.status) === "rejected") && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="font-medium text-red-900">Payment or registration rejected</p>
                        <p className="mt-1 text-xs text-red-800">
                          {String(
                            recentOrders.find((order) => String(order.status) === "rejected")
                              ?.rejection_reason ?? "Review the order for the admin reason.",
                          )}
                        </p>
                      </div>
                    )}
                    {storedNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="rounded-lg border border-primary/20 bg-background p-3"
                      >
                        <p className="font-medium text-foreground">{notification.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {workflowNotifications.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border bg-background p-3"
                      >
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Chat Modal */}
              {showChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <Card className="w-full max-w-2xl border-border/70">
                    <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border">
                      <div className="flex items-center gap-2">
                        <MessageSquareText className="h-5 w-5 text-primary" />
                        <h2 className="font-display text-2xl font-bold">
                          {selectedContact
                            ? `Chat with ${selectedContact.name}`
                            : "Select a Contact"}
                        </h2>
                      </div>
                      <button
                        onClick={() => {
                          setShowChatModal(false);
                          setSelectedContact(null);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </CardHeader>

                    <CardContent className="grid gap-6 p-6 lg:grid-cols-[0.7fr_1.3fr]">
                      {/* Contacts List */}
                      <div className="space-y-2 border-r border-border pr-4">
                        <p className="text-xs font-semibold text-muted-foreground">CENTRE ADMIN</p>
                        <button
                          onClick={() =>
                            setSelectedContact({ id: "admin", name: "Centre Admin", role: "admin" })
                          }
                          className={`w-full rounded-lg border p-3 text-left transition-colors ${
                            selectedContact?.id === "admin"
                              ? "border-primary bg-primary/10"
                              : "border-border hover:bg-secondary/50"
                          }`}
                        >
                          <p className="font-medium">Centre Admin</p>
                          <p className="text-xs text-muted-foreground">
                            Office & enrolment support
                          </p>
                        </button>

                        <p className="mt-4 text-xs font-semibold text-muted-foreground">
                          YOUR TEACHERS
                        </p>
                        {teachers.map((teacher) => (
                          <button
                            key={teacher.id}
                            onClick={() =>
                              setSelectedContact({
                                id: teacher.id,
                                name: teacher.name,
                                role: "teacher",
                              })
                            }
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              selectedContact?.id === teacher.id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-secondary/50"
                            } ${teacher.isCurrentTeacher ? "ring-2 ring-primary" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{teacher.name}</p>
                                <p className="text-xs text-muted-foreground">{teacher.teaches}</p>
                              </div>
                              {teacher.isCurrentTeacher && (
                                <Badge variant="default" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Chat Area */}
                      <div className="flex flex-col gap-4">
                        {selectedContact ? (
                          <>
                            {/* Messages */}
                            <div className="max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-4">
                              {chatMessages.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground">
                                  No messages yet. Start the conversation!
                                </p>
                              ) : (
                                chatMessages.map((msg, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex gap-2 ${msg.from === "You" ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`rounded-lg p-3 max-w-xs ${msg.from === "You" ? "bg-primary text-primary-foreground" : "bg-background border border-border"}`}
                                    >
                                      <p className="text-sm">{msg.message}</p>
                                      <p className="text-xs mt-1 opacity-70">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Message Input */}
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                              <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                              />
                              <Button type="submit" size="sm" disabled={!messageText.trim()}>
                                <Send className="h-4 w-4" />
                              </Button>
                            </form>
                          </>
                        ) : (
                          <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-secondary/30">
                            <p className="text-center text-sm text-muted-foreground">
                              Select a contact to start chatting
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Card className="border-border/70 bg-secondary/30">
                <CardContent className="py-8 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
                  <h2 className="mt-3 font-display text-xl font-bold">
                    Academic dashboard pending approval
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    Results, learning progress, certificates and teacher allocation will unlock
                    after the centre approves your registration and payment.
                  </p>
                  <Link to="/contact" className="mt-4 inline-block">
                    <Button variant="outline" size="sm">
                      Contact the centre
                    </Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-xl font-bold">Chat with admin</h2>
                      <p className="text-xs text-muted-foreground">
                        Your message will be marked as coming from an unapproved student.
                      </p>
                    </div>
                    <Badge variant="destructive">Unapproved</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-3">
                    {adminChatMessages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Ask the centre about your registration or payment.
                      </p>
                    ) : (
                      adminChatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-lg p-2 text-sm ${message.from === "student" ? "ml-6 bg-primary/10" : "mr-6 bg-background"}`}
                        >
                          <p>{message.message}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {message.from === "student" ? "You" : "Admin"} ·{" "}
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      setSelectedContact({ id: "admin", name: "Centre Admin", role: "admin" });
                      handleSendMessage(event);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      placeholder="Ask the admin for help"
                      className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                    <Button type="submit" size="sm" disabled={!messageText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-border/70">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary">
              <ShoppingBag className="h-5 w-5" />
              <h2 className="font-display text-2xl font-bold text-foreground">Recent orders</h2>
            </div>
            <Badge variant="secondary">{recentOrders.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved orders yet. Your enrolments and purchases will appear here after checkout.
              </p>
            ) : (
              recentOrders.slice(0, 4).map((order) => {
                const items = Array.isArray((order as any).order_items)
                  ? (order as any).order_items
                  : [];
                const itemSummary = items.length
                  ? items
                      .slice(0, 2)
                      .map((item: any) => `${item.name} x ${item.quantity}`)
                      .join(", ")
                  : "Order items";

                return (
                  <div
                    key={String(order.id)}
                    className="rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{itemSummary}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(String(order.created_at)).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-semibold text-primary">
                          {formatPrice(Number(order.total ?? 0))}
                        </p>
                        <Badge
                          variant={String(order.status) === "pending" ? "secondary" : "default"}
                        >
                          {String(order.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-primary/5">
          <CardHeader>
            <h2 className="font-display text-2xl font-bold">Messages & workflow</h2>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {supportThreads.map((thread) => (
              <div key={thread.id} className="rounded-lg border border-border bg-background p-3">
                <p className="font-medium text-foreground">{thread.from}</p>
                <p className="mt-1">{thread.message}</p>
              </div>
            ))}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/courses">
                <Button variant="secondary">Review course plan</Button>
              </Link>
              <Link to="/contact">
                <Button
                  variant="outline"
                  className="border-primary/40 bg-transparent text-foreground hover:bg-primary/5"
                >
                  Ask the office
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {isCustomer && (
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-border/70">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Customer feedback</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Feedback title</label>
                  <input
                    value={feedbackForm.title}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({ ...current, title: event.target.value }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="How was your experience?"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Your rating</label>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setFeedbackForm((current) => ({ ...current, rating: value }))
                          }
                          className={`rounded-full border px-2 py-1 text-sm ${feedbackForm.rating >= value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Comments</label>
                  <textarea
                    rows={4}
                    value={feedbackForm.message}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({ ...current, message: event.target.value }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Tell us about your shopping, payment, delivery, or support experience."
                  />
                </div>
                <Button type="submit" className="w-full">
                  Submit feedback
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-secondary/40">
            <CardHeader>
              <h2 className="font-display text-2xl font-bold">Delivery & payment tracking</h2>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="font-medium text-foreground">Payment status</p>
                <p className="mt-1">
                  Awaiting centre review and confirmation before enrolment is finalized.
                </p>
              </div>
              {recentOrders.some((order) => order.delivery_visible === true) ? (
                recentOrders
                  .filter((order) => order.delivery_visible === true)
                  .slice(0, 1)
                  .map((order) => (
                    <div
                      key={String(order.id)}
                      className="space-y-3 rounded-lg border border-border bg-background p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">Current status</span>
                        <Badge>
                          {String(order.delivery_status ?? order.status).replaceAll("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs">
                        Address: {String(order.delivery_address ?? "Not provided")}
                      </p>
                      <p className="text-xs">
                        Expected delivery: {String(order.expected_delivery_at ?? "To be confirmed")}
                      </p>
                      {Array.isArray((order as any).order_delivery_events) &&
                        (order as any).order_delivery_events.length > 0 && (
                          <div className="border-t border-border pt-2">
                            <p className="text-xs font-medium">Delivery history</p>
                            {(order as any).order_delivery_events.slice(-3).map((event: any) => (
                              <p
                                key={`${event.created_at}-${event.status}`}
                                className="mt-1 text-xs text-muted-foreground"
                              >
                                {new Date(event.created_at).toLocaleDateString()} ·{" "}
                                {String(event.status).replaceAll("_", " ")} · {event.note}
                              </p>
                            ))}
                          </div>
                        )}
                    </div>
                  ))
              ) : (
                <p className="rounded-lg border border-border bg-background p-4 text-sm">
                  Delivery tracking becomes visible after your order and payment are approved.
                </p>
              )}
              {customerFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Your recent service feedback will appear here after you submit it.
                </p>
              ) : (
                customerFeedback.slice(0, 3).map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-foreground">{item.title}</p>
                      <Badge variant="secondary">{item.rating}/5</Badge>
                    </div>
                    <p className="mt-2">{item.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
